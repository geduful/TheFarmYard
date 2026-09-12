import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createServiceSupabaseClient } from '@/lib/supabase/service';
import { createNotification } from '@/lib/notifications';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
    if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const url = new URL(request.url);
    const type = url.searchParams.get('type') || 'suppliers';
    const status = url.searchParams.get('status');

    if (type === 'suppliers') {
      let query = supabase
        .from('supplier_profiles')
        .select('*, user:profiles!supplier_profiles_user_id_fkey(full_name, phone_number, email)')
        .order('created_at', { ascending: false });
      if (status) query = query.eq('verification_status', status);
      const { data, error } = await query;
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ suppliers: data || [] });
    }

    if (type === 'products') {
      let query = supabase
        .from('supply_products')
        .select('*, supplier:supplier_profiles!supply_products_supplier_id_fkey(business_name, verification_status)')
        .order('created_at', { ascending: false });
      if (status) query = query.eq('status', status);
      const { data, error } = await query;
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ products: data || [] });
    }

    if (type === 'orders') {
      let query = supabase
        .from('supply_orders')
        .select('*, items:supply_order_items(*), supplier:supplier_profiles!supply_orders_supplier_id_fkey(business_name), farmer:profiles!supply_orders_farmer_id_fkey(full_name)')
        .order('created_at', { ascending: false });
      if (status) query = query.eq('status', status);
      const { data, error } = await query;
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ orders: data || [] });
    }

    return NextResponse.json({ error: 'Invalid type.' }, { status: 400 });
  } catch (error) {
    console.error('Admin supply GET error:', error);
    return NextResponse.json({ error: 'Failed.' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
    if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    let body: Record<string, unknown>;
    try { body = await request.json(); } catch {
      return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 });
    }

    const serviceClient = createServiceSupabaseClient();

    // Supplier verification action
    if (body.supplierId && body.action) {
      const supplierId = String(body.supplierId);
      const action = String(body.action);

      const VALID_ACTIONS = ['approve', 'reject', 'suspend', 'under_review'];
      if (!VALID_ACTIONS.includes(action)) {
        return NextResponse.json({ error: 'Invalid action.' }, { status: 400 });
      }

      const STATUS_MAP: Record<string, string> = {
        approve: 'approved',
        reject: 'rejected',
        suspend: 'suspended',
        under_review: 'under_review',
      };

      const updates: Record<string, unknown> = {
        verification_status: STATUS_MAP[action],
      };
      if (action === 'approve') updates.verified_at = new Date().toISOString();
      if (action === 'reject' && body.reason) updates.rejection_reason = String(body.reason);
      if (body.adminNotes) updates.admin_notes = String(body.adminNotes);

      const { data: supplier, error } = await serviceClient
        .from('supplier_profiles')
        .update(updates)
        .eq('id', supplierId)
        .select('id, user_id, business_name')
        .single();

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });

      const NOTIF_MAP: Record<string, { type: string; title: string; message: string }> = {
        approve: {
          type: 'supplier_application_approved',
          title: 'Supplier Application Approved',
          message: `Your supplier application for "${supplier.business_name}" has been approved. You can now list products for sale.`,
        },
        reject: {
          type: 'supplier_application_rejected',
          title: 'Supplier Application Rejected',
          message: `Your supplier application for "${supplier.business_name}" has been rejected. ${body.reason ? `Reason: ${body.reason}` : ''}`,
        },
        suspend: {
          type: 'supplier_suspended',
          title: 'Supplier Account Suspended',
          message: `Your supplier account "${supplier.business_name}" has been suspended.`,
        },
        under_review: {
          type: 'supplier_application_submitted',
          title: 'Supplier Application Under Review',
          message: `Your supplier application for "${supplier.business_name}" is now under review.`,
        },
      };

      const notif = NOTIF_MAP[action];
      if (notif) {
        await createNotification({
          userId: supplier.user_id,
          type: notif.type as 'supplier_application_approved' | 'supplier_application_rejected' | 'supplier_suspended' | 'supplier_application_submitted',
          category: 'supply',
          title: notif.title,
          message: notif.message,
          priority: action === 'reject' || action === 'suspend' ? 'high' : 'normal',
          actionUrl: '/dashboard/supplier',
          entityType: 'supplier_profile',
          entityId: supplierId,
        });
      }

      return NextResponse.json({ ok: true });
    }

    // Product moderation
    if (body.productId && body.action) {
      const productId = Number(body.productId);
      const action = String(body.action);

      if (action === 'remove') {
        const { error } = await serviceClient
          .from('supply_products')
          .update({ status: 'inactive' })
          .eq('id', productId);
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json({ ok: true });
      }

      if (action === 'feature' || action === 'unfeature') {
        const { error } = await serviceClient
          .from('supply_products')
          .update({ is_featured: action === 'feature' })
          .eq('id', productId);
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json({ ok: true });
      }

      return NextResponse.json({ error: 'Invalid product action.' }, { status: 400 });
    }

    return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 });
  } catch (error) {
    console.error('Admin supply PATCH error:', error);
    return NextResponse.json({ error: 'Failed.' }, { status: 500 });
  }
}
