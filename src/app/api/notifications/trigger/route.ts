import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createServiceSupabaseClient } from '@/lib/supabase/service';
import { createNotification } from '@/lib/notifications';
import type { NotificationType, NotificationCategory, NotificationPriority } from '@/lib/types';

const ALLOWED_CLIENT_TYPES = new Set([
  'new_rating', 'booking_created', 'booking_confirmed',
  'booking_rejected', 'booking_stored', 'booking_checked_out',
  'order_created', 'order_payment_received', 'order_released',
  'listing_approved', 'buyer_request_matched',
  'verification_approved', 'verification_rejected', 'tier_changed',
  'shipment_created', 'shipment_pickup_scheduled', 'shipment_assigned',
  'shipment_in_transit', 'shipment_out_for_delivery', 'shipment_delivered',
  'shipment_delivery_confirmed', 'shipment_delivery_issue',
  'shipment_cancelled', 'shipment_failed',
]);

/**
 * POST /api/notifications/trigger
 * Client calls this after a business event to create a notification.
 * Rate-limited: max 20 notifications per user per hour.
 * Restricted types: only business event types allowed for clients.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    let body;
    try { body = await request.json(); } catch {
      return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 });
    }

    const { type, category, title, message, priority, actionUrl, entityType, entityId } = body;

    if (!type || !category || !title || !message) {
      return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 });
    }

    // Only allow known business event types for clients
    if (!ALLOWED_CLIENT_TYPES.has(type)) {
      return NextResponse.json({ error: 'Invalid notification type.' }, { status: 400 });
    }

    // Rate limit check via database function
    const serviceClient = createServiceSupabaseClient();
    const { data: rateOk } = await serviceClient
      .rpc('check_notification_rate_limit', { p_user_id: user.id });
    if (rateOk === false) {
      return NextResponse.json({ error: 'Rate limit exceeded. Try again later.' }, { status: 429 });
    }

    const id = await createNotification({
      userId: user.id,
      type: type as NotificationType,
      category: category as NotificationCategory,
      title,
      message,
      priority: (priority as NotificationPriority) || 'normal',
      actionUrl,
      entityType,
      entityId: entityId ? String(entityId) : undefined,
    });

    return NextResponse.json({ id });
  } catch (error) {
    console.error('Notification trigger error:', error);
    return NextResponse.json({ error: 'Failed to create notification.' }, { status: 500 });
  }
}
