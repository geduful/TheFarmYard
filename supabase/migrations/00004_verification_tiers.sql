-- ─────────────────────────────────────────────
-- VERIFICATION TIER SYSTEM
-- Tiers: 'none' | 'verified' | 'premium' | 'supreme'
-- Supreme is reserved for admins only — assigned automatically, never requestable.
-- Verified is granted by admin reviewing ID documents.
-- Premium is earned by verified users who meet activity standards.
-- ─────────────────────────────────────────────

-- 1. Add verification_tier column to profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS verification_tier TEXT
  CHECK (verification_tier IN ('none', 'verified', 'premium', 'supreme'))
  DEFAULT 'none';

-- 2. Back-fill: admins get supreme, already-verified users get verified
UPDATE profiles SET verification_tier = 'supreme' WHERE role = 'admin';
UPDATE profiles SET verification_tier = 'verified' WHERE is_verified = true AND role != 'admin';

-- 3. Premium verification requests table
--    Only users who are already verified (tier = 'verified') can submit one.
CREATE TABLE IF NOT EXISTS premium_verification_requests (
    id BIGSERIAL PRIMARY KEY,
    profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    -- Snapshot of eligibility metrics at time of request
    listing_count INT NOT NULL DEFAULT 0,
    transaction_count INT NOT NULL DEFAULT 0,
    account_age_days INT NOT NULL DEFAULT 0,
    -- Optional message from the user
    message TEXT,
    status TEXT CHECK (status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
    rejection_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    reviewer_id UUID REFERENCES profiles(id)
);

ALTER TABLE premium_verification_requests ENABLE ROW LEVEL SECURITY;

-- Users: read & insert their own requests
DROP POLICY IF EXISTS "pvr_select_own" ON premium_verification_requests;
CREATE POLICY "pvr_select_own" ON premium_verification_requests
  FOR SELECT USING (auth.uid() = profile_id);

DROP POLICY IF EXISTS "pvr_insert_own" ON premium_verification_requests;
CREATE POLICY "pvr_insert_own" ON premium_verification_requests
  FOR INSERT WITH CHECK (auth.uid() = profile_id);

-- Admin: read & update all premium requests
DROP POLICY IF EXISTS "pvr_select_admin" ON premium_verification_requests;
CREATE POLICY "pvr_select_admin" ON premium_verification_requests
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "pvr_update_admin" ON premium_verification_requests;
CREATE POLICY "pvr_update_admin" ON premium_verification_requests
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- 4. Allow admin to update verification_tier on any profile
DROP POLICY IF EXISTS "profiles_update_admin_tier" ON profiles;
CREATE POLICY "profiles_update_admin_tier" ON profiles
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );
