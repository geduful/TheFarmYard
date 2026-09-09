-- Migration 00010: Logistics Network — Shipments, Tracking, Delivery Lifecycle

-- ============================================================
-- 1. Shipments table — core logistics record
-- ============================================================
CREATE TABLE IF NOT EXISTS shipments (
  id BIGSERIAL PRIMARY KEY,
  escrow_id BIGINT REFERENCES escrow_transactions(id) ON DELETE SET NULL,
  order_id TEXT UNIQUE, -- human-readable: TFY-LG-XXXXX
  farmer_id UUID REFERENCES profiles(id) ON DELETE SET NULL NOT NULL,
  buyer_id UUID REFERENCES profiles(id) ON DELETE SET NULL NOT NULL,

  -- parties
  logistics_provider_name TEXT,
  driver_name TEXT,
  driver_phone TEXT,
  vehicle_license_plate TEXT,

  -- locations
  pickup_location TEXT NOT NULL,
  destination TEXT NOT NULL,
  delivery_notes TEXT,

  -- status
  status TEXT DEFAULT 'pending'
    CHECK (status IN (
      'pending',
      'pickup_scheduled',
      'assigned',
      'in_transit',
      'out_for_delivery',
      'delivered',
      'delivery_confirmed',
      'cancelled',
      'failed',
      'delivery_issue'
    )),

  -- tracking
  tracking_number TEXT,
  waybill_receipt_url TEXT,

  -- timing
  estimated_pickup_at TIMESTAMPTZ,
  estimated_delivery_at TIMESTAMPTZ,
  actual_pickup_at TIMESTAMPTZ,
  actual_delivery_at TIMESTAMPTZ,

  -- financials
  delivery_fee NUMERIC DEFAULT 0,
  currency TEXT DEFAULT 'GHS',

  -- metadata
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- ============================================================
-- 2. Shipment status history — audit trail
-- ============================================================
CREATE TABLE IF NOT EXISTS shipment_status_history (
  id BIGSERIAL PRIMARY KEY,
  shipment_id BIGINT REFERENCES shipments(id) ON DELETE CASCADE NOT NULL,
  from_status TEXT,
  to_status TEXT NOT NULL,
  note TEXT,
  changed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- ============================================================
-- 3. Indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_shipments_escrow ON shipments(escrow_id);
CREATE INDEX IF NOT EXISTS idx_shipments_farmer ON shipments(farmer_id, status);
CREATE INDEX IF NOT EXISTS idx_shipments_buyer ON shipments(buyer_id, status);
CREATE INDEX IF NOT EXISTS idx_shipments_status ON shipments(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_shipments_tracking ON shipments(tracking_number);
CREATE INDEX IF NOT EXISTS idx_shipment_history_shipment ON shipment_status_history(shipment_id, created_at);

-- ============================================================
-- 4. RLS Policies
-- ============================================================
ALTER TABLE shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipment_status_history ENABLE ROW LEVEL SECURITY;

-- Farmers can see their own shipments
DROP POLICY IF EXISTS "shipments_farmer_select" ON shipments;
CREATE POLICY "shipments_farmer_select"
  ON shipments FOR SELECT
  USING (auth.uid() = farmer_id);

-- Buyers can see their own shipments
DROP POLICY IF EXISTS "shipments_buyer_select" ON shipments;
CREATE POLICY "shipments_buyer_select"
  ON shipments FOR SELECT
  USING (auth.uid() = buyer_id);

-- Farmers can insert shipments for their orders
DROP POLICY IF EXISTS "shipments_farmer_insert" ON shipments;
CREATE POLICY "shipments_farmer_insert"
  ON shipments FOR INSERT
  WITH CHECK (auth.uid() = farmer_id);

-- Farmers can update their own shipments
DROP POLICY IF EXISTS "shipments_farmer_update" ON shipments;
CREATE POLICY "shipments_farmer_update"
  ON shipments FOR UPDATE
  USING (auth.uid() = farmer_id);

-- Buyers can update limited fields (delivery confirmation)
DROP POLICY IF EXISTS "shipments_buyer_update" ON shipments;
CREATE POLICY "shipments_buyer_update"
  ON shipments FOR UPDATE
  USING (auth.uid() = buyer_id);

-- Admin can do everything
DROP POLICY IF EXISTS "shipments_admin_all" ON shipments;
CREATE POLICY "shipments_admin_all"
  ON shipments FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Status history: readable by shipment participants
DROP POLICY IF EXISTS "shipment_history_select" ON shipment_status_history;
CREATE POLICY "shipment_history_select"
  ON shipment_status_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM shipments s
      WHERE s.id = shipment_status_history.shipment_id
        AND (s.farmer_id = auth.uid() OR s.buyer_id = auth.uid())
    )
  );

-- Status history: insertable by shipment participants
DROP POLICY IF EXISTS "shipment_history_insert" ON shipment_status_history;
CREATE POLICY "shipment_history_insert"
  ON shipment_status_history FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM shipments s
      WHERE s.id = shipment_status_history.shipment_id
        AND (s.farmer_id = auth.uid() OR s.buyer_id = auth.uid())
    )
  );

-- Admin can see all history
DROP POLICY IF EXISTS "shipment_history_admin_all" ON shipment_status_history;
CREATE POLICY "shipment_history_admin_all"
  ON shipment_status_history FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================================
-- 5. Updated_at trigger
-- ============================================================
CREATE OR REPLACE FUNCTION update_shipment_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc'::text, NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_shipments_updated_at ON shipments;
CREATE TRIGGER trg_shipments_updated_at
  BEFORE UPDATE ON shipments
  FOR EACH ROW
  EXECUTE FUNCTION update_shipment_updated_at();

-- ============================================================
-- 6. Status transition validation function
-- ============================================================
CREATE OR REPLACE FUNCTION validate_shipment_status_transition()
RETURNS TRIGGER AS $$
DECLARE
  v_valid BOOLEAN := FALSE;
BEGIN
  -- Only validate on status change
  IF NEW.status = OLD.status THEN
    RETURN NEW;
  END IF;

  -- Define valid transitions
  v_valid := CASE OLD.status
    WHEN 'pending' THEN
      NEW.status IN ('pickup_scheduled', 'cancelled', 'failed')
    WHEN 'pickup_scheduled' THEN
      NEW.status IN ('assigned', 'cancelled', 'failed')
    WHEN 'assigned' THEN
      NEW.status IN ('in_transit', 'cancelled', 'failed')
    WHEN 'in_transit' THEN
      NEW.status IN ('out_for_delivery', 'delivered', 'cancelled', 'failed', 'delivery_issue')
    WHEN 'out_for_delivery' THEN
      NEW.status IN ('delivered', 'cancelled', 'failed', 'delivery_issue')
    WHEN 'delivered' THEN
      NEW.status IN ('delivery_confirmed', 'delivery_issue')
    WHEN 'delivery_confirmed' THEN
      FALSE -- terminal
    WHEN 'cancelled' THEN
      FALSE -- terminal
    WHEN 'failed' THEN
      FALSE -- terminal
    WHEN 'delivery_issue' THEN
      NEW.status IN ('in_transit', 'out_for_delivery', 'delivered', 'cancelled')
    ELSE
      FALSE
  END;

  IF NOT v_valid THEN
    RAISE EXCEPTION 'Invalid shipment status transition: % -> %', OLD.status, NEW.status;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_validate_shipment_status ON shipments;
CREATE TRIGGER trg_validate_shipment_status
  BEFORE UPDATE OF status ON shipments
  FOR EACH ROW
  EXECUTE FUNCTION validate_shipment_status_transition();

-- ============================================================
-- 7. Generate tracking number function
-- ============================================================
CREATE OR REPLACE FUNCTION generate_tracking_number()
RETURNS TEXT AS $$
DECLARE
  v_seq BIGINT;
BEGIN
  SELECT COALESCE(MAX(id), 0) + 1 INTO v_seq FROM shipments;
  RETURN 'TFY-LG-' || LPAD(v_seq::TEXT, 5, '0');
END;
$$ LANGUAGE plpgsql;
