import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createServiceSupabaseClient } from '@/lib/supabase/service';

/**
 * POST /api/storage/facility
 * Create or update a storage facility (operator).
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: profile } = await supabase
      .from('profiles').select('role').eq('id', user.id).single();
    if (profile?.role !== 'farmer' && profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Only farmers or admins can manage facilities.' }, { status: 403 });
    }

    let body;
    try { body = await request.json(); } catch {
      return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 });
    }

    const {
      facilityId, name, facilityType, location, address, description,
      capacityUnit, totalCapacity, pricePerUnit, pricingModel,
      contactName, contactPhone, contactEmail,
      hasClimateControl, hasSecurity, hasLoadingDock,
      supportedCrops, operatingHours, imageUrl,
    } = body;

    if (!name || !facilityType || !location || !totalCapacity || !pricePerUnit) {
      return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 });
    }

    const serviceClient = createServiceSupabaseClient();

    const facilityData = {
      name: name.trim(),
      facility_type: facilityType,
      location: location.trim(),
      address: address?.trim() || null,
      description: description?.trim() || null,
      capacity_unit: capacityUnit || 'kg',
      total_capacity: totalCapacity,
      available_capacity: totalCapacity,
      price_per_unit: pricePerUnit,
      pricing_model: pricingModel || 'per_unit_day',
      contact_name: contactName?.trim() || null,
      contact_phone: contactPhone?.trim() || null,
      contact_email: contactEmail?.trim() || null,
      has_climate_control: hasClimateControl || false,
      has_security: hasSecurity || false,
      has_loading_dock: hasLoadingDock || false,
      supported_crops: supportedCrops || [],
      operating_hours: operatingHours?.trim() || null,
      image_url: imageUrl?.trim() || null,
      owner_id: user.id,
      is_approved: false,
      status: 'active' as const,
    };

    if (facilityId) {
      // Update existing — verify ownership
      const { data: existing } = await serviceClient
        .from('storage_facilities')
        .select('owner_id')
        .eq('id', facilityId)
        .single();

      if (!existing) {
        return NextResponse.json({ error: 'Facility not found.' }, { status: 404 });
      }

      if (existing.owner_id !== user.id && profile?.role !== 'admin') {
        return NextResponse.json({ error: 'Not authorized to edit this facility.' }, { status: 403 });
      }

      // Don't override available_capacity on edit
      const { available_capacity, ...updateData } = facilityData;

      const { error } = await serviceClient
        .from('storage_facilities')
        .update(updateData)
        .eq('id', facilityId);

      if (error) throw error;
      return NextResponse.json({ ok: true, facilityId });
    } else {
      // Create new
      const { data, error } = await serviceClient
        .from('storage_facilities')
        .insert(facilityData)
        .select('id')
        .single();

      if (error) throw error;
      return NextResponse.json({ ok: true, facilityId: data.id });
    }
  } catch (error) {
    console.error('Storage facility error:', error);
    return NextResponse.json({ error: 'Failed to save facility.' }, { status: 500 });
  }
}

/**
 * PATCH /api/storage/facility
 * Update facility status/capacity (operator or admin).
 */
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    let body;
    try { body = await request.json(); } catch {
      return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 });
    }

    const { facilityId, status, availableCapacity, isApproved } = body;
    if (!facilityId) {
      return NextResponse.json({ error: 'facilityId required.' }, { status: 400 });
    }

    const serviceClient = createServiceSupabaseClient();

    const { data: profile } = await supabase
      .from('profiles').select('role').eq('id', user.id).single();

    // Verify ownership
    const { data: facility } = await serviceClient
      .from('storage_facilities')
      .select('owner_id')
      .eq('id', facilityId)
      .single();

    if (!facility) {
      return NextResponse.json({ error: 'Facility not found.' }, { status: 404 });
    }

    if (facility.owner_id !== user.id && profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Not authorized.' }, { status: 403 });
    }

    const updates: Record<string, unknown> = {};
    if (status) updates.status = status;
    if (availableCapacity !== undefined) {
      // Only admin can override capacity directly
      if (profile?.role !== 'admin') {
        return NextResponse.json({ error: 'Only admin can directly set capacity.' }, { status: 403 });
      }
      updates.available_capacity = availableCapacity;
    }
    if (isApproved !== undefined && profile?.role === 'admin') {
      updates.is_approved = isApproved;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No fields to update.' }, { status: 400 });
    }

    const { error } = await serviceClient
      .from('storage_facilities')
      .update(updates)
      .eq('id', facilityId);

    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Storage facility update error:', error);
    return NextResponse.json({ error: 'Update failed.' }, { status: 500 });
  }
}
