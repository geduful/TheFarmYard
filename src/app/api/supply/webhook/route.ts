import { NextRequest, NextResponse } from 'next/server';
import { createServiceSupabaseClient } from '@/lib/supabase/service';
import { verifyTransaction, isPaymentsConfigured } from '@/lib/flutterwave';
import { createNotification } from '@/lib/notifications';
import { timingSafeEqual } from 'crypto';

/**
 * POST /api/supply/webhook — Flutterwave webhook for supply order payments.
 */
export async function POST(request: NextRequest) {
  const expectedHash = process.env.FLW_WEBHOOK_HASH;
  if (!expectedHash || !isPaymentsConfigured()) {
    return NextResponse.json({ error: 'Webhooks not configured.' }, { status: 503 });
  }
  const receivedHash = request.headers.get('verif-hash');
  if (!receivedHash) {
    return NextResponse.json({ error: 'Invalid signature.' }, { status: 401 });
  }

  const expectedBuf = Buffer.from(expectedHash, 'utf8');
  const receivedBuf = Buffer.from(receivedHash, 'utf8');
  if (expectedBuf.length !== receivedBuf.length || !timingSafeEqual(expectedBuf, receivedBuf)) {
    return NextResponse.json({ error: 'Invalid signature.' }, { status: 401 });
  }

  let event: { event?: string; data?: { id?: number; tx_ref?: string; status?: string } };
  try {
    event = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid payload.' }, { status: 400 });
  }

  if (event.event !== 'charge.completed' || event.data?.status !== 'successful') {
    return NextResponse.json({ received: true });
  }
  const txRef = event.data.tx_ref;
  const flwId = event.data.id;
  if (!txRef || !flwId) return NextResponse.json({ received: true });

  try {
    const charge = await verifyTransaction(flwId);
    if (charge.txRef !== txRef || charge.status !== 'successful') {
      return NextResponse.json({ received: true });
    }

    const supabase = createServiceSupabaseClient();
    const { data: order } = await supabase
      .from('supply_orders')
      .select('id, farmer_id, supplier_id, order_number, total_amount, status')
      .eq('flw_tx_ref', txRef)
      .single();

    if (!order) return NextResponse.json({ received: true });
    if (order.status === 'paid') return NextResponse.json({ received: true });
    if (order.status !== 'pending_payment') return NextResponse.json({ received: true });

    await supabase
      .from('supply_orders')
      .update({
        status: 'paid',
        paid_at: new Date().toISOString(),
        flw_transaction_id: flwId,
      })
      .eq('id', order.id)
      .eq('status', 'pending_payment');

    await createNotification({
      userId: order.farmer_id,
      type: 'supply_order_paid',
      category: 'supply',
      title: 'Payment Confirmed',
      message: `Payment for order ${order.order_number} (GHS ${Number(order.total_amount).toFixed(2)}) has been confirmed.`,
      priority: 'high',
      actionUrl: '/dashboard/supplier/orders',
      entityType: 'supply_order',
      entityId: String(order.id),
    });

    const { data: supplier } = await supabase
      .from('supplier_profiles')
      .select('user_id')
      .eq('id', order.supplier_id)
      .single();
    if (supplier) {
      await createNotification({
        userId: supplier.user_id,
        type: 'supplier_new_order',
        category: 'supply',
        title: 'New Supply Order',
        message: `Payment confirmed for order ${order.order_number}. Please prepare the order.`,
        priority: 'high',
        actionUrl: '/dashboard/supplier/orders',
        entityType: 'supply_order',
        entityId: String(order.id),
      });
    }
  } catch (err) {
    console.error('[supply webhook] confirm failed:', err instanceof Error ? err.message : err);
  }
  return NextResponse.json({ received: true });
}
