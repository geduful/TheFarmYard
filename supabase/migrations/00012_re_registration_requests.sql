-- Migration 00012: Re-Registration Requests — let deleted/blocked users request to rejoin

-- 1. Re-registration requests table
CREATE TABLE IF NOT EXISTS re_registration_requests (
  id BIGSERIAL PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  role TEXT CHECK (role IN ('farmer', 'buyer')) NOT NULL,
  farm_location TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  reviewed_at TIMESTAMPTZ,
  reviewer_id UUID REFERENCES profiles(id) ON DELETE SET NULL
);

-- 2. Indexes
CREATE INDEX IF NOT EXISTS idx_rereg_status ON re_registration_requests(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rereg_email ON re_registration_requests(email);

-- 3. RLS policies
ALTER TABLE re_registration_requests ENABLE ROW LEVEL SECURITY;

-- Anyone can insert (unauthenticated users submitting requests)
DROP POLICY IF EXISTS "rereg_insert_anyone" ON re_registration_requests;
CREATE POLICY "rereg_insert_anyone"
  ON re_registration_requests FOR INSERT
  WITH CHECK (true);

-- Admin can do everything
DROP POLICY IF EXISTS "rereg_admin_all" ON re_registration_requests;
CREATE POLICY "rereg_admin_all"
  ON re_registration_requests FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );
