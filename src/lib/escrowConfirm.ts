import type { createServiceSupabaseClient } from '@/lib/supabase/service';
import { sendSms } from '@/lib/sms';
import { createNotification } from '@/lib/notifications';

type ServiceClient = ReturnType<typeof createServiceSupabaseClient>;

interface ConfirmArgs {
  txRef: string;
  amount: number;
  currency: string;
  flwId: number;
}

/**
 * Confirm an escrow from a verified Flutterwave charge. Idempotent: only a
 * `pending_deposit` row is ever touched, so double webhooks/refreshes are safe.
 */
export async function confirmEscrowPayment(
  supabase: ServiceClient,
  { txRef, amount, currency, flwId }: ConfirmArgs
): Promise<{ ok: boolean; escrowId?: number; buyerId?: string; error?: string }> {
  const { data: escrow } = await supabase
    .from('escrow_transactions')
    .select('id, buyer_id, total_buyer_paid, currency, status, delivery_token, listing:listings(title)')
    .eq('flw_tx_ref', txRef)
    .single();

  if (!escrow) return { ok: false, error: 'Unknown payment reference.' };
  if (escrow.status === 'held_in_escrow') {
    return { ok: true, escrowId: escrow.id, buyerId: escrow.buyer_id };
  }
  if (escrow.status !== 'pending_deposit') {
    return { ok: false, error: `Already ${escrow.status}.` };
  }
  if (Math.abs(Number(amount) - Number(escrow.total_buyer_paid)) > 0.01) {
    return { ok: false, error: 'Paid amount mismatch.' };
  }
  if (currency && escrow.currency && currency !== escrow.currency) {
    return { ok: false, error: 'Currency mismatch.' };
  }

  const { error } = await supabase
    .from('escrow_transactions')
    .update({
      status: 'held_in_escrow',
      paid_at: new Date().toISOString(),
      flw_transaction_id: flwId,
    })
    .eq('id', escrow.id)
    .eq('status', 'pending_deposit');
  if (error) return { ok: false, error: error.message };

  const listingTitle =
    escrow.listing && typeof escrow.listing === 'object' && 'title' in escrow.listing
      ? String((escrow.listing as { title: string }).title)
      : 'your order';
  const { data: buyer } = await supabase
    .from('profiles')
    .select('phone_number')
    .eq('id', escrow.buyer_id)
    .single();
  await sendSms(
    buyer?.phone_number,
    `TheFarmYard: payment confirmed for "${listingTitle}". Delivery token: ${escrow.delivery_token}. Share it only after inspecting goods.`
  );

  // Notify buyer
  createNotification({
    userId: escrow.buyer_id,
    type: 'order_payment_received',
    category: 'orders',
    title: 'Payment Confirmed',
    message: `Your payment for "${listingTitle}" has been secured in escrow. Share the delivery token (${escrow.delivery_token}) only after inspecting goods.`,
    priority: 'high',
    actionUrl: `/dashboard/buyer`,
    entityType: 'escrow',
    entityId: String(escrow.id),
  });

  // Fetch escrow farmer_id and notify farmer
  const { data: fullEscrow } = await supabase
    .from('escrow_transactions')
    .select('farmer_id')
    .eq('id', escrow.id)
    .single();
  if (fullEscrow?.farmer_id) {
    createNotification({
      userId: fullEscrow.farmer_id,
      type: 'order_payment_received',
      category: 'orders',
      title: 'Payment Received',
      message: `Payment for "${listingTitle}" has been confirmed. You can now dispatch the order.`,
      priority: 'high',
      actionUrl: `/dashboard/farmer`,
      entityType: 'escrow',
      entityId: String(escrow.id),
    });
  }

  return { ok: true, escrowId: escrow.id, buyerId: escrow.buyer_id };
}
