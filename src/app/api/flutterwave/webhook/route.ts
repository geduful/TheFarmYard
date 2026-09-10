import { NextRequest, NextResponse } from 'next/server';
import { createServiceSupabaseClient } from '@/lib/supabase/service';
import { verifyTransaction, isPaymentsConfigured } from '@/lib/flutterwave';
import { confirmEscrowPayment } from '@/lib/escrowConfirm';
import { timingSafeEqual } from 'crypto';

/**
 * POST /api/flutterwave/webhook — Flutterwave server callback (source of truth).
 * Verify with the `verif-hash` header = FLW_WEBHOOK_HASH from your dashboard.
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

  // Constant-time comparison to prevent timing attacks
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

  // Only successful charges matter; everything else is ignored (200 to stop retries).
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
    await confirmEscrowPayment(supabase, {
      txRef,
      amount: charge.amount,
      currency: charge.currency,
      flwId: charge.flwId,
    });
  } catch (err) {
    console.error('[webhook] confirm failed:', err instanceof Error ? err.message : err);
  }
  return NextResponse.json({ received: true });
}
