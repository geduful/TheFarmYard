-- ─────────────────────────────────────────────────────────────
-- REPORTS TABLE
-- Any user can report an issue directly to the admin.
-- Categories: fraud | account_issue | listing_issue | delivery_issue | other
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reports (
    id BIGSERIAL PRIMARY KEY,
    reporter_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    -- Optional: link to a specific transaction
    transaction_id BIGINT REFERENCES escrow_transactions(id) ON DELETE SET NULL,
    -- Optional: link to a specific user being reported
    reported_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    category TEXT CHECK (category IN ('fraud', 'account_issue', 'listing_issue', 'delivery_issue', 'other')) NOT NULL,
    subject TEXT NOT NULL,
    description TEXT NOT NULL,
    status TEXT CHECK (status IN ('open', 'under_review', 'resolved', 'dismissed')) DEFAULT 'open',
    admin_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    reviewer_id UUID REFERENCES profiles(id)
);

ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- Users can read & insert their own reports
DROP POLICY IF EXISTS "reports_select_own" ON reports;
CREATE POLICY "reports_select_own" ON reports FOR SELECT USING (auth.uid() = reporter_id);
DROP POLICY IF EXISTS "reports_insert_own" ON reports;
CREATE POLICY "reports_insert_own" ON reports FOR INSERT WITH CHECK (auth.uid() = reporter_id);

-- Admin can read and update all reports
DROP POLICY IF EXISTS "reports_select_admin" ON reports;
CREATE POLICY "reports_select_admin" ON reports FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
DROP POLICY IF EXISTS "reports_update_admin" ON reports;
CREATE POLICY "reports_update_admin" ON reports FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- ─────────────────────────────────────────────────────────────
-- FARMER RATINGS TABLE
-- Buyers rate a farmer once per released transaction.
-- Rating: 1–5 stars + optional comment.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS farmer_ratings (
    id BIGSERIAL PRIMARY KEY,
    farmer_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    buyer_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    transaction_id BIGINT REFERENCES escrow_transactions(id) ON DELETE CASCADE NOT NULL,
    rating INT CHECK (rating BETWEEN 1 AND 5) NOT NULL,
    comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    -- One rating per transaction
    UNIQUE (buyer_id, transaction_id)
);

ALTER TABLE farmer_ratings ENABLE ROW LEVEL SECURITY;

-- Anyone can read ratings (shown publicly on farmer profile)
DROP POLICY IF EXISTS "ratings_select_all" ON farmer_ratings;
CREATE POLICY "ratings_select_all" ON farmer_ratings FOR SELECT USING (true);
-- Only the buyer of that transaction can insert
DROP POLICY IF EXISTS "ratings_insert_own" ON farmer_ratings;
CREATE POLICY "ratings_insert_own" ON farmer_ratings FOR INSERT WITH CHECK (auth.uid() = buyer_id);
