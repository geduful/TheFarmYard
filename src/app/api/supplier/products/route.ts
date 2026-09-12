import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createServiceSupabaseClient } from '@/lib/supabase/service';
import { createNotification } from '@/lib/notifications';

async function getSupplierId(supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>, userId: string): Promise<string | null> {
  const { data } = await supabase
    .from('supplier_profiles')
    .select('id, verification_status')
    .eq('user_id', userId)
    .single();
  if (!data || data.verification_status !== 'approved') return null;
  return data.id;
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const url = new URL(request.url);
    const mode = url.searchParams.get('mode');

    // Public browse mode - no auth required for listing active products
    if (mode === 'public') {
      const search = url.searchParams.get('search') || '';
      const category = url.searchParams.get('category') || '';
      const location = url.searchParams.get('location') || '';
      const sort = url.searchParams.get('sort') || 'newest';
      const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'));
      const limit = Math.min(50, Math.max(1, parseInt(url.searchParams.get('limit') || '24')));
      const from = (page - 1) * limit;

      let query = supabase
        .from('supply_products')
        .select('*, supplier:supplier_profiles!supply_products_supplier_id_fkey(business_name, verification_status, business_location, rating_avg, rating_count)', { count: 'exact' })
        .eq('status', 'active')
        .eq('supplier_profiles.verification_status', 'approved');

      if (search) query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%,brand.ilike.%${search}%`);
      if (category) query = query.eq('category', category);
      if (location) query = query.ilike('location', `%${location}%`);

      switch (sort) {
        case 'price_asc': query = query.order('price', { ascending: true }); break;
        case 'price_desc': query = query.order('price', { ascending: false }); break;
        case 'name': query = query.order('name', { ascending: true }); break;
        default: query = query.order('created_at', { ascending: false });
      }

      query = query.range(from, from + limit - 1);
      const { data, error, count } = await query;
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });

      return NextResponse.json({
        products: data || [],
        pagination: { page, limit, total: count || 0, totalPages: Math.ceil((count || 0) / limit) },
      });
    }

    // Supplier's own products
    const supplierId = await getSupplierId(supabase, user.id);
    if (!supplierId) {
      return NextResponse.json({ error: 'No approved supplier profile.' }, { status: 403 });
    }

    const { data: products, error } = await supabase
      .from('supply_products')
      .select('*')
      .eq('supplier_id', supplierId)
      .order('created_at', { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ products: products || [] });
  } catch (error) {
    console.error('Supply products GET error:', error);
    return NextResponse.json({ error: 'Failed.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const supplierId = await getSupplierId(supabase, user.id);
    if (!supplierId) {
      return NextResponse.json({ error: 'No approved supplier profile.' }, { status: 403 });
    }

    let body: Record<string, unknown>;
    try { body = await request.json(); } catch {
      return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 });
    }

    const name = String(body.name || '').trim();
    const price = Number(body.price);
    if (!name) return NextResponse.json({ error: 'Product name is required.' }, { status: 400 });
    if (!Number.isFinite(price) || price <= 0) return NextResponse.json({ error: 'Invalid price.' }, { status: 400 });

    const serviceClient = createServiceSupabaseClient();
    const { data: product, error } = await serviceClient
      .from('supply_products')
      .insert({
        supplier_id: supplierId,
        name,
        description: body.description ? String(body.description).trim() : null,
        category: body.category || 'other_agricultural_inputs',
        product_type: body.product_type ? String(body.product_type).trim() : null,
        brand: body.brand ? String(body.brand).trim() : null,
        unit: body.unit || 'unit',
        price,
        min_order_quantity: Math.max(1, Number(body.min_order_quantity) || 1),
        stock_quantity: Math.max(0, Number(body.stock_quantity) || 0),
        location: body.location ? String(body.location).trim() : null,
        delivery_available: Boolean(body.delivery_available),
        image_url: body.image_url ? String(body.image_url) : null,
      })
      .select('*')
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ product });
  } catch (error) {
    console.error('Supply products POST error:', error);
    return NextResponse.json({ error: 'Failed.' }, { status: 500 });
  }
}
