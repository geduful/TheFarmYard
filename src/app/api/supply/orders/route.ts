import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const url = new URL(request.url);
    const status = url.searchParams.get('status');
    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'));
    const limit = Math.min(50, Math.max(1, parseInt(url.searchParams.get('limit') || '20')));
    const from = (page - 1) * limit;

    let query = supabase
      .from('supply_orders')
      .select('*, items:supply_order_items(*), supplier:supplier_profiles!supply_orders_supplier_id_fkey(business_name, verification_status, business_location, contact_phone)', { count: 'exact' })
      .eq('farmer_id', user.id);

    if (status) query = query.eq('status', status);
    query = query.order('created_at', { ascending: false }).range(from, from + limit - 1);

    const { data, error, count } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({
      orders: data || [],
      pagination: { page, limit, total: count || 0, totalPages: Math.ceil((count || 0) / limit) },
    });
  } catch (error) {
    console.error('Supply orders GET error:', error);
    return NextResponse.json({ error: 'Failed.' }, { status: 500 });
  }
}
