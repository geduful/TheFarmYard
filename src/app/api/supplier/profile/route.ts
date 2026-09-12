import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createServiceSupabaseClient } from '@/lib/supabase/service';
import { createNotification } from '@/lib/notifications';

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    if (profile?.role !== 'farmer' && profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { data: supplier } = await supabase
      .from('supplier_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    return NextResponse.json({ supplier: supplier || null });
  } catch (error) {
    console.error('Supplier profile GET error:', error);
    return NextResponse.json({ error: 'Failed.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    if (profile?.role !== 'farmer' && profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Only farmers can become suppliers.' }, { status: 403 });
    }

    const existing = await supabase
      .from('supplier_profiles')
      .select('id, verification_status')
      .eq('user_id', user.id)
      .single();
    if (existing.data) {
      return NextResponse.json({ error: 'You already have a supplier profile.', status: existing.data.verification_status }, { status: 409 });
    }

    let body: Record<string, unknown>;
    try { body = await request.json(); } catch {
      return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 });
    }

    const businessName = String(body.business_name || '').trim();
    const businessLocation = String(body.business_location || '').trim();
    if (!businessName || !businessLocation) {
      return NextResponse.json({ error: 'Business name and location are required.' }, { status: 400 });
    }

    const serviceClient = createServiceSupabaseClient();
    const { data: supplier, error } = await serviceClient
      .from('supplier_profiles')
      .insert({
        user_id: user.id,
        business_name: businessName,
        business_description: body.business_description ? String(body.business_description).trim() : null,
        supplier_category: body.supplier_category || 'other_agricultural_inputs',
        business_location: businessLocation,
        contact_phone: body.contact_phone ? String(body.contact_phone).trim() : null,
        contact_email: body.contact_email ? String(body.contact_email).trim() : null,
        operating_areas: Array.isArray(body.operating_areas) ? body.operating_areas : null,
      })
      .select('*')
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    await createNotification({
      userId: user.id,
      type: 'supplier_application_submitted',
      category: 'supply',
      title: 'Supplier Application Submitted',
      message: `Your supplier application for "${businessName}" has been submitted. Our team will review it shortly.`,
      priority: 'normal',
      actionUrl: '/dashboard/supplier',
      entityType: 'supplier_profile',
      entityId: supplier.id,
    });

    return NextResponse.json({ supplier });
  } catch (error) {
    console.error('Supplier profile POST error:', error);
    return NextResponse.json({ error: 'Failed.' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    let body: Record<string, unknown>;
    try { body = await request.json(); } catch {
      return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 });
    }

    const serviceClient = createServiceSupabaseClient();
    const updates: Record<string, unknown> = {};
    if (body.business_name) updates.business_name = String(body.business_name).trim();
    if (body.business_description !== undefined) updates.business_description = body.business_description ? String(body.business_description).trim() : null;
    if (body.supplier_category) updates.supplier_category = body.supplier_category;
    if (body.business_location) updates.business_location = String(body.business_location).trim();
    if (body.contact_phone !== undefined) updates.contact_phone = body.contact_phone ? String(body.contact_phone).trim() : null;
    if (body.contact_email !== undefined) updates.contact_email = body.contact_email ? String(body.contact_email).trim() : null;
    if (Array.isArray(body.operating_areas)) updates.operating_areas = body.operating_areas;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No fields to update.' }, { status: 400 });
    }

    const { data, error } = await serviceClient
      .from('supplier_profiles')
      .update(updates)
      .eq('user_id', user.id)
      .select('*')
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ supplier: data });
  } catch (error) {
    console.error('Supplier profile PATCH error:', error);
    return NextResponse.json({ error: 'Failed.' }, { status: 500 });
  }
}
