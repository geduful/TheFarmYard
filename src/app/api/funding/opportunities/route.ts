import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createServiceSupabaseClient } from '@/lib/supabase/service';
import type { FundingType, FundingOpportunityStatus } from '@/lib/types';

const MAX_PER_PAGE = 50;
const DEFAULT_LIMIT = 20;

/**
 * GET /api/funding/opportunities
 * Public search/filter for open funding opportunities from verified providers.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const type = searchParams.get('type') as FundingType | null;
    const location = searchParams.get('location');
    const crop = searchParams.get('crop');
    const minAmount = searchParams.get('min_amount');
    const maxAmount = searchParams.get('max_amount');
    const sort = searchParams.get('sort') || 'newest';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(MAX_PER_PAGE, Math.max(1, parseInt(searchParams.get('limit') || String(DEFAULT_LIMIT), 10)));
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const supabase = createServiceSupabaseClient();

    const statuses: FundingOpportunityStatus[] = ['open', 'closing_soon'];

    let query = supabase
      .from('funding_opportunities')
      .select(`
        id, provider_id, title, description, funding_type,
        min_amount, max_amount, currency, application_start, application_deadline,
        eligibility_criteria, supported_crops, supported_activities,
        supported_locations, target_farmer_categories, required_documents,
        application_instructions, external_url, status, created_at,
        provider:funding_providers!inner(id, name, provider_type, logo_url, verification_status)
      `, { count: 'exact' })
      .in('status', statuses);

    if (search) {
      query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
    }

    if (type) {
      query = query.eq('funding_type', type);
    }

    if (location) {
      query = query.contains('supported_locations', [location]);
    }

    if (crop) {
      query = query.contains('supported_crops', [crop]);
    }

    if (minAmount) {
      query = query.gte('max_amount', Number(minAmount));
    }

    if (maxAmount) {
      query = query.lte('min_amount', Number(maxAmount));
    }

    switch (sort) {
      case 'amount_high':
        query = query.order('max_amount', { ascending: false });
        break;
      case 'amount_low':
        query = query.order('min_amount', { ascending: true });
        break;
      case 'deadline':
        query = query.order('application_deadline', { ascending: true, nullsFirst: false });
        break;
      case 'oldest':
        query = query.order('created_at', { ascending: true });
        break;
      case 'newest':
      default:
        query = query.order('created_at', { ascending: false });
        break;
    }

    query = query.range(from, to);

    const { data, error, count } = await query;
    if (error) throw error;

    const opportunities = (data || []).map((opp) => ({
      ...opp,
      provider: Array.isArray(opp.provider) ? opp.provider[0] : opp.provider,
    }));

    return NextResponse.json({
      opportunities,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (error) {
    console.error('Funding opportunities error:', error);
    return NextResponse.json({ error: 'Failed to fetch funding opportunities.' }, { status: 500 });
  }
}

/**
 * POST /api/funding/opportunities
 * Admin only: Create a new funding opportunity.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 });
    }

    const {
      title, provider_id, funding_type, description,
      min_amount, max_amount, application_start, application_deadline,
      eligibility_criteria, supported_crops, supported_activities,
      supported_locations, target_farmer_categories, required_documents,
      application_instructions, external_url, status,
    } = body;

    if (!title || !provider_id || !funding_type) {
      return NextResponse.json({ error: 'Missing required fields: title, provider_id, funding_type.' }, { status: 400 });
    }

    const validStatuses: FundingOpportunityStatus[] = ['draft', 'pending_approval'];
    const initialStatus: FundingOpportunityStatus = validStatuses.includes(status) ? status : 'draft';

    const serviceClient = createServiceSupabaseClient();

    const { data: opportunity, error: insertError } = await serviceClient
      .from('funding_opportunities')
      .insert({
        title: title.trim(),
        provider_id: Number(provider_id),
        funding_type,
        description: description || null,
        min_amount: min_amount ?? 0,
        max_amount: max_amount ?? 0,
        currency: 'GHS',
        application_start: application_start || null,
        application_deadline: application_deadline || null,
        eligibility_criteria: eligibility_criteria || null,
        supported_crops: supported_crops || [],
        supported_activities: supported_activities || [],
        supported_locations: supported_locations || [],
        target_farmer_categories: target_farmer_categories || [],
        required_documents: required_documents || [],
        application_instructions: application_instructions || null,
        external_url: external_url || null,
        status: initialStatus,
        created_by: user.id,
      })
      .select('id, title, status, created_at')
      .single();

    if (insertError) throw insertError;

    return NextResponse.json({ ok: true, opportunity }, { status: 201 });
  } catch (error) {
    console.error('Create funding opportunity error:', error);
    return NextResponse.json({ error: 'Failed to create funding opportunity.' }, { status: 500 });
  }
}
