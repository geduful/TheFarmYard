'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import type { BuyRequest, Category, PriceUnit, Profile } from '@/lib/types';
import { formatCurrency, formatPriceUnit } from '@/lib/utils';
import { TableSkeleton } from '@/components/ui/LoadingSkeleton';

const categories: Category[] = ['Crops & Grains', 'Livestock', 'Poultry', 'Aquaculture', 'Other'];
const priceUnits: PriceUnit[] = ['kg', 'tonne', 'bag', 'crate', 'box', 'litre', 'unit', 'dozen', 'bunch', 'sack'];

export default function BuyerRequestsPage() {
  return (
    <Suspense fallback={<div className="p-6"><TableSkeleton rows={4} cols={3} /></div>}>
      <BuyerRequestsContent />
    </Suspense>
  );
}

function BuyerRequestsContent() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [requests, setRequests] = useState<BuyRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [filter, setFilter] = useState<'all' | 'open' | 'matched' | 'fulfilled' | 'expired' | 'cancelled'>('all');

  const [form, setForm] = useState({
    commodity_title: '',
    category: 'Crops & Grains' as Category,
    quantity_required: '',
    price_unit: 'kg' as PriceUnit,
    max_price_per_unit: '',
    delivery_location: '',
    deadline: '',
    additional_notes: '',
  });
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }
      const { data: p } = await supabase.from('profiles').select('id, full_name, phone_number, role, is_verified, is_blocked, blocked_warning, verification_tier, farm_location, created_at').eq('id', user.id).single();
      if (!p) { setLoading(false); return; }
      if (p.role !== 'buyer') { router.push('/marketplace'); return; }
      setProfile(p);

      const { data: r } = await supabase
        .from('buy_requests')
        .select('*')
        .eq('buyer_id', user.id)
        .order('created_at', { ascending: false });

      setRequests(r || []);
      setLoading(false);
    }
    load();
  }, [router]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!profile) return;
    if (!form.commodity_title.trim() || !form.quantity_required.trim() || !form.delivery_location.trim() || !form.deadline) {
      setFormError('Please fill in all required fields.');
      return;
    }
    setFormError('');
    setFormLoading(true);

    try {
      const res = await fetch('/api/buy-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();

      if (!res.ok) {
        setFormError(data.error || 'Failed to create request.');
        setFormLoading(false);
        return;
      }

      if (data.request) setRequests((prev) => [data.request as BuyRequest, ...prev]);
      setFormSuccess(true);
      setTimeout(() => {
        setShowCreate(false);
        setFormSuccess(false);
        setForm({ commodity_title: '', category: 'Crops & Grains', quantity_required: '', price_unit: 'kg', max_price_per_unit: '', delivery_location: '', deadline: '', additional_notes: '' });
      }, 1500);
    } catch {
      setFormError('Network error. Please try again.');
    }
    setFormLoading(false);
  }

  async function handleCancel(id: number) {
    const supabase = createClient();
    const { error } = await supabase.from('buy_requests').update({ status: 'cancelled' }).eq('id', id);
    if (!error) {
      setRequests((prev) => prev.map((r) => r.id === id ? { ...r, status: 'cancelled' as const } : r));
    }
  }

  const filtered = filter === 'all' ? requests : requests.filter((r) => r.status === filter);

  if (loading) return <div className="p-6"><TableSkeleton rows={4} cols={3} /></div>;
  if (!profile) return <div className="p-6 text-center text-gray-500">Profile not found.</div>;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto animate-fade-in">
      <Link href="/dashboard/buyer" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-farm-green transition mb-4 group">
        <svg className="w-4 h-4 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Back to My Orders
      </Link>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <span className="w-1.5 h-6 rounded-full bg-farm-green" />
            My Buyer Requests
          </h1>
          <p className="text-sm text-gray-500 mt-1">Post what you need and let farmers come to you</p>
        </div>
        <button onClick={() => { setFormError(''); setShowCreate(true); }}
          className="px-5 py-2.5 bg-farm-green text-white text-sm font-semibold rounded-xl hover:bg-farm-green-light transition shadow-sm hover:shadow-md flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.5v15m7.5-7.5h-15" /></svg>
          New Request
        </button>
      </div>

      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {(['all', 'open', 'matched', 'fulfilled', 'expired', 'cancelled'] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition ${
              filter === f ? 'bg-farm-green text-white shadow-sm' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}>
            {f.charAt(0).toUpperCase() + f.slice(1)}
            {f === 'all' && requests.length > 0 && <span className="ml-1.5 text-xs opacity-70">({requests.length})</span>}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 text-center py-20 animate-fade-in">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-farm-green/10 to-emerald-green/10 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-farm-green" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}><path d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" /></svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">No requests yet</h3>
          <p className="text-sm text-gray-500 mb-5">Create a buyer request to tell farmers what you need.</p>
          <button onClick={() => { setFormError(''); setShowCreate(true); }}
            className="px-5 py-2.5 bg-farm-green text-white text-sm font-semibold rounded-xl hover:bg-farm-green-light transition shadow-sm">
            Create Your First Request
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((req) => (
            <div key={req.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 sm:p-6 card-hover animate-fade-in">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-gray-900">{req.commodity_title}</h3>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      req.status === 'open' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                      req.status === 'matched' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                      req.status === 'fulfilled' ? 'bg-purple-50 text-purple-700 border border-purple-200' :
                      req.status === 'expired' ? 'bg-gray-100 text-gray-500 border border-gray-200' :
                      'bg-red-50 text-red-600 border border-red-200'
                    }`}>
                      {req.status.charAt(0).toUpperCase() + req.status.slice(1)}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-500">
                    <span className="font-medium text-farm-green bg-farm-green/10 px-2 py-0.5 rounded-full text-xs">{req.category}</span>
                    <span className="flex items-center gap-1">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}><path d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" /><path d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" /></svg>
                      {req.delivery_location}
                    </span>
                    <span>Need by {new Date(req.deadline).toLocaleDateString()}</span>
                  </div>
                </div>
                {req.status === 'open' && (
                  <button onClick={() => handleCancel(req.id)}
                    className="px-3 py-1.5 text-xs font-medium text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50 transition shrink-0">
                    Cancel
                  </button>
                )}
              </div>

              <div className="grid sm:grid-cols-3 gap-3">
                <div className="bg-gray-50 rounded-xl p-3">
                  <span className="text-xs text-gray-400 block mb-0.5">Quantity Needed</span>
                  <span className="text-sm font-semibold text-gray-900">{req.quantity_required}</span>
                </div>
                {req.max_price_per_unit && (
                  <div className="bg-gray-50 rounded-xl p-3">
                    <span className="text-xs text-gray-400 block mb-0.5">Max Price {formatPriceUnit(req.price_unit)}</span>
                    <span className="text-sm font-semibold text-gray-900">{formatCurrency(req.max_price_per_unit)}</span>
                  </div>
                )}
                <div className="bg-gray-50 rounded-xl p-3">
                  <span className="text-xs text-gray-400 block mb-0.5">Posted</span>
                  <span className="text-sm font-semibold text-gray-900">{new Date(req.created_at).toLocaleDateString()}</span>
                </div>
              </div>

              {req.additional_notes && (
                <div className="mt-3 p-3 bg-cream/50 rounded-xl">
                  <p className="text-sm text-gray-600 italic">&ldquo;{req.additional_notes}&rdquo;</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm" onClick={() => setShowCreate(false)}>
          <div className="bg-white rounded-2xl p-6 sm:p-8 max-w-lg w-full shadow-2xl max-h-[90vh] overflow-y-auto animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-farm-green to-emerald-green flex items-center justify-center text-white">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.5v15m7.5-7.5h-15" /></svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">New Buyer Request</h3>
                  <p className="text-xs text-gray-400">Tell farmers what you need</p>
                </div>
              </div>
              <button onClick={() => setShowCreate(false)} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            {formSuccess ? (
              <div className="py-8 text-center">
                <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-3">
                  <svg className="w-7 h-7 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                </div>
                <p className="font-semibold text-gray-900">Request Created</p>
                <p className="text-sm text-gray-500 mt-1">Farmers can now see your request.</p>
              </div>
            ) : (
              <form onSubmit={handleCreate} className="space-y-4">
                {formError && <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl">{formError}</div>}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">What do you need? *</label>
                  <input type="text" value={form.commodity_title} onChange={(e) => setForm({ ...form, commodity_title: e.target.value })}
                    placeholder="e.g., Fresh Maize, Live Catfish, Cassava" required
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-farm-green focus:border-transparent bg-white text-sm" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Category *</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {categories.map((cat) => (
                      <button key={cat} type="button" onClick={() => setForm({ ...form, category: cat })}
                        className={`px-3 py-2 rounded-xl border-2 text-xs font-medium transition-all ${
                          form.category === cat ? 'border-farm-green bg-farm-green text-white shadow-sm' : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                        }`}>
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Quantity Needed *</label>
                    <input type="text" value={form.quantity_required} onChange={(e) => setForm({ ...form, quantity_required: e.target.value })}
                      placeholder="e.g., 500 kg" required
                      className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-farm-green focus:border-transparent bg-white text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Unit</label>
                    <select value={form.price_unit} onChange={(e) => setForm({ ...form, price_unit: e.target.value as PriceUnit })}
                      className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-farm-green bg-white text-sm">
                      {priceUnits.map((u) => <option key={u} value={u}>{u}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Max Price per Unit (GH₵) <span className="text-gray-400">(optional)</span></label>
                    <input type="number" value={form.max_price_per_unit} onChange={(e) => setForm({ ...form, max_price_per_unit: e.target.value })}
                      placeholder="0.00" step="0.01" min="0"
                      className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-farm-green focus:border-transparent bg-white text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Delivery Location *</label>
                    <input type="text" value={form.delivery_location} onChange={(e) => setForm({ ...form, delivery_location: e.target.value })}
                      placeholder="e.g., Accra, Kumasi" required
                      className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-farm-green focus:border-transparent bg-white text-sm" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Deadline *</label>
                  <input type="date" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })}
                    required min={new Date().toISOString().split('T')[0]}
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-farm-green focus:border-transparent bg-white text-sm" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Additional Notes <span className="text-gray-400">(optional)</span></label>
                  <textarea value={form.additional_notes} onChange={(e) => setForm({ ...form, additional_notes: e.target.value })}
                    placeholder="Any specific requirements, quality standards, packaging preferences..."
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-farm-green focus:border-transparent bg-white text-sm resize-none" rows={3} />
                </div>

                <div className="flex gap-3 pt-2">
                  <button type="submit" disabled={formLoading}
                    className="flex-1 py-2.5 bg-farm-green text-white font-semibold rounded-xl hover:bg-farm-green-light transition disabled:opacity-50 shadow-sm text-sm active:scale-[0.98]">
                    {formLoading ? <span className="flex items-center justify-center gap-2"><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Creating...</span> : 'Post Request'}
                  </button>
                  <button type="button" onClick={() => setShowCreate(false)}
                    className="px-5 py-2.5 text-gray-600 font-medium rounded-xl border border-gray-200 hover:bg-gray-50 transition text-sm">
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      <div className="mt-8 p-4 bg-gradient-to-br from-cream to-cream-dark rounded-2xl border border-cream-dark/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 animate-fade-in">
        <div>
          <p className="text-sm font-semibold text-gray-900">Buyer Policy</p>
          <p className="text-xs text-gray-500 mt-0.5">Know your protections, escrow process, and dispute rights.</p>
        </div>
        <Link href="/policy/buyer" className="shrink-0 px-4 py-2 bg-farm-green text-white text-xs font-semibold rounded-xl hover:bg-farm-green-light transition shadow-sm hover:shadow-md">
          Read Policy
        </Link>
      </div>
    </div>
  );
}
