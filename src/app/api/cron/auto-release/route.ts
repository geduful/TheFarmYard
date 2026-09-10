import { NextRequest, NextResponse } from 'next/server';
import { createServiceSupabaseClient } from '@/lib/supabase/service';
import { initiateTransfer, isPaymentsConfigured } from '@/lib/flutterwave';
import { sendSms } from '@/lib/sms';
import { createNotification } from '@/lib/notifications';

export const dynamic = 'force-dynamic';

const RELEASE_WINDOW_MS = 48 * 60 * 60 * 1000;
const PENDING_TTL_MS = 24 * 60 * 60 * 1000;
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

  // Batch-fetch all user phone numbers upfront (eliminates N+1)
  const allUserIds = [...new Set((due ?? []).flatMap(tx => [tx.buyer_id, tx.farmer_id]))];
  const phoneMap = new Map<string, string>();
  if (allUserIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, phone_number')
      .in('id', allUserIds);
    if (profiles) {
      for (const p of profiles) {
        if (p.phone_number) phoneMap.set(p.id, p.phone_number);
      }
    }
  }

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

    if (isPaymentsConfigured() && !tx.payout_reference) {
      const { data: payout } = await supabase
        .from('payout_details')
        .select('bank_name, account_number')
        .eq('user_id', tx.farmer_id)
        .single();
      if (payout?.bank_name && payout?.account_number) {
        try {
          const { reference } = await initiateTransfer({
            amount: Number(tx.total_farmer_yield),
            currency: tx.currency || 'GHS',
            accountBank: payout.bank_name,
            accountNumber: payout.account_number,
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

    const buyerPhone = phoneMap.get(tx.buyer_id);
    const farmerPhone = phoneMap.get(tx.farmer_id);
    if (buyerPhone) await sendSms(buyerPhone, `TheFarmYard: order #${tx.id} auto-released after the delivery window.`);
    if (farmerPhone) await sendSms(farmerPhone, `TheFarmYard: funds for order #${tx.id} released to your payout account.`);

    createNotification({
      userId: tx.buyer_id,
      type: 'order_released',
      category: 'orders',
      title: 'Order Auto-Released',
      message: `Order #${tx.id} has been auto-released after the delivery inspection window.`,
      priority: 'high',
      actionUrl: `/dashboard/buyer`,
      entityType: 'escrow',
      entityId: String(tx.id),
    });
    createNotification({
      userId: tx.farmer_id,
      type: 'order_released',
      category: 'orders',
      title: 'Funds Released',
      message: `Funds for order #${tx.id} have been released to your payout account.`,
      priority: 'high',
      actionUrl: `/dashboard/farmer`,
      entityType: 'escrow',
      entityId: String(tx.id),
    });
  }

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
