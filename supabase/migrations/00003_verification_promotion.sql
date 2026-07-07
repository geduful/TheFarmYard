-- Add promotion columns to listings
ALTER TABLE listings ADD COLUMN IF NOT EXISTS is_promoted BOOLEAN DEFAULT false;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS promoted_at TIMESTAMP WITH TIME ZONE;

-- Verification requests table
CREATE TABLE IF NOT EXISTS verification_requests (
    id BIGSERIAL PRIMARY KEY,
    profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    document_urls JSONB NOT NULL DEFAULT '[]',
    status TEXT CHECK (status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    reviewer_id UUID REFERENCES profiles(id)
);

ALTER TABLE verification_requests ENABLE ROW LEVEL SECURITY;

-- Users can read their own requests
CREATE POLICY "vr_select_own" ON verification_requests FOR SELECT USING (auth.uid() = profile_id);
-- Users can insert their own
CREATE POLICY "vr_insert_own" ON verification_requests FOR INSERT WITH CHECK (auth.uid() = profile_id);
-- Users can update their own (cancel)
CREATE POLICY "vr_update_own" ON verification_requests FOR UPDATE USING (auth.uid() = profile_id);

-- Admin policies
CREATE POLICY "vr_select_admin" ON verification_requests FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "vr_update_admin" ON verification_requests FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Listing RLS: add admin update policy for promotion
CREATE POLICY "listings_update_admin" ON listings FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
-- Listing RLS: admin can read all (including unapproved)
CREATE POLICY "listings_select_admin" ON listings FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
