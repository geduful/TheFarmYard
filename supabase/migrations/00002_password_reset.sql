-- Add email column to profiles for lookup
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email TEXT;

-- Backfill email for existing profiles from auth.users
UPDATE profiles
SET email = au.email
FROM auth.users au
WHERE profiles.id = au.id
  AND profiles.email IS NULL;

-- Update trigger to store email on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name, phone_number, email, role, farm_location)
    VALUES (
        NEW.id,
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'phone_number',
        NEW.email,
        NEW.raw_user_meta_data->>'role',
        NEW.raw_user_meta_data->>'farm_location'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Password reset codes table
CREATE TABLE IF NOT EXISTS password_reset_codes (
    id BIGSERIAL PRIMARY KEY,
    profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    code TEXT NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

ALTER TABLE password_reset_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reset_codes_insert" ON password_reset_codes
    FOR INSERT WITH CHECK (true);

CREATE POLICY "reset_codes_select" ON password_reset_codes
    FOR SELECT USING (true);

CREATE POLICY "reset_codes_delete" ON password_reset_codes
    FOR DELETE USING (true);
