'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import type { SupplyProduct } from '@/lib/types';
import { SUPPLY_PRODUCT_CATEGORY_CONFIG, SUPPLY_PRODUCT_STATUS_CONFIG } from '@/lib/types';

export default function SupplyProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const [product, setProduct] = useState<SupplyProduct | null>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [ordering, setOrdering] = useState(false);
  const [orderMsg, setOrderMsg] = useState('');
  const [deliveryName, setDeliveryName] = useState('');
  const [deliveryPhone, setDeliveryPhone] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [showOrderForm, setShowOrderForm] = useState(false);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/supplier/products/${id}`)
      .then((r) => r.json())
      .then((d) => { setProduct(d.product); setLoading(false); })
      .catch(() => setLoading(false));
  }, [id]);

  const handleOrder = async () => {
    if (!product) return;
    setOrdering(true);
    setOrderMsg('');
    try {
      const res = await fetch('/api/supply/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: [{ productId: product.id, quantity }],
          deliveryName, deliveryPhone, deliveryAddress,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setOrderMsg(data.error || 'Order failed.'); setOrdering(false); return; }
      if (data.orders?.[0]?.paymentLink) {
        window.location.href = data.orders[0].paymentLink;
      } else {
        setOrderMsg('Order placed successfully! (Demo mode)');
        setTimeout(() => router.push('/dashboard/supplier/orders'), 2000);
      }
    } catch { setOrderMsg('Network error.'); }
    setOrdering(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-cream to-white flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-farm-green border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-cream to-white flex flex-col items-center justify-center">
        <p className="text-gray-500 mb-4">Product not found.</p>
        <Link href="/supplies" className="text-farm-green font-medium hover:underline">Back to Supplies</Link>
      </div>
    );
  }

  const config = SUPPLY_PRODUCT_CATEGORY_CONFIG[product.category];
  const statusConfig = SUPPLY_PRODUCT_STATUS_CONFIG[product.status];
  const supplier = product.supplier as Record<string, unknown> | undefined;
  const available = product.stock_quantity - product.reserved_quantity;

  return (
    <div className="min-h-screen bg-gradient-to-br from-cream to-white">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
          <Link href="/supplies" className="hover:text-farm-green transition">Supplies</Link>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
          <span className="text-gray-700 font-medium truncate">{product.name}</span>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Product Image */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            {product.image_url ? (
              <div className="aspect-square bg-gray-100">
                <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
              </div>
            ) : (
              <div className="aspect-square bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
                <span className="text-6xl text-gray-300"><svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" /></svg></span>
              </div>
            )}
          </div>

          {/* Product Info */}
          <div className="space-y-6">
            <div>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mb-2 ${config?.color || 'bg-gray-100 text-gray-600'}`}>
                        {config?.label}
              </span>
              <h1 className="text-2xl font-bold text-gray-900 mb-1">{product.name}</h1>
              {product.brand && <p className="text-sm text-gray-500">Brand: {product.brand}</p>}
            </div>

            {/* Price */}
            <div className="bg-farm-green/5 rounded-xl p-4">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-farm-green">GH₵ {Number(product.price).toFixed(2)}</span>
                <span className="text-sm text-gray-500">/ {product.unit}</span>
              </div>
              <p className="text-xs text-gray-400 mt-1">Minimum order: {product.min_order_quantity} {product.unit}</p>
            </div>

            {/* Stock */}
            <div className="flex items-center gap-3">
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${statusConfig?.color || 'bg-gray-100 text-gray-600'}`}>
                {statusConfig?.label}
              </span>
              <span className="text-sm text-gray-500">
                {available > 0 ? `${available} available` : 'Out of stock'}
              </span>
              {product.delivery_available && (
                <span className="inline-flex items-center gap-1 text-sm text-emerald-600">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0H21A2.25 2.25 0 0023.25 18V6.75A2.25 2.25 0 0021 4.5h-1.5M6.75 14.25h.008v.008H6.75v-.008zm0 3h.008v.008H6.75v-.008zm0 3h.008v.008H6.75v-.008z" /></svg>
                  Delivery available
                </span>
              )}
            </div>

            {/* Supplier */}
            {supplier && (
              <div className="bg-white rounded-xl border border-gray-100 p-4">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-gray-900 text-sm">{String(supplier.business_name)}</span>
                  {supplier.verification_status === 'approved' && (
                    <svg className="w-4 h-4 text-farm-green" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                  )}
                </div>
                <p className="text-xs text-gray-500">{String(supplier.business_location)}</p>
                {Number(supplier.rating_count) > 0 && (
                  <div className="flex items-center gap-1 mt-1">
                    <div className="flex text-amber-400">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <svg key={i} className={`w-3.5 h-3.5 ${i < Math.round(Number(supplier.rating_avg)) ? 'fill-current' : 'fill-gray-200'}`} viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                      ))}
                    </div>
                    <span className="text-xs text-gray-500">({Number(supplier.rating_count)})</span>
                  </div>
                )}
              </div>
            )}

            {/* Description */}
            {product.description && (
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Description</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{product.description}</p>
              </div>
            )}

            {/* Order Form */}
            {available > 0 && product.status === 'active' && (
              <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-3">
                <h3 className="text-sm font-semibold text-gray-700">Place Order</h3>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Quantity ({product.unit})</label>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setQuantity(Math.max(product.min_order_quantity, quantity - 1))} className="w-9 h-9 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition">-</button>
                    <input type="number" value={quantity} onChange={(e) => setQuantity(Math.max(product.min_order_quantity, parseInt(e.target.value) || product.min_order_quantity))} className="w-20 text-center px-2 py-2 border border-gray-200 rounded-lg text-sm" />
                    <button onClick={() => setQuantity(quantity + 1)} className="w-9 h-9 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition">+</button>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">Total: GH₵ {(Number(product.price) * quantity).toFixed(2)}</p>
                </div>
                {!showOrderForm ? (
                  <button onClick={() => setShowOrderForm(true)} className="w-full px-4 py-3 bg-farm-green text-white text-sm font-semibold rounded-xl hover:bg-farm-green-light transition active:scale-[0.97]">
                    Proceed to Checkout
                  </button>
                ) : (
                  <div className="space-y-3">
                    <input type="text" placeholder="Delivery Name" value={deliveryName} onChange={(e) => setDeliveryName(e.target.value)} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm" />
                    <input type="tel" placeholder="Delivery Phone" value={deliveryPhone} onChange={(e) => setDeliveryPhone(e.target.value)} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm" />
                    <input type="text" placeholder="Delivery Address" value={deliveryAddress} onChange={(e) => setDeliveryAddress(e.target.value)} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm" />
                    <button onClick={handleOrder} disabled={ordering || !deliveryName || !deliveryPhone || !deliveryAddress} className="w-full px-4 py-3 bg-farm-green text-white text-sm font-semibold rounded-xl hover:bg-farm-green-light transition disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.97]">
                      {ordering ? 'Processing...' : `Pay GH₵ ${(Number(product.price) * quantity + Number(product.price) * quantity * 0.02).toFixed(2)}`}
                    </button>
                    {orderMsg && <p className={`text-sm text-center ${orderMsg.includes('success') ? 'text-emerald-600' : 'text-red-500'}`}>{orderMsg}</p>}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
