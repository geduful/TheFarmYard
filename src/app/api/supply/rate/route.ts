import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createServiceSupabaseClient } from '@/lib/supabase/service';
import { createNotification } from '@/lib/notifications';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    let body: Record<string, unknown>;
    try { body = await request.json(); } catch {
      return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 });
    }

    const orderId = Number(body.order_id);
    const rating = Number(body.rating);
    if (!orderId || !Number.isInteger(rating) || rating < 1 || rating > 5) {
      return NextResponse.json({ error: 'Valid order_id and rating (1-5) required.' }, { status: 400 });
    }

    const { data: order } = await supabase
      .from('supply_orders')
      .select('id, supplier_id, farmer_id, order_number')
      .eq('id', orderId)
      .eq('farmer_id', user.id)
      .eq('status', 'completed')
      .single();
    if (!order) {
      return NextResponse.json({ error: 'Order not found or not completed.' }, { status: 404 });
    }

    const existing = await supabase
      .from('supplier_ratings')
      .select('id')
      .eq('farmer_id', user.id)
      .eq('order_id', orderId)
      .single();
    if (existing.data) {
      return NextResponse.json({ error: 'You have already rated this order.' }, { status: 409 });
    }

    const serviceClient = createServiceSupabaseClient();
    const { error } = await serviceClient
      .from('supplier_ratings')
      .insert({
        supplier_id: order.supplier_id,
        farmer_id: user.id,
        order_id: orderId,
        rating,
        product_quality_rating: body.product_quality_rating ? Number(body.product_quality_rating) : null,
        delivery_rating: body.delivery_rating ? Number(body.delivery_rating) : null,
        communication_rating: body.communication_rating ? Number(body.communication_rating) : null,
        comment: body.comment ? String(body.comment).trim() : null,
      });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const { data: supplier } = await serviceClient
      .from('supplier_profiles')
      .select('user_id, business_name')
      .eq('id', order.supplier_id)
      .single();

    if (supplier) {
      await createNotification({
        userId: supplier.user_id,
        type: 'supplier_rating_received',
        category: 'reputation',
        title: 'New Supplier Rating',
        message: `You received a ${rating}-star rating for order ${order.order_number}.`,
        priority: 'normal',
        actionUrl: '/dashboard/supplier',
        entityType: 'supplier_rating',
        entityId: String(orderId),
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Supply rate error:', error);
    return NextResponse.json({ error: 'Failed.' }, { status: 500 });
  }
}
