import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createServiceSupabaseClient } from '@/lib/supabase/service';
import { createNotification } from '@/lib/notifications';
import type { FundingOpportunityStatus } from '@/lib/types';

/**
 * POST /api/funding/apply
 * Submit a funding application. Requires an authenticated farmer.
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
      .select('role, full_name, phone_number, email, farm_location')
      .eq('id', user.id)
      .single();
    if (profile?.role !== 'farmer') {
      return NextResponse.json({ error: 'Only farmers can apply for funding.' }, { status: 403 });
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 });
    }

    const { opportunity_id } = body;
    if (!opportunity_id) {
      return NextResponse.json({ error: 'Missing required field: opportunity_id.' }, { status: 400 });
    }

    const serviceClient = createServiceSupabaseClient();

    // Fetch opportunity with provider info
    const { data: opportunity, error: oppError } = await serviceClient
      .from('funding_opportunities')
      .select('id, title, status, application_deadline, provider_id, provider:funding_providers(name)')
      .eq('id', Number(opportunity_id))
      .single();

    if (oppError || !opportunity) {
      return NextResponse.json({ error: 'Funding opportunity not found.' }, { status: 404 });
    }

    const allowedStatuses: FundingOpportunityStatus[] = ['open', 'closing_soon'];
    if (!allowedStatuses.includes(opportunity.status as FundingOpportunityStatus)) {
      return NextResponse.json({ error: 'This funding opportunity is no longer accepting applications.' }, { status: 400 });
    }

    if (opportunity.application_deadline) {
      const deadline = new Date(opportunity.application_deadline);
      if (deadline < new Date()) {
        return NextResponse.json({ error: 'The application deadline has passed.' }, { status: 400 });
      }
    }

    // Check for duplicate application
    const { data: existing } = await serviceClient
      .from('funding_applications')
      .select('id')
      .eq('opportunity_id', Number(opportunity_id))
      .eq('farmer_id', user.id)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ error: 'You have already applied for this opportunity.' }, { status: 409 });
    }

    // Validate amount_requested if provided
    const { amount_requested, farm_size, agricultural_activity, crop_details, funding_purpose, additional_info, documents } = body;

    if (amount_requested !== undefined && amount_requested !== null) {
      const amount = Number(amount_requested);
      if (!Number.isFinite(amount) || amount <= 0) {
        return NextResponse.json({ error: 'Amount requested must be a positive number.' }, { status: 400 });
      }
    }

    const now = new Date().toISOString();

    const { data: application, error: insertError } = await serviceClient
      .from('funding_applications')
      .insert({
        opportunity_id: Number(opportunity_id),
        farmer_id: user.id,
        amount_requested: amount_requested ? Number(amount_requested) : null,
        status: 'submitted',
        applicant_name: profile?.full_name || null,
        applicant_phone: profile?.phone_number || null,
        applicant_email: profile?.email || null,
        farm_location: profile?.farm_location || null,
        farm_size: farm_size || null,
        agricultural_activity: agricultural_activity || null,
        crop_details: crop_details || null,
        funding_purpose: funding_purpose || null,
        additional_info: additional_info || null,
        documents: documents || [],
        submitted_at: now,
      })
      .select('id, status, submitted_at')
      .single();

    if (insertError) {
      console.error('Funding application insert error:', insertError);
      return NextResponse.json({ error: insertError.message || 'Failed to submit application.' }, { status: 500 });
    }

    // Notify farmer
    await createNotification({
      userId: user.id,
      type: 'funding_application_submitted',
      category: 'funding',
      title: 'Funding Application Submitted',
      message: `Your application for "${opportunity.title}" has been submitted successfully.`,
      priority: 'normal',
      actionUrl: '/dashboard/farmer/funding',
      entityType: 'funding_application',
      entityId: String(application.id),
    });

    // Notify provider/admin of new application
    const providerName = Array.isArray(opportunity.provider)
      ? opportunity.provider[0]?.name
      : (opportunity.provider as { name?: string } | null)?.name;

    await createNotification({
      userId: user.id,
      type: 'funding_application_received',
      category: 'funding',
      title: 'New Funding Application',
      message: `A new application has been submitted for "${opportunity.title}"${providerName ? ` from ${providerName}` : ''}.`,
      priority: 'high',
      actionUrl: '/dashboard/admin/funding',
      entityType: 'funding_application',
      entityId: String(application.id),
    });

    return NextResponse.json({ ok: true, applicationId: application.id, status: application.status }, { status: 201 });
  } catch (error) {
    console.error('Funding apply error:', error);
    return NextResponse.json({ error: 'Failed to submit application.' }, { status: 500 });
  }
}
