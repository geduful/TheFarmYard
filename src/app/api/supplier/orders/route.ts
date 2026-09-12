import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createServiceSupabaseClient } from '@/lib/supabase/service';
import { createNotification } from '@/lib/notifications';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: supplier } = await supabase
      .from('supplier_profiles')
      .select('id')
      .eq('user_id', user.id)
      .single();
    if (!supplier) return NextResponse.json({ error: 'No supplier profile.' }, { status: 403 });

    const url = new URL(request.url);
    const status = url.searchParams.get('status');
    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'));
    const limit = Math.min(50, Math.max(1, parseInt(url.searchParams.get('limit') || '20')));
    const from = (page - 1) * limit;

    let query = supabase
      .from('supply_orders')
      .select('*, items:supply_order_items(*), farmer:profiles!supply_orders_farmer_id_fkey(full_name, phone_number, farm_location)', { count: 'exact' })
      .eq('supplier_id', supplier.id);

    if (status) query = query.eq('status', status);
    query = query.order('created_at', { ascending: false }).range(from, from + limit - 1);

    const { data, error, count } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({
      orders: data || [],
      pagination: { page, limit, total: count || 0, totalPages: Math.ceil((count || 0) / limit) },
    });
  } catch (error) {
    console.error('Supplier orders GET error:', error);
    return NextResponse.json({ error: 'Failed.' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: supplier } = await supabase
      .from('supplier_profiles')
      .select('id')
      .eq('user_id', user.id)
      .single();
    if (!supplier) return NextResponse.json({ error: 'No supplier profile.' }, { status: 403 });

    let body: Record<string, unknown>;
    try { body = await request.json(); } catch {
      return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 });
    }

    const orderId = Number(body.order_id);
    const newStatus = String(body.status || '') as string;
    if (!orderId || !newStatus) {
      return NextResponse.json({ error: 'order_id and status required.' }, { status: 400 });
    }

    const VALID_SUPPLIER_TRANSITIONS: Record<string, string[]> = {
      confirmed: ['processing'],
      processing: ['ready_for_dispatch'],
      ready_for_dispatch: ['dispatched'],
      dispatched: ['in_transit'],
      in_transit: ['delivered'],
      delivered: ['completed'],
    };

    const { data: existing } = await supabase
      .from('supply_orders')
      .select('id, status, farmer_id, order_number')
      .eq('id', orderId)
      .eq('supplier_id', supplier.id)
      .single();
    if (!existing) return NextResponse.json({ error: 'Order not found.' }, { status: 404 });

    const allowed = VALID_SUPPLIER_TRANSITIONS[existing.status];
    if (!allowed || !allowed.includes(newStatus)) {
      return NextResponse.json({ error: `Cannot transition from ${existing.status} to ${newStatus}.` }, { status: 400 });
    }

    const serviceClient = createServiceSupabaseClient();
    const updates: Record<string, unknown> = { status: newStatus };
    if (newStatus === 'dispatched') updates.dispatched_at = new Date().toISOString();
    if (newStatus === 'delivered') updates.delivered_at = new Date().toISOString();
    if (newStatus === 'completed') updates.completed_at = new Date().toISOString();

    const { error } = await serviceClient
      .from('supply_orders')
      .update(updates)
      .eq('id', orderId);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const STATUS_NOTIFICATIONS: Record<string, { title: string; message: string; priority: 'normal' | 'high' }> = {
      confirmed: { title: 'Order Confirmed', message: `Your order ${existing.order_number} has been confirmed by the supplier.`, priority: 'normal' },
      processing: { title: 'Order Processing', message: `Your order ${existing.order_number} is being prepared.`, priority: 'normal' },
      ready_for_dispatch: { title: 'Ready for Dispatch', message: `Your order ${existing.order_number} is ready for dispatch.`, priority: 'normal' },
      dispatched: { title: 'Order Dispatched', message: `Your order ${existing.order_number} has been dispatched.`, priority: 'high' },
      in_transit: { title: 'Order In Transit', message: `Your order ${existing.order_number} is on its way.`, priority: 'high' },
      delivered: { title: 'Order Delivered', message: `Your order ${existing.order_number} has been delivered. Please confirm receipt.`, priority: 'high' },
      completed: { title: 'Order Completed', message: `Your order ${existing.order_number} has been completed. Thank you!`, priority: 'normal' },
    };

    const notif = STATUS_NOTIFICATIONS[newStatus];
    if (notif) {
      await createNotification({
        userId: existing.farmer_id,
        type: `supply_order_${newStatus}` as 'supply_order_placed' | 'supply_order_paid' | 'supply_order_confirmed' | 'supply_order_processing' | 'supply_order_dispatched' | 'supply_order_in_transit' | 'supply_order_delivered' | 'supply_order_completed' | 'supply_order_cancelled',
        category: 'supply',
        title: notif.title,
        message: notif.message,
        priority: notif.priority,
        actionUrl: '/dashboard/supplier/orders',
        entityType: 'supply_order',
        entityId: String(orderId),
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Supplier orders PATCH error:', error);
    return NextResponse.json({ error: 'Failed.' }, { status: 500 });
  }
}
