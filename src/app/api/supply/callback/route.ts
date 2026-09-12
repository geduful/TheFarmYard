import { NextRequest, NextResponse } from 'next/server';
import { createServiceSupabaseClient } from '@/lib/supabase/service';
import { verifyTransaction, isPaymentsConfigured } from '@/lib/flutterwave';
import { createNotification } from '@/lib/notifications';

/**
 * GET /api/supply/callback — Browser redirect after Flutterwave checkout.
 * Re-verifies server-side before confirming the supply order.
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const orderId = url.searchParams.get('order_id');
  const transactionId = url.searchParams.get('transaction_id');

  if (!orderId) {
    return NextResponse.redirect(new URL('/dashboard/supplier/orders?error=missing_order', request.url));
  }

  if (!isPaymentsConfigured()) {
    return NextResponse.redirect(new URL('/dashboard/supplier/orders', request.url));
  }

  try {
    const supabase = createServiceSupabaseClient();
    const { data: order } = await supabase
      .from('supply_orders')
      .select('id, flw_tx_ref, status')
      .eq('id', orderId)
      .single();

    if (!order) {
      return NextResponse.redirect(new URL('/dashboard/supplier/orders?error=order_not_found', request.url));
    }
    if (order.status === 'paid') {
      return NextResponse.redirect(new URL('/dashboard/supplier/orders?success=1', request.url));
    }
    if (order.status !== 'pending_payment') {
      return NextResponse.redirect(new URL(`/dashboard/supplier/orders?error=invalid_status`, request.url));
    }

    if (transactionId && order.flw_tx_ref) {
      const charge = await verifyTransaction(transactionId);
      if (charge.status === 'successful' && charge.txRef === order.flw_tx_ref) {
        await supabase
          .from('supply_orders')
          .update({ status: 'paid', paid_at: new Date().toISOString(), flw_transaction_id: charge.flwId })
          .eq('id', order.id)
          .eq('status', 'pending_payment');

        return NextResponse.redirect(new URL('/dashboard/supplier/orders?success=1', request.url));
      }
    }
    return NextResponse.redirect(new URL('/dashboard/supplier/orders?error=payment_unverified', request.url));
  } catch {
    return NextResponse.redirect(new URL('/dashboard/supplier/orders?error=verification_failed', request.url));
  }
}
