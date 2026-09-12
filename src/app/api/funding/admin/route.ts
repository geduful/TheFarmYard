import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createServiceSupabaseClient } from '@/lib/supabase/service';
import { createNotification } from '@/lib/notifications';
import type { FundingOpportunityStatus, FundingApplicationStatus } from '@/lib/types';

const VALID_OPPORTUNITY_TRANSITIONS: Record<string, FundingOpportunityStatus[]> = {
  draft: ['pending_approval', 'open', 'suspended'],
  pending_approval: ['open', 'draft', 'suspended'],
  open: ['closing_soon', 'closed', 'suspended'],
  closing_soon: ['closed', 'open', 'suspended'],
  closed: ['open', 'draft'],
  suspended: ['open', 'draft', 'closed'],
};

const VALID_APPLICATION_TRANSITIONS: Record<string, FundingApplicationStatus[]> = {
  submitted: ['under_review', 'rejected', 'withdrawn'],
  under_review: ['shortlisted', 'rejected', 'approved'],
  shortlisted: ['approved', 'rejected'],
  approved: [],
  rejected: [],
  withdrawn: ['submitted'],
  expired: [],
  draft: ['submitted', 'withdrawn'],
};

/**
 * POST /api/funding/admin
 * Admin only: Update a funding opportunity's status.
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

    const { opportunity_id, status: newStatus } = body;
    if (!opportunity_id || !newStatus) {
      return NextResponse.json({ error: 'Missing required fields: opportunity_id, status.' }, { status: 400 });
    }

    const validStatuses: FundingOpportunityStatus[] = ['open', 'closing_soon', 'closed', 'suspended', 'draft', 'pending_approval'];
    if (!validStatuses.includes(newStatus)) {
      return NextResponse.json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` }, { status: 400 });
    }

    const serviceClient = createServiceSupabaseClient();

    const { data: opportunity, error: fetchError } = await serviceClient
      .from('funding_opportunities')
      .select('id, title, status')
      .eq('id', Number(opportunity_id))
      .single();

    if (fetchError || !opportunity) {
      return NextResponse.json({ error: 'Funding opportunity not found.' }, { status: 404 });
    }

    const allowedTransitions = VALID_OPPORTUNITY_TRANSITIONS[opportunity.status] || [];
    if (!allowedTransitions.includes(newStatus)) {
      return NextResponse.json({
        error: `Cannot change status from "${opportunity.status}" to "${newStatus}". Allowed transitions: ${allowedTransitions.join(', ') || 'none'}`,
      }, { status: 400 });
    }

    const { error: updateError } = await serviceClient
      .from('funding_opportunities')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', Number(opportunity_id));

    if (updateError) throw updateError;

    return NextResponse.json({ ok: true, id: opportunity.id, status: newStatus });
  } catch (error) {
    console.error('Update opportunity status error:', error);
    return NextResponse.json({ error: 'Failed to update opportunity status.' }, { status: 500 });
  }
}

/**
 * PATCH /api/funding/admin
 * Admin only: Update a funding application's status with transition validation + notification.
 */
export async function PATCH(request: NextRequest) {
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

    const { application_id, status: newStatus, reviewer_notes } = body;
    if (!application_id || !newStatus) {
      return NextResponse.json({ error: 'Missing required fields: application_id, status.' }, { status: 400 });
    }

    const validStatuses: FundingApplicationStatus[] = [
      'submitted', 'under_review', 'shortlisted', 'approved', 'rejected', 'withdrawn', 'expired',
    ];
    if (!validStatuses.includes(newStatus)) {
      return NextResponse.json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` }, { status: 400 });
    }

    const serviceClient = createServiceSupabaseClient();

    const { data: application, error: fetchError } = await serviceClient
      .from('funding_applications')
      .select('id, farmer_id, status, opportunity_id, opportunity:funding_opportunities(title)')
      .eq('id', Number(application_id))
      .single();

    if (fetchError || !application) {
      return NextResponse.json({ error: 'Funding application not found.' }, { status: 404 });
    }

    const allowedTransitions = VALID_APPLICATION_TRANSITIONS[application.status] || [];
    if (!allowedTransitions.includes(newStatus)) {
      return NextResponse.json({
        error: `Cannot change status from "${application.status}" to "${newStatus}". Allowed transitions: ${allowedTransitions.join(', ') || 'none'}`,
      }, { status: 400 });
    }

    const updatePayload: Record<string, unknown> = {
      status: newStatus,
      updated_at: new Date().toISOString(),
    };

    if (newStatus === 'under_review') {
      updatePayload.reviewer_notes = reviewer_notes || null;
      updatePayload.reviewed_by = user.id;
      updatePayload.reviewed_at = new Date().toISOString();
    }

    if (newStatus === 'approved' || newStatus === 'rejected' || newStatus === 'shortlisted') {
      updatePayload.reviewer_notes = reviewer_notes || null;
      updatePayload.reviewed_by = user.id;
      updatePayload.reviewed_at = new Date().toISOString();
    }

    const { error: updateError } = await serviceClient
      .from('funding_applications')
      .update(updatePayload)
      .eq('id', Number(application_id));

    if (updateError) throw updateError;

    const oppTitle = Array.isArray(application.opportunity)
      ? application.opportunity[0]?.title
      : (application.opportunity as { title?: string } | null)?.title;

    const statusMessages: Record<string, { title: string; message: string; priority: 'low' | 'normal' | 'high' }> = {
      under_review: {
        title: 'Application Under Review',
        message: `Your application for "${oppTitle || 'a funding opportunity'}" is now under review.`,
        priority: 'normal',
      },
      shortlisted: {
        title: 'Application Shortlisted',
        message: `Congratulations! Your application for "${oppTitle || 'a funding opportunity'}" has been shortlisted.`,
        priority: 'high',
      },
      approved: {
        title: 'Application Approved',
        message: `Great news! Your application for "${oppTitle || 'a funding opportunity'}" has been approved.`,
        priority: 'high',
      },
      rejected: {
        title: 'Application Not Selected',
        message: `Your application for "${oppTitle || 'a funding opportunity'}" was not selected at this time.`,
        priority: 'normal',
      },
    };

    const notif = statusMessages[newStatus];
    if (notif && application.farmer_id) {
      const notificationType = newStatus === 'approved'
        ? 'funding_application_approved'
        : newStatus === 'rejected'
          ? 'funding_application_rejected'
          : newStatus === 'shortlisted'
            ? 'funding_application_shortlisted'
            : 'funding_application_review';

      await createNotification({
        userId: application.farmer_id,
        type: notificationType as any,
        category: 'funding',
        title: notif.title,
        message: notif.message,
        priority: notif.priority,
        actionUrl: '/dashboard/farmer/funding',
        entityType: 'funding_application',
        entityId: String(application.id),
      });
    }

    return NextResponse.json({ ok: true, id: application.id, status: newStatus });
  } catch (error) {
    console.error('Update application status error:', error);
    return NextResponse.json({ error: 'Failed to update application status.' }, { status: 500 });
  }
}
