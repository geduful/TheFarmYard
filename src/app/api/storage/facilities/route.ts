import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { searchParams } = new URL(request.url);

    const search = searchParams.get('search') || '';
    const type = searchParams.get('type') || '';
    const location = searchParams.get('location') || '';
    const crop = searchParams.get('crop') || '';
    const minCapacity = searchParams.get('min_capacity') || '';
    const maxPrice = searchParams.get('max_price') || '';
    const verified = searchParams.get('verified') || '';
    const minRating = searchParams.get('min_rating') || '';
    const sort = searchParams.get('sort') || 'newest';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = Math.min(parseInt(searchParams.get('limit') || '24', 10), 50);
    const offset = (page - 1) * limit;

    let query = supabase
      .from('storage_facilities')
      .select('*', { count: 'exact' })
      .eq('is_approved', true)
      .eq('status', 'active');

    if (search) {
      query = query.or(`name.ilike.%${search}%,location.ilike.%${search}%,description.ilike.%${search}%`);
    }
    if (type) {
      query = query.eq('facility_type', type);
    }
    if (location) {
      query = query.ilike('location', `%${location}%`);
    }
    if (crop) {
      query = query.contains('supported_crops', [crop]);
    }
    if (minCapacity) {
      query = query.gte('available_capacity', parseFloat(minCapacity));
    }
    if (maxPrice) {
      query = query.lte('price_per_unit', parseFloat(maxPrice));
    }
    if (verified === 'true') {
      query = query.eq('owner_id', query); // If owner is verified
    }
    if (minRating) {
      query = query.gte('rating_avg', parseFloat(minRating));
    }

    switch (sort) {
      case 'price_asc':
        query = query.order('price_per_unit', { ascending: true });
        break;
      case 'price_desc':
        query = query.order('price_per_unit', { ascending: false });
        break;
      case 'capacity':
        query = query.order('available_capacity', { ascending: false });
        break;
      case 'rating':
        query = query.order('rating_avg', { ascending: false });
        break;
      case 'featured':
        query = query.order('is_featured', { ascending: false }).order('rating_avg', { ascending: false });
        break;
      default:
        query = query.order('created_at', { ascending: false });
    }

    const { data, error, count } = await query.range(offset, offset + limit - 1);

    if (error) throw error;

    return NextResponse.json({
      facilities: data || [],
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
    });
  } catch (error) {
    console.error('Storage facilities search error:', error);
    return NextResponse.json({ error: 'Failed to search facilities.' }, { status: 500 });
  }
}
