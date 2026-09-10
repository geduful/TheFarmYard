-- Migration 00020: Performance Indexes & Query Optimization
-- Adds missing indexes for frequently queried columns.

-- ============================================================
-- 1. profiles — most queried table, missing role/status indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles (role);
CREATE INDEX IF NOT EXISTS idx_profiles_is_verified ON profiles (is_verified);
CREATE INDEX IF NOT EXISTS idx_profiles_is_blocked ON profiles (is_blocked);
CREATE INDEX IF NOT EXISTS idx_profiles_created_at ON profiles (created_at DESC);

-- ============================================================
-- 2. verification_requests — admin filters by status + sorts by created_at
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_vr_profile_id ON verification_requests (profile_id);
CREATE INDEX IF NOT EXISTS idx_vr_status_created ON verification_requests (status, created_at DESC);

-- ============================================================
-- 3. premium_verification_requests — same pattern as verification_requests
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_pvr_profile_id ON premium_verification_requests (profile_id);
CREATE INDEX IF NOT EXISTS idx_pvr_status_created ON premium_verification_requests (status, created_at DESC);

-- ============================================================
-- 4. reports — admin filters by status + sorts by created_at
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_reports_status_created ON reports (status, created_at DESC);

-- ============================================================
-- 5. storage_bookings — farmer dashboard + admin filtering
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_sb_farmer_id ON storage_bookings (farmer_id);
CREATE INDEX IF NOT EXISTS idx_sb_facility_id ON storage_bookings (facility_id);
CREATE INDEX IF NOT EXISTS idx_sb_status_created ON storage_bookings (status, created_at DESC);

-- ============================================================
-- 6. storage_facilities — admin sorts by created_at
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_sf_created_at ON storage_facilities (created_at DESC);

-- ============================================================
-- 7. escrow_transactions — farmer/buyer dashboard queries
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_escrow_farmer_id ON escrow_transactions (farmer_id, status);
CREATE INDEX IF NOT EXISTS idx_escrow_buyer_id ON escrow_transactions (buyer_id, status);
CREATE INDEX IF NOT EXISTS idx_escrow_created_at ON escrow_transactions (created_at DESC);

-- ============================================================
-- 8. listings — farmer's own listings query
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_listings_farmer_id ON listings (farmer_id);

-- ============================================================
-- 9. buy_requests — farmer views open requests
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_br_buyer_id ON buy_requests (buyer_id);

-- ============================================================
-- 10. farmer_ratings — lookup by farmer
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_fr_farmer_id ON farmer_ratings (farmer_id);

-- ============================================================
-- 11. learning_categories — sorted by display_order
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_lc_display_order ON learning_categories (display_order);
