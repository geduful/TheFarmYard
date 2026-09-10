import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createServiceSupabaseClient } from '@/lib/supabase/service';
import { createNotification } from '@/lib/notifications';
import type { NotificationType } from '@/lib/types';

const VALID_TRANSITIONS: Record<string, string[]> = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['checked_in', 'cancelled'],
  checked_in: ['stored'],
  stored: ['checked_out'],
};

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  checked_in: 'Checked In',
  stored: 'Stored',
  checked_out: 'Checked Out',
  cancelled: 'Cancelled',
};

/**
 * POST /api/storage-bookings/update
 * Server-side storage booking status update with notifications.
 * Requires admin role.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: profile } = await supabase
      .from('profiles').select('role').eq('id', user.id).single();
    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required.' }, { status: 403 });
    }

    let body;
    try { body = await request.json(); } catch {
      return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 });
    }

    const { bookingId, newStatus } = body;
    if (!bookingId || !newStatus) {
      return NextResponse.json({ error: 'bookingId and newStatus required.' }, { status: 400 });
    }

    if (!['confirmed', 'cancelled', 'stored', 'checked_out'].includes(newStatus)) {
      return NextResponse.json({ error: 'Invalid status.' }, { status: 400 });
    }

    const serviceClient = createServiceSupabaseClient();

    // Fetch current booking
    const { data: booking, error: fetchError } = await serviceClient
      .from('storage_bookings')
      .select('id, status, user_id, facility_id, storage_facilities(name)')
      .eq('id', bookingId)
      .single();

    if (fetchError || !booking) {
      return NextResponse.json({ error: 'Booking not found.' }, { status: 404 });
    }

    // Validate transition
    const allowed = VALID_TRANSITIONS[booking.status];
    if (!allowed || !allowed.includes(newStatus)) {
      return NextResponse.json({
        error: `Cannot transition from "${STATUS_LABELS[booking.status]}" to "${STATUS_LABELS[newStatus]}".`
      }, { status: 400 });
    }

    // Update
    const updateData: Record<string, unknown> = { status: newStatus };
    if (newStatus === 'checked_out') {
      updateData.checked_out_at = new Date().toISOString();
    }

    const { error: updateError } = await serviceClient
      .from('storage_bookings')
      .update(updateData)
      .eq('id', bookingId)
      .eq('status', booking.status);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    const facilityName = booking.storage_facilities
      && typeof booking.storage_facilities === 'object'
      && 'name' in booking.storage_facilities
      ? (booking.storage_facilities as { name: string }).name
      : 'your facility';

    // Notify farmer of status change
    const notifMessages: Record<string, { title: string; message: string; priority: 'normal' | 'high' }> = {
      confirmed: {
        title: 'Booking Confirmed',
        message: `Your storage booking for "${facilityName}" has been confirmed.`,
        priority: 'high',
      },
      cancelled: {
        title: 'Booking Rejected',
        message: `Your storage booking for "${facilityName}" has been rejected.`,
        priority: 'high',
      },
      stored: {
        title: 'Goods Stored',
        message: `Your goods at "${facilityName}" have been marked as stored.`,
        priority: 'normal',
      },
      checked_out: {
        title: 'Booking Complete',
        message: `Your booking at "${facilityName}" has been checked out.`,
        priority: 'normal',
      },
    };

    const notif = notifMessages[newStatus];
    if (notif) {
      createNotification({
        userId: booking.user_id,
        type: `storage_booking_${newStatus}` as NotificationType,
        category: 'storage',
        title: notif.title,
        message: notif.message,
        priority: notif.priority,
        actionUrl: `/dashboard/farmer/storage`,
        entityType: 'storage_booking',
        entityId: String(bookingId),
      });
    }

    return NextResponse.json({ ok: true, status: newStatus });
  } catch (error) {
    console.error('Storage booking update error:', error);
    return NextResponse.json({ error: 'Update failed.' }, { status: 500 });
  }
}
