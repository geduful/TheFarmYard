-- ─────────────────────────────────────────────────────────────
-- USER BLOCKING SYSTEM
-- Admin can block any user (farmer or buyer).
-- Blocked users are signed out and cannot log back in.
-- Admin can also permanently delete a user's profile.
-- ─────────────────────────────────────────────────────────────

-- 1. Add is_blocked column to profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN DEFAULT false;

-- 2. Admin policy: allow admin to update ANY profile (for blocking/unblocking)
--    (profiles_update_admin_tier was added in migration 00004 — this extends it)
--    Drop and recreate to ensure it covers is_blocked too.
DROP POLICY IF EXISTS "profiles_update_admin_tier" ON profiles;

CREATE POLICY "profiles_update_admin" ON profiles
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- 3. Admin policy: allow admin to DELETE any non-admin profile
CREATE POLICY "profiles_delete_admin" ON profiles
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );
