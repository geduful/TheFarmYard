-- Migration 00017: Notification Security Hardening
-- Fixes: SECURITY DEFINER search_path, removes admin bypass policy, adds rate limit function.

-- 1. Recreate create_notification with fixed search_path
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

  -- Check category preference (skip for platform — always deliver)
  IF p_category != 'platform' AND (
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2. Remove the admin insert policy that bypasses RLS + preferences + deduplication
DROP POLICY IF EXISTS notifications_insert_admin ON notifications;

-- 3. Rate limit function: max 20 notifications per user per hour via client trigger
CREATE OR REPLACE FUNCTION check_notification_rate_limit(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_count BIGINT;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM notifications
  WHERE user_id = p_user_id
    AND created_at > NOW() - INTERVAL '1 hour';
  RETURN v_count < 20;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
