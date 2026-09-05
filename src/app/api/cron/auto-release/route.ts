import { NextRequest, NextResponse } from 'next/server';
import { createServiceSupabaseClient } from '@/lib/supabase/service';
import { initiateTransfer, isPaymentsConfigured } from '@/lib/flutterwave';
import { sendSms } from '@/lib/sms';

export const dynamic = 'force-dynamic';

const RELEASE_WINDOW_MS = 48 * 60 * 60 * 1000; // max 48h per platform policy
const PENDING_TTL_MS = 24 * 60 * 60 * 1000; // drop unpaid checkouts after 24h
const BATCH = 50;

/**
 * GET /api/cron/auto-release — releases dispatched orders past their window
 * and sweeps abandoned pending checkouts. Trigger hourly via Vercel Cron.
 * Auth: `Authorization: Bearer <CRON_SECRET>` or `?secret=<CRON_SECRET>`.
 */
export async function GET(request: NextRequest) {
  const expected = process.env.CRON_SECRET;
  if (!expected) return NextResponse.json({ error: 'Cron not configured.' }, { status: 503 });
  const auth = request.headers.get('authorization');
  const secret = auth?.startsWith('Bearer ') ? auth.slice(7) : request.nextUrl.searchParams.get('secret');
  if (secret !== expected) return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });

  const supabase = createServiceSupabaseClient();
  const now = new Date();
  let released = 0;
  const payouts: string[] = [];

  const { data: due } = await supabase
    .from('escrow_transactions')
    .select('id, total_farmer_yield, currency, buyer_id, farmer_id, dispatched_at, auto_release_at, payout_reference')
    .eq('status', 'dispatched')
    .limit(BATCH);

  for (const tx of due ?? []) {
    const deadline = tx.auto_release_at
      ? new Date(tx.auto_release_at)
      : new Date(new Date(tx.dispatched_at).getTime() + RELEASE_WINDOW_MS);
    if (deadline > now) continue;

    const { error } = await supabase
      .from('escrow_transactions')
      .update({ status: 'released' })
      .eq('id', tx.id)
      .eq('status', 'dispatched');
    if (error) continue;
    released += 1;

    // Attempt farmer payout when details + gateway exist; otherwise the
    // release stands in-ledger and admin settles manually (payout_reference null).
    if (isPaymentsConfigured() && !tx.payout_reference) {
      const { data: farmer } = await supabase
        .from('profiles')
        .select('phone_number, payout_account_bank, payout_account_number')
        .eq('id', tx.farmer_id)
        .single();
      if (farmer?.payout_account_bank && farmer?.payout_account_number) {
        try {
          const { reference } = await initiateTransfer({
            amount: Number(tx.total_farmer_yield),
            currency: tx.currency || 'GHS',
            accountBank: farmer.payout_account_bank,
            accountNumber: farmer.payout_account_number,
            reference: `tfy-payout-${tx.id}-${Date.now()}`,
            narration: `TheFarmYard payout #${tx.id}`,
          });
          await supabase
            .from('escrow_transactions')
            .update({ payout_reference: reference })
            .eq('id', tx.id);
          payouts.push(reference);
        } catch (err) {
          console.error(`[cron] payout #${tx.id} failed:`, err instanceof Error ? err.message : err);
        }
      }
    }

    const [{ data: buyer }, { data: farmer }] = await Promise.all([
      supabase.from('profiles').select('phone_number').eq('id', tx.buyer_id).single(),
      supabase.from('profiles').select('phone_number').eq('id', tx.farmer_id).single(),
    ]);
    await sendSms(buyer?.phone_number, `TheFarmYard: order #${tx.id} auto-released after the delivery window.`);
    await sendSms(farmer?.phone_number, `TheFarmYard: funds for order #${tx.id} released to your payout account.`);
  }

  // Sweep unpaid demo/gateway checkouts older than 24h.
  const { data: stale } = await supabase
    .from('escrow_transactions')
    .select('id')
    .eq('status', 'pending_deposit')
    .lt('created_at', new Date(now.getTime() - PENDING_TTL_MS).toISOString())
    .limit(BATCH);
  let cleaned = 0;
  for (const row of stale ?? []) {
    const { error } = await supabase.from('escrow_transactions').delete().eq('id', row.id);
    if (!error) cleaned += 1;
  }

  return NextResponse.json({ released, payouts: payouts.length, cleaned });
}
