-- ─────────────────────────────────────────────────────────────────────────────
-- MIGRATION 00024: AGRICULTURAL SUPPLY & INPUT MARKETPLACE
-- ─────────────────────────────────────────────────────────────────────────────
-- Tables:
--   supplier_profiles  – Business profiles for verified agricultural suppliers
--   supply_products    – Product catalog managed by suppliers
--   supply_orders      – Orders placed by farmers to suppliers
--   supply_order_items – Individual line items within supply orders
--   supplier_ratings   – Farmer ratings of suppliers after order completion
-- ─────────────────────────────────────────────────────────────────────────────

-- ─── ENUM TYPES ─────────────────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE supplier_verification_status AS ENUM (
    'pending', 'under_review', 'approved', 'rejected', 'suspended'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE supply_product_category AS ENUM (
    'seeds', 'fertilizers', 'crop_protection', 'animal_feed',
    'irrigation', 'farm_equipment', 'farm_tools', 'poultry_inputs',
    'livestock_inputs', 'packaging', 'other_agricultural_inputs'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE supply_product_status AS ENUM (
    'active', 'inactive', 'out_of_stock'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE supply_order_status AS ENUM (
    'pending_payment', 'paid', 'confirmed', 'processing',
    'ready_for_dispatch', 'dispatched', 'in_transit', 'delivered',
    'completed', 'cancelled', 'failed', 'delivery_issue'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ─── SUPPLIER PROFILES ─────────────────────────────────────────────────────
-- One-to-one with profiles. Only farmers can become suppliers.

CREATE TABLE IF NOT EXISTS supplier_profiles (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  business_name TEXT NOT NULL,
  business_description TEXT,
  supplier_category supply_product_category NOT NULL DEFAULT 'other_agricultural_inputs',
  business_location TEXT NOT NULL,
  contact_phone TEXT,
  contact_email TEXT,
  operating_areas TEXT[],
  verification_status supplier_verification_status NOT NULL DEFAULT 'pending',
  verified_at   TIMESTAMPTZ,
  rejection_reason TEXT,
  admin_notes   TEXT,
  total_products INT NOT NULL DEFAULT 0,
  total_orders  INT NOT NULL DEFAULT 0,
  total_revenue NUMERIC(12,2) NOT NULL DEFAULT 0,
  rating_avg    NUMERIC(3,2) NOT NULL DEFAULT 0,
  rating_count  INT NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── SUPPLY PRODUCTS ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS supply_products (
  id            BIGSERIAL PRIMARY KEY,
  supplier_id   UUID NOT NULL REFERENCES public.supplier_profiles(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  description   TEXT,
  category      supply_product_category NOT NULL,
  product_type  TEXT,
  brand         TEXT,
  unit          TEXT NOT NULL DEFAULT 'unit',
  price         NUMERIC(10,2) NOT NULL,
  currency      TEXT NOT NULL DEFAULT 'GHS',
  min_order_quantity INT NOT NULL DEFAULT 1,
  stock_quantity INT NOT NULL DEFAULT 0,
  reserved_quantity INT NOT NULL DEFAULT 0,
  status        supply_product_status NOT NULL DEFAULT 'active',
  location      TEXT,
  delivery_available BOOLEAN NOT NULL DEFAULT FALSE,
  image_url     TEXT,
  is_featured   BOOLEAN NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── SUPPLY ORDERS ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS supply_orders (
  id            BIGSERIAL PRIMARY KEY,
  order_number  TEXT NOT NULL UNIQUE,
  farmer_id     UUID NOT NULL REFERENCES public.profiles(id),
  supplier_id   UUID NOT NULL REFERENCES public.supplier_profiles(id),
  status        supply_order_status NOT NULL DEFAULT 'pending_payment',
  subtotal      NUMERIC(12,2) NOT NULL,
  platform_fee  NUMERIC(12,2) NOT NULL,
  total_amount  NUMERIC(12,2) NOT NULL,
  currency      TEXT NOT NULL DEFAULT 'GHS',
  delivery_name TEXT,
  delivery_phone TEXT,
  delivery_address TEXT,
  delivery_notes TEXT,
  payment_ref   TEXT,
  flw_tx_ref    TEXT,
  flw_transaction_id BIGINT,
  paid_at       TIMESTAMPTZ,
  confirmed_at  TIMESTAMPTZ,
  dispatched_at TIMESTAMPTZ,
  delivered_at  TIMESTAMPTZ,
  completed_at  TIMESTAMPTZ,
  cancelled_at  TIMESTAMPTZ,
  cancellation_reason TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── SUPPLY ORDER ITEMS ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS supply_order_items (
  id            BIGSERIAL PRIMARY KEY,
  order_id      BIGINT NOT NULL REFERENCES public.supply_orders(id) ON DELETE CASCADE,
  product_id    BIGINT NOT NULL REFERENCES public.supply_products(id),
  product_name  TEXT NOT NULL,
  product_image TEXT,
  quantity      INT NOT NULL,
  unit_price    NUMERIC(10,2) NOT NULL,
  total_price   NUMERIC(12,2) NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── SUPPLIER RATINGS ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS supplier_ratings (
  id            BIGSERIAL PRIMARY KEY,
  supplier_id   UUID NOT NULL REFERENCES public.supplier_profiles(id) ON DELETE CASCADE,
  farmer_id     UUID NOT NULL REFERENCES public.profiles(id),
  order_id      BIGINT NOT NULL REFERENCES public.supply_orders(id),
  rating        INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  product_quality_rating INT CHECK (product_quality_rating >= 1 AND product_quality_rating <= 5),
  delivery_rating INT CHECK (delivery_rating >= 1 AND delivery_rating <= 5),
  communication_rating INT CHECK (communication_rating >= 1 AND communication_rating <= 5),
  comment       TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(farmer_id, order_id)
);

-- ─── UPDATED_AT TRIGGERS ──────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_supplier_profile_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_supplier_profiles_updated_at ON supplier_profiles;
CREATE TRIGGER trg_supplier_profiles_updated_at
  BEFORE UPDATE ON supplier_profiles
  FOR EACH ROW EXECUTE FUNCTION update_supplier_profile_updated_at();

CREATE OR REPLACE FUNCTION update_supply_product_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_supply_products_updated_at ON supply_products;
CREATE TRIGGER trg_supply_products_updated_at
  BEFORE UPDATE ON supply_products
  FOR EACH ROW EXECUTE FUNCTION update_supply_product_updated_at();

CREATE OR REPLACE FUNCTION update_supply_order_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_supply_orders_updated_at ON supply_orders;
CREATE TRIGGER trg_supply_orders_updated_at
  BEFORE UPDATE ON supply_orders
  FOR EACH ROW EXECUTE FUNCTION update_supply_order_updated_at();

-- ─── SUPPLIER RATING UPDATE TRIGGER ───────────────────────────────────────

CREATE OR REPLACE FUNCTION update_supplier_rating_on_insert()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.supplier_profiles
  SET
    rating_avg = (SELECT COALESCE(AVG(rating), 0) FROM public.supplier_ratings WHERE supplier_id = NEW.supplier_id),
    rating_count = (SELECT COUNT(*) FROM public.supplier_ratings WHERE supplier_id = NEW.supplier_id)
  WHERE id = NEW.supplier_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_supplier_rating_update ON supplier_ratings;
CREATE TRIGGER trg_supplier_rating_update
  AFTER INSERT ON supplier_ratings
  FOR EACH ROW EXECUTE FUNCTION update_supplier_rating_on_insert();

-- ─── INVENTORY VALIDATION TRIGGER ─────────────────────────────────────────

CREATE OR REPLACE FUNCTION validate_supply_order_inventory()
RETURNS TRIGGER AS $$
DECLARE
  v_available INT;
BEGIN
  SELECT (stock_quantity - reserved_quantity) INTO v_available
  FROM public.supply_products WHERE id = NEW.product_id;

  IF v_available IS NULL THEN
    RAISE EXCEPTION 'Product not found: %', NEW.product_id;
  END IF;

  IF v_available < NEW.quantity THEN
    RAISE EXCEPTION 'Insufficient stock for product %. Available: %, requested: %',
      NEW.product_id, v_available, NEW.quantity;
  END IF;

  UPDATE public.supply_products
  SET reserved_quantity = reserved_quantity + NEW.quantity
  WHERE id = NEW.product_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_validate_supply_order_inventory ON supply_order_items;
CREATE TRIGGER trg_validate_supply_order_inventory
  BEFORE INSERT ON supply_order_items
  FOR EACH ROW EXECUTE FUNCTION validate_supply_order_inventory();

-- ─── ORDER NUMBER GENERATION ──────────────────────────────────────────────

CREATE OR REPLACE FUNCTION generate_supply_order_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.order_number IS NULL OR NEW.order_number = '' THEN
    NEW.order_number := 'TFY-SP-' || LPAD(NEW.id::TEXT, 6, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_generate_supply_order_number ON supply_orders;
CREATE TRIGGER trg_generate_supply_order_number
  BEFORE INSERT ON supply_orders
  FOR EACH ROW EXECUTE FUNCTION generate_supply_order_number();

-- ─── INVENTORY RELEASE ON ORDER CANCEL/COMPLETE ───────────────────────────

CREATE OR REPLACE FUNCTION release_supply_inventory_on_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status IN ('cancelled', 'failed', 'completed') AND OLD.status NOT IN ('cancelled', 'failed', 'completed') THEN
    UPDATE public.supply_products
    SET reserved_quantity = GREATEST(0, reserved_quantity - (
      SELECT COALESCE(SUM(quantity), 0) FROM public.supply_order_items WHERE order_id = NEW.id
    ))
    WHERE id IN (SELECT product_id FROM public.supply_order_items WHERE order_id = NEW.id);

    -- Deduct from stock on completion (actual sale)
    IF NEW.status = 'completed' THEN
      UPDATE public.supply_products
      SET stock_quantity = GREATEST(0, stock_quantity - (
        SELECT COALESCE(SUM(quantity), 0) FROM public.supply_order_items WHERE order_id = NEW.id
      ))
      WHERE id IN (SELECT product_id FROM public.supply_order_items WHERE order_id = NEW.id);
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_release_supply_inventory ON supply_orders;
CREATE TRIGGER trg_release_supply_inventory
  AFTER UPDATE OF status ON supply_orders
  FOR EACH ROW EXECUTE FUNCTION release_supply_inventory_on_status();

-- ─── NOTIFICATION PREFERENCES ───────────────────────────────────────────────

ALTER TABLE notification_preferences ADD COLUMN IF NOT EXISTS supply_enabled BOOLEAN NOT NULL DEFAULT TRUE;

-- ─── UPDATE CREATE_NOTIFICATION FOR SUPPLY ──────────────────────────────────

CREATE OR REPLACE FUNCTION public.create_notification(
  p_user_id UUID,
  p_type TEXT,
  p_category TEXT,
  p_title TEXT,
  p_message TEXT,
  p_priority TEXT DEFAULT 'normal',
  p_action_url TEXT DEFAULT NULL,
  p_entity_type TEXT DEFAULT NULL,
  p_entity_id TEXT DEFAULT NULL,
  p_metadata TEXT DEFAULT NULL,
  p_deduplication_key TEXT DEFAULT NULL
) RETURNS BIGINT AS $$
DECLARE
  v_id BIGINT;
  v_key TEXT;
BEGIN
  -- Check notification preference
  IF (
    CASE p_category
      WHEN 'marketplace' THEN (SELECT marketplace_enabled FROM public.notification_preferences WHERE user_id = p_user_id)
      WHEN 'orders' THEN (SELECT orders_enabled FROM public.notification_preferences WHERE user_id = p_user_id)
      WHEN 'verification' THEN (SELECT verification_enabled FROM public.notification_preferences WHERE user_id = p_user_id)
      WHEN 'reputation' THEN (SELECT reputation_enabled FROM public.notification_preferences WHERE user_id = p_user_id)
      WHEN 'logistics' THEN (SELECT logistics_enabled FROM public.notification_preferences WHERE user_id = p_user_id)
      WHEN 'storage' THEN (SELECT storage_enabled FROM public.notification_preferences WHERE user_id = p_user_id)
      WHEN 'funding' THEN (SELECT funding_enabled FROM public.notification_preferences WHERE user_id = p_user_id)
      WHEN 'supply' THEN (SELECT supply_enabled FROM public.notification_preferences WHERE user_id = p_user_id)
      ELSE TRUE
    END = FALSE
  ) THEN
    RETURN NULL;
  END IF;

  -- Generate dedup key
  v_key := COALESCE(
    p_deduplication_key,
    public.generate_notification_dedup_key(p_user_id, p_type, p_entity_type, p_entity_id)
  );

  -- Check for duplicate
  IF v_key IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.notifications WHERE deduplication_key = v_key AND user_id = p_user_id
  ) THEN
    RETURN NULL;
  END IF;

  INSERT INTO public.notifications (
    user_id, type, category, title, message, priority,
    action_url, entity_type, entity_id, metadata, deduplication_key
  ) VALUES (
    p_user_id, p_type, p_category, p_title, p_message, p_priority,
    p_action_url, p_entity_type, p_entity_id,
    CASE WHEN p_metadata IS NOT NULL THEN p_metadata::jsonb ELSE NULL END,
    v_key
  ) RETURNING id INTO v_id;

  RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ─── RLS POLICIES ──────────────────────────────────────────────────────────

-- supplier_profiles: public can see approved suppliers; owner sees own; admin sees all
ALTER TABLE supplier_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS spp_select_public ON supplier_profiles;
CREATE POLICY spp_select_public ON supplier_profiles
  FOR SELECT USING (verification_status = 'approved');

DROP POLICY IF EXISTS spp_select_own ON supplier_profiles;
CREATE POLICY spp_select_own ON supplier_profiles
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS spp_insert_own ON supplier_profiles;
CREATE POLICY spp_insert_own ON supplier_profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS spp_update_own ON supplier_profiles;
CREATE POLICY spp_update_own ON supplier_profiles
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS spp_admin_all ON supplier_profiles;
CREATE POLICY spp_admin_all ON supplier_profiles
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- supply_products: public sees active/approved; supplier sees own; admin sees all
ALTER TABLE supply_products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS sp_select_public ON supply_products;
CREATE POLICY sp_select_public ON supply_products
  FOR SELECT USING (
    status = 'active'
    AND EXISTS (
      SELECT 1 FROM public.supplier_profiles sp
      WHERE sp.id = supplier_products.supplier_id
        AND sp.verification_status = 'approved'
    )
  );

DROP POLICY IF EXISTS sp_select_own ON supply_products;
CREATE POLICY sp_select_own ON supply_products
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.supplier_profiles sp
      WHERE sp.id = supply_products.supplier_id AND sp.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS sp_insert_own ON supply_products;
CREATE POLICY sp_insert_own ON supply_products
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.supplier_profiles sp
      WHERE sp.id = supply_products.supplier_id
        AND sp.user_id = auth.uid()
        AND sp.verification_status = 'approved'
    )
  );

DROP POLICY IF EXISTS sp_update_own ON supply_products;
CREATE POLICY sp_update_own ON supply_products
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.supplier_profiles sp
      WHERE sp.id = supply_products.supplier_id AND sp.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS sp_delete_own ON supply_products;
CREATE POLICY sp_delete_own ON supply_products
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.supplier_profiles sp
      WHERE sp.id = supply_products.supplier_id AND sp.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS sp_admin_all ON supply_products;
CREATE POLICY sp_admin_all ON supply_products
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- supply_orders: farmer sees own; supplier sees orders for their products; admin sees all
ALTER TABLE supply_orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS so_select_farmer ON supply_orders;
CREATE POLICY so_select_farmer ON supply_orders
  FOR SELECT USING (auth.uid() = farmer_id);

DROP POLICY IF EXISTS so_insert_farmer ON supply_orders;
CREATE POLICY so_insert_farmer ON supply_orders
  FOR INSERT WITH CHECK (auth.uid() = farmer_id);

DROP POLICY IF EXISTS so_select_supplier ON supply_orders;
CREATE POLICY so_select_supplier ON supply_orders
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.supplier_profiles sp
      WHERE sp.id = supply_orders.supplier_id AND sp.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS so_update_supplier ON supply_orders;
CREATE POLICY so_update_supplier ON supply_orders
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.supplier_profiles sp
      WHERE sp.id = supply_orders.supplier_id AND sp.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS so_admin_all ON supply_orders;
CREATE POLICY so_admin_all ON supply_orders
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- supply_order_items: visible to order participants
ALTER TABLE supply_order_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS soi_select_farmer ON supply_order_items;
CREATE POLICY soi_select_farmer ON supply_order_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.supply_orders so
      WHERE so.id = supply_order_items.order_id AND so.farmer_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS soi_insert_farmer ON supply_order_items;
CREATE POLICY soi_insert_farmer ON supply_order_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.supply_orders so
      WHERE so.id = supply_order_items.order_id AND so.farmer_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS soi_select_supplier ON supply_order_items;
CREATE POLICY soi_select_supplier ON supply_order_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.supply_orders so
      JOIN public.supplier_profiles sp ON sp.id = so.supplier_id
      WHERE so.id = supply_order_items.order_id AND sp.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS soi_admin_all ON supply_order_items;
CREATE POLICY soi_admin_all ON supply_order_items
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- supplier_ratings: public sees all; farmer sees own; supplier sees for their products
ALTER TABLE supplier_ratings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS sr_select_public ON supplier_ratings;
CREATE POLICY sr_select_public ON supplier_ratings
  FOR SELECT USING (true);

DROP POLICY IF EXISTS sr_insert_farmer ON supplier_ratings;
CREATE POLICY sr_insert_farmer ON supplier_ratings
  FOR INSERT WITH CHECK (auth.uid() = farmer_id);

DROP POLICY IF EXISTS sr_select_farmer ON supplier_ratings;
CREATE POLICY sr_select_farmer ON supplier_ratings
  FOR SELECT USING (auth.uid() = farmer_id);

DROP POLICY IF EXISTS sr_admin_all ON supplier_ratings;
CREATE POLICY sr_admin_all ON supplier_ratings
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ─── INDEXES ───────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_sp_user_id ON supplier_profiles (user_id);
CREATE INDEX IF NOT EXISTS idx_sp_verification ON supplier_profiles (verification_status);
CREATE INDEX IF NOT EXISTS idx_sp_category ON supplier_profiles (supplier_category);

CREATE INDEX IF NOT EXISTS idx_sprod_supplier_id ON supply_products (supplier_id);
CREATE INDEX IF NOT EXISTS idx_sprod_category ON supply_products (category);
CREATE INDEX IF NOT EXISTS idx_sprod_status ON supply_products (status);
CREATE INDEX IF NOT EXISTS idx_sprod_price ON supply_products (price);
CREATE INDEX IF NOT EXISTS idx_sprod_location ON supply_products (location);

CREATE INDEX IF NOT EXISTS idx_sord_farmer_id ON supply_orders (farmer_id);
CREATE INDEX IF NOT EXISTS idx_sord_supplier_id ON supply_orders (supplier_id);
CREATE INDEX IF NOT EXISTS idx_sord_status ON supply_orders (status);
CREATE INDEX IF NOT EXISTS idx_sord_created_at ON supply_orders (created_at);

CREATE INDEX IF NOT EXISTS idx_sordi_order_id ON supply_order_items (order_id);
CREATE INDEX IF NOT EXISTS idx_sordi_product_id ON supply_order_items (product_id);

CREATE INDEX IF NOT EXISTS idx_srat_supplier_id ON supplier_ratings (supplier_id);
CREATE INDEX IF NOT EXISTS idx_srat_farmer_id ON supplier_ratings (farmer_id);
CREATE INDEX IF NOT EXISTS idx_srat_order_id ON supplier_ratings (order_id);
