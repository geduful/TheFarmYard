-- ─────────────────────────────────────────────────────────────
-- SECURITY HARDENING (fix audit findings)
-- 1. Prevent farmers from self-approving / self-promoting listings
-- 2. Lock escrow money fields + enforce valid status transitions
-- 3. Rate-limit password reset codes + validate format
-- 4. Ensure new profiles get correct verification_tier
-- ─────────────────────────────────────────────────────────────

-- 1. Listing self-approval guard --------------------------------
CREATE OR REPLACE FUNCTION public.prevent_listing_self_approval()
RETURNS TRIGGER AS $$
DECLARE
  caller_role TEXT;
BEGIN
  SELECT role INTO caller_role FROM public.profiles WHERE id = auth.uid();
  -- Admins bypass the guard
  IF caller_role = 'admin' THEN
    RETURN NEW;
  END IF;
  IF OLD.is_approved IS DISTINCT FROM NEW.is_approved THEN
    RAISE EXCEPTION 'Only admin can change is_approved';
  END IF;
  IF OLD.is_promoted IS DISTINCT FROM NEW.is_promoted THEN
    RAISE EXCEPTION 'Only admin can change is_promoted';
  END IF;
  IF OLD.promoted_at IS DISTINCT FROM NEW.promoted_at THEN
    RAISE EXCEPTION 'Only admin can change promoted_at';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_prevent_listing_self_approval ON public.listings;
CREATE TRIGGER trg_prevent_listing_self_approval
  BEFORE UPDATE ON public.listings
  FOR EACH ROW EXECUTE FUNCTION public.prevent_listing_self_approval();

-- 2. Escrow immutability + status transition guard ----------------
CREATE OR REPLACE FUNCTION public.guard_escrow_update()
RETURNS TRIGGER AS $$
BEGIN
  -- Money + identity fields are immutable after insert
  IF OLD.base_amount IS DISTINCT FROM NEW.base_amount
    OR OLD.buyer_fee IS DISTINCT FROM NEW.buyer_fee
    OR OLD.farmer_fee IS DISTINCT FROM NEW.farmer_fee
    OR OLD.total_buyer_paid IS DISTINCT FROM NEW.total_buyer_paid
    OR OLD.total_farmer_yield IS DISTINCT FROM NEW.total_farmer_yield
    OR OLD.platform_revenue IS DISTINCT FROM NEW.platform_revenue
    OR OLD.buyer_id IS DISTINCT FROM NEW.buyer_id
    OR OLD.farmer_id IS DISTINCT FROM NEW.farmer_id
    OR OLD.listing_id IS DISTINCT FROM NEW.listing_id
    OR OLD.delivery_token IS DISTINCT FROM NEW.delivery_token THEN
    RAISE EXCEPTION 'Escrow amounts, parties and delivery token are immutable';
  END IF;

  -- Valid forward transitions only:
  -- pending_deposit -> held_in_escrow -> dispatched -> released
  -- any -> disputed / refunded (admin / dispute flow)
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    IF OLD.status = 'held_in_escrow' AND NEW.status NOT IN ('dispatched', 'disputed', 'refunded') THEN
      RAISE EXCEPTION 'Invalid escrow transition % -> %', OLD.status, NEW.status;
    ELSIF OLD.status = 'dispatched' AND NEW.status NOT IN ('released', 'disputed', 'refunded') THEN
      RAISE EXCEPTION 'Invalid escrow transition % -> %', OLD.status, NEW.status;
    ELSIF OLD.status IN ('released', 'refunded') THEN
      RAISE EXCEPTION 'Terminal escrow state % cannot change', OLD.status;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_guard_escrow_update ON public.escrow_transactions;
CREATE TRIGGER trg_guard_escrow_update
  BEFORE UPDATE ON public.escrow_transactions
  FOR EACH ROW EXECUTE FUNCTION public.guard_escrow_update();

-- 3. Password reset hardening ------------------------------------
-- Validate 4-digit format
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'password_reset_codes_code_format'
  ) THEN
    ALTER TABLE public.password_reset_codes
      ADD CONSTRAINT password_reset_codes_code_format CHECK (code ~ '^[0-9]{4}$');
  END IF;
END $$;

-- Rate-limit: max 3 codes per profile per 10 minutes
CREATE OR REPLACE FUNCTION public.rate_limit_reset_codes()
RETURNS TRIGGER AS $$
DECLARE
  recent_count INT;
BEGIN
  SELECT COUNT(*) INTO recent_count
  FROM public.password_reset_codes
  WHERE profile_id = NEW.profile_id
    AND created_at > NOW() - INTERVAL '10 minutes';
  IF recent_count >= 3 THEN
    RAISE EXCEPTION 'Too many reset attempts. Try again later.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_rate_limit_reset_codes ON public.password_reset_codes;
CREATE TRIGGER trg_rate_limit_reset_codes
  BEFORE INSERT ON public.password_reset_codes
  FOR EACH ROW EXECUTE FUNCTION public.rate_limit_reset_codes();

CREATE INDEX IF NOT EXISTS idx_reset_codes_profile_expires
  ON public.password_reset_codes (profile_id, expires_at);

-- Cleanup helper for expired codes (call via cron)
CREATE OR REPLACE FUNCTION public.cleanup_expired_reset_codes()
RETURNS INT AS $$
DECLARE
  deleted_count INT;
BEGIN
  DELETE FROM public.password_reset_codes WHERE expires_at < NOW();
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. New profiles get correct tier --------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name, phone_number, email, role, farm_location, verification_tier)
    VALUES (
        NEW.id,
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'phone_number',
        NEW.email,
        NEW.raw_user_meta_data->>'role',
        NEW.raw_user_meta_data->>'farm_location',
        CASE WHEN NEW.raw_user_meta_data->>'role' = 'admin' THEN 'supreme' ELSE 'none' END
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
