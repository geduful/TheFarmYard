import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import type { FundingApplicationStatus } from '@/lib/types';

const MAX_PER_PAGE = 50;
const DEFAULT_LIMIT = 20;

/**
 * GET /api/funding/applications
 * Farmers see their own applications; admins see all.
 */
export async function GET(request: NextRequest) {
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
    if (!profile) {
      return NextResponse.json({ error: 'Profile not found.' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(MAX_PER_PAGE, Math.max(1, parseInt(searchParams.get('limit') || String(DEFAULT_LIMIT), 10)));
    const status = searchParams.get('status') as FundingApplicationStatus | null;
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const isAdmin = profile.role === 'admin';

    let query = supabase
      .from('funding_applications')
      .select(`
        id, opportunity_id, farmer_id, amount_requested, status,
        applicant_name, applicant_phone, farm_location, farm_size,
        agricultural_activity, crop_details, funding_purpose, additional_info,
        documents, reviewer_notes, reviewed_at, submitted_at, created_at, updated_at,
        opportunity:funding_opportunities!inner(
          id, title, funding_type, min_amount, max_amount, currency, application_deadline,
          provider:funding_providers!inner(id, name, verification_status)
        ),
        farmer:profiles!funding_applications_farmer_id_fkey(id, full_name, phone_number, farm_location)
      `, { count: 'exact' });

    if (!isAdmin) {
      query = query.eq('farmer_id', user.id);
    }

    if (status) {
      query = query.eq('status', status);
    }

    query = query
      .order('created_at', { ascending: false })
      .range(from, to);

    const { data, error, count } = await query;
    if (error) throw error;

    // Flatten nested joins
    const applications = (data || []).map((app) => {
      const opp = Array.isArray(app.opportunity) ? app.opportunity[0] : app.opportunity;
      const oppProvider = opp
        ? (Array.isArray(opp.provider) ? opp.provider[0] : opp.provider)
        : null;
      const farmer = Array.isArray(app.farmer) ? app.farmer[0] : app.farmer;

      return {
        id: app.id,
        opportunity_id: app.opportunity_id,
        farmer_id: app.farmer_id,
        amount_requested: app.amount_requested,
        status: app.status,
        applicant_name: app.applicant_name,
        applicant_phone: app.applicant_phone,
        farm_location: app.farm_location,
        farm_size: app.farm_size,
        agricultural_activity: app.agricultural_activity,
        crop_details: app.crop_details,
        funding_purpose: app.funding_purpose,
        additional_info: app.additional_info,
        documents: app.documents,
        reviewer_notes: isAdmin ? app.reviewer_notes : undefined,
        reviewed_at: app.reviewed_at,
        submitted_at: app.submitted_at,
        created_at: app.created_at,
        updated_at: app.updated_at,
        opportunity: opp
          ? {
              id: opp.id,
              title: opp.title,
              funding_type: opp.funding_type,
              min_amount: opp.min_amount,
              max_amount: opp.max_amount,
              currency: opp.currency,
              application_deadline: opp.application_deadline,
              provider: oppProvider
                ? { name: oppProvider.name, verification_status: oppProvider.verification_status }
                : null,
            }
          : null,
        farmer: farmer
          ? { id: farmer.id, full_name: farmer.full_name, phone_number: farmer.phone_number, farm_location: farmer.farm_location }
          : null,
      };
    });

    return NextResponse.json({
      applications,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (error) {
    console.error('Fetch funding applications error:', error);
    return NextResponse.json({ error: 'Failed to fetch applications.' }, { status: 500 });
  }
}
