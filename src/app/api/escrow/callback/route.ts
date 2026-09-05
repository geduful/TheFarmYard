import { NextRequest, NextResponse } from 'next/server';
import { createServiceSupabaseClient } from '@/lib/supabase/service';
import { verifyTransaction, isPaymentsConfigured } from '@/lib/flutterwave';
import { confirmEscrowPayment } from '@/lib/escrowConfirm';

/**
 * GET /api/escrow/callback?escrow_id=&status=&tx_ref=&transaction_id=
 * Browser landing after hosted Flutterwave checkout. Re-verifies server-side
 * (never trusts the redirect) then sends the buyer to their orders.
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const escrowId = params.get('escrow_id');
  const status = params.get('status');
  const txRef = params.get('tx_ref');
  const transactionId = params.get('transaction_id');
  const origin = request.nextUrl.origin;

  const fail = (msg: string) =>
    NextResponse.redirect(`${origin}/dashboard/buyer?payment=${encodeURIComponent(msg)}`);

  if (!escrowId) return fail('error');
  if (!isPaymentsConfigured()) return fail('error');
  if (status !== 'successful' || !txRef || !transactionId) return fail('cancelled');

  try {
    const charge = await verifyTransaction(transactionId);
    if (charge.status !== 'successful' || charge.txRef !== txRef) return fail('failed');
    const supabase = createServiceSupabaseClient();
    const result = await confirmEscrowPayment(supabase, {
      txRef,
      amount: charge.amount,
      currency: charge.currency,
      flwId: charge.flwId,
    });
    return result.ok ? fail('success') : fail('failed');
  } catch {
    return fail('failed');
  }
}
