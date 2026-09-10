-- Migration 00021: Notification Category Cleanup
-- Consolidates 12 notification categories down to 8:
--   - Merge buyer_requests + matching INTO marketplace
--   - Remove market_intelligence, news, learning (dead categories, never triggered)

-- ============================================================
-- 1. Merge buyer_requests and matching INTO marketplace
-- ============================================================
-- Before dropping the columns, ensure marketplace_enabled is TRUE if
-- any of the three (marketplace, buyer_requests, matching) was enabled.
UPDATE notification_preferences
SET marketplace_enabled = TRUE
WHERE marketplace_enabled = FALSE
  AND (buyer_requests_enabled = TRUE OR matching_enabled = TRUE);

-- ============================================================
-- 2. Drop dead/merged columns from notification_preferences
-- ============================================================
ALTER TABLE notification_preferences DROP COLUMN IF EXISTS buyer_requests_enabled;
ALTER TABLE notification_preferences DROP COLUMN IF EXISTS matching_enabled;
ALTER TABLE notification_preferences DROP COLUMN IF EXISTS market_intelligence_enabled;
ALTER TABLE notification_preferences DROP COLUMN IF EXISTS news_enabled;
ALTER TABLE notification_preferences DROP COLUMN IF EXISTS learning_enabled;

-- ============================================================
-- 3. Update create_notification() function
-- ============================================================
-- Remove CASE branches for dropped categories.
-- Existing notifications with old categories still display (no data loss).
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
  -- Auto-create preferences if none exist
  IF NOT EXISTS (
    SELECT 1 FROM notification_preferences WHERE user_id = p_user_id
  ) THEN
    INSERT INTO notification_preferences (user_id) VALUES (p_user_id);
  END IF;

  -- Check category preference (8 active categories)
  IF (
    CASE p_category
      WHEN 'marketplace' THEN (SELECT marketplace_enabled FROM notification_preferences WHERE user_id = p_user_id)
      WHEN 'orders' THEN (SELECT orders_enabled FROM notification_preferences WHERE user_id = p_user_id)
      WHEN 'verification' THEN (SELECT verification_enabled FROM notification_preferences WHERE user_id = p_user_id)
      WHEN 'reputation' THEN (SELECT reputation_enabled FROM notification_preferences WHERE user_id = p_user_id)
      WHEN 'logistics' THEN (SELECT logistics_enabled FROM notification_preferences WHERE user_id = p_user_id)
      WHEN 'storage' THEN (SELECT storage_enabled FROM notification_preferences WHERE user_id = p_user_id)
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
