import { NextRequest, NextResponse } from 'next/server';
import { randomInt } from 'crypto';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { calculateEscrowFees } from '@/lib/utils';
import { createCollectionPayment, isPaymentsConfigured } from '@/lib/flutterwave';
import { createNotification } from '@/lib/notifications';

/**
 * POST /api/escrow/create { listingId, quantity }
 * Server-authoritative checkout: validates the listing, computes fees, creates
 * the escrow row, and (when Flutterwave is configured) returns a hosted
 * payment link. Without FLW keys it runs in demo mode (immediate escrow).
 */
export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Please sign in.' }, { status: 401 });

  let body: { listingId?: unknown; quantity?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }
  const listingId = Number(body.listingId);
  const quantity = Math.floor(Number(body.quantity));
  if (!Number.isInteger(listingId) || listingId <= 0) {
    return NextResponse.json({ error: 'Invalid listing.' }, { status: 400 });
  }
  if (!Number.isInteger(quantity) || quantity < 1) {
    return NextResponse.json({ error: 'Quantity must be at least 1.' }, { status: 400 });
  }

  const { data: listing } = await supabase
    .from('listings')
    .select('id, farmer_id, title, price_per_unit, is_approved')
    .eq('id', listingId)
    .single();
  if (!listing || !listing.is_approved) {
    return NextResponse.json({ error: 'Listing unavailable.' }, { status: 404 });
  }
  if (listing.farmer_id === user.id) {
    return NextResponse.json({ error: 'You cannot buy your own listing.' }, { status: 403 });
  }

  const { data: buyer } = await supabase
    .from('profiles')
    .select('full_name, phone_number, email')
    .eq('id', user.id)
    .single();

  const baseAmount = Number(listing.price_per_unit) * quantity;
  if (!Number.isFinite(baseAmount) || baseAmount <= 0) {
    return NextResponse.json({ error: 'Invalid amount.' }, { status: 400 });
  }
  const fees = calculateEscrowFees(baseAmount);
  const deliveryToken = String(randomInt(100000, 1000000));
  const currency = 'GHS';

  // ── Demo mode (no payment keys): keep the old instant-escrow behaviour ──
  if (!isPaymentsConfigured()) {
    const { data: escrow, error } = await supabase
      .from('escrow_transactions')
      .insert({
        listing_id: listing.id,
        buyer_id: user.id,
        farmer_id: listing.farmer_id,
        base_amount: baseAmount,
        buyer_fee: fees.buyerFee,
        farmer_fee: fees.farmerFee,
        total_buyer_paid: fees.totalBuyerPaid,
        total_farmer_yield: fees.totalFarmerYield,
        platform_revenue: fees.platformRevenue,
        currency,
        status: 'held_in_escrow',
        delivery_token: deliveryToken,
      })
      .select('*, listing:listings(*), farmer:profiles!escrow_transactions_farmer_id_fkey(full_name, phone_number)')
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Notify farmer of new order
    createNotification({
      userId: listing.farmer_id,
      type: 'order_created',
      category: 'orders',
      title: 'New Order Received',
      message: `A buyer has placed an order for "${listing.title}". Payment secured in escrow.`,
      priority: 'high',
      actionUrl: `/dashboard/farmer`,
      entityType: 'escrow',
      entityId: String(escrow.id),
    });

    return NextResponse.json({ demo: true, escrow });
  }

  // ── Real mode: escrow starts as pending_deposit until webhook confirms ──
  const txRef = `tfy-${Date.now()}-${randomInt(100000, 1000000)}`;
  const { data: escrow, error: insertError } = await supabase
    .from('escrow_transactions')
    .insert({
      listing_id: listing.id,
      buyer_id: user.id,
      farmer_id: listing.farmer_id,
      base_amount: baseAmount,
      buyer_fee: fees.buyerFee,
      farmer_fee: fees.farmerFee,
      total_buyer_paid: fees.totalBuyerPaid,
      total_farmer_yield: fees.totalFarmerYield,
      platform_revenue: fees.platformRevenue,
      currency,
      status: 'pending_deposit',
      delivery_token: deliveryToken,
      flw_tx_ref: txRef,
    })
    .select('id')
    .single();
  if (insertError || !escrow) {
    return NextResponse.json({ error: insertError?.message || 'Checkout failed.' }, { status: 500 });
  }

  const appUrl = process.env.APP_URL || request.nextUrl.origin;
  try {
    const { link } = await createCollectionPayment({
      txRef,
      amount: fees.totalBuyerPaid,
      currency,
      email: buyer?.email || user.email || 'buyer@thefarmyard.africa',
      phone: buyer?.phone_number,
      name: buyer?.full_name,
      title: `TheFarmYard: ${listing.title}`,
      redirectUrl: `${appUrl}/api/escrow/callback?escrow_id=${escrow.id}`,
    });
    return NextResponse.json({ paymentLink: link, escrowId: escrow.id });
  } catch (err) {
    // Don't strand a pending row the buyer can never pay for.
    await supabase.from('escrow_transactions').delete().eq('id', escrow.id);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Payment failed to start.' },
      { status: 502 }
    );
  }
}
