'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import type { Listing, EscrowTransaction, FarmerRating, Profile, BuyRequest, Shipment, ShipmentStatusHistory } from '@/lib/types';
import { formatCurrency, formatPriceUnit } from '@/lib/utils';
import StatusBadge from '@/components/ui/StatusBadge';
import ShipmentTracker from '@/components/ShipmentTracker';
import { TableSkeleton } from '@/components/ui/LoadingSkeleton';

export default function FarmerDashboard() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [listings, setListings] = useState<Listing[]>([]);
  const [transactions, setTransactions] = useState<EscrowTransaction[]>([]);
  const [ratings, setRatings] = useState<FarmerRating[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'listings' | 'requests' | 'shipments'>('listings');
  const [buyerRequests, setBuyerRequests] = useState<BuyRequest[]>([]);
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [shipmentHistory, setShipmentHistory] = useState<Record<number, ShipmentStatusHistory[]>>({});

  useEffect(() => {
    const supabase = createClient();
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }
      const { data: p } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      if (!p) { setLoading(false); return; }
      setProfile(p);
      if (p.role !== 'farmer') { router.push('/marketplace'); return; }
      const { data: l } = await supabase.from('listings').select('*, farmer:profiles!listings_farmer_id_fkey(full_name, farm_location, is_verified)').eq('farmer_id', user.id).order('created_at', { ascending: false });
      setListings(l || []);
      const { data: t } = await supabase.from('escrow_transactions').select('*, listing:listings(*)').eq('farmer_id', user.id).order('created_at', { ascending: false });
      setTransactions(t || []);
      const { data: r } = await supabase.from('farmer_ratings').select('*, buyer:profiles!farmer_ratings_buyer_id_fkey(full_name)').eq('farmer_id', user.id).order('created_at', { ascending: false });
      setRatings(r || []);

      const { data: br } = await supabase.from('buy_requests').select('*').eq('status', 'open').order('created_at', { ascending: false });
      setBuyerRequests(br || []);

      // Load shipments
      const { data: s } = await supabase.from('shipments').select('*').eq('farmer_id', user.id).order('created_at', { ascending: false });
      setShipments(s || []);

      // Load shipment history for each shipment
      if (s && s.length > 0) {
        const historyMap: Record<number, ShipmentStatusHistory[]> = {};
        for (const shipment of s) {
          const { data: h } = await supabase
            .from('shipment_status_history')
            .select('*')
            .eq('shipment_id', shipment.id)
            .order('created_at', { ascending: true });
          historyMap[shipment.id] = h || [];
        }
        setShipmentHistory(historyMap);
      }

      setLoading(false);
    }
    load();
  }, [router]);

  async function handleDismissWarning() {
    if (!profile) return;
    const supabase = createClient();
    await supabase.from('profiles').update({ blocked_warning: null }).eq('id', profile.id);
    setProfile({ ...profile, blocked_warning: null });
  }

  if (loading) return <div className="p-6 space-y-5"><TableSkeleton rows={6} cols={5} /></div>;
  if (!profile) return <div className="p-6 text-center text-gray-500">Profile not found. Please <Link href="/signup" className="text-farm-green font-semibold hover:underline">create an account</Link> or contact support.</div>;

  const activeTransactions = transactions.filter((t) => !['released', 'refunded'].includes(t.status));
  const pendingAmount = transactions.filter((t) => t.status === 'held_in_escrow').reduce((sum, t) => sum + t.total_farmer_yield, 0);

  const avgRating = ratings.length > 0 ? (ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length).toFixed(1) : null;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto">
      {profile && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 sm:p-6 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-fade-in card-hover-light">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-farm-green to-emerald-green flex items-center justify-center text-white font-bold text-lg shadow-sm shrink-0">
              {profile.full_name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Welcome back, {profile.full_name.split(' ')[0]} 👋</h2>
              <p className="text-sm text-gray-500 flex items-center gap-1.5 mt-0.5">
                {profile.farm_location}
                {profile.is_verified && <span className="text-emerald-green font-medium">• Verified Farmer</span>}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <StatusBadge type="verification" value={profile.is_verified} />
            <Link href="/dashboard/profile" className="px-3 py-1.5 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition">View Profile</Link>
          </div>
        </div>
      )}

      {profile?.blocked_warning && (
        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start justify-between gap-3 animate-fade-in">
          <div className="flex items-start gap-3">
            <span className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center shrink-0 mt-0.5">
              <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}>
                <path d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
            </span>
            <div>
              <p className="text-sm font-semibold text-amber-800">Account Warning</p>
              <p className="text-sm text-amber-700 mt-0.5">{profile.blocked_warning}</p>
            </div>
          </div>
          <button onClick={handleDismissWarning}
            className="text-amber-500 hover:text-amber-700 transition shrink-0 mt-0.5"
            aria-label="Dismiss warning">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}>
              <path d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Listings', value: listings.length, color: 'from-farm-green to-emerald-green', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" /><rect x="9" y="3" width="6" height="4" rx="1" /></svg> },
          { label: 'Approved', value: listings.filter((l) => l.is_approved).length, color: 'from-emerald-green to-emerald-500', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}><path d="M9 12l2 2 4-4" /><path d="M12 2a10 10 0 100 20 10 10 0 000-20z" /></svg> },
          { label: 'Pending Payout', value: formatCurrency(pendingAmount), color: 'from-blue-500 to-blue-600', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}><path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" /></svg> },
          { label: 'Buyer Rating', value: avgRating ? `${avgRating} ★` : 'No ratings', color: 'from-amber-400 to-amber-500', icon: <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.9 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l7.1-1.01L12 2z" /></svg> },
        ].map((stat, i) => (
          <div key={i} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 card-hover animate-fade-in" style={{ animationDelay: `${i * 50}ms` }}>
            <div className="flex items-center justify-between mb-3">
              {stat.icon && (
                <span className={`w-10 h-10 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center text-white shadow-sm`}>
                  {stat.icon}
                </span>
              )}
            </div>
            <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-2">
          <button onClick={() => setActiveTab('listings')}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition ${activeTab === 'listings' ? 'bg-farm-green text-white shadow-sm' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}>
            My Listings
            {listings.length > 0 && <span className="ml-1.5 text-xs opacity-70">({listings.length})</span>}
          </button>
          <button onClick={() => setActiveTab('shipments')}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition ${activeTab === 'shipments' ? 'bg-farm-green text-white shadow-sm' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}>
            Shipments
            {shipments.length > 0 && <span className="ml-1.5 text-xs opacity-70">({shipments.length})</span>}
          </button>
          <button onClick={() => setActiveTab('requests')}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition ${activeTab === 'requests' ? 'bg-farm-green text-white shadow-sm' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}>
            Buyer Requests
            {buyerRequests.length > 0 && <span className="ml-1.5 text-xs opacity-70">({buyerRequests.length})</span>}
          </button>
        </div>
        {activeTab === 'listings' && (
          <Link href="/dashboard/farmer/listings/new" className="px-4 py-2 bg-farm-green text-white text-sm font-semibold rounded-xl hover:bg-farm-green-light transition shadow-sm hover:shadow-md">
            + New Listing
          </Link>
        )}
        {activeTab === 'requests' && (
          <Link href="/dashboard/farmer/requests" className="px-4 py-2 bg-farm-green text-white text-sm font-semibold rounded-xl hover:bg-farm-green-light transition shadow-sm hover:shadow-md">
            View All Requests
          </Link>
        )}
      </div>

      {activeTab === 'requests' && (
        <div className="mb-8">
          {buyerRequests.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 text-center py-12 animate-fade-in">
              <p className="text-gray-500 font-medium mb-1">No open buyer requests</p>
              <p className="text-gray-400 text-sm mb-4">Check back later for buyer requests in your category.</p>
              <Link href="/dashboard/farmer/requests" className="inline-flex px-5 py-2.5 bg-farm-green text-white text-sm font-semibold rounded-xl hover:bg-farm-green-light transition shadow-sm">
                View All Requests
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {buyerRequests.slice(0, 3).map((req) => {
                const matchingListings = listings.filter((l) => l.category === req.category);
                return (
                  <div key={req.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 card-hover animate-fade-in">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-gray-900">{req.commodity_title}</h4>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">Open</span>
                        {matchingListings.length > 0 && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                            {matchingListings.length} match{matchingListings.length !== 1 ? 'es' : ''}
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-gray-400">{new Date(req.created_at).toLocaleDateString()}</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-500">
                      <span className="font-medium text-farm-green bg-farm-green/10 px-2 py-0.5 rounded-full text-xs">{req.category}</span>
                      <span>{req.quantity_required}</span>
                      {req.max_price_per_unit && <span>Max {formatCurrency(req.max_price_per_unit)}{formatPriceUnit(req.price_unit)}</span>}
                      <span className="flex items-center gap-1">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}><path d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" /><path d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" /></svg>
                        {req.delivery_location}
                      </span>
                    </div>
                  </div>
                );
              })}
              {buyerRequests.length > 3 && (
                <Link href="/dashboard/farmer/requests" className="block text-center py-3 text-sm font-medium text-farm-green hover:text-farm-green-light transition">
                  View all {buyerRequests.length} requests →
                </Link>
              )}
            </div>
          )}
        </div>
      )}

      {activeTab === 'shipments' && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
              <span className="w-1.5 h-5 rounded-full bg-purple-500" />
              Shipment Management
            </h3>
          </div>
          {shipments.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 text-center py-12 animate-fade-in">
              <div className="w-16 h-16 rounded-full bg-purple-50 flex items-center justify-center mx-auto mb-3">
                <svg className="w-8 h-8 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H18.75m-7.5-3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                </svg>
              </div>
              <p className="text-gray-500 font-medium mb-1">No shipments yet</p>
              <p className="text-gray-400 text-sm">Shipments will appear here when you dispatch orders.</p>
            </div>
          ) : (
            <div className="space-y-5">
              {shipments.map((shipment) => (
                <ShipmentTracker
                  key={shipment.id}
                  shipment={shipment}
                  history={shipmentHistory[shipment.id] || []}
                  userRole="farmer"
                  onStatusUpdate={(newStatus: import('@/lib/types').ShipmentStatus) => {
                    setShipments((prev) => prev.map((s) => s.id === shipment.id ? { ...s, status: newStatus } : s));
                    setShipmentHistory((prev) => ({
                      ...prev,
                      [shipment.id]: [...(prev[shipment.id] || []), {
                        id: Date.now(),
                        shipment_id: shipment.id,
                        from_status: shipment.status,
                        to_status: newStatus,
                        note: null,
                        changed_by: profile?.id || null,
                        created_at: new Date().toISOString(),
                      }],
                    }));
                  }}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'listings' && (<>
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-8 animate-fade-in">
        {listings.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-gray-500 font-medium mb-1">No listings yet</p>
            <p className="text-gray-400 text-sm mb-5">Create your first listing to start selling.</p>
            <Link href="/dashboard/farmer/listings/new" className="inline-flex px-5 py-2.5 bg-farm-green text-white text-sm font-semibold rounded-xl hover:bg-farm-green-light transition shadow-sm">
              Create Listing
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  {['Title', 'Category', 'Quantity', 'Price', 'Status', 'Date'].map((h) => (
                    <th key={h} className="text-left px-4 py-3 font-semibold text-gray-400 text-xs uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {listings.map((listing) => (
                  <tr key={listing.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-3.5 font-medium text-gray-900">{listing.title}</td>
                    <td className="px-4 py-3.5 text-gray-600">{listing.category}</td>
                    <td className="px-4 py-3.5 text-gray-600">{listing.quantity_available}</td>
                    <td className="px-4 py-3.5 text-gray-900 font-medium">{formatCurrency(listing.price_per_unit)}</td>
                    <td className="px-4 py-3.5"><StatusBadge type="approval" value={listing.is_approved} /></td>
                    <td className="px-4 py-3.5 text-gray-500 text-xs">{new Date(listing.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <h3 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <span className="w-1.5 h-5 rounded-full bg-farm-green" />
        Active Transactions
        {activeTransactions.length > 0 && <span className="text-xs font-normal text-gray-400">({activeTransactions.length})</span>}
      </h3>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden animate-fade-in">
        {transactions.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-gray-500 font-medium">No transactions yet</p>
            <p className="text-gray-400 text-sm mt-1">Transactions will appear when buyers purchase your listings.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  {['Listing', 'Amount', 'Status', 'Actions'].map((h) => (
                    <th key={h} className="text-left px-4 py-3 font-semibold text-gray-400 text-xs uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-3.5 font-medium text-gray-900">{tx.listing?.title || `Transaction #${tx.id}`}</td>
                    <td className="px-4 py-3.5 text-gray-900 font-medium">{formatCurrency(tx.total_farmer_yield)}</td>
                    <td className="px-4 py-3.5"><StatusBadge type="escrow" value={tx.status} /></td>
                    <td className="px-4 py-3.5">
                      <div className="flex gap-2">
                        {tx.status === 'held_in_escrow' && (
                          <Link href={`/dashboard/farmer/dispatch/${tx.id}`} className="px-3 py-1.5 bg-amber-600 text-white text-xs font-semibold rounded-lg hover:bg-amber-700 transition shadow-sm">
                            Dispatch
                          </Link>
                        )}
                        {tx.status === 'dispatched' && (
                          <Link href={`/dashboard/farmer/verify/${tx.id}`} className="px-3 py-1.5 bg-emerald-green text-white text-xs font-semibold rounded-lg hover:bg-emerald-700 transition shadow-sm">
                            Verify Delivery
                          </Link>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      </>)}

      {/* Buyer Ratings Section */}
      {ratings.length > 0 && (
        <div className="mt-8 animate-fade-in">
          <h3 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <span className="w-1.5 h-5 rounded-full bg-amber-400" />
            Buyer Ratings
            <span className="text-xs font-normal text-gray-400">({ratings.length} review{ratings.length !== 1 ? 's' : ''})</span>
            {avgRating && (
              <span className="ml-1 flex items-center gap-1 px-2.5 py-0.5 bg-amber-50 border border-amber-200 rounded-full text-xs font-bold text-amber-700">
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.9 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l7.1-1.01L12 2z" /></svg>
                {avgRating} avg
              </span>
            )}
          </h3>
          <div className="space-y-3">
            {ratings.map((r) => (
              <div key={r.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 card-hover">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="flex gap-0.5">
                        {[1,2,3,4,5].map((star) => (
                          <svg key={star} className={`w-4 h-4 ${star <= r.rating ? 'text-amber-400' : 'text-gray-200'}`} viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 2l2.9 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l7.1-1.01L12 2z" />
                          </svg>
                        ))}
                      </div>
                      <span className="text-xs font-semibold text-gray-700">{r.rating}/5</span>
                    </div>
                    {r.comment && <p className="text-sm text-gray-600 italic">&ldquo;{r.comment}&rdquo;</p>}
                    <p className="text-xs text-gray-400 mt-1">{r.buyer?.full_name || 'Buyer'} · {new Date(r.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-8 p-4 bg-gradient-to-br from-cream to-cream-dark rounded-2xl border border-cream-dark/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 animate-fade-in">
        <div>
          <p className="text-sm font-semibold text-gray-900">Farmer Policy</p>
          <p className="text-xs text-gray-500 mt-0.5">Review your obligations, payout terms, and listing guidelines.</p>
        </div>
        <Link href="/policy/farmer" className="shrink-0 px-4 py-2 bg-farm-green text-white text-xs font-semibold rounded-xl hover:bg-farm-green-light transition shadow-sm hover:shadow-md">
          Read Policy
        </Link>
      </div>
    </div>
  );
}
