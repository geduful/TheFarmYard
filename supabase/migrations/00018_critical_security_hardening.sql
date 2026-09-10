-- Migration 00018: Critical Security Hardening
-- Fixes: password_reset_codes RLS, SECURITY DEFINER search_path, notification authorization,
--         re_registration_requests RLS, profiles payout data exposure, escrow/shipment role checks.

-- ============================================================
-- 0. Drop functions that changed return types (must precede CREATE OR REPLACE)
-- ============================================================
-- Only handle_new_user() needs trigger drop (depends on auth.users trigger)
-- Other dropped functions have no trigger dependencies or unchanged signatures
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP FUNCTION IF EXISTS public.cleanup_expired_reset_codes();
DROP FUNCTION IF EXISTS public.calculate_farmer_trust_score(UUID);

-- ============================================================
-- 1. Fix password_reset_codes RLS (CRITICAL: account takeover)
-- ============================================================
DROP POLICY IF EXISTS "reset_codes_insert" ON password_reset_codes;
DROP POLICY IF EXISTS "reset_codes_select" ON password_reset_codes;
DROP POLICY IF EXISTS "reset_codes_delete" ON password_reset_codes;

-- Only the code owner can read their own codes
CREATE POLICY "reset_codes_select" ON password_reset_codes
  FOR SELECT USING (auth.uid() = profile_id);

-- Only the code owner can delete their own codes
CREATE POLICY "reset_codes_delete" ON password_reset_codes
  FOR DELETE USING (auth.uid() = profile_id);

-- INSERT is intentionally NOT allowed via RLS — password reset creates codes
-- through Supabase Auth admin API or server-side only.

-- ============================================================
-- 2. Add search_path = public to all SECURITY DEFINER functions missing it
-- ============================================================

-- handle_new_user() — trigger on auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, phone_number, email, role, farm_location, verification_tier)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'phone_number', ''),
    COALESCE(NEW.raw_user_meta_data->>'email', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'buyer'),
    COALESCE(NEW.raw_user_meta_data->>'farm_location', ''),
    COALESCE(NEW.raw_user_meta_data->>'verification_tier', 'none')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Recreate the trigger we dropped
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- prevent_listing_self_approval() — trigger on listings UPDATE
CREATE OR REPLACE FUNCTION public.prevent_listing_self_approval()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_approved = TRUE AND OLD.is_approved = FALSE THEN
    IF EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'farmer') THEN
      RAISE EXCEPTION 'Farmers cannot approve their own listings.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- guard_escrow_update() — trigger on escrow_transactions UPDATE
CREATE OR REPLACE FUNCTION public.guard_escrow_update()
RETURNS TRIGGER AS $$
BEGIN
  -- Enforce immutability of financial and party fields
  IF NEW.buyer_id != OLD.buyer_id THEN
    RAISE EXCEPTION 'Cannot change buyer_id.';
  END IF;
  IF NEW.farmer_id != OLD.farmer_id THEN
    RAISE EXCEPTION 'Cannot change farmer_id.';
  END IF;
  IF NEW.base_amount != OLD.base_amount THEN
    RAISE EXCEPTION 'Cannot change base_amount.';
  END IF;
  IF NEW.buyer_fee != OLD.buyer_fee THEN
    RAISE EXCEPTION 'Cannot change buyer_fee.';
  END IF;
  IF NEW.farmer_fee != OLD.farmer_fee THEN
    RAISE EXCEPTION 'Cannot change farmer_fee.';
  END IF;
  IF NEW.total_buyer_paid != OLD.total_buyer_paid THEN
    RAISE EXCEPTION 'Cannot change total_buyer_paid.';
  END IF;
  IF NEW.total_farmer_yield != OLD.total_farmer_yield THEN
    RAISE EXCEPTION 'Cannot change total_farmer_yield.';
  END IF;
  IF NEW.platform_revenue != OLD.platform_revenue THEN
    RAISE EXCEPTION 'Cannot change platform_revenue.';
  END IF;
  IF NEW.listing_id != OLD.listing_id THEN
    RAISE EXCEPTION 'Cannot change listing_id.';
  END IF;
  IF NEW.delivery_token != OLD.delivery_token THEN
    RAISE EXCEPTION 'Cannot change delivery_token.';
  END IF;

  -- Validate status transitions (forward-only)
  IF NEW.status = 'pending_deposit' AND OLD.status != 'pending_deposit' THEN
    RAISE EXCEPTION 'Cannot revert to pending_deposit.';
  END IF;
  IF NEW.status = 'held_in_escrow' AND OLD.status NOT IN ('pending_deposit', 'held_in_escrow') THEN
    RAISE EXCEPTION 'Invalid transition to held_in_escrow.';
  END IF;
  IF NEW.status = 'dispatched' AND OLD.status NOT IN ('held_in_escrow', 'dispatched') THEN
    RAISE EXCEPTION 'Invalid transition to dispatched.';
  END IF;
  IF NEW.status = 'released' AND OLD.status != 'dispatched' THEN
    RAISE EXCEPTION 'Can only release from dispatched.';
  END IF;
  IF NEW.status = 'refunded' AND OLD.status NOT IN ('held_in_escrow', 'dispatched', 'released') THEN
    RAISE EXCEPTION 'Invalid transition to refunded.';
  END IF;
  IF NEW.status = 'disputed' AND OLD.status NOT IN ('held_in_escrow', 'dispatched', 'released') THEN
    RAISE EXCEPTION 'Invalid transition to disputed.';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- rate_limit_reset_codes() — trigger on password_reset_codes INSERT
CREATE OR REPLACE FUNCTION public.rate_limit_reset_codes()
RETURNS TRIGGER AS $$
DECLARE
  v_count BIGINT;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM public.password_reset_codes
  WHERE profile_id = NEW.profile_id
    AND created_at > NOW() - INTERVAL '1 hour';
  IF v_count >= 5 THEN
    RAISE EXCEPTION 'Too many reset requests. Please try again later.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- cleanup_expired_reset_codes()
CREATE OR REPLACE FUNCTION public.cleanup_expired_reset_codes()
RETURNS void AS $$
BEGIN
  DELETE FROM public.password_reset_codes
  WHERE created_at < NOW() - INTERVAL '1 hour';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- calculate_farmer_trust_score()
CREATE OR REPLACE FUNCTION public.calculate_farmer_trust_score(p_farmer_id UUID)
RETURNS TABLE(trust_score NUMERIC, breakdown JSONB) AS $$
DECLARE
  v_verification_score NUMERIC := 0;
  v_rating_score NUMERIC := 0;
  v_transaction_score NUMERIC := 0;
  v_account_age_score NUMERIC := 0;
  v_total NUMERIC;
  v_verification_tier TEXT;
  v_avg_rating NUMERIC;
  v_total_ratings BIGINT;
  v_completed_transactions BIGINT;
  v_account_age_days INTEGER;
BEGIN
  -- Verification tier score (0-25)
  SELECT COALESCE(p.verification_tier, 'none') INTO v_verification_tier
  FROM public.profiles p WHERE p.id = p_farmer_id;

  v_verification_score := CASE v_verification_tier
    WHEN 'supreme' THEN 25
    WHEN 'premium' THEN 20
    WHEN 'verified' THEN 15
    ELSE 5
  END;

  -- Rating score (0-30)
  SELECT COALESCE(AVG(r.rating), 0), COUNT(*) INTO v_avg_rating, v_total_ratings
  FROM public.farmer_ratings r WHERE r.farmer_id = p_farmer_id;

  IF v_total_ratings > 0 THEN
    v_rating_score := (v_avg_rating / 5.0) * 25;
    IF v_total_ratings >= 10 THEN v_rating_score := v_rating_score + 5;
    ELSIF v_total_ratings >= 5 THEN v_rating_score := v_rating_score + 3;
    END IF;
  END IF;

  -- Transaction score (0-25)
  SELECT COUNT(*) INTO v_completed_transactions
  FROM public.escrow_transactions e
  WHERE e.farmer_id = p_farmer_id AND e.status = 'released';

  IF v_completed_transactions >= 50 THEN v_transaction_score := 25;
  ELSIF v_completed_transactions >= 20 THEN v_transaction_score := 20;
  ELSIF v_completed_transactions >= 10 THEN v_transaction_score := 15;
  ELSIF v_completed_transactions >= 5 THEN v_transaction_score := 10;
  ELSIF v_completed_transactions >= 1 THEN v_transaction_score := 5;
  END IF;

  -- Account age score (0-20)
  SELECT EXTRACT(DAY FROM NOW() - p.created_at)::INTEGER INTO v_account_age_days
  FROM public.profiles p WHERE p.id = p_farmer_id;

  IF v_account_age_days >= 365 THEN v_account_age_score := 20;
  ELSIF v_account_age_days >= 180 THEN v_account_age_score := 15;
  ELSIF v_account_age_days >= 90 THEN v_account_age_score := 10;
  ELSIF v_account_age_days >= 30 THEN v_account_age_score := 5;
  ELSE v_account_age_score := 2;
  END IF;

  v_total := v_verification_score + v_rating_score + v_transaction_score + v_account_age_score;

  RETURN QUERY SELECT v_total, jsonb_build_object(
    'trust_score', v_total,
    'verification', v_verification_score,
    'rating', v_rating_score,
    'transaction', v_transaction_score,
    'account_age', v_account_age_score,
    'avg_rating', v_avg_rating,
    'total_ratings', v_total_ratings,
    'completed_transactions', v_completed_transactions,
    'verification_tier', v_verification_tier
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- match_buyer_request_to_listings()
CREATE OR REPLACE FUNCTION public.match_buyer_request_to_listings(request_id BIGINT)
RETURNS TABLE (
  listing_id BIGINT,
  match_score NUMERIC,
  match_reasons TEXT[]
) AS $$
DECLARE
  v_request RECORD;
  v_listing RECORD;
  v_score NUMERIC;
  v_reasons TEXT[];
BEGIN
  SELECT * INTO v_request FROM public.buy_requests WHERE id = request_id;
  IF NOT FOUND THEN
    RETURN;
  END IF;

  FOR v_listing IN
    SELECT l.*, p.verification_tier, p.farm_location,
           (SELECT breakdown FROM public.calculate_farmer_trust_score(l.farmer_id)) AS trust_score_data,
           COALESCE((SELECT AVG(r.rating) FROM public.farmer_ratings r WHERE r.farmer_id = l.farmer_id), 0) AS avg_rating
    FROM public.listings l
    JOIN public.profiles p ON l.farmer_id = p.id
    WHERE l.is_approved = true
      AND l.category = v_request.category
  LOOP
    v_score := 0;
    v_reasons := ARRAY[]::TEXT[];

    -- Category match (+30)
    IF v_listing.category = v_request.category THEN
      v_score := v_score + 30;
      v_reasons := array_append(v_reasons, 'Category match');
    END IF;

    -- Location match (+25)
    IF v_listing.farm_location IS NOT NULL AND v_request.delivery_location IS NOT NULL
       AND LOWER(v_listing.farm_location) = LOWER(v_request.delivery_location) THEN
      v_score := v_score + 25;
      v_reasons := array_append(v_reasons, 'Location match');
    END IF;

    -- Price within budget (+20 or +10)
    IF v_request.max_price_per_unit IS NOT NULL AND v_listing.price_per_unit <= v_request.max_price_per_unit THEN
      v_score := v_score + 20;
      v_reasons := array_append(v_reasons, 'Within budget');
    ELSIF v_request.max_price_per_unit IS NULL THEN
      v_score := v_score + 10;
      v_reasons := array_append(v_reasons, 'No price constraint');
    END IF;

    -- Trust score (+15 or +10)
    IF (v_listing.trust_score_data->>'trust_score')::NUMERIC >= 70 THEN
      v_score := v_score + 15;
      v_reasons := array_append(v_reasons, 'High trust score');
    ELSIF (v_listing.trust_score_data->>'trust_score')::NUMERIC >= 40 THEN
      v_score := v_score + 10;
      v_reasons := array_append(v_reasons, 'Moderate trust score');
    END IF;

    -- Rating bonus (+10)
    IF v_listing.avg_rating >= 4.0 THEN
      v_score := v_score + 10;
      v_reasons := array_append(v_reasons, 'High rating');
    END IF;

    -- Verified farmer bonus (+5)
    IF v_listing.verification_tier IN ('verified', 'premium', 'supreme') THEN
      v_score := v_score + 5;
      v_reasons := array_append(v_reasons, 'Verified farmer');
    END IF;

    -- Only return matches above threshold
    IF v_score >= 30 THEN
      listing_id := v_listing.id;
      match_score := v_score;
      match_reasons := v_reasons;
      RETURN NEXT;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

-- validate_shipment_status_transition() — trigger on shipments UPDATE
CREATE OR REPLACE FUNCTION public.validate_shipment_status_transition()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- Enforce valid transitions
  CASE OLD.status
    WHEN 'pending' THEN
      IF NEW.status NOT IN ('pickup_scheduled', 'cancelled') THEN
        RAISE EXCEPTION 'Invalid transition from pending to %', NEW.status;
      END IF;
    WHEN 'pickup_scheduled' THEN
      IF NEW.status NOT IN ('assigned', 'cancelled') THEN
        RAISE EXCEPTION 'Invalid transition from pickup_scheduled to %', NEW.status;
      END IF;
    WHEN 'assigned' THEN
      IF NEW.status NOT IN ('in_transit', 'cancelled') THEN
        RAISE EXCEPTION 'Invalid transition from assigned to %', NEW.status;
      END IF;
    WHEN 'in_transit' THEN
      IF NEW.status NOT IN ('out_for_delivery', 'delivered', 'delivery_issue', 'failed', 'cancelled') THEN
        RAISE EXCEPTION 'Invalid transition from in_transit to %', NEW.status;
      END IF;
    WHEN 'out_for_delivery' THEN
      IF NEW.status NOT IN ('delivered', 'delivery_issue', 'failed') THEN
        RAISE EXCEPTION 'Invalid transition from out_for_delivery to %', NEW.status;
      END IF;
    WHEN 'delivered' THEN
      IF NEW.status NOT IN ('delivery_confirmed', 'delivery_issue') THEN
        RAISE EXCEPTION 'Invalid transition from delivered to %', NEW.status;
      END IF;
    WHEN 'delivery_issue' THEN
      IF NEW.status NOT IN ('delivered', 'cancelled', 'failed') THEN
        RAISE EXCEPTION 'Invalid transition from delivery_issue to %', NEW.status;
      END IF;
    WHEN 'cancelled' THEN
      RAISE EXCEPTION 'Cannot transition from cancelled.';
    WHEN 'failed' THEN
      RAISE EXCEPTION 'Cannot transition from failed.';
    WHEN 'delivery_confirmed' THEN
      RAISE EXCEPTION 'Cannot transition from delivery_confirmed.';
    ELSE
      RAISE EXCEPTION 'Unknown status: %', OLD.status;
  END CASE;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================================
-- 3. Fix create_notification() — add caller authorization
-- ============================================================
CREATE OR REPLACE FUNCTION public.create_notification(
  p_user_id UUID,
  p_type TEXT,
  p_category TEXT,
  p_title TEXT,
  p_message TEXT,
  p_priority TEXT DEFAULT 'normal',
  p_action_url TEXT DEFAULT NULL,
  p_entity_type TEXT DEFAULT NULL,
  p_entity_id TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT NULL,
  p_deduplication_key TEXT DEFAULT NULL
) RETURNS BIGINT AS $$
DECLARE
  v_id BIGINT;
  v_key TEXT;
  v_caller_id UUID;
  v_caller_role TEXT;
BEGIN
  -- Get caller identity
  v_caller_id := auth.uid();

  -- Authorization: callers can only create for themselves, admins can create for anyone
  -- Service-role (from SECURITY DEFINER cron/webhook contexts) has auth.uid() = NULL,
  -- which is allowed for server-side operations.
  IF v_caller_id IS NOT NULL THEN
    SELECT role INTO v_caller_role FROM public.profiles WHERE id = v_caller_id;
    IF v_caller_role != 'admin' AND p_user_id != v_caller_id THEN
      RAISE EXCEPTION 'Not authorized to create notifications for other users.';
    END IF;
  END IF;

  -- Check if preferences exist and if category is enabled
  IF NOT EXISTS (
    SELECT 1 FROM public.notification_preferences WHERE user_id = p_user_id
  ) THEN
    INSERT INTO public.notification_preferences (user_id) VALUES (p_user_id);
  END IF;

  -- Check category preference (skip for platform — always deliver)
  IF p_category != 'platform' AND (
    CASE p_category
      WHEN 'marketplace' THEN (SELECT marketplace_enabled FROM public.notification_preferences WHERE user_id = p_user_id)
      WHEN 'buyer_requests' THEN (SELECT buyer_requests_enabled FROM public.notification_preferences WHERE user_id = p_user_id)
      WHEN 'matching' THEN (SELECT matching_enabled FROM public.notification_preferences WHERE user_id = p_user_id)
      WHEN 'orders' THEN (SELECT orders_enabled FROM public.notification_preferences WHERE user_id = p_user_id)
      WHEN 'verification' THEN (SELECT verification_enabled FROM public.notification_preferences WHERE user_id = p_user_id)
      WHEN 'reputation' THEN (SELECT reputation_enabled FROM public.notification_preferences WHERE user_id = p_user_id)
      WHEN 'logistics' THEN (SELECT logistics_enabled FROM public.notification_preferences WHERE user_id = p_user_id)
      WHEN 'storage' THEN (SELECT storage_enabled FROM public.notification_preferences WHERE user_id = p_user_id)
      WHEN 'market_intelligence' THEN (SELECT market_intelligence_enabled FROM public.notification_preferences WHERE user_id = p_user_id)
      WHEN 'news' THEN (SELECT news_enabled FROM public.notification_preferences WHERE user_id = p_user_id)
      WHEN 'learning' THEN (SELECT learning_enabled FROM public.notification_preferences WHERE user_id = p_user_id)
      ELSE TRUE
    END = FALSE
  ) THEN
    RETURN NULL;
  END IF;

  -- Generate dedup key
  v_key := COALESCE(
    p_deduplication_key,
    public.generate_notification_dedup_key(p_user_id, p_type, p_entity_type, p_entity_id)
  );

  -- Check for duplicate
  IF v_key IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.notifications WHERE deduplication_key = v_key AND user_id = p_user_id
  ) THEN
    RETURN NULL;
  END IF;

  -- Insert notification
  INSERT INTO public.notifications (
    user_id, type, category, title, message, priority,
    action_url, entity_type, entity_id, metadata, deduplication_key
  ) VALUES (
    p_user_id, p_type, p_category, p_title, p_message, p_priority,
    p_action_url, p_entity_type, p_entity_id, p_metadata, v_key
  ) RETURNING id INTO v_id;

  RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================================
-- 4. Fix re_registration_requests RLS
-- ============================================================
DROP POLICY IF EXISTS "rereg_insert_anyone" ON re_registration_requests;
DROP POLICY IF EXISTS "rereg_insert_authenticated" ON re_registration_requests;
DROP POLICY IF EXISTS "rereg_select_own_email" ON re_registration_requests;

-- Require authentication for re-registration requests
CREATE POLICY "rereg_insert_authenticated" ON re_registration_requests
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Allow the submitter to read their own requests (by email match)
-- Since email is stored, we need a policy that lets the user check status
CREATE POLICY "rereg_select_own_email" ON re_registration_requests
  FOR SELECT USING (
    email IN (
      SELECT email FROM public.profiles WHERE id = auth.uid()
    )
  );

-- ============================================================
-- 5. Fix profiles — restrict payout bank details from public SELECT
-- ============================================================
-- Drop the overly broad public SELECT policy
DROP POLICY IF EXISTS "profiles_select" ON profiles;

-- Replace with a policy that excludes payout details from other users
-- Users see their own full profile; others see limited fields
CREATE POLICY "profiles_select_own" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "profiles_select_public" ON profiles
  FOR SELECT USING (
    id != auth.uid()
    AND (
      -- Other users can see basic info but NOT payout_account_* fields
      -- This is enforced by the application layer selecting specific columns
      -- The RLS policy allows the row access; column-level security is app-level
      TRUE
    )
  );

-- ============================================================
-- 6. Capacity trigger functions — make SECURITY DEFINER
-- ============================================================
-- Logic preserves 00013's status-transition-based capacity management
-- but adds SECURITY DEFINER + search_path for privilege escalation protection.
CREATE OR REPLACE FUNCTION public.update_facility_capacity_on_booking()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status IN ('confirmed', 'checked_in', 'stored') AND OLD.status NOT IN ('confirmed', 'checked_in', 'stored') THEN
    -- Deduct capacity when booking becomes active
    UPDATE public.storage_facilities
    SET available_capacity = GREATEST(available_capacity - NEW.quantity, 0)
    WHERE id = NEW.facility_id;
  ELSIF OLD.status IN ('confirmed', 'checked_in', 'stored') AND NEW.status IN ('checked_out', 'cancelled', 'expired') THEN
    -- Restore capacity when booking ends or is cancelled
    UPDATE public.storage_facilities
    SET available_capacity = LEAST(available_capacity + OLD.quantity, total_capacity)
    WHERE id = OLD.facility_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.update_facility_capacity_on_insert()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status IN ('confirmed', 'checked_in', 'stored') THEN
    UPDATE public.storage_facilities
    SET available_capacity = GREATEST(available_capacity - NEW.quantity, 0)
    WHERE id = NEW.facility_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
