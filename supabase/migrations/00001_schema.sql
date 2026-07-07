-- ENABLE UUID EXTENSION
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. PROFILES TABLE (Role management and security verification)
CREATE TABLE profiles (
    id UUID REFERENCES auth.users NOT NULL PRIMARY KEY,
    full_name TEXT NOT NULL,
    phone_number TEXT NOT NULL,
    role TEXT CHECK (role IN ('farmer', 'buyer', 'admin')) NOT NULL,
    is_verified BOOLEAN DEFAULT false,
    farm_location TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 2. LISTINGS TABLE (Universal agricultural marketplace items)
CREATE TABLE listings (
    id BIGSERIAL PRIMARY KEY,
    farmer_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    category TEXT CHECK (category IN ('Crops & Grains', 'Livestock', 'Poultry', 'Aquaculture', 'Other')) NOT NULL,
    quantity_available TEXT NOT NULL,
    price_per_unit NUMERIC NOT NULL,
    image_url TEXT NOT NULL,
    description TEXT,
    is_approved BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 3. BUY_REQUESTS TABLE (The Reverse Marketplace Engine)
CREATE TABLE buy_requests (
    id BIGSERIAL PRIMARY KEY,
    buyer_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    commodity_title TEXT NOT NULL,
    category TEXT CHECK (category IN ('Crops & Grains', 'Livestock', 'Poultry', 'Aquaculture', 'Other')) NOT NULL,
    quantity_required TEXT NOT NULL,
    delivery_location TEXT NOT NULL,
    deadline DATE NOT NULL,
    additional_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 4. ESCROW_TRANSACTIONS TABLE (The Monetized Safe Wallet Engine)
CREATE TABLE escrow_transactions (
    id BIGSERIAL PRIMARY KEY,
    listing_id INT REFERENCES listings(id) ON DELETE SET NULL,
    buyer_id UUID REFERENCES profiles(id) NOT NULL,
    farmer_id UUID REFERENCES profiles(id) NOT NULL,

    -- Exact Monetization Math Logs
    base_amount NUMERIC NOT NULL,
    buyer_fee NUMERIC NOT NULL,
    farmer_fee NUMERIC NOT NULL,
    total_buyer_paid NUMERIC NOT NULL,
    total_farmer_yield NUMERIC NOT NULL,
    platform_revenue NUMERIC NOT NULL,

    status TEXT CHECK (status IN ('pending_deposit', 'held_in_escrow', 'dispatched', 'released', 'disputed', 'refunded')) DEFAULT 'pending_deposit',
    delivery_token TEXT NOT NULL,

    -- Real-World Offline Driver Metadata
    vehicle_license_plate TEXT,
    driver_phone_number TEXT,
    waybill_receipt_url TEXT,

    dispatched_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE buy_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE escrow_transactions ENABLE ROW LEVEL SECURITY;

-- Profiles: users can read all profiles, insert their own, update their own
CREATE POLICY "profiles_select" ON profiles FOR SELECT USING (true);
CREATE POLICY "profiles_insert" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Listings: anyone can read approved listings, farmers manage their own
CREATE POLICY "listings_select_approved" ON listings FOR SELECT USING (is_approved = true);
CREATE POLICY "listings_select_own" ON listings FOR SELECT USING (auth.uid() = farmer_id);
CREATE POLICY "listings_insert" ON listings FOR INSERT WITH CHECK (auth.uid() = farmer_id);
CREATE POLICY "listings_update" ON listings FOR UPDATE USING (auth.uid() = farmer_id);
CREATE POLICY "listings_delete" ON listings FOR DELETE USING (auth.uid() = farmer_id);

-- Buy Requests: anyone can read, buyers manage their own
CREATE POLICY "buy_requests_select" ON buy_requests FOR SELECT USING (true);
CREATE POLICY "buy_requests_insert" ON buy_requests FOR INSERT WITH CHECK (auth.uid() = buyer_id);
CREATE POLICY "buy_requests_update" ON buy_requests FOR UPDATE USING (auth.uid() = buyer_id);
CREATE POLICY "buy_requests_delete" ON buy_requests FOR DELETE USING (auth.uid() = buyer_id);

-- Escrow Transactions: participants can read their own
CREATE POLICY "escrow_select_participant" ON escrow_transactions FOR SELECT USING (auth.uid() = buyer_id OR auth.uid() = farmer_id);
CREATE POLICY "escrow_insert" ON escrow_transactions FOR INSERT WITH CHECK (auth.uid() = buyer_id);
CREATE POLICY "escrow_update" ON escrow_transactions FOR UPDATE USING (auth.uid() = buyer_id OR auth.uid() = farmer_id);

-- Function to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name, phone_number, role, farm_location)
    VALUES (
        NEW.id,
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'phone_number',
        NEW.raw_user_meta_data->>'role',
        NEW.raw_user_meta_data->>'farm_location'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger the function every time a user is created
CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
