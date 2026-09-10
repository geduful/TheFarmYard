import { createServiceSupabaseClient } from '@/lib/supabase/service';
import type { NotificationCategory, NotificationPriority, NotificationType } from '@/lib/types';

interface CreateNotificationParams {
  userId: string;
  type: NotificationType;
  category: NotificationCategory;
  title: string;
  message: string;
  priority?: NotificationPriority;
  actionUrl?: string;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
  deduplicationKey?: string;
}

/**
 * Create a notification using the database function for deduplication + preference checking.
 * Uses the service-role client to bypass RLS (called from server-side business logic).
 */
export async function createNotification(params: CreateNotificationParams): Promise<number | null> {
  const supabase = createServiceSupabaseClient();

  const { data, error } = await supabase.rpc('create_notification', {
    p_user_id: params.userId,
    p_type: params.type,
    p_category: params.category,
    p_title: params.title,
    p_message: params.message,
    p_priority: params.priority ?? 'normal',
    p_action_url: params.actionUrl ?? null,
    p_entity_type: params.entityType ?? null,
    p_entity_id: params.entityId ?? null,
    p_metadata: params.metadata ? JSON.stringify(params.metadata) : null,
    p_deduplication_key: params.deduplicationKey ?? null,
  });

  if (error) {
    console.error('Notification creation error:', error);
    return null;
  }

  return data as number | null;
}

/**
 * Notify multiple users (e.g., platform announcement to all users).
 */
export async function notifyMultipleUsers(
  userIds: string[],
  params: Omit<CreateNotificationParams, 'userId'>
): Promise<void> {
  const promises = userIds.map((userId) =>
    createNotification({ ...params, userId })
  );
  await Promise.allSettled(promises);
}

/**
 * Notify all users of a given role.
 */
export async function notifyRole(
  role: 'farmer' | 'buyer' | 'admin',
  params: Omit<CreateNotificationParams, 'userId'>
): Promise<void> {
  const supabase = createServiceSupabaseClient();

  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('id')
    .eq('role', role);

  if (error || !profiles) {
    console.error('Failed to fetch profiles for role notification:', error);
    return;
  }

  await notifyMultipleUsers(
    profiles.map((p) => p.id),
    params
  );
}

/**
 * Notify all users.
 */
export async function notifyAllUsers(
  params: Omit<CreateNotificationParams, 'userId'>
): Promise<void> {
  const supabase = createServiceSupabaseClient();

  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('id');

  if (error || !profiles) {
    console.error('Failed to fetch profiles for broadcast:', error);
    return;
  }

  await notifyMultipleUsers(
    profiles.map((p) => p.id),
    params
  );
}
