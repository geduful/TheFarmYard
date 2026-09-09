-- ============================================================
-- 00015_news_market_intelligence.sql
-- Agricultural News & Market Intelligence System
-- ============================================================

-- 1. ENUMS
-- ----------------------------------------------------------------

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'news_source_type') THEN
    CREATE TYPE news_source_type AS ENUM (
      'government', 'research', 'international', 'publication',
      'market_service', 'weather', 'news_org', 'ngo', 'other'
    );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'news_source_status') THEN
    CREATE TYPE news_source_status AS ENUM ('active', 'inactive', 'pending');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'news_article_status') THEN
    CREATE TYPE news_article_status AS ENUM (
      'pending', 'approved', 'published', 'rejected', 'archived'
    );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'opportunity_status') THEN
    CREATE TYPE opportunity_status AS ENUM (
      'open', 'closed', 'expired', 'upcoming'
    );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'price_trend') THEN
    CREATE TYPE price_trend AS ENUM ('up', 'down', 'stable', 'unknown');
  END IF;
END $$;

-- 2. TRUSTED SOURCES
-- ----------------------------------------------------------------

CREATE TABLE IF NOT EXISTS news_sources (
  id            BIGSERIAL PRIMARY KEY,
  name          TEXT NOT NULL,
  website_url   TEXT,
  feed_url      TEXT,
  api_url       TEXT,
  source_type   news_source_type NOT NULL DEFAULT 'other',
  country       TEXT DEFAULT 'Ghana',
  region        TEXT,
  trust_level   TEXT DEFAULT 'unverified' CHECK (trust_level IN ('verified', 'unverified', 'internal')),
  status        news_source_status NOT NULL DEFAULT 'pending',
  description   TEXT,
  last_fetched_at TIMESTAMPTZ,
  fetch_error   TEXT,
  created_at    TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at    TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

ALTER TABLE news_sources ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "news_sources_select_public" ON news_sources;
CREATE POLICY "news_sources_select_public" ON news_sources FOR SELECT USING (status = 'active');
DROP POLICY IF EXISTS "news_sources_admin_all" ON news_sources;
CREATE POLICY "news_sources_admin_all" ON news_sources
  FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE INDEX IF NOT EXISTS idx_news_sources_status ON news_sources(status);
CREATE INDEX IF NOT EXISTS idx_news_sources_source_type ON news_sources(source_type);

-- 3. NEWS CATEGORIES
-- ----------------------------------------------------------------

CREATE TABLE IF NOT EXISTS news_categories (
  id            BIGSERIAL PRIMARY KEY,
  name          TEXT NOT NULL UNIQUE,
  slug          TEXT NOT NULL UNIQUE,
  description   TEXT,
  icon          TEXT,
  display_order INT DEFAULT 0,
  is_active     BOOLEAN DEFAULT true,
  created_at    TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

ALTER TABLE news_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "news_categories_select_public" ON news_categories;
CREATE POLICY "news_categories_select_public" ON news_categories FOR SELECT USING (is_active = true);
DROP POLICY IF EXISTS "news_categories_admin_all" ON news_categories;
CREATE POLICY "news_categories_admin_all" ON news_categories
  FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Seed default categories
INSERT INTO news_categories (name, slug, description, display_order) VALUES
  ('Agriculture News', 'agriculture-news', 'General agricultural developments', 1),
  ('Market Prices', 'market-prices', 'Commodity pricing and market data', 2),
  ('Crop Production', 'crop-production', 'Crop farming news and updates', 3),
  ('Livestock', 'livestock', 'Livestock farming news', 4),
  ('Poultry', 'poultry', 'Poultry farming news', 5),
  ('Fisheries', 'fisheries', 'Fishing and aquaculture news', 6),
  ('Farming Technology', 'farming-technology', 'AgTech and innovations', 7),
  ('Climate & Weather', 'climate-weather', 'Climate and weather information', 8),
  ('Government & Policy', 'government-policy', 'Government policies and regulations', 9),
  ('Trade & Export', 'trade-export', 'Import/export and trade developments', 10),
  ('Storage & Logistics', 'storage-logistics', 'Storage and transportation news', 11),
  ('Agricultural Finance', 'agricultural-finance', 'Funding, grants, and financial services', 12),
  ('Opportunities', 'opportunities', 'Programs, grants, and opportunities', 13),
  ('Research & Innovation', 'research-innovation', 'Research findings and innovations', 14)
ON CONFLICT (slug) DO NOTHING;

-- 4. NEWS ARTICLES
-- ----------------------------------------------------------------

CREATE TABLE IF NOT EXISTS news_articles (
  id              BIGSERIAL PRIMARY KEY,
  title           TEXT NOT NULL,
  slug            TEXT NOT NULL UNIQUE,
  summary         TEXT,
  content         TEXT,
  source_id       BIGINT REFERENCES news_sources(id) ON DELETE SET NULL,
  source_name     TEXT,
  source_url      TEXT,
  image_url       TEXT,
  category_id     BIGINT REFERENCES news_categories(id) ON DELETE SET NULL,
  tags            TEXT[] DEFAULT '{}',
  region          TEXT,
  country         TEXT DEFAULT 'Ghana',
  author_name     TEXT,
  status          news_article_status NOT NULL DEFAULT 'pending',
  is_featured     BOOLEAN DEFAULT false,
  ai_summary      TEXT,
  ai_generated    BOOLEAN DEFAULT false,
  view_count      INT DEFAULT 0,
  published_at    TIMESTAMPTZ,
  fetched_at      TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()),
  created_at      TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at      TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

ALTER TABLE news_articles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "news_articles_select_published" ON news_articles;
CREATE POLICY "news_articles_select_published" ON news_articles
  FOR SELECT USING (status = 'published');
DROP POLICY IF EXISTS "news_articles_admin_all" ON news_articles;
CREATE POLICY "news_articles_admin_all" ON news_articles
  FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE INDEX IF NOT EXISTS idx_news_articles_slug ON news_articles(slug);
CREATE INDEX IF NOT EXISTS idx_news_articles_status ON news_articles(status);
CREATE INDEX IF NOT EXISTS idx_news_articles_category ON news_articles(category_id);
CREATE INDEX IF NOT EXISTS idx_news_articles_published ON news_articles(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_news_articles_source ON news_articles(source_id);
CREATE INDEX IF NOT EXISTS idx_news_articles_featured ON news_articles(is_featured) WHERE is_featured = true;
CREATE INDEX IF NOT EXISTS idx_news_articles_tags ON news_articles USING GIN (tags);

-- Full-text search index
CREATE INDEX IF NOT EXISTS idx_news_articles_fts ON news_articles USING GIN (
  to_tsvector('english', coalesce(title, '') || ' ' || coalesce(summary, '') || ' ' || coalesce(content, ''))
);

-- 5. COMMODITIES
-- ----------------------------------------------------------------

CREATE TABLE IF NOT EXISTS commodities (
  id            BIGSERIAL PRIMARY KEY,
  name          TEXT NOT NULL UNIQUE,
  slug          TEXT NOT NULL UNIQUE,
  category      TEXT NOT NULL DEFAULT 'crops',
  unit          TEXT NOT NULL DEFAULT 'bag',
  image_url     TEXT,
  is_active     BOOLEAN DEFAULT true,
  display_order INT DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

ALTER TABLE commodities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "commodities_select_public" ON commodities;
CREATE POLICY "commodities_select_public" ON commodities FOR SELECT USING (is_active = true);
DROP POLICY IF EXISTS "commodities_admin_all" ON commodities;
CREATE POLICY "commodities_admin_all" ON commodities
  FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Seed default commodities
INSERT INTO commodities (name, slug, category, unit, display_order) VALUES
  ('Maize', 'maize', 'crops', 'bag (100kg)', 1),
  ('Rice', 'rice', 'crops', 'bag (50kg)', 2),
  ('Cassava', 'cassava', 'crops', 'bag (100kg)', 3),
  ('Yam', 'yam', 'crops', 'tuber', 4),
  ('Plantain', 'plantain', 'crops', 'bunch', 5),
  ('Tomato', 'tomato', 'crops', 'crate', 6),
  ('Pepper', 'pepper', 'crops', 'bag (50kg)', 7),
  ('Onion', 'onion', 'crops', 'bag (100kg)', 8),
  ('Cocoa', 'cocoa', 'crops', 'bag (64kg)', 9),
  ('Soybean', 'soybean', 'crops', 'bag (100kg)', 10),
  ('Groundnut', 'groundnut', 'crops', 'bag (50kg)', 11),
  ('Cowpea', 'cowpea', 'crops', 'bag (100kg)', 12),
  ('Poultry', 'poultry', 'livestock', 'kg', 13),
  ('Eggs', 'eggs', 'livestock', 'crate (30)', 14),
  ('Fish', 'fish', 'fisheries', 'kg', 15),
  ('Goat', 'goat', 'livestock', 'head', 16),
  ('Sheep', 'sheep', 'livestock', 'head', 17),
  ('Cattle', 'cattle', 'livestock', 'head', 18)
ON CONFLICT (slug) DO NOTHING;

-- 6. MARKET PRICES
-- ----------------------------------------------------------------

CREATE TABLE IF NOT EXISTS market_prices (
  id              BIGSERIAL PRIMARY KEY,
  commodity_id    BIGINT NOT NULL REFERENCES commodities(id) ON DELETE CASCADE,
  market_name     TEXT NOT NULL,
  region          TEXT,
  price           NUMERIC NOT NULL,
  currency        TEXT DEFAULT 'GHS',
  unit            TEXT NOT NULL,
  previous_price  NUMERIC,
  price_change    NUMERIC,
  price_change_pct NUMERIC,
  trend           price_trend DEFAULT 'unknown',
  source_id       BIGINT REFERENCES news_sources(id) ON DELETE SET NULL,
  data_date       DATE NOT NULL,
  fetched_at      TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

ALTER TABLE market_prices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "market_prices_select_public" ON market_prices;
CREATE POLICY "market_prices_select_public" ON market_prices FOR SELECT USING (true);
DROP POLICY IF EXISTS "market_prices_admin_all" ON market_prices;
CREATE POLICY "market_prices_admin_all" ON market_prices
  FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE INDEX IF NOT EXISTS idx_market_prices_commodity ON market_prices(commodity_id);
CREATE INDEX IF NOT EXISTS idx_market_prices_market ON market_prices(market_name);
CREATE INDEX IF NOT EXISTS idx_market_prices_date ON market_prices(data_date DESC);
CREATE INDEX IF NOT EXISTS idx_market_prices_commodity_date ON market_prices(commodity_id, data_date DESC);

-- 7. MARKET PRICE HISTORY (for trends/charts)
-- ----------------------------------------------------------------

CREATE TABLE IF NOT EXISTS market_price_history (
  id              BIGSERIAL PRIMARY KEY,
  commodity_id    BIGINT NOT NULL REFERENCES commodities(id) ON DELETE CASCADE,
  market_name     TEXT NOT NULL,
  avg_price       NUMERIC NOT NULL,
  min_price       NUMERIC,
  max_price       NUMERIC,
  currency        TEXT DEFAULT 'GHS',
  unit            TEXT NOT NULL,
  sample_count    INT DEFAULT 1,
  period_start    DATE NOT NULL,
  period_end      DATE NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

ALTER TABLE market_price_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "market_price_history_select_public" ON market_price_history;
CREATE POLICY "market_price_history_select_public" ON market_price_history FOR SELECT USING (true);
DROP POLICY IF EXISTS "market_price_history_admin_all" ON market_price_history;
CREATE POLICY "market_price_history_admin_all" ON market_price_history
  FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE INDEX IF NOT EXISTS idx_market_price_history_commodity ON market_price_history(commodity_id);
CREATE INDEX IF NOT EXISTS idx_market_price_history_period ON market_price_history(period_start DESC, period_end DESC);

-- 8. MARKET ALERTS (price alerts)
-- ----------------------------------------------------------------

CREATE TABLE IF NOT EXISTS market_alerts (
  id              BIGSERIAL PRIMARY KEY,
  user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  commodity_id    BIGINT NOT NULL REFERENCES commodities(id) ON DELETE CASCADE,
  market_name     TEXT,
  alert_type      TEXT NOT NULL CHECK (alert_type IN ('above', 'below')),
  threshold_price NUMERIC NOT NULL,
  is_active       BOOLEAN DEFAULT true,
  last_triggered_at TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

ALTER TABLE market_alerts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "market_alerts_select_own" ON market_alerts;
CREATE POLICY "market_alerts_select_own" ON market_alerts
  FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "market_alerts_insert_own" ON market_alerts;
CREATE POLICY "market_alerts_insert_own" ON market_alerts
  FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "market_alerts_update_own" ON market_alerts;
CREATE POLICY "market_alerts_update_own" ON market_alerts
  FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "market_alerts_delete_own" ON market_alerts;
CREATE POLICY "market_alerts_delete_own" ON market_alerts
  FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_market_alerts_user ON market_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_market_alerts_active ON market_alerts(is_active) WHERE is_active = true;

-- 9. AGRICULTURAL OPPORTUNITIES
-- ----------------------------------------------------------------

CREATE TABLE IF NOT EXISTS opportunities (
  id              BIGSERIAL PRIMARY KEY,
  title           TEXT NOT NULL,
  slug            TEXT NOT NULL UNIQUE,
  description     TEXT NOT NULL,
  organization    TEXT,
  opportunity_type TEXT DEFAULT 'other',
  location        TEXT,
  eligibility     TEXT,
  deadline        DATE,
  source_url      TEXT,
  source_id       BIGINT REFERENCES news_sources(id) ON DELETE SET NULL,
  image_url       TEXT,
  status          opportunity_status NOT NULL DEFAULT 'open',
  is_featured     BOOLEAN DEFAULT false,
  tags            TEXT[] DEFAULT '{}',
  published_at    TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()),
  created_at      TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at      TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

ALTER TABLE opportunities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "opportunities_select_published" ON opportunities;
CREATE POLICY "opportunities_select_published" ON opportunities
  FOR SELECT USING (status IN ('open', 'upcoming'));
DROP POLICY IF EXISTS "opportunities_admin_all" ON opportunities;
CREATE POLICY "opportunities_admin_all" ON opportunities
  FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE INDEX IF NOT EXISTS idx_opportunities_slug ON opportunities(slug);
CREATE INDEX IF NOT EXISTS idx_opportunities_status ON opportunities(status);
CREATE INDEX IF NOT EXISTS idx_opportunities_deadline ON opportunities(deadline);
CREATE INDEX IF NOT EXISTS idx_opportunities_type ON opportunities(opportunity_type);
CREATE INDEX IF NOT EXISTS idx_opportunities_featured ON opportunities(is_featured) WHERE is_featured = true;
CREATE INDEX IF NOT EXISTS idx_opportunities_tags ON opportunities USING GIN (tags);

-- 10. NEWS BOOKMARKS (reuse learning bookmark pattern)
-- ----------------------------------------------------------------

CREATE TABLE IF NOT EXISTS news_bookmarks (
  id          BIGSERIAL PRIMARY KEY,
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  article_id  BIGINT NOT NULL REFERENCES news_articles(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(user_id, article_id)
);

ALTER TABLE news_bookmarks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "news_bookmarks_select_own" ON news_bookmarks;
CREATE POLICY "news_bookmarks_select_own" ON news_bookmarks
  FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "news_bookmarks_insert_own" ON news_bookmarks;
CREATE POLICY "news_bookmarks_insert_own" ON news_bookmarks
  FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "news_bookmarks_delete_own" ON news_bookmarks;
CREATE POLICY "news_bookmarks_delete_own" ON news_bookmarks
  FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_news_bookmarks_user ON news_bookmarks(user_id);

-- 11. UPDATED-AT TRIGGERS
-- ----------------------------------------------------------------

CREATE OR REPLACE FUNCTION update_news_source_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc'::text, NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_news_source_updated ON news_sources;
CREATE TRIGGER on_news_source_updated
  BEFORE UPDATE ON news_sources
  FOR EACH ROW EXECUTE FUNCTION update_news_source_timestamp();

CREATE OR REPLACE FUNCTION update_news_article_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc'::text, NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_news_article_updated ON news_articles;
CREATE TRIGGER on_news_article_updated
  BEFORE UPDATE ON news_articles
  FOR EACH ROW EXECUTE FUNCTION update_news_article_timestamp();

CREATE OR REPLACE FUNCTION update_opportunity_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc'::text, NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_opportunity_updated ON opportunities;
CREATE TRIGGER on_opportunity_updated
  BEFORE UPDATE ON opportunities
  FOR EACH ROW EXECUTE FUNCTION update_opportunity_timestamp();

-- 12. NEWS VIEWS COUNTER TRIGGER
-- ----------------------------------------------------------------

CREATE OR REPLACE FUNCTION increment_news_view_count()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.view_count IS DISTINCT FROM OLD.view_count THEN
    NEW.view_count = OLD.view_count + 1;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
