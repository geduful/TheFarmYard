import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createServiceSupabaseClient } from '@/lib/supabase/service';
import { createNotification } from '@/lib/notifications';

/**
 * POST /api/storage/book
 * Server-side booking with capacity validation.
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

    const { facilityId, produceName, category, quantity, quantityUnit, storageStart, storageEnd, specialNotes } = body;

    if (!facilityId || !produceName || !quantity || !storageStart || !storageEnd) {
      return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 });
    }

    if (quantity <= 0) {
      return NextResponse.json({ error: 'Quantity must be positive.' }, { status: 400 });
    }

    if (new Date(storageEnd) <= new Date(storageStart)) {
      return NextResponse.json({ error: 'End date must be after start date.' }, { status: 400 });
    }

    const serviceClient = createServiceSupabaseClient();

    // Fetch facility with lock
    const { data: facility, error: facilityError } = await serviceClient
      .from('storage_facilities')
      .select('id, name, available_capacity, capacity_unit, price_per_unit, is_approved, status, supported_crops, owner_id')
      .eq('id', facilityId)
      .single();

    if (facilityError || !facility) {
      return NextResponse.json({ error: 'Facility not found.' }, { status: 404 });
    }

    if (!facility.is_approved || facility.status !== 'active') {
      return NextResponse.json({ error: 'Facility is not available.' }, { status: 400 });
    }

    if (quantity > facility.available_capacity) {
      return NextResponse.json({
        error: `Insufficient capacity. Available: ${facility.available_capacity} ${facility.capacity_unit}, Requested: ${quantity} ${quantityUnit || facility.capacity_unit}`,
      }, { status: 400 });
    }

    // Check crop support if specified
    if (facility.supported_crops && facility.supported_crops.length > 0 && category) {
      const cropSupported = (facility.supported_crops as string[]).some(
        (c) => c.toLowerCase() === category.toLowerCase()
      );
      if (!cropSupported) {
        return NextResponse.json({ error: `This facility does not support storing ${category}.` }, { status: 400 });
      }
    }

    // Calculate fee server-side
    const start = new Date(storageStart);
    const end = new Date(storageEnd);
    const days = Math.max(Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)), 1);
    const totalFee = Math.round(facility.price_per_unit * quantity * days * 100) / 100;

    // Create booking (capacity trigger validates)
    const { data: booking, error: bookingError } = await serviceClient
      .from('storage_bookings')
      .insert({
        facility_id: facilityId,
        farmer_id: user.id,
        produce_name: produceName.trim(),
        category: category || null,
        quantity,
        quantity_unit: quantityUnit || facility.capacity_unit,
        storage_start: storageStart,
        storage_end: storageEnd,
        total_fee: totalFee,
        currency: 'GHS',
        special_notes: specialNotes?.trim() || null,
        status: 'pending',
      })
      .select('id')
      .single();

    if (bookingError) {
      if (bookingError.message.includes('Insufficient capacity')) {
        return NextResponse.json({ error: bookingError.message }, { status: 400 });
      }
      return NextResponse.json({ error: bookingError.message }, { status: 500 });
    }

    // Notify farmer
    await createNotification({
      userId: user.id,
      type: 'booking_created',
      category: 'storage',
      title: 'Storage Booking Submitted',
      message: `Your booking request for ${facility.name} has been submitted. Estimated cost: GH₵ ${totalFee.toLocaleString()}.`,
      priority: 'normal',
      actionUrl: '/dashboard/farmer/storage',
      entityType: 'storage_booking',
      entityId: String(booking.id),
    });

    // Notify operator if exists
    if (facility.owner_id) {
      await createNotification({
        userId: facility.owner_id,
        type: 'booking_created',
        category: 'storage',
        title: 'New Storage Booking',
        message: `A farmer has submitted a booking request for ${facility.name}.`,
        priority: 'high',
        actionUrl: `/dashboard/farmer/storage/operator/${facilityId}`,
        entityType: 'storage_booking',
        entityId: String(booking.id),
      });
    }

    return NextResponse.json({ ok: true, bookingId: booking.id, totalFee });
  } catch (error) {
    console.error('Storage booking error:', error);
    return NextResponse.json({ error: 'Booking failed.' }, { status: 500 });
  }
}
