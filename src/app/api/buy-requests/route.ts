import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createNotification } from '@/lib/notifications';

/**
 * POST /api/buy-requests
 * Server-side buyer request creation with smart matching notifications.
 * Validates server-side, runs matching, notifies relevant farmers.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: profile } = await supabase
      .from('profiles').select('role').eq('id', user.id).single();
    if (profile?.role !== 'buyer') {
      return NextResponse.json({ error: 'Only buyers can create requests.' }, { status: 403 });
    }

    let body;
    try { body = await request.json(); } catch {
      return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 });
    }

    const { commodity_title, category, quantity_required, price_unit, max_price_per_unit, delivery_location, deadline, additional_notes } = body;

    if (!commodity_title?.trim() || !quantity_required?.trim() || !delivery_location?.trim() || !deadline) {
      return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 });
    }

    // Insert buyer request
    const { data: request_, error: insertError } = await supabase
      .from('buy_requests')
      .insert({
        buyer_id: user.id,
        commodity_title: commodity_title.trim(),
        category: category || 'Crops & Grains',
        quantity_required: quantity_required.trim(),
        price_unit: price_unit || 'kg',
        max_price_per_unit: max_price_per_unit ? parseFloat(max_price_per_unit) : null,
        delivery_location: delivery_location.trim(),
        deadline,
        additional_notes: additional_notes?.trim() || null,
        status: 'open',
      })
      .select('*')
      .single();

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    // Run smart matching to find relevant farmers
    const { data: matches } = await supabase
      .rpc('match_buyer_request_to_listings', { request_id: request_.id });

    // Notify farmers with meaningful matches (score >= 50)
    if (matches && matches.length > 0) {
      const notifiedFarmers = new Set<string>();

      for (const match of matches) {
        if (match.match_score < 50) continue;

        // Fetch the listing to get farmer_id
        const { data: listing } = await supabase
          .from('listings')
          .select('farmer_id, title')
          .eq('id', match.listing_id)
          .single();

        if (!listing || notifiedFarmers.has(listing.farmer_id)) continue;
        notifiedFarmers.add(listing.farmer_id);

        const reasons = match.match_reasons?.join(', ') || 'relevant match';

        createNotification({
          userId: listing.farmer_id,
          type: 'buyer_request_matched',
          category: 'buyer_requests',
          title: 'New Buyer Request Match',
          message: `A buyer is looking for "${commodity_title}" in ${delivery_location}. Your listing "${listing.title}" is a strong match (${reasons}).`,
          priority: 'high',
          actionUrl: `/dashboard/farmer`,
          entityType: 'buy_request',
          entityId: String(request_.id),
        });
      }
    }

    return NextResponse.json({ request: request_ });
  } catch (error) {
    console.error('Buy request creation error:', error);
    return NextResponse.json({ error: 'Failed to create request.' }, { status: 500 });
  }
}
