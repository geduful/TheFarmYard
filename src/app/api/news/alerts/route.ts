import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

async function getSupabase() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {}
        },
      },
    }
  );
}

export async function GET() {
  try {
    const supabase = await getSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data, error } = await supabase
      .from('market_alerts')
      .select('*, commodity:commodities(name, slug, unit)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return NextResponse.json({ alerts: data || [] });
  } catch (error) {
    console.error('Market alerts GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch alerts.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await getSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { commodityId, marketName, alertType, thresholdPrice } = await request.json();

    if (!commodityId || !alertType || thresholdPrice === undefined) {
      return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 });
    }

    if (!['above', 'below'].includes(alertType)) {
      return NextResponse.json({ error: 'Invalid alert type.' }, { status: 400 });
    }

    if (typeof thresholdPrice !== 'number' || thresholdPrice <= 0) {
      return NextResponse.json({ error: 'Invalid threshold price.' }, { status: 400 });
    }

    // Check limit: max 10 active alerts per user
    const { count } = await supabase
      .from('market_alerts')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_active', true);

    if (count && count >= 10) {
      return NextResponse.json({ error: 'Maximum 10 active alerts reached.' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('market_alerts')
      .insert({
        user_id: user.id,
        commodity_id: commodityId,
        market_name: marketName || null,
        alert_type: alertType,
        threshold_price: thresholdPrice,
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ alert: data });
  } catch (error) {
    console.error('Market alerts POST error:', error);
    return NextResponse.json({ error: 'Failed to create alert.' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await getSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { alertId } = await request.json();
    if (!alertId) return NextResponse.json({ error: 'Alert ID required.' }, { status: 400 });

    const { error } = await supabase
      .from('market_alerts')
      .delete()
      .eq('id', alertId)
      .eq('user_id', user.id);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Market alerts DELETE error:', error);
    return NextResponse.json({ error: 'Failed to delete alert.' }, { status: 500 });
  }
}
