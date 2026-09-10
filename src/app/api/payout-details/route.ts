import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createServiceSupabaseClient } from '@/lib/supabase/service';

/**
 * GET /api/payout-details — Fetch the authenticated user's payout details.
 */
export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const serviceClient = createServiceSupabaseClient();
    const { data } = await serviceClient
      .from('payout_details')
      .select('bank_name, account_number, account_name')
      .eq('user_id', user.id)
      .single();

    return NextResponse.json({ payoutDetails: data || null });
  } catch (error) {
    console.error('Payout details fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch payout details.' }, { status: 500 });
  }
}

/**
 * PUT /api/payout-details — Upsert the authenticated user's payout details.
 */
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    let body;
    try { body = await request.json(); } catch {
      return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 });
    }

    const { bank_name, account_number, account_name } = body;

    const serviceClient = createServiceSupabaseClient();
    const { error } = await serviceClient
      .from('payout_details')
      .upsert({
        user_id: user.id,
        bank_name: bank_name?.trim() || null,
        account_number: account_number?.trim() || null,
        account_name: account_name?.trim() || null,
      }, { onConflict: 'user_id' });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Payout details update error:', error);
    return NextResponse.json({ error: 'Failed to update payout details.' }, { status: 500 });
  }
}
