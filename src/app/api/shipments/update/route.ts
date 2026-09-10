import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createNotification } from '@/lib/notifications';

const VALID_SHIPMENT_TRANSITIONS: Record<string, string[]> = {
  pending: ['pickup_scheduled', 'cancelled'],
  pickup_scheduled: ['assigned', 'cancelled'],
  assigned: ['in_transit', 'cancelled'],
  in_transit: ['out_for_delivery', 'delivered', 'delivery_issue', 'failed', 'cancelled'],
  out_for_delivery: ['delivered', 'delivery_issue', 'failed'],
  delivered: ['delivery_confirmed', 'delivery_issue'],
  delivery_confirmed: [],
  delivery_issue: ['delivered', 'cancelled', 'failed'],
  cancelled: [],
  failed: [],
};

/**
 * POST /api/shipments/update
 * Updates shipment status with transition validation and notifications.
 * Only participants (farmer/buyer) or admins can update.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    let body;
    try { body = await request.json(); } catch {
      return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 });
    }

    const { shipmentId, newStatus, note } = body;
    if (!shipmentId || !newStatus) {
      return NextResponse.json({ error: 'Missing shipmentId or newStatus.' }, { status: 400 });
    }

    // Fetch shipment
    const { data: shipment, error: fetchError } = await supabase
      .from('shipments')
      .select('id, farmer_id, buyer_id, order_id, status, escrow_id')
      .eq('id', shipmentId)
      .single();

    if (fetchError || !shipment) {
      return NextResponse.json({ error: 'Shipment not found.' }, { status: 404 });
    }

    // Verify user is participant
    if (shipment.farmer_id !== user.id && shipment.buyer_id !== user.id) {
      const { data: profile } = await supabase
        .from('profiles').select('role').eq('id', user.id).single();
      if (profile?.role !== 'admin') {
        return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
      }
    }

    // Validate status transition
    const allowed = VALID_SHIPMENT_TRANSITIONS[shipment.status];
    if (!allowed || !allowed.includes(newStatus)) {
      return NextResponse.json({
        error: `Invalid transition from "${shipment.status}" to "${newStatus}".`
      }, { status: 400 });
    }

    // Update shipment status
    const updateData: Record<string, unknown> = { status: newStatus };
    if (newStatus === 'pickup_scheduled' || newStatus === 'in_transit') {
      updateData.actual_pickup_at = new Date().toISOString();
    }
    if (newStatus === 'delivered' || newStatus === 'delivery_confirmed') {
      updateData.actual_delivery_at = new Date().toISOString();
    }

    const { error: updateError } = await supabase
      .from('shipments')
      .update(updateData)
      .eq('id', shipmentId)
      .eq('status', shipment.status);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // Insert status history
    await supabase.from('shipment_status_history').insert({
      shipment_id: shipmentId,
      from_status: shipment.status,
      to_status: newStatus,
      note: note || null,
      changed_by: user.id,
    });

    // Create notifications based on status change
    const orderId = shipment.order_id || `#${shipmentId}`;

    const notifyOther = (userId: string, title: string, message: string, priority: 'normal' | 'high' | 'critical') => {
      createNotification({
        userId,
        type: `shipment_${newStatus}` as 'shipment_created',
        category: 'logistics',
        title,
        message,
        priority,
        actionUrl: `/dashboard/${userId === shipment.farmer_id ? 'farmer' : 'buyer'}`,
        entityType: 'shipment',
        entityId: String(shipmentId),
      });
    };

    switch (newStatus) {
      case 'pickup_scheduled':
        notifyOther(shipment.buyer_id, 'Pickup Scheduled', `Shipment for order ${orderId} pickup has been scheduled.`, 'normal');
        break;
      case 'assigned':
        notifyOther(shipment.buyer_id, 'Driver Assigned', `A driver has been assigned to your order ${orderId}.`, 'normal');
        break;
      case 'in_transit':
        notifyOther(shipment.buyer_id, 'Shipment In Transit', `Your order ${orderId} is now in transit.`, 'high');
        break;
      case 'out_for_delivery':
        notifyOther(shipment.buyer_id, 'Out for Delivery', `Your order ${orderId} is out for delivery. Get ready!`, 'high');
        break;
      case 'delivered':
        notifyOther(shipment.farmer_id, 'Delivery Completed', `Order ${orderId} has been delivered.`, 'high');
        break;
      case 'delivery_confirmed':
        notifyOther(shipment.farmer_id, 'Delivery Confirmed', `Buyer has confirmed delivery for order ${orderId}.`, 'high');
        break;
      case 'delivery_issue':
        notifyOther(shipment.farmer_id, 'Delivery Issue Reported', `Buyer has reported an issue with order ${orderId}.`, 'critical');
        break;
      case 'cancelled':
        notifyOther(shipment.buyer_id === user.id ? shipment.farmer_id : shipment.buyer_id, 'Shipment Cancelled', `Shipment for order ${orderId} has been cancelled.`, 'high');
        break;
      case 'failed':
        notifyOther(shipment.buyer_id === user.id ? shipment.farmer_id : shipment.buyer_id, 'Shipment Failed', `Shipment for order ${orderId} has failed.`, 'critical');
        break;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Shipment update error:', error);
    return NextResponse.json({ error: 'Failed to update shipment.' }, { status: 500 });
  }
}
