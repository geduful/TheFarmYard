-- ─────────────────────────────────────────────────────────────────────────────
-- MIGRATION 00014: LEARNING HUB
-- ─────────────────────────────────────────────────────────────────────────────
-- Tables:
--   learning_categories   – Extensible content categories
--   learning_resources    – Educational content (articles, guides, etc.)
--   learning_bookmarks    – User saved resources
--   learning_progress     – User reading/completion progress
-- ─────────────────────────────────────────────────────────────────────────────

-- ─── ENUM TYPES ─────────────────────────────────────────────────────────────

CREATE TYPE learning_content_type AS ENUM (
  'article',
  'guide',
  'tutorial',
  'video',
  'checklist',
  'faq'
);

CREATE TYPE learning_difficulty AS ENUM (
  'beginner',
  'intermediate',
  'advanced'
);

CREATE TYPE learning_resource_status AS ENUM (
  'draft',
  'published',
  'archived'
);

CREATE TYPE learning_progress_status AS ENUM (
  'not_started',
  'in_progress',
  'completed'
);

-- ─── LEARNING CATEGORIES ────────────────────────────────────────────────────

CREATE TABLE learning_categories (
  id              BIGSERIAL PRIMARY KEY,
  name            TEXT NOT NULL UNIQUE,
  slug            TEXT NOT NULL UNIQUE,
  description     TEXT,
  icon            TEXT,                               -- SVG path or icon name
  display_order   INT DEFAULT 0,
  is_active       BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE learning_categories ENABLE ROW LEVEL SECURITY;

-- Public can read active categories
CREATE POLICY "lc_select_public" ON learning_categories
  FOR SELECT USING (is_active = true);

-- Admin can do everything
CREATE POLICY "lc_admin_all" ON learning_categories
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ─── LEARNING RESOURCES ─────────────────────────────────────────────────────

CREATE TABLE learning_resources (
  id                BIGSERIAL PRIMARY KEY,
  title             TEXT NOT NULL,
  slug              TEXT NOT NULL UNIQUE,
  summary           TEXT,                               -- short description
  content           TEXT NOT NULL,                       -- HTML/markdown content
  category_id       BIGINT REFERENCES learning_categories(id) ON DELETE SET NULL,
  content_type      learning_content_type DEFAULT 'article',
  difficulty        learning_difficulty DEFAULT 'beginner',
  reading_time_min  INT DEFAULT 5,                      -- estimated minutes
  author_name       TEXT,                               -- display author
  author_id         UUID REFERENCES profiles(id) ON DELETE SET NULL,
  featured_image    TEXT,                               -- URL
  tags              TEXT[] DEFAULT '{}',
  status            learning_resource_status DEFAULT 'draft',
  is_featured       BOOLEAN DEFAULT false,
  view_count        INT DEFAULT 0,
  published_at      TIMESTAMPTZ,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- Index for public queries (published resources only)
CREATE INDEX idx_lr_published ON learning_resources (status, published_at DESC) WHERE status = 'published';
CREATE INDEX idx_lr_category ON learning_resources (category_id) WHERE status = 'published';
CREATE INDEX idx_lr_slug ON learning_resources (slug);
CREATE INDEX idx_lr_tags ON learning_resources USING GIN (tags);

ALTER TABLE learning_resources ENABLE ROW LEVEL SECURITY;

-- Public can read published resources
CREATE POLICY "lr_select_published" ON learning_resources
  FOR SELECT USING (status = 'published');

-- Admin can read all resources
CREATE POLICY "lr_select_admin" ON learning_resources
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Admin can insert resources
CREATE POLICY "lr_insert_admin" ON learning_resources
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Admin can update resources
CREATE POLICY "lr_update_admin" ON learning_resources
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Admin can delete resources
CREATE POLICY "lr_delete_admin" ON learning_resources
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Updated-at trigger
CREATE OR REPLACE FUNCTION update_learning_resource_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_learning_resources_updated_at
  BEFORE UPDATE ON learning_resources
  FOR EACH ROW EXECUTE FUNCTION update_learning_resource_updated_at();

-- ─── LEARNING BOOKMARKS ─────────────────────────────────────────────────────

CREATE TABLE learning_bookmarks (
  id              BIGSERIAL PRIMARY KEY,
  user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  resource_id     BIGINT NOT NULL REFERENCES learning_resources(id) ON DELETE CASCADE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, resource_id)
);

ALTER TABLE learning_bookmarks ENABLE ROW LEVEL SECURITY;

-- User can read own bookmarks
CREATE POLICY "lb_select_own" ON learning_bookmarks
  FOR SELECT USING (auth.uid() = user_id);

-- User can insert own bookmarks
CREATE POLICY "lb_insert_own" ON learning_bookmarks
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- User can delete own bookmarks
CREATE POLICY "lb_delete_own" ON learning_bookmarks
  FOR DELETE USING (auth.uid() = user_id);

-- ─── LEARNING PROGRESS ──────────────────────────────────────────────────────

CREATE TABLE learning_progress (
  id              BIGSERIAL PRIMARY KEY,
  user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  resource_id     BIGINT NOT NULL REFERENCES learning_resources(id) ON DELETE CASCADE,
  status          learning_progress_status DEFAULT 'not_started',
  progress_pct    INT DEFAULT 0 CHECK (progress_pct >= 0 AND progress_pct <= 100),
  last_read_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, resource_id)
);

ALTER TABLE learning_progress ENABLE ROW LEVEL SECURITY;

-- User can read own progress
CREATE POLICY "lp_select_own" ON learning_progress
  FOR SELECT USING (auth.uid() = user_id);

-- User can insert own progress
CREATE POLICY "lp_insert_own" ON learning_progress
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- User can update own progress
CREATE POLICY "lp_update_own" ON learning_progress
  FOR UPDATE USING (auth.uid() = user_id);

-- Updated-at trigger
CREATE OR REPLACE FUNCTION update_learning_progress_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_learning_progress_updated_at
  BEFORE UPDATE ON learning_progress
  FOR EACH ROW EXECUTE FUNCTION update_learning_progress_updated_at();
