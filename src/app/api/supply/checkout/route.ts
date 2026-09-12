import { NextRequest, NextResponse } from 'next/server';
import { randomInt } from 'crypto';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createServiceSupabaseClient } from '@/lib/supabase/service';
import { createCollectionPayment, isPaymentsConfigured } from '@/lib/flutterwave';
import { createNotification } from '@/lib/notifications';

interface CartItem {
  productId: number;
  quantity: number;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Please sign in.' }, { status: 401 });

    const { data: profile } = await supabase
      .from('profiles')
      .select('role, full_name, phone_number, email, farm_location')
      .eq('id', user.id)
      .single();
    if (profile?.role !== 'farmer' && profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Only farmers can place supply orders.' }, { status: 403 });
    }

    let body: { items?: CartItem[]; deliveryName?: string; deliveryPhone?: string; deliveryAddress?: string; deliveryNotes?: string };
    try { body = await request.json(); } catch {
      return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 });
    }

    if (!body.items || !Array.isArray(body.items) || body.items.length === 0) {
      return NextResponse.json({ error: 'Cart is empty.' }, { status: 400 });
    }

    const serviceClient = createServiceSupabaseClient();

    // Validate products and group by supplier
    const productIds = body.items.map((i) => i.productId);
    const { data: products, error: prodError } = await serviceClient
      .from('supply_products')
      .select('id, supplier_id, name, price, stock_quantity, reserved_quantity, min_order_quantity, status, image_url, unit')
      .in('id', productIds);

    if (prodError || !products) {
      return NextResponse.json({ error: 'Failed to load products.' }, { status: 500 });
    }

    const productMap = new Map(products.map((p) => [p.id, p]));

    // Validate all items
    for (const item of body.items) {
      const product = productMap.get(item.productId);
      if (!product) return NextResponse.json({ error: `Product ${item.productId} not found.` }, { status: 400 });
      if (product.status !== 'active') return NextResponse.json({ error: `"${product.name}" is not available.` }, { status: 400 });
      if (!Number.isInteger(item.quantity) || item.quantity < 1) {
        return NextResponse.json({ error: `Invalid quantity for "${product.name}".` }, { status: 400 });
      }
      if (item.quantity < product.min_order_quantity) {
        return NextResponse.json({ error: `Minimum order for "${product.name}" is ${product.min_order_quantity} ${product.unit}.` }, { status: 400 });
      }
      const available = product.stock_quantity - product.reserved_quantity;
      if (available < item.quantity) {
        return NextResponse.json({ error: `Insufficient stock for "${product.name}". Available: ${available}.` }, { status: 400 });
      }
    }

    // Group items by supplier
    const supplierGroups = new Map<string, CartItem[]>();
    for (const item of body.items) {
      const product = productMap.get(item.productId)!;
      const existing = supplierGroups.get(product.supplier_id) || [];
      existing.push(item);
      supplierGroups.set(product.supplier_id, existing);
    }

    // Create one order per supplier
    const orders = [];
    for (const [supplierId, items] of supplierGroups) {
      let subtotal = 0;
      const orderItems = [];
      for (const item of items) {
        const product = productMap.get(item.productId)!;
        const itemTotal = Number(product.price) * item.quantity;
        subtotal += itemTotal;
        orderItems.push({
          product_id: product.id,
          product_name: product.name,
          product_image: product.image_url,
          quantity: item.quantity,
          unit_price: product.price,
          total_price: itemTotal,
        });
      }

      const platformFee = Math.round(subtotal * 0.02 * 100) / 100;
      const totalAmount = subtotal + platformFee;

      const { data: order, error: orderError } = await serviceClient
        .from('supply_orders')
        .insert({
          farmer_id: user.id,
          supplier_id: supplierId,
          subtotal,
          platform_fee: platformFee,
          total_amount: totalAmount,
          currency: 'GHS',
          delivery_name: body.deliveryName || profile?.full_name || '',
          delivery_phone: body.deliveryPhone || profile?.phone_number || '',
          delivery_address: body.deliveryAddress || profile?.farm_location || '',
          delivery_notes: body.deliveryNotes || null,
        })
        .select('id, order_number')
        .single();

      if (orderError || !order) {
        return NextResponse.json({ error: 'Failed to create order.' }, { status: 500 });
      }

      // Insert order items (triggers inventory reservation)
      for (const item of orderItems) {
        const { error: itemError } = await serviceClient
          .from('supply_order_items')
          .insert({ ...item, order_id: order.id });
        if (itemError) {
          console.error('Order item insert error:', itemError);
          return NextResponse.json({ error: `Failed to add item: ${itemError.message}` }, { status: 500 });
        }
      }

      // Demo mode: instant confirmation
      if (!isPaymentsConfigured()) {
        await serviceClient
          .from('supply_orders')
          .update({ status: 'paid', paid_at: new Date().toISOString() })
          .eq('id', order.id);

        await createNotification({
          userId: supplierId,
          type: 'supplier_new_order',
          category: 'supply',
          title: 'New Supply Order',
          message: `You have a new order ${order.order_number} for GHS ${totalAmount.toFixed(2)}.`,
          priority: 'high',
          actionUrl: '/dashboard/supplier/orders',
          entityType: 'supply_order',
          entityId: String(order.id),
        });

        orders.push({ ...order, demo: true });
      } else {
        // Real mode: create Flutterwave payment
        const txRef = `tfy-sp-${order.id}-${Date.now()}-${randomInt(100000, 1000000)}`;
        await serviceClient
          .from('supply_orders')
          .update({ flw_tx_ref: txRef })
          .eq('id', order.id);

        const appUrl = process.env.APP_URL || request.nextUrl.origin;
        try {
          const { link } = await createCollectionPayment({
            txRef,
            amount: totalAmount,
            currency: 'GHS',
            email: user.email || 'farmer@thefarmyard.africa',
            phone: profile?.phone_number,
            name: profile?.full_name,
            title: `TheFarmYard Supply: ${order.order_number}`,
            redirectUrl: `${appUrl}/api/supply/callback?order_id=${order.id}`,
          });
          orders.push({ ...order, paymentLink: link });
        } catch (err) {
          await serviceClient.from('supply_orders').delete().eq('id', order.id);
          return NextResponse.json(
            { error: err instanceof Error ? err.message : 'Payment failed to start.' },
            { status: 502 }
          );
        }
      }
    }

    return NextResponse.json({ orders });
  } catch (error) {
    console.error('Supply checkout error:', error);
    return NextResponse.json({ error: 'Failed.' }, { status: 500 });
  }
}
