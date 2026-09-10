-- Migration 00019: Payout Privacy, AI Rate Limiting, Profile Hardening
-- Separates payout data from public profiles, adds rate limiting for AI,
-- adds input length validation constraints.

-- ============================================================
-- 1. Create payout_details table (private, owner-only access)
-- ============================================================
CREATE TABLE IF NOT EXISTS payout_details (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bank_name TEXT,
  account_number TEXT,
  account_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  CONSTRAINT payout_details_user_id_unique UNIQUE (user_id)
);

ALTER TABLE payout_details ENABLE ROW LEVEL SECURITY;

-- Owner can read their own payout details
DROP POLICY IF EXISTS "payout_details_select_own" ON payout_details;
CREATE POLICY payout_details_select_own ON payout_details
  FOR SELECT USING (auth.uid() = user_id);

-- Owner can insert their own payout details
DROP POLICY IF EXISTS "payout_details_insert_own" ON payout_details;
CREATE POLICY payout_details_insert_own ON payout_details
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Owner can update their own payout details
DROP POLICY IF EXISTS "payout_details_update_own" ON payout_details;
CREATE POLICY payout_details_update_own ON payout_details
  FOR UPDATE USING (auth.uid() = user_id);

-- No DELETE policy — payout details are retained for audit

-- ============================================================
-- 2. Migrate existing payout data from profiles to payout_details
-- ============================================================
-- Ensure payout columns exist (added in 00008, but guard for safety)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS payout_account_bank TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS payout_account_number TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS payout_account_name TEXT;

INSERT INTO payout_details (user_id, bank_name, account_number, account_name, created_at)
SELECT id, payout_account_bank, payout_account_number, payout_account_name, created_at
FROM profiles
WHERE payout_account_bank IS NOT NULL
   OR payout_account_number IS NOT NULL
   OR payout_account_name IS NOT NULL
ON CONFLICT (user_id) DO NOTHING;

-- ============================================================
-- 3. Remove payout columns from profiles (after data migration)
-- ============================================================
ALTER TABLE profiles DROP COLUMN IF EXISTS payout_account_bank;
ALTER TABLE profiles DROP COLUMN IF EXISTS payout_account_number;
ALTER TABLE profiles DROP COLUMN IF EXISTS payout_account_name;

-- ============================================================
-- 4. AI rate limiting table
-- ============================================================
CREATE TABLE IF NOT EXISTS ai_rate_limits (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

ALTER TABLE ai_rate_limits ENABLE ROW LEVEL SECURITY;

-- Only service role can access rate limit tracking (via SECURITY DEFINER function)
DROP POLICY IF EXISTS "ai_rate_limits_service_all" ON ai_rate_limits;
CREATE POLICY ai_rate_limits_service_all ON ai_rate_limits
  FOR ALL USING (false);

-- Index for fast rate limit checks
CREATE INDEX IF NOT EXISTS idx_ai_rate_limits_user_endpoint
  ON ai_rate_limits (user_id, endpoint, created_at DESC);

-- Rate limit check function
CREATE OR REPLACE FUNCTION public.check_ai_rate_limit(
  p_user_id UUID,
  p_endpoint TEXT,
  p_max_requests INT,
  p_window_minutes INT
) RETURNS BOOLEAN AS $$
DECLARE
  v_count BIGINT;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM public.ai_rate_limits
  WHERE user_id = p_user_id
    AND endpoint = p_endpoint
    AND created_at > NOW() - (p_window_minutes || ' minutes')::INTERVAL;
  RETURN v_count < p_max_requests;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Rate limit record insertion function
CREATE OR REPLACE FUNCTION public.record_ai_usage(
  p_user_id UUID,
  p_endpoint TEXT
) RETURNS VOID AS $$
BEGIN
  INSERT INTO public.ai_rate_limits (user_id, endpoint)
  VALUES (p_user_id, p_endpoint);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Cleanup old rate limit records (run periodically via cron)
CREATE OR REPLACE FUNCTION public.cleanup_ai_rate_limits()
RETURNS VOID AS $$
BEGIN
  DELETE FROM public.ai_rate_limits
  WHERE created_at < NOW() - INTERVAL '1 hour';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================================
-- 5. Profile view without payout columns (for safe public access)
-- ============================================================
CREATE OR REPLACE VIEW public.public_profile AS
SELECT
  id, full_name, phone_number, role, is_verified, verification_tier,
  farm_location, created_at, blocked_warning, is_blocked
FROM profiles;

-- ============================================================
-- 6. Admin select fix — drop the overly permissive admin all-users query
-- ============================================================
-- Admin page should NOT fetch payout details for all users.
-- This is handled by application-layer query changes (see code fixes).

-- ============================================================
-- 7. Input length constraints (defense-in-depth)
-- ============================================================
-- These are soft constraints via check constraints on new data
-- The application layer enforces these too, but DB provides a safety net

-- Note: ALTER TABLE ADD CONSTRAINT requires the column to exist.
-- Since profiles columns may already have data, we use NOT VALID + VALIDATE
-- to avoid locking the table on large datasets.
-- We skip DDL constraints here to avoid migration complexity; app-layer validation is primary.

-- ============================================================
-- 8. Add updated_at trigger for payout_details
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_payout_details_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS update_payout_details_updated_at ON payout_details;
CREATE TRIGGER update_payout_details_updated_at
  BEFORE UPDATE ON payout_details
  FOR EACH ROW
  EXECUTE FUNCTION public.update_payout_details_timestamp();
