-- ─────────────────────────────────────────────────────────────────────────────
-- MIGRATION 00013: STORAGE & WAREHOUSING
-- ─────────────────────────────────────────────────────────────────────────────
-- Tables:
--   storage_facilities    – Registered warehouses / cold rooms / silos
--   storage_bookings      – Farmer reservations of storage space
--   storage_inventory     – Individual items stored per booking
-- ─────────────────────────────────────────────────────────────────────────────

-- ─── ENUM TYPES ─────────────────────────────────────────────────────────────

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'storage_facility_type') THEN
    CREATE TYPE storage_facility_type AS ENUM (
      'cold_storage',
      'dry_storage',
      'refrigerated',
      'open_air',
      'silo'
    );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'storage_facility_status') THEN
    CREATE TYPE storage_facility_status AS ENUM (
      'active',
      'inactive',
      'maintenance'
    );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'storage_booking_status') THEN
    CREATE TYPE storage_booking_status AS ENUM (
      'pending',
      'confirmed',
      'checked_in',
      'stored',
      'checked_out',
      'expired',
      'cancelled'
    );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'storage_item_condition') THEN
    CREATE TYPE storage_item_condition AS ENUM (
      'excellent',
      'good',
      'fair',
      'poor',
      'damaged'
    );
  END IF;
END $$;

-- ─── STORAGE FACILITIES ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS storage_facilities (
  id              BIGSERIAL PRIMARY KEY,
  name            TEXT NOT NULL,
  facility_type   storage_facility_type NOT NULL DEFAULT 'dry_storage',
  location        TEXT NOT NULL,
  address         TEXT,
  description     TEXT,
  capacity_unit   TEXT NOT NULL DEFAULT 'kg',          -- kg, tonne, bag, crate, box
  total_capacity  NUMERIC NOT NULL DEFAULT 0,
  available_capacity NUMERIC NOT NULL DEFAULT 0,
  price_per_unit  NUMERIC NOT NULL DEFAULT 0,          -- per capacity_unit per day
  currency        TEXT NOT NULL DEFAULT 'GHS',
  contact_name    TEXT,
  contact_phone   TEXT,
  contact_email   TEXT,
  has_climate_control BOOLEAN DEFAULT false,
  has_security    BOOLEAN DEFAULT false,
  has_loading_dock BOOLEAN DEFAULT false,
  image_url       TEXT,
  is_approved     BOOLEAN DEFAULT false,
  status          storage_facility_status DEFAULT 'active',
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE storage_facilities ENABLE ROW LEVEL SECURITY;

-- Public can read approved active facilities
DROP POLICY IF EXISTS "sf_select_public" ON storage_facilities;
CREATE POLICY "sf_select_public" ON storage_facilities
  FOR SELECT USING (is_approved = true AND status = 'active');

-- Admin can do everything
DROP POLICY IF EXISTS "sf_admin_all" ON storage_facilities;
CREATE POLICY "sf_admin_all" ON storage_facilities
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Updated-at trigger
CREATE OR REPLACE FUNCTION update_storage_facility_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_storage_facilities_updated_at ON storage_facilities;
CREATE TRIGGER trg_storage_facilities_updated_at
  BEFORE UPDATE ON storage_facilities
  FOR EACH ROW EXECUTE FUNCTION update_storage_facility_updated_at();

-- ─── STORAGE BOOKINGS ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS storage_bookings (
  id                BIGSERIAL PRIMARY KEY,
  facility_id       BIGINT NOT NULL REFERENCES storage_facilities(id) ON DELETE CASCADE,
  farmer_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  produce_name      TEXT NOT NULL,                       -- e.g. "Tomatoes", "Maize"
  category          TEXT,                                -- matches listing categories
  quantity          NUMERIC NOT NULL,
  quantity_unit     TEXT NOT NULL DEFAULT 'kg',          -- kg, tonne, bag, crate, box
  storage_start     DATE NOT NULL,
  storage_end       DATE NOT NULL,
  total_fee         NUMERIC NOT NULL DEFAULT 0,
  currency          TEXT NOT NULL DEFAULT 'GHS',
  status            storage_booking_status DEFAULT 'pending',
  special_notes     TEXT,
  rejection_reason  TEXT,
  checked_in_at     TIMESTAMPTZ,
  checked_out_at    TIMESTAMPTZ,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE storage_bookings ENABLE ROW LEVEL SECURITY;

-- Farmer can read own bookings
DROP POLICY IF EXISTS "sb_select_farmer" ON storage_bookings;
CREATE POLICY "sb_select_farmer" ON storage_bookings
  FOR SELECT USING (auth.uid() = farmer_id);

-- Farmer can insert own bookings
DROP POLICY IF EXISTS "sb_insert_farmer" ON storage_bookings;
CREATE POLICY "sb_insert_farmer" ON storage_bookings
  FOR INSERT WITH CHECK (auth.uid() = farmer_id);

-- Farmer can update own bookings (for cancellation)
DROP POLICY IF EXISTS "sb_update_farmer" ON storage_bookings;
CREATE POLICY "sb_update_farmer" ON storage_bookings
  FOR UPDATE USING (auth.uid() = farmer_id);

-- Admin can do everything
DROP POLICY IF EXISTS "sb_admin_all" ON storage_bookings;
CREATE POLICY "sb_admin_all" ON storage_bookings
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Updated-at trigger
CREATE OR REPLACE FUNCTION update_storage_booking_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_storage_bookings_updated_at ON storage_bookings;
CREATE TRIGGER trg_storage_bookings_updated_at
  BEFORE UPDATE ON storage_bookings
  FOR EACH ROW EXECUTE FUNCTION update_storage_booking_updated_at();

-- ─── STORAGE INVENTORY ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS storage_inventory (
  id              BIGSERIAL PRIMARY KEY,
  booking_id      BIGINT NOT NULL REFERENCES storage_bookings(id) ON DELETE CASCADE,
  facility_id     BIGINT NOT NULL REFERENCES storage_facilities(id) ON DELETE CASCADE,
  farmer_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  produce_name    TEXT NOT NULL,
  quantity        NUMERIC NOT NULL,
  quantity_unit   TEXT NOT NULL DEFAULT 'kg',
  condition       storage_item_condition DEFAULT 'good',
  storage_location TEXT,                                 -- e.g. "Bay 3", "Shelf A2"
  notes           TEXT,
  checked_in_at   TIMESTAMPTZ DEFAULT NOW(),
  checked_out_at  TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE storage_inventory ENABLE ROW LEVEL SECURITY;

-- Farmer can read own inventory
DROP POLICY IF EXISTS "si_select_farmer" ON storage_inventory;
CREATE POLICY "si_select_farmer" ON storage_inventory
  FOR SELECT USING (auth.uid() = farmer_id);

-- Admin can do everything
DROP POLICY IF EXISTS "si_admin_all" ON storage_inventory;
CREATE POLICY "si_admin_all" ON storage_inventory
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ─── CAPACITY MANAGEMENT FUNCTION ───────────────────────────────────────────

-- Update available capacity when booking is confirmed or checked in
CREATE OR REPLACE FUNCTION update_facility_capacity_on_booking()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status IN ('confirmed', 'checked_in', 'stored') AND OLD.status NOT IN ('confirmed', 'checked_in', 'stored') THEN
    -- Deduct capacity
    UPDATE storage_facilities
    SET available_capacity = GREATEST(available_capacity - NEW.quantity, 0)
    WHERE id = NEW.facility_id;
  ELSIF OLD.status IN ('confirmed', 'checked_in', 'stored') AND NEW.status IN ('checked_out', 'cancelled', 'expired') THEN
    -- Restore capacity
    UPDATE storage_facilities
    SET available_capacity = LEAST(available_capacity + OLD.quantity, total_capacity)
    WHERE id = OLD.facility_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_storage_booking_capacity ON storage_bookings;
CREATE TRIGGER trg_storage_booking_capacity
  AFTER UPDATE OF status ON storage_bookings
  FOR EACH ROW EXECUTE FUNCTION update_facility_capacity_on_booking();

-- Also handle INSERT for confirmed bookings
CREATE OR REPLACE FUNCTION update_facility_capacity_on_insert()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status IN ('confirmed', 'checked_in', 'stored') THEN
    UPDATE storage_facilities
    SET available_capacity = GREATEST(available_capacity - NEW.quantity, 0)
    WHERE id = NEW.facility_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_storage_booking_capacity_insert ON storage_bookings;
CREATE TRIGGER trg_storage_booking_capacity_insert
  AFTER INSERT ON storage_bookings
  FOR EACH ROW EXECUTE FUNCTION update_facility_capacity_on_insert();
