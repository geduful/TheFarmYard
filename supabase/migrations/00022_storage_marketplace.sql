-- ─────────────────────────────────────────────────────────────────────────────
-- MIGRATION 00022: STORAGE MARKETPLACE & CAPACITY NETWORK
-- ─────────────────────────────────────────────────────────────────────────────
-- Expands the existing Storage & Warehousing system into a proper marketplace.
-- ─────────────────────────────────────────────────────────────────────────────

-- ─── SAFELY ADD ENUM VALUES ────────────────────────────────────────────────
-- Add new facility types to existing enum (skip if already present)

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = 'storage_facility_type' AND enumlabel = 'grain_storage') THEN
    ALTER TYPE storage_facility_type ADD VALUE 'grain_storage';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = 'storage_facility_type' AND enumlabel = 'produce_warehouse') THEN
    ALTER TYPE storage_facility_type ADD VALUE 'produce_warehouse';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = 'storage_facility_type' AND enumlabel = 'livestock_storage') THEN
    ALTER TYPE storage_facility_type ADD VALUE 'livestock_storage';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = 'storage_facility_type' AND enumlabel = 'other') THEN
    ALTER TYPE storage_facility_type ADD VALUE 'other';
  END IF;
END $$;

-- ─── EXTEND STORAGE FACILITIES ─────────────────────────────────────────────

ALTER TABLE storage_facilities ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES profiles(id) ON DELETE SET NULL;
ALTER TABLE storage_facilities ADD COLUMN IF NOT EXISTS supported_crops TEXT[] DEFAULT '{}';
ALTER TABLE storage_facilities ADD COLUMN IF NOT EXISTS pricing_model TEXT DEFAULT 'per_unit_day';
ALTER TABLE storage_facilities ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false;
ALTER TABLE storage_facilities ADD COLUMN IF NOT EXISTS rating_avg NUMERIC DEFAULT 0;
ALTER TABLE storage_facilities ADD COLUMN IF NOT EXISTS rating_count INTEGER DEFAULT 0;
ALTER TABLE storage_facilities ADD COLUMN IF NOT EXISTS operating_hours TEXT;

-- ─── STORAGE RATINGS ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS storage_ratings (
  id              BIGSERIAL PRIMARY KEY,
  facility_id     BIGINT NOT NULL REFERENCES storage_facilities(id) ON DELETE CASCADE,
  farmer_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  booking_id      BIGINT NOT NULL REFERENCES storage_bookings(id) ON DELETE CASCADE,
  rating          SMALLINT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  condition_rating SMALLINT CHECK (condition_rating >= 1 AND condition_rating <= 5),
  handling_rating SMALLINT CHECK (handling_rating >= 1 AND handling_rating <= 5),
  reliability_rating SMALLINT CHECK (reliability_rating >= 1 AND reliability_rating <= 5),
  comment         TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (facility_id, booking_id)
);

ALTER TABLE storage_ratings ENABLE ROW LEVEL SECURITY;

-- Anyone can read ratings for approved facilities
DROP POLICY IF EXISTS "sr_select_public" ON storage_ratings;
CREATE POLICY "sr_select_public" ON storage_ratings
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM storage_facilities WHERE id = facility_id AND is_approved = true)
  );

-- Farmer can insert own rating
DROP POLICY IF EXISTS "sr_insert_farmer" ON storage_ratings;
CREATE POLICY "sr_insert_farmer" ON storage_ratings
  FOR INSERT WITH CHECK (auth.uid() = farmer_id);

-- Admin can do everything
DROP POLICY IF EXISTS "sr_admin_all" ON storage_ratings;
CREATE POLICY "sr_admin_all" ON storage_ratings
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ─── UPDATE FACILITY RATING TRIGGER ────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_facility_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE storage_facilities
  SET rating_avg = COALESCE((SELECT ROUND(AVG(rating)::numeric, 1) FROM storage_ratings WHERE facility_id = NEW.facility_id), 0),
      rating_count = (SELECT COUNT(*)::integer FROM storage_ratings WHERE facility_id = NEW.facility_id)
  WHERE id = NEW.facility_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_storage_rating_update ON storage_ratings;
CREATE TRIGGER trg_storage_rating_update
  AFTER INSERT ON storage_ratings
  FOR EACH ROW EXECUTE FUNCTION update_facility_rating();

-- ─── CAPACITY VALIDATION FUNCTION ──────────────────────────────────────────
-- Prevents overbooking by checking capacity before INSERT

CREATE OR REPLACE FUNCTION validate_booking_capacity()
RETURNS TRIGGER AS $$
DECLARE
  avail NUMERIC;
BEGIN
  -- Only validate for pending bookings (which is the default new status)
  IF NEW.status = 'pending' THEN
    SELECT available_capacity INTO avail
    FROM storage_facilities
    WHERE id = NEW.facility_id
    FOR UPDATE;

    IF avail IS NULL THEN
      RAISE EXCEPTION 'Facility not found';
    END IF;

    IF NEW.quantity > avail THEN
      RAISE EXCEPTION 'Insufficient capacity. Available: % %, Requested: % %',
        avail, (SELECT capacity_unit FROM storage_facilities WHERE id = NEW.facility_id),
        NEW.quantity, NEW.quantity_unit;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_validate_booking_capacity ON storage_bookings;
CREATE TRIGGER trg_validate_booking_capacity
  BEFORE INSERT ON storage_bookings
  FOR EACH ROW EXECUTE FUNCTION validate_booking_capacity();

-- ─── RLS: OWNER/OPERATOR ACCESS ────────────────────────────────────────────

-- Owner can update own facility
DROP POLICY IF EXISTS "sf_owner_update" ON storage_facilities;
CREATE POLICY "sf_owner_update" ON storage_facilities
  FOR UPDATE USING (auth.uid() = owner_id);

-- Owner can read own facilities (including unapproved ones)
DROP POLICY IF EXISTS "sf_owner_select" ON storage_facilities;
CREATE POLICY "sf_owner_select" ON storage_facilities
  FOR SELECT USING (auth.uid() = owner_id);

-- Operator can read bookings for own facilities
DROP POLICY IF EXISTS "sb_operator_select" ON storage_bookings;
CREATE POLICY "sb_operator_select" ON storage_bookings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM storage_facilities
      WHERE id = facility_id AND owner_id = auth.uid()
    )
  );

-- Operator can update bookings for own facilities
DROP POLICY IF EXISTS "sb_operator_update" ON storage_bookings;
CREATE POLICY "sb_operator_update" ON storage_bookings
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM storage_facilities
      WHERE id = facility_id AND owner_id = auth.uid()
    )
  );

-- Operator can read inventory for own facilities
DROP POLICY IF EXISTS "si_operator_select" ON storage_inventory;
CREATE POLICY "si_operator_select" ON storage_inventory
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM storage_facilities
      WHERE id = facility_id AND owner_id = auth.uid()
    )
  );

-- Operator can insert inventory for own facilities
DROP POLICY IF EXISTS "si_operator_insert" ON storage_inventory;
CREATE POLICY "si_operator_insert" ON storage_inventory
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM storage_facilities
      WHERE id = facility_id AND owner_id = auth.uid()
    )
  );

-- Operator can update inventory for own facilities
DROP POLICY IF EXISTS "si_operator_update" ON storage_inventory;
CREATE POLICY "si_operator_update" ON storage_inventory
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM storage_facilities
      WHERE id = facility_id AND owner_id = auth.uid()
    )
  );

-- ─── INDEXES ───────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_sf_owner_id ON storage_facilities (owner_id);
CREATE INDEX IF NOT EXISTS idx_sf_supported_crops ON storage_facilities USING GIN (supported_crops);
CREATE INDEX IF NOT EXISTS idx_sf_is_featured ON storage_facilities (is_featured) WHERE is_featured = true;
CREATE INDEX IF NOT EXISTS idx_sf_rating ON storage_facilities (rating_avg DESC);
CREATE INDEX IF NOT EXISTS idx_sr_facility_id ON storage_ratings (facility_id);
CREATE INDEX IF NOT EXISTS idx_sr_farmer_id ON storage_ratings (farmer_id);
CREATE INDEX IF NOT EXISTS idx_sr_booking_id ON storage_ratings (booking_id);
