-- ─────────────────────────────────────────────────────────────────────────────
-- MIGRATION 00023: AGRICULTURAL FINANCE & FUNDING NETWORK
-- ─────────────────────────────────────────────────────────────────────────────
-- Tables:
--   funding_providers    – Organizations offering funding opportunities
--   funding_opportunities – Specific funding programs/grants/loans
--   funding_applications – Farmer applications to funding opportunities
-- ─────────────────────────────────────────────────────────────────────────────

-- ─── ENUM TYPES ─────────────────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE funding_type AS ENUM (
    'agricultural_grant', 'farm_input_financing', 'equipment_financing',
    'working_capital', 'agricultural_loan', 'cooperative_funding',
    'government_program', 'ngo_funding', 'youth_program',
    'women_program', 'research_innovation', 'other'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE provider_type AS ENUM (
    'government', 'bank', 'microfinance', 'ngo', 'development',
    'agricultural_company', 'cooperative', 'research_institution', 'other'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE provider_verification_status AS ENUM (
    'pending', 'verified', 'rejected', 'suspended'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE funding_opportunity_status AS ENUM (
    'draft', 'pending_approval', 'open', 'closing_soon', 'closed', 'suspended'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE funding_application_status AS ENUM (
    'draft', 'submitted', 'under_review', 'shortlisted',
    'approved', 'rejected', 'withdrawn', 'expired'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ─── FUNDING PROVIDERS ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS funding_providers (
  id              BIGSERIAL PRIMARY KEY,
  name            TEXT NOT NULL,
  description     TEXT,
  provider_type   provider_type NOT NULL DEFAULT 'other',
  logo_url        TEXT,
  website_url     TEXT,
  contact_email   TEXT,
  contact_phone   TEXT,
  location        TEXT,
  verification_status provider_verification_status DEFAULT 'pending',
  verified_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE funding_providers ENABLE ROW LEVEL SECURITY;

-- Public can read verified/suspended providers
DROP POLICY IF EXISTS "fp_select_public" ON funding_providers;
CREATE POLICY "fp_select_public" ON funding_providers
  FOR SELECT USING (verification_status IN ('verified', 'suspended'));

-- Admin can do everything
DROP POLICY IF EXISTS "fp_admin_all" ON funding_providers;
CREATE POLICY "fp_admin_all" ON funding_providers
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Updated-at trigger
CREATE OR REPLACE FUNCTION update_funding_provider_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_funding_providers_updated_at ON funding_providers;
CREATE TRIGGER trg_funding_providers_updated_at
  BEFORE UPDATE ON funding_providers
  FOR EACH ROW EXECUTE FUNCTION update_funding_provider_updated_at();

-- ─── FUNDING OPPORTUNITIES ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS funding_opportunities (
  id              BIGSERIAL PRIMARY KEY,
  provider_id     BIGINT NOT NULL REFERENCES funding_providers(id) ON DELETE CASCADE,
  title           TEXT NOT NULL,
  description     TEXT,
  funding_type    funding_type NOT NULL DEFAULT 'other',
  min_amount      NUMERIC DEFAULT 0,
  max_amount      NUMERIC DEFAULT 0,
  currency        TEXT NOT NULL DEFAULT 'GHS',
  application_start DATE,
  application_deadline DATE,
  eligibility_criteria TEXT,
  supported_crops TEXT[],
  supported_activities TEXT[],
  supported_locations TEXT[],
  target_farmer_categories TEXT[],
  required_documents TEXT[],
  application_instructions TEXT,
  external_url    TEXT,
  status          funding_opportunity_status DEFAULT 'draft',
  created_by      UUID REFERENCES profiles(id),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE funding_opportunities ENABLE ROW LEVEL SECURITY;

-- Public can read open/closing_soon opportunities from verified providers
DROP POLICY IF EXISTS "fo_select_public" ON funding_opportunities;
CREATE POLICY "fo_select_public" ON funding_opportunities
  FOR SELECT USING (
    status IN ('open', 'closing_soon')
    AND EXISTS (SELECT 1 FROM funding_providers WHERE id = provider_id AND verification_status = 'verified')
  );

-- Admin can do everything
DROP POLICY IF EXISTS "fo_admin_all" ON funding_opportunities;
CREATE POLICY "fo_admin_all" ON funding_opportunities
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Updated-at trigger
CREATE OR REPLACE FUNCTION update_funding_opportunity_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_funding_opportunities_updated_at ON funding_opportunities;
CREATE TRIGGER trg_funding_opportunities_updated_at
  BEFORE UPDATE ON funding_opportunities
  FOR EACH ROW EXECUTE FUNCTION update_funding_opportunity_updated_at();

-- ─── FUNDING APPLICATIONS ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS funding_applications (
  id              BIGSERIAL PRIMARY KEY,
  opportunity_id  BIGINT NOT NULL REFERENCES funding_opportunities(id) ON DELETE CASCADE,
  farmer_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount_requested NUMERIC DEFAULT 0,
  status          funding_application_status DEFAULT 'draft',
  applicant_name  TEXT,
  applicant_phone TEXT,
  applicant_email TEXT,
  farm_location   TEXT,
  farm_size       TEXT,
  agricultural_activity TEXT,
  crop_details    TEXT,
  funding_purpose TEXT,
  additional_info TEXT,
  documents       TEXT[],
  reviewer_notes  TEXT,
  reviewed_by     UUID REFERENCES profiles(id),
  reviewed_at     TIMESTAMPTZ,
  submitted_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (opportunity_id, farmer_id)
);

ALTER TABLE funding_applications ENABLE ROW LEVEL SECURITY;

-- Farmer can read own applications
DROP POLICY IF EXISTS "fa_select_farmer" ON funding_applications;
CREATE POLICY "fa_select_farmer" ON funding_applications
  FOR SELECT USING (auth.uid() = farmer_id);

-- Farmer can insert own applications
DROP POLICY IF EXISTS "fa_insert_farmer" ON funding_applications;
CREATE POLICY "fa_insert_farmer" ON funding_applications
  FOR INSERT WITH CHECK (auth.uid() = farmer_id);

-- Farmer can update own applications (for draft/withdraw)
DROP POLICY IF EXISTS "fa_update_farmer" ON funding_applications;
CREATE POLICY "fa_update_farmer" ON funding_applications
  FOR UPDATE USING (auth.uid() = farmer_id);

-- Admin can do everything
DROP POLICY IF EXISTS "fa_admin_all" ON funding_applications;
CREATE POLICY "fa_admin_all" ON funding_applications
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Updated-at trigger
CREATE OR REPLACE FUNCTION update_funding_application_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_funding_applications_updated_at ON funding_applications;
CREATE TRIGGER trg_funding_applications_updated_at
  BEFORE UPDATE ON funding_applications
  FOR EACH ROW EXECUTE FUNCTION update_funding_application_updated_at();

-- ─── NOTIFICATION PREFERENCES ───────────────────────────────────────────────

ALTER TABLE notification_preferences ADD COLUMN IF NOT EXISTS funding_enabled BOOLEAN NOT NULL DEFAULT TRUE;

-- ─── UPDATE CREATE_NOTIFICATION FOR FUNDING ────────────────────────────────

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

-- ─── INDEXES ───────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_fp_verification ON funding_providers (verification_status);
CREATE INDEX IF NOT EXISTS idx_fo_provider_id ON funding_opportunities (provider_id);
CREATE INDEX IF NOT EXISTS idx_fo_status ON funding_opportunities (status);
CREATE INDEX IF NOT EXISTS idx_fo_deadline ON funding_opportunities (application_deadline);
CREATE INDEX IF NOT EXISTS idx_fo_funding_type ON funding_opportunities (funding_type);
CREATE INDEX IF NOT EXISTS idx_fo_supported_crops ON funding_opportunities USING GIN (supported_crops);
CREATE INDEX IF NOT EXISTS idx_fo_supported_locations ON funding_opportunities USING GIN (supported_locations);
CREATE INDEX IF NOT EXISTS idx_fa_opportunity_id ON funding_applications (opportunity_id);
CREATE INDEX IF NOT EXISTS idx_fa_farmer_id ON funding_applications (farmer_id);
CREATE INDEX IF NOT EXISTS idx_fa_status ON funding_applications (status);
