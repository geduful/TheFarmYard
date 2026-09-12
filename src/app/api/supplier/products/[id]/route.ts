import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createServiceSupabaseClient } from '@/lib/supabase/service';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: product, error } = await supabase
      .from('supply_products')
      .select('*, supplier:supplier_profiles!supply_products_supplier_id_fkey(*)')
      .eq('id', id)
      .single();

    if (error || !product) return NextResponse.json({ error: 'Product not found.' }, { status: 404 });
    return NextResponse.json({ product });
  } catch (error) {
    console.error('Supply product GET error:', error);
    return NextResponse.json({ error: 'Failed.' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: existing } = await supabase
      .from('supply_products')
      .select('supplier_id')
      .eq('id', id)
      .single();
    if (!existing) return NextResponse.json({ error: 'Product not found.' }, { status: 404 });

    const { data: supplier } = await supabase
      .from('supplier_profiles')
      .select('id')
      .eq('user_id', user.id)
      .eq('id', existing.supplier_id)
      .single();
    if (!supplier) return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });

    let body: Record<string, unknown>;
    try { body = await request.json(); } catch {
      return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 });
    }

    const updates: Record<string, unknown> = {};
    if (body.name) updates.name = String(body.name).trim();
    if (body.description !== undefined) updates.description = body.description ? String(body.description).trim() : null;
    if (body.category) updates.category = body.category;
    if (body.product_type !== undefined) updates.product_type = body.product_type ? String(body.product_type).trim() : null;
    if (body.brand !== undefined) updates.brand = body.brand ? String(body.brand).trim() : null;
    if (body.unit) updates.unit = body.unit;
    if (body.price !== undefined) {
      const p = Number(body.price);
      if (!Number.isFinite(p) || p <= 0) return NextResponse.json({ error: 'Invalid price.' }, { status: 400 });
      updates.price = p;
    }
    if (body.min_order_quantity !== undefined) updates.min_order_quantity = Math.max(1, Number(body.min_order_quantity) || 1);
    if (body.stock_quantity !== undefined) updates.stock_quantity = Math.max(0, Number(body.stock_quantity) || 0);
    if (body.status) updates.status = body.status;
    if (body.location !== undefined) updates.location = body.location ? String(body.location).trim() : null;
    if (body.delivery_available !== undefined) updates.delivery_available = Boolean(body.delivery_available);
    if (body.image_url !== undefined) updates.image_url = body.image_url ? String(body.image_url) : null;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No fields to update.' }, { status: 400 });
    }

    const serviceClient = createServiceSupabaseClient();
    const { data, error } = await serviceClient
      .from('supply_products')
      .update(updates)
      .eq('id', id)
      .select('*')
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ product: data });
  } catch (error) {
    console.error('Supply product PATCH error:', error);
    return NextResponse.json({ error: 'Failed.' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: existing } = await supabase
      .from('supply_products')
      .select('supplier_id')
      .eq('id', id)
      .single();
    if (!existing) return NextResponse.json({ error: 'Product not found.' }, { status: 404 });

    const { data: supplier } = await supabase
      .from('supplier_profiles')
      .select('id')
      .eq('user_id', user.id)
      .eq('id', existing.supplier_id)
      .single();
    if (!supplier) return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });

    const serviceClient = createServiceSupabaseClient();
    const { error } = await serviceClient
      .from('supply_products')
      .delete()
      .eq('id', id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Supply product DELETE error:', error);
    return NextResponse.json({ error: 'Failed.' }, { status: 500 });
  }
}
