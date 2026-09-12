'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { SupplierProfile, SupplyProduct, SupplyOrder, SupplyProductCategory } from '@/lib/types';
import { SUPPLIER_VERIFICATION_STATUS_CONFIG, SUPPLY_PRODUCT_CATEGORY_CONFIG, SUPPLY_PRODUCT_STATUS_CONFIG, SUPPLY_ORDER_STATUS_CONFIG } from '@/lib/types';

type TabFilter = 'overview' | 'products' | 'orders' | 'profile';

export default function SupplierDashboardPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<SupplierProfile | null>(null);
  const [products, setProducts] = useState<SupplyProduct[]>([]);
  const [orders, setOrders] = useState<SupplyOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabFilter>('overview');
  const [applying, setApplying] = useState(false);
  const [appForm, setAppForm] = useState({ business_name: '', business_description: '', business_location: '', contact_phone: '', contact_email: '', supplier_category: 'other_agricultural_inputs' as SupplyProductCategory });

  // Product form
  const [showProductForm, setShowProductForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<SupplyProduct | null>(null);
  const [prodForm, setProdForm] = useState({ name: '', description: '', category: 'seeds' as SupplyProductCategory, brand: '', unit: 'unit', price: '', min_order_quantity: '1', stock_quantity: '0', location: '', delivery_available: false });
  const [prodSaving, setProdSaving] = useState(false);
  const [prodMsg, setProdMsg] = useState('');

  const fetchData = useCallback(async () => {
    try {
      const [profileRes, productsRes, ordersRes] = await Promise.all([
        fetch('/api/supplier/profile'),
        fetch('/api/supplier/products'),
        fetch('/api/supplier/orders'),
      ]);
      const profileData = await profileRes.json();
      const productsData = await productsRes.json();
      const ordersData = await ordersRes.json();
      setProfile(profileData.supplier);
      setProducts(productsData.products || []);
      setOrders(ordersData.orders || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleApply = async () => {
    setApplying(true);
    try {
      const res = await fetch('/api/supplier/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(appForm),
      });
      const data = await res.json();
      if (res.ok && data.supplier) {
        setProfile(data.supplier);
      } else {
        alert(data.error || 'Failed to apply.');
      }
    } catch { alert('Network error.'); }
    setApplying(false);
  };

  const handleSaveProduct = async () => {
    setProdSaving(true);
    setProdMsg('');
    try {
      const body = { ...prodForm, price: Number(prodForm.price), min_order_quantity: Number(prodForm.min_order_quantity), stock_quantity: Number(prodForm.stock_quantity) };
      const url = editingProduct ? `/api/supplier/products/${editingProduct.id}` : '/api/supplier/products';
      const method = editingProduct ? 'PATCH' : 'POST';
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) { setProdMsg(data.error || 'Failed.'); setProdSaving(false); return; }
      setProdMsg(editingProduct ? 'Product updated!' : 'Product created!');
      setShowProductForm(false);
      setEditingProduct(null);
      setProdForm({ name: '', description: '', category: 'seeds', brand: '', unit: 'unit', price: '', min_order_quantity: '1', stock_quantity: '0', location: '', delivery_available: false });
      fetchData();
    } catch { setProdMsg('Network error.'); }
    setProdSaving(false);
  };

  const handleUpdateOrder = async (orderId: number, newStatus: string) => {
    try {
      const res = await fetch('/api/supplier/orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id: orderId, status: newStatus }),
      });
      if (res.ok) fetchData();
    } catch (e) { console.error(e); }
  };

  const handleDeleteProduct = async (productId: number) => {
    if (!confirm('Delete this product?')) return;
    try {
      const res = await fetch(`/api/supplier/products/${productId}`, { method: 'DELETE' });
      if (res.ok) fetchData();
    } catch (e) { console.error(e); }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-cream to-white flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-farm-green border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Not yet a supplier - show application form
  if (!profile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-cream to-white">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Become a Supplier</h1>
            <p className="text-sm text-gray-500 mb-6">Apply to sell agricultural inputs and equipment directly to farmers on TheFarmYard.</p>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Business Name *</label>
                <input type="text" value={appForm.business_name} onChange={(e) => setAppForm({ ...appForm, business_name: e.target.value })} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm" placeholder="e.g. AgroTech Ghana Ltd" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Business Description</label>
                <textarea value={appForm.business_description} onChange={(e) => setAppForm({ ...appForm, business_description: e.target.value })} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm" rows={3} placeholder="Describe your business..." />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Primary Category *</label>
                <select value={appForm.supplier_category} onChange={(e) => setAppForm({ ...appForm, supplier_category: e.target.value as SupplyProductCategory })} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm">
                  {Object.entries(SUPPLY_PRODUCT_CATEGORY_CONFIG).map(([k, v]) => (
                    <option key={k} value={k}>{v.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Business Location *</label>
                <input type="text" value={appForm.business_location} onChange={(e) => setAppForm({ ...appForm, business_location: e.target.value })} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm" placeholder="e.g. Ashanti > Kumasi" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Contact Phone</label>
                  <input type="tel" value={appForm.contact_phone} onChange={(e) => setAppForm({ ...appForm, contact_phone: e.target.value })} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Contact Email</label>
                  <input type="email" value={appForm.contact_email} onChange={(e) => setAppForm({ ...appForm, contact_email: e.target.value })} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm" />
                </div>
              </div>
              <button onClick={handleApply} disabled={applying || !appForm.business_name || !appForm.business_location} className="w-full px-4 py-3 bg-farm-green text-white text-sm font-semibold rounded-xl hover:bg-farm-green-light transition disabled:opacity-50 active:scale-[0.97]">
                {applying ? 'Submitting...' : 'Submit Application'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Supplier exists but not approved
  if (profile.verification_status !== 'approved') {
    const statusConfig = SUPPLIER_VERIFICATION_STATUS_CONFIG[profile.verification_status];
    return (
      <div className="min-h-screen bg-gradient-to-br from-cream to-white">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" /></svg>
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Application Under Review</h2>
            <p className="text-sm text-gray-500 mb-4">Your supplier application for <strong>{profile.business_name}</strong> is currently <span className={`font-medium ${statusConfig?.color}`}>{statusConfig?.label}</span>.</p>
            {profile.rejection_reason && (
              <div className="bg-red-50 rounded-xl p-4 mb-4 text-left">
                <p className="text-sm font-medium text-red-700 mb-1">Rejection Reason:</p>
                <p className="text-sm text-red-600">{profile.rejection_reason}</p>
              </div>
            )}
            <p className="text-xs text-gray-400">You will be notified once your application is reviewed.</p>
          </div>
        </div>
      </div>
    );
  }

  // Approved supplier dashboard
  const stats = {
    totalProducts: products.length,
    activeProducts: products.filter((p) => p.status === 'active').length,
    totalOrders: orders.length,
    pendingOrders: orders.filter((o) => o.status === 'pending_payment' || o.status === 'paid').length,
    revenue: orders.filter((o) => o.status === 'completed').reduce((sum, o) => sum + Number(o.total_amount), 0),
  };

  const NEXT_STATUSES: Record<string, string> = {
    confirmed: 'processing',
    processing: 'ready_for_dispatch',
    ready_for_dispatch: 'dispatched',
    dispatched: 'in_transit',
    in_transit: 'delivered',
    delivered: 'completed',
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-cream to-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-2xl font-bold text-gray-900">{profile.business_name}</h1>
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${SUPPLIER_VERIFICATION_STATUS_CONFIG[profile.verification_status]?.color}`}>
                {SUPPLIER_VERIFICATION_STATUS_CONFIG[profile.verification_status]?.label}
              </span>
            </div>
            <p className="text-sm text-gray-500">Supplier Dashboard</p>
          </div>
          <Link href="/supplies" className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.5 6V5.25A2.25 2.25 0 0011.25 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 005.25 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" /></svg>
            View Marketplace
          </Link>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-white rounded-xl border border-gray-100 mb-6 overflow-x-auto">
          {(['overview', 'products', 'orders', 'profile'] as const).map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all whitespace-nowrap ${activeTab === tab ? 'bg-farm-green text-white shadow-sm' : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'}`}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6 animate-fade-in">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: 'Total Products', value: stats.totalProducts, color: 'blue' },
                { label: 'Active Products', value: stats.activeProducts, color: 'emerald' },
                { label: 'Total Orders', value: stats.totalOrders, color: 'amber' },
                { label: 'Revenue', value: `GH₵ ${stats.revenue.toFixed(2)}`, color: 'purple' },
              ].map((stat) => (
                <div key={stat.label} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                  <p className="text-xs text-gray-500 mb-1">{stat.label}</p>
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                </div>
              ))}
            </div>
            {/* Recent Orders */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <h3 className="font-semibold text-gray-900 mb-3">Recent Orders</h3>
              {orders.length === 0 ? (
                <p className="text-sm text-gray-400">No orders yet.</p>
              ) : (
                <div className="space-y-2">
                  {orders.slice(0, 5).map((order) => (
                    <div key={order.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{order.order_number}</p>
                        <p className="text-xs text-gray-500">GH₵ {Number(order.total_amount).toFixed(2)}</p>
                      </div>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${SUPPLY_ORDER_STATUS_CONFIG[order.status]?.color || 'bg-gray-100 text-gray-600'}`}>
                        {SUPPLY_ORDER_STATUS_CONFIG[order.status]?.label || order.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Products Tab */}
        {activeTab === 'products' && (
          <div className="space-y-4 animate-fade-in">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Products ({products.length})</h3>
              <button onClick={() => { setEditingProduct(null); setProdForm({ name: '', description: '', category: 'seeds', brand: '', unit: 'unit', price: '', min_order_quantity: '1', stock_quantity: '0', location: '', delivery_available: false }); setShowProductForm(true); }} className="px-4 py-2 bg-farm-green text-white text-sm font-semibold rounded-xl hover:bg-farm-green-light transition active:scale-[0.97]">
                + Add Product
              </button>
            </div>

            {/* Product Form Modal */}
            {showProductForm && (
              <div className="fixed inset-0 bg-black/50 z-40 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">{editingProduct ? 'Edit Product' : 'Add New Product'}</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs font-medium text-gray-700 mb-1 block">Product Name *</label>
                      <input type="text" value={prodForm.name} onChange={(e) => setProdForm({ ...prodForm, name: e.target.value })} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-medium text-gray-700 mb-1 block">Category *</label>
                        <select value={prodForm.category} onChange={(e) => setProdForm({ ...prodForm, category: e.target.value as SupplyProductCategory })} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm">
                          {Object.entries(SUPPLY_PRODUCT_CATEGORY_CONFIG).map(([k, v]) => (
                            <option key={k} value={k}>{v.label}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-700 mb-1 block">Unit</label>
                        <input type="text" value={prodForm.unit} onChange={(e) => setProdForm({ ...prodForm, unit: e.target.value })} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm" placeholder="kg, bag, unit..." />
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="text-xs font-medium text-gray-700 mb-1 block">Price (GHS) *</label>
                        <input type="number" value={prodForm.price} onChange={(e) => setProdForm({ ...prodForm, price: e.target.value })} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm" step="0.01" />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-700 mb-1 block">Min Order</label>
                        <input type="number" value={prodForm.min_order_quantity} onChange={(e) => setProdForm({ ...prodForm, min_order_quantity: e.target.value })} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm" />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-700 mb-1 block">Stock</label>
                        <input type="number" value={prodForm.stock_quantity} onChange={(e) => setProdForm({ ...prodForm, stock_quantity: e.target.value })} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-medium text-gray-700 mb-1 block">Brand</label>
                        <input type="text" value={prodForm.brand} onChange={(e) => setProdForm({ ...prodForm, brand: e.target.value })} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm" />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-700 mb-1 block">Location</label>
                        <input type="text" value={prodForm.location} onChange={(e) => setProdForm({ ...prodForm, location: e.target.value })} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm" />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-700 mb-1 block">Description</label>
                      <textarea value={prodForm.description} onChange={(e) => setProdForm({ ...prodForm, description: e.target.value })} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm" rows={3} />
                    </div>
                    <label className="flex items-center gap-2 text-sm text-gray-700">
                      <input type="checkbox" checked={prodForm.delivery_available} onChange={(e) => setProdForm({ ...prodForm, delivery_available: e.target.checked })} className="rounded border-gray-300" />
                      Delivery available
                    </label>
                    {prodMsg && <p className={`text-sm ${prodMsg.includes('success') || prodMsg.includes('created') || prodMsg.includes('updated') ? 'text-emerald-600' : 'text-red-500'}`}>{prodMsg}</p>}
                    <div className="flex gap-3 pt-2">
                      <button onClick={() => { setShowProductForm(false); setEditingProduct(null); }} className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition">Cancel</button>
                      <button onClick={handleSaveProduct} disabled={prodSaving || !prodForm.name || !prodForm.price} className="flex-1 px-4 py-2.5 bg-farm-green text-white text-sm font-semibold rounded-xl hover:bg-farm-green-light transition disabled:opacity-50 active:scale-[0.97]">
                        {prodSaving ? 'Saving...' : editingProduct ? 'Update' : 'Create'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Products List */}
            {products.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 text-center py-12">
                <p className="text-gray-500 font-medium">No products yet</p>
                <p className="text-gray-400 text-sm mt-1">Add your first product to start selling.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {products.map((product) => {
                  const catConfig = SUPPLY_PRODUCT_CATEGORY_CONFIG[product.category];
                  const statusConfig = SUPPLY_PRODUCT_STATUS_CONFIG[product.status];
                  return (
                    <div key={product.id} className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <h4 className="font-semibold text-gray-900 text-sm">{product.name}</h4>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${catConfig?.color || 'bg-gray-100 text-gray-600'}`}>{catConfig?.label}</span>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusConfig?.color || 'bg-gray-100 text-gray-600'}`}>{statusConfig?.label}</span>
                        </div>
                        <p className="text-xs text-gray-500">GH₵ {Number(product.price).toFixed(2)} / {product.unit} · Stock: {product.stock_quantity} · Available: {product.stock_quantity - product.reserved_quantity}</p>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <button onClick={() => { setEditingProduct(product); setProdForm({ name: product.name, description: product.description || '', category: product.category, brand: product.brand || '', unit: product.unit, price: String(product.price), min_order_quantity: String(product.min_order_quantity), stock_quantity: String(product.stock_quantity), location: product.location || '', delivery_available: product.delivery_available }); setShowProductForm(true); }} className="px-3 py-1.5 text-xs font-medium text-farm-green bg-farm-green/10 rounded-lg hover:bg-farm-green/20 transition">Edit</button>
                        <button onClick={() => handleDeleteProduct(product.id)} className="px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition">Delete</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Orders Tab */}
        {activeTab === 'orders' && (
          <div className="space-y-4 animate-fade-in">
            <h3 className="font-semibold text-gray-900">Orders ({orders.length})</h3>
            {orders.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 text-center py-12">
                <p className="text-gray-500 font-medium">No orders yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {orders.map((order) => {
                  const statusConfig = SUPPLY_ORDER_STATUS_CONFIG[order.status];
                  const nextStatus = NEXT_STATUSES[order.status];
                  return (
                    <div key={order.id} className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="font-semibold text-gray-900 text-sm">{order.order_number}</span>
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusConfig?.color || 'bg-gray-100 text-gray-600'}`}>{statusConfig?.label}</span>
                          </div>
                          <p className="text-xs text-gray-500">
                            {typeof order.farmer === 'object' && order.farmer ? String(order.farmer.full_name) : 'Farmer'} · GH₵ {Number(order.total_amount).toFixed(2)} · {new Date(order.created_at).toLocaleDateString()}
                          </p>
                          {order.items && (
                            <p className="text-xs text-gray-400 mt-1">
                              {order.items.map((item) => `${item.product_name} x${item.quantity}`).join(', ')}
                            </p>
                          )}
                        </div>
                        {nextStatus && (
                          <button onClick={() => handleUpdateOrder(order.id, nextStatus)} className="px-3 py-1.5 text-xs font-medium text-white bg-farm-green rounded-lg hover:bg-farm-green-light transition active:scale-[0.97]">
                            Mark as {SUPPLY_ORDER_STATUS_CONFIG[nextStatus as keyof typeof SUPPLY_ORDER_STATUS_CONFIG]?.label}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <div className="space-y-4 animate-fade-in">
            <h3 className="font-semibold text-gray-900">Supplier Profile</h3>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><p className="text-xs text-gray-500">Business Name</p><p className="text-sm font-medium text-gray-900">{profile.business_name}</p></div>
                <div><p className="text-xs text-gray-500">Category</p><p className="text-sm font-medium text-gray-900">{SUPPLY_PRODUCT_CATEGORY_CONFIG[profile.supplier_category]?.label}</p></div>
                <div><p className="text-xs text-gray-500">Location</p><p className="text-sm font-medium text-gray-900">{profile.business_location}</p></div>
                <div><p className="text-xs text-gray-500">Rating</p><p className="text-sm font-medium text-gray-900">{profile.rating_avg > 0 ? `${profile.rating_avg.toFixed(1)} (${profile.rating_count} reviews)` : 'No reviews yet'}</p></div>
              </div>
              {profile.business_description && (
                <div><p className="text-xs text-gray-500 mb-1">Description</p><p className="text-sm text-gray-700">{profile.business_description}</p></div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
