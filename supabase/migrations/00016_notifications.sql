-- Migration 00016: Notifications & Alert Intelligence
-- Creates notifications and notification_preferences tables with RLS.

-- 1. Notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'normal',
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  action_url TEXT,
  entity_type TEXT,
  entity_id TEXT,
  metadata JSONB,
  deduplication_key TEXT
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read_at ON notifications(read_at);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id) WHERE read_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_notifications_dedup ON notifications(deduplication_key) WHERE deduplication_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_notifications_category ON notifications(category);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS notifications_select_own ON notifications;
CREATE POLICY notifications_select_own ON notifications
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS notifications_insert_own ON notifications;
CREATE POLICY notifications_insert_own ON notifications
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS notifications_update_own ON notifications;
CREATE POLICY notifications_update_own ON notifications
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS notifications_delete_own ON notifications;
CREATE POLICY notifications_delete_own ON notifications
  FOR DELETE USING (auth.uid() = user_id);

-- Admins can insert notifications for any user (platform announcements)
DROP POLICY IF EXISTS notifications_insert_admin ON notifications;
CREATE POLICY notifications_insert_admin ON notifications
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- 2. Notification preferences table
CREATE TABLE IF NOT EXISTS notification_preferences (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  marketplace_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  buyer_requests_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  matching_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  orders_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  verification_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  reputation_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  logistics_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  storage_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  market_intelligence_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  news_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  learning_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  platform_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notification_prefs_user ON notification_preferences(user_id);

ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS np_select_own ON notification_preferences;
CREATE POLICY np_select_own ON notification_preferences
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS np_insert_own ON notification_preferences;
CREATE POLICY np_insert_own ON notification_preferences
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS np_update_own ON notification_preferences;
CREATE POLICY np_update_own ON notification_preferences
  FOR UPDATE USING (auth.uid() = user_id);

-- 3. Function: generate deduplication key
CREATE OR REPLACE FUNCTION generate_notification_dedup_key(
  p_user_id UUID,
  p_type TEXT,
  p_entity_type TEXT,
  p_entity_id TEXT
) RETURNS TEXT AS $$
BEGIN
  RETURN p_user_id::TEXT || ':' || p_type || ':' || COALESCE(p_entity_type, '') || ':' || COALESCE(p_entity_id, '');
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 4. Function: create notification with deduplication
CREATE OR REPLACE FUNCTION create_notification(
  p_user_id UUID,
  p_type TEXT,
  p_category TEXT,
  p_title TEXT,
  p_message TEXT,
  p_priority TEXT DEFAULT 'normal',
  p_action_url TEXT DEFAULT NULL,
  p_entity_type TEXT DEFAULT NULL,
  p_entity_id TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT NULL,
  p_deduplication_key TEXT DEFAULT NULL
) RETURNS BIGINT AS $$
DECLARE
  v_id BIGINT;
  v_key TEXT;
BEGIN
  -- Check if preferences exist and if category is enabled
  IF NOT EXISTS (
    SELECT 1 FROM notification_preferences WHERE user_id = p_user_id
  ) THEN
    INSERT INTO notification_preferences (user_id) VALUES (p_user_id);
  END IF;

  -- Check category preference
  IF (
    CASE p_category
      WHEN 'marketplace' THEN (SELECT marketplace_enabled FROM notification_preferences WHERE user_id = p_user_id)
      WHEN 'buyer_requests' THEN (SELECT buyer_requests_enabled FROM notification_preferences WHERE user_id = p_user_id)
      WHEN 'matching' THEN (SELECT matching_enabled FROM notification_preferences WHERE user_id = p_user_id)
      WHEN 'orders' THEN (SELECT orders_enabled FROM notification_preferences WHERE user_id = p_user_id)
      WHEN 'verification' THEN (SELECT verification_enabled FROM notification_preferences WHERE user_id = p_user_id)
      WHEN 'reputation' THEN (SELECT reputation_enabled FROM notification_preferences WHERE user_id = p_user_id)
      WHEN 'logistics' THEN (SELECT logistics_enabled FROM notification_preferences WHERE user_id = p_user_id)
      WHEN 'storage' THEN (SELECT storage_enabled FROM notification_preferences WHERE user_id = p_user_id)
      WHEN 'market_intelligence' THEN (SELECT market_intelligence_enabled FROM notification_preferences WHERE user_id = p_user_id)
      WHEN 'news' THEN (SELECT news_enabled FROM notification_preferences WHERE user_id = p_user_id)
      WHEN 'learning' THEN (SELECT learning_enabled FROM notification_preferences WHERE user_id = p_user_id)
      WHEN 'platform' THEN (SELECT platform_enabled FROM notification_preferences WHERE user_id = p_user_id)
      ELSE TRUE
    END = FALSE
  ) THEN
    RETURN NULL;
  END IF;

  -- Generate dedup key
  v_key := COALESCE(
    p_deduplication_key,
    generate_notification_dedup_key(p_user_id, p_type, p_entity_type, p_entity_id)
  );

  -- Check for duplicate
  IF v_key IS NOT NULL AND EXISTS (
    SELECT 1 FROM notifications WHERE deduplication_key = v_key AND user_id = p_user_id
  ) THEN
    RETURN NULL;
  END IF;

  -- Insert notification
  INSERT INTO notifications (
    user_id, type, category, title, message, priority,
    action_url, entity_type, entity_id, metadata, deduplication_key
  ) VALUES (
    p_user_id, p_type, p_category, p_title, p_message, p_priority,
    p_action_url, p_entity_type, p_entity_id, p_metadata, v_key
  ) RETURNING id INTO v_id;

  RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Function: auto-create notification preferences on user creation
CREATE OR REPLACE FUNCTION handle_new_notification_preferences()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO notification_preferences (user_id) VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_profile_created ON profiles;
CREATE TRIGGER on_profile_created
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_notification_preferences();

-- 6. Seed preferences for existing users
INSERT INTO notification_preferences (user_id)
SELECT id FROM profiles
WHERE id NOT IN (SELECT user_id FROM notification_preferences)
ON CONFLICT (user_id) DO NOTHING;
