import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  );
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const commodityId = searchParams.get('commodity_id');
    const market = searchParams.get('market');
    const days = parseInt(searchParams.get('days') || '30', 10);

    const supabase = getSupabase();

    // Get latest prices for each commodity
    if (!commodityId && !market) {
      const { data, error } = await supabase
        .from('market_prices')
        .select(`
          *,
          commodity:commodities(name, slug, unit, category),
          source:news_sources(name, trust_level)
        `)
        .order('data_date', { ascending: false })
        .limit(100);

      if (error) throw error;

      // Deduplicate: keep latest price per commodity+market
      const seen = new Map<string, typeof data[0]>();
      for (const row of data || []) {
        const key = `${row.commodity_id}-${row.market_name}`;
        if (!seen.has(key)) seen.set(key, row);
      }

      return NextResponse.json({ prices: Array.from(seen.values()), count: seen.size });
    }

    // Get price history for a specific commodity
    if (commodityId) {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const query = supabase
        .from('market_prices')
        .select(`
          *,
          commodity:commodities(name, slug, unit, category),
          source:news_sources(name, trust_level)
        `)
        .eq('commodity_id', commodityId)
        .gte('data_date', startDate.toISOString().split('T')[0])
        .order('data_date', { ascending: true });

      if (market) {
        query.eq('market_name', market);
      }

      const { data, error } = await query.limit(200);

      if (error) throw error;

      // Also get aggregated history
      const { data: history } = await supabase
        .from('market_price_history')
        .select('*')
        .eq('commodity_id', commodityId)
        .gte('period_start', startDate.toISOString().split('T')[0])
        .order('period_start', { ascending: true })
        .limit(100);

      return NextResponse.json({ prices: data || [], history: history || [] });
    }

    // Get prices for a specific market
    if (market) {
      const { data, error } = await supabase
        .from('market_prices')
        .select(`
          *,
          commodity:commodities(name, slug, unit, category),
          source:news_sources(name, trust_level)
        `)
        .eq('market_name', market)
        .order('data_date', { ascending: false })
        .limit(100);

      if (error) throw error;

      return NextResponse.json({ prices: data || [] });
    }

    return NextResponse.json({ prices: [], count: 0 });
  } catch (error) {
    console.error('Market prices error:', error);
    return NextResponse.json({ error: 'Failed to fetch market prices.' }, { status: 500 });
  }
}
