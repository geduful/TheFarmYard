-- Migration 00009: Enhanced Marketplace, Buyer Requests, Smart Matching, Trust Score

-- ============================================================
-- 1. Enhance listings table with new marketplace fields
-- ============================================================
ALTER TABLE listings
  ADD COLUMN IF NOT EXISTS price_unit TEXT DEFAULT 'unit',
  ADD COLUMN IF NOT EXISTS location TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS quality_grade TEXT,
  ADD COLUMN IF NOT EXISTS availability TEXT DEFAULT 'In Stock',
  ADD COLUMN IF NOT EXISTS minimum_order TEXT,
  ADD COLUMN IF NOT EXISTS harvest_date DATE;

-- Backfill location from farmer profile
UPDATE listings l
SET location = p.farm_location
FROM profiles p
WHERE l.farmer_id = p.id AND (l.location IS NULL OR l.location = '');

-- ============================================================
-- 2. Enhance buy_requests table
-- ============================================================
ALTER TABLE buy_requests
  ADD COLUMN IF NOT EXISTS price_unit TEXT DEFAULT 'unit',
  ADD COLUMN IF NOT EXISTS max_price_per_unit NUMERIC,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'open'
    CHECK (status IN ('open', 'matched', 'fulfilled', 'expired', 'cancelled'));

-- ============================================================
-- 3. Create farmer_trust_scores materialized view for fast reads
-- ============================================================
CREATE OR REPLACE FUNCTION calculate_farmer_trust_score(farmer UUID)
RETURNS NUMERIC AS $$
DECLARE
  v_score NUMERIC := 0;
  v_avg_rating NUMERIC;
  v_rating_count INT;
  v_tx_count INT;
  v_listing_count INT;
  v_tier TEXT;
  v_account_age_days INT;
  v_tier_score NUMERIC;
  v_rating_score NUMERIC;
  v_tx_score NUMERIC;
  v_listing_score NUMERIC;
  v_age_score NUMERIC;
BEGIN
  -- Verification tier score (0-30)
  SELECT verification_tier INTO v_tier FROM profiles WHERE id = farmer;
  v_tier_score := CASE v_tier
    WHEN 'supreme' THEN 30
    WHEN 'premium' THEN 25
    WHEN 'verified' THEN 18
    ELSE 5
  END;

  -- Average rating score (0-25)
  SELECT COALESCE(AVG(rating), 0), COUNT(*)
  INTO v_avg_rating, v_rating_count
  FROM farmer_ratings WHERE farmer_id = farmer;

  IF v_rating_count > 0 THEN
    v_rating_score := (v_avg_rating / 5.0) * 20 + LEAST(v_rating_count, 10) * 0.5;
  ELSE
    v_rating_score := 0;
  END IF;

  -- Completed transactions score (0-20)
  SELECT COUNT(*) INTO v_tx_count
  FROM escrow_transactions
  WHERE farmer_id = farmer AND status = 'released';

  v_tx_score := LEAST(v_tx_count * 2, 20);

  -- Listing quality score (0-15)
  SELECT COUNT(*) INTO v_listing_count
  FROM listings
  WHERE farmer_id = farmer AND is_approved = true;

  v_listing_score := LEAST(v_listing_count * 3, 15);

  -- Account age score (0-10)
  SELECT EXTRACT(DAY FROM NOW() - created_at)::INT INTO v_account_age_days
  FROM profiles WHERE id = farmer;

  v_age_score := LEAST(v_account_age_days / 30.0, 10);

  -- Total score
  v_score := v_tier_score + v_rating_score + v_tx_score + v_listing_score + v_age_score;

  RETURN ROUND(LEAST(GREATEST(v_score, 0), 100), 1);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ============================================================
-- 4. Smart matching function
-- ============================================================
CREATE OR REPLACE FUNCTION match_buyer_request_to_listings(request_id BIGINT)
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
  SELECT * INTO v_request FROM buy_requests WHERE id = request_id;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  FOR v_listing IN
    SELECT l.*, p.verification_tier, p.farm_location,
           calculate_farmer_trust_score(l.farmer_id) AS trust_score,
           COALESCE((SELECT AVG(r.rating) FROM farmer_ratings r WHERE r.farmer_id = l.farmer_id), 0) AS avg_rating
    FROM listings l
    JOIN profiles p ON l.farmer_id = p.id
    WHERE l.is_approved = true
      AND l.category = v_request.category
  LOOP
    v_score := 0;
    v_reasons := ARRAY[]::TEXT[];

    -- Category match (exact, always true here due to WHERE clause)
    v_score := v_score + 30;
    v_reasons := array_append(v_reasons, 'Category match');

    -- Location match
    IF v_listing.farm_location ILIKE '%' || v_request.delivery_location || '%'
       OR v_request.delivery_location ILIKE '%' || v_listing.farm_location || '%' THEN
      v_score := v_score + 25;
      v_reasons := array_append(v_reasons, 'Location match');
    END IF;

    -- Price within budget
    IF v_request.max_price_per_unit IS NOT NULL
       AND v_listing.price_per_unit <= v_request.max_price_per_unit THEN
      v_score := v_score + 20;
      v_reasons := array_append(v_reasons, 'Within budget');
    ELSIF v_request.max_price_per_unit IS NULL THEN
      v_score := v_score + 10;
      v_reasons := array_append(v_reasons, 'No price constraint');
    END IF;

    -- Trust score
    IF v_listing.trust_score >= 70 THEN
      v_score := v_score + 15;
      v_reasons := array_append(v_reasons, 'High trust (' || v_listing.trust_score || '/100)');
    ELSIF v_listing.trust_score >= 40 THEN
      v_score := v_score + 10;
      v_reasons := array_append(v_reasons, 'Moderate trust (' || v_listing.trust_score || '/100)');
    END IF;

    -- Rating bonus
    IF v_listing.avg_rating >= 4.0 THEN
      v_score := v_score + 10;
      v_reasons := array_append(v_reasons, 'Top rated (' || ROUND(v_listing.avg_rating, 1) || '/5)');
    END IF;

    -- Verified farmer bonus
    IF v_listing.verification_tier IN ('verified', 'premium', 'supreme') THEN
      v_score := v_score + 5;
      v_reasons := array_append(v_reasons, 'Verified farmer');
    END IF;

    -- Return if score meets threshold
    IF v_score >= 30 THEN
      listing_id := v_listing.id;
      match_score := v_score;
      match_reasons := v_reasons;
      RETURN NEXT;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ============================================================
-- 5. RLS Policies for enhanced buy_requests
-- ============================================================
-- Buyers can see all open requests (for the marketplace view)
DROP POLICY IF EXISTS "Buy requests are viewable by everyone" ON buy_requests;
CREATE POLICY "Buy requests are viewable by everyone"
  ON buy_requests FOR SELECT
  USING (status = 'open' OR buyer_id = auth.uid());

-- Buyers can insert their own requests
-- (existing INSERT policy already allows this)

-- Farmers can view all open requests to find opportunities
-- (existing SELECT policy allows this since status='open' OR buyer_id=auth.uid())

-- ============================================================
-- 6. Indexes for performance
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_listings_category_location ON listings(category, location);
CREATE INDEX IF NOT EXISTS idx_listings_price_unit ON listings(price_per_unit, price_unit);
CREATE INDEX IF NOT EXISTS idx_listings_trust ON listings(is_approved, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_buy_requests_status ON buy_requests(status, category);
CREATE INDEX IF NOT EXISTS idx_buy_requests_location ON buy_requests(delivery_location, category);
CREATE INDEX IF NOT EXISTS idx_farmer_ratings_farmer ON farmer_ratings(farmer_id, rating);
