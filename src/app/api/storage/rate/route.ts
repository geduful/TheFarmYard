import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createServiceSupabaseClient } from '@/lib/supabase/service';
import { createNotification } from '@/lib/notifications';

/**
 * POST /api/storage/rate
 * Rate a completed storage booking.
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

    const { bookingId, rating, conditionRating, handlingRating, reliabilityRating, comment } = body;

    if (!bookingId || !rating) {
      return NextResponse.json({ error: 'bookingId and rating required.' }, { status: 400 });
    }

    if (rating < 1 || rating > 5) {
      return NextResponse.json({ error: 'Rating must be between 1 and 5.' }, { status: 400 });
    }

    const serviceClient = createServiceSupabaseClient();

    // Fetch booking
    const { data: booking, error: bookingError } = await serviceClient
      .from('storage_bookings')
      .select('id, facility_id, farmer_id, status')
      .eq('id', bookingId)
      .single();

    if (bookingError || !booking) {
      return NextResponse.json({ error: 'Booking not found.' }, { status: 404 });
    }

    if (booking.farmer_id !== user.id) {
      return NextResponse.json({ error: 'Not your booking.' }, { status: 403 });
    }

    if (booking.status !== 'checked_out') {
      return NextResponse.json({ error: 'Can only rate completed bookings.' }, { status: 400 });
    }

    // Check for duplicate rating
    const { data: existingRating } = await serviceClient
      .from('storage_ratings')
      .select('id')
      .eq('booking_id', bookingId)
      .eq('farmer_id', user.id)
      .single();

    if (existingRating) {
      return NextResponse.json({ error: 'You have already rated this booking.' }, { status: 400 });
    }

    // Insert rating (unique constraint on facility_id + booking_id prevents duplicates)
    const { error: insertError } = await serviceClient
      .from('storage_ratings')
      .insert({
        facility_id: booking.facility_id,
        farmer_id: user.id,
        booking_id: bookingId,
        rating,
        condition_rating: conditionRating || null,
        handling_rating: handlingRating || null,
        reliability_rating: reliabilityRating || null,
        comment: comment?.trim() || null,
      });

    if (insertError) {
      if (insertError.code === '23505') {
        return NextResponse.json({ error: 'You have already rated this booking.' }, { status: 400 });
      }
      throw insertError;
    }

    // Notify facility owner
    const { data: facility } = await serviceClient
      .from('storage_facilities')
      .select('owner_id, name')
      .eq('id', booking.facility_id)
      .single();

    if (facility?.owner_id) {
      await createNotification({
        userId: facility.owner_id,
        type: 'new_rating',
        category: 'reputation',
        title: 'New Storage Rating',
        message: `A farmer rated your facility "${facility.name}" ${rating}/5 stars.`,
        priority: 'normal',
        actionUrl: `/dashboard/farmer/storage/operator/${booking.facility_id}`,
        entityType: 'storage_rating',
        entityId: String(bookingId),
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Storage rating error:', error);
    return NextResponse.json({ error: 'Rating failed.' }, { status: 500 });
  }
}
