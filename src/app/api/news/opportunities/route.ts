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
    const type = searchParams.get('type');
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    const supabase = getSupabase();

    let query = supabase
      .from('opportunities')
      .select('*')
      .order('is_featured', { ascending: false })
      .order('deadline', { ascending: true });

    if (status) {
      query = query.eq('status', status);
    }

    if (type) {
      query = query.eq('opportunity_type', type);
    }

    if (search) {
      query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%,organization.ilike.%${search}%`);
    }

    query = query.limit(limit);

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({ opportunities: data || [] });
  } catch (error) {
    console.error('Opportunities error:', error);
    return NextResponse.json({ error: 'Failed to fetch opportunities.' }, { status: 500 });
  }
}
