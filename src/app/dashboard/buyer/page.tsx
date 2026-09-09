'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import type { Listing, EscrowTransaction, Profile, ReportCategory, BuyRequest, Shipment, ShipmentStatusHistory } from '@/lib/types';
import { formatCurrency, calculateEscrowFees } from '@/lib/utils';
import EscrowTracker from '@/components/EscrowTracker';
import ShipmentTracker from '@/components/ShipmentTracker';
import StorageImage from '@/components/StorageImage';
import StatusBadge from '@/components/ui/StatusBadge';
import { TableSkeleton } from '@/components/ui/LoadingSkeleton';

export default function BuyerDashboard() {
  return (
    <Suspense fallback={<div className="p-6"><TableSkeleton rows={4} cols={3} /></div>}>
      <BuyerDashboardContent />
    </Suspense>
  );
}

function BuyerDashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const checkoutParam = searchParams.get('checkout');

  const [profile, setProfile] = useState<Profile | null>(null);
  const [transactions, setTransactions] = useState<EscrowTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'orders' | 'requests' | 'shipments'>('orders');
  const [buyerRequests, setBuyerRequests] = useState<BuyRequest[]>([]);
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [shipmentHistory, setShipmentHistory] = useState<Record<number, ShipmentStatusHistory[]>>({});

  const [showCheckout, setShowCheckout] = useState(false);
  const [checkoutListing, setCheckoutListing] = useState<Listing | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState('');

  // Report state
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportTx, setReportTx] = useState<EscrowTransaction | null>(null);
  const [reportCategory, setReportCategory] = useState<ReportCategory>('other');
  const [reportSubject, setReportSubject] = useState('');
  const [reportDescription, setReportDescription] = useState('');
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [reportError, setReportError] = useState('');
  const [reportSuccess, setReportSuccess] = useState(false);

  // Rating state
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [ratingTx, setRatingTx] = useState<EscrowTransaction | null>(null);
  const [ratingStars, setRatingStars] = useState(0);
  const [ratingComment, setRatingComment] = useState('');
  const [ratingSubmitting, setRatingSubmitting] = useState(false);
  const [ratingError, setRatingError] = useState('');
  const [submittedRatings, setSubmittedRatings] = useState<Set<number>>(new Set());

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (cancelled) return;
      if (!user) { router.push('/login'); return; }
      const { data: p } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      if (cancelled || !p) { setLoading(false); return; }
      if (p.role === 'farmer') { router.push('/marketplace'); return; }
      setProfile(p);

      // Handle checkout param (needs user + profile first)
      if (checkoutParam) {
        try {
          const params = JSON.parse(decodeURIComponent(checkoutParam)) as { listingId?: number };
          if (typeof params.listingId === 'number') {
            const { data: listing } = await supabase.from('listings').select('*, farmer:profiles!listings_farmer_id_fkey(full_name, farm_location, is_verified)').eq('id', params.listingId).eq('is_approved', true).single();
            if (cancelled) return;
            if (listing && listing.farmer_id !== user.id) { setCheckoutListing(listing); setShowCheckout(true); }
          }
        } catch {}
      }

      // Parallelize all independent queries
      const [txRes, brRes, sRes, ratingsRes] = await Promise.all([
        supabase.from('escrow_transactions').select('*, listing:listings(*), farmer:profiles!escrow_transactions_farmer_id_fkey(full_name, phone_number)').eq('buyer_id', user.id).order('created_at', { ascending: false }),
        supabase.from('buy_requests').select('*').eq('buyer_id', user.id).order('created_at', { ascending: false }),
        supabase.from('shipments').select('*').eq('buyer_id', user.id).order('created_at', { ascending: false }),
        supabase.from('farmer_ratings').select('transaction_id').eq('buyer_id', user.id),
      ]);

      if (cancelled) return;
      const s = sRes.data || [];
      setTransactions(txRes.data || []);
      setBuyerRequests(brRes.data || []);
      setShipments(s);
      setSubmittedRatings(new Set((ratingsRes.data || []).map((r: { transaction_id: number }) => r.transaction_id)));

      // Fix N+1: batch-fetch all shipment history in one query
      if (s.length > 0) {
        const shipmentIds = s.map((sh) => sh.id);
        const { data: allHistory } = await supabase
          .from('shipment_status_history')
          .select('*')
          .in('shipment_id', shipmentIds)
          .order('created_at', { ascending: true });
        if (!cancelled && allHistory) {
          const historyMap: Record<number, ShipmentStatusHistory[]> = {};
          for (const h of allHistory) {
            if (!historyMap[h.shipment_id]) historyMap[h.shipment_id] = [];
            historyMap[h.shipment_id].push(h);
          }
          setShipmentHistory(historyMap);
        }
      }

      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [router, checkoutParam]);

  async function handleCheckout(e: React.FormEvent) {
    e.preventDefault();
    if (!checkoutListing || !profile) return;
    if (checkoutListing.farmer_id === profile.id) { setCheckoutError('You cannot purchase your own listing.'); return; }
    if (!checkoutListing.is_approved) { setCheckoutError('This listing is no longer available.'); return; }
    if (!Number.isFinite(quantity) || quantity < 1) { setCheckoutError('Quantity must be at least 1.'); return; }
    setCheckoutError('');
    setCheckoutLoading(true);
    try {
      const res = await fetch('/api/escrow/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listingId: checkoutListing.id, quantity }),
      });
      const json = await res.json() as {
        error?: string;
        demo?: boolean;
        escrow?: EscrowTransaction;
        paymentLink?: string;
      };
      if (!res.ok || json.error) { setCheckoutError(json.error || 'Checkout failed.'); setCheckoutLoading(false); return; }
      if (json.paymentLink) {
        // Real payment: hand off to the hosted Flutterwave page.
        window.location.href = json.paymentLink;
        return;
      }
      if (json.demo && json.escrow) setTransactions((prev) => [json.escrow as EscrowTransaction, ...prev]);
      setShowCheckout(false); setCheckoutListing(null); setQuantity(1); setCheckoutLoading(false);
      router.replace('/dashboard/buyer');
    } catch {
      setCheckoutError('Checkout failed. Please try again.');
      setCheckoutLoading(false);
    }
  }

  async function handleDismissWarning() {
    if (!profile) return;
    const supabase = createClient();
    await supabase.from('profiles').update({ blocked_warning: null }).eq('id', profile.id);
    setProfile({ ...profile, blocked_warning: null });
  }

  async function handleReportSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!profile) { setReportError('Please sign in again.'); return; }
    if (!reportSubject.trim() || !reportDescription.trim()) { setReportError('Please fill in all fields.'); return; }
    setReportError(''); setReportSubmitting(true);
    const supabase = createClient();
    const { error } = await supabase.from('reports').insert({
      reporter_id: profile.id,
      transaction_id: reportTx?.id || null,
      reported_user_id: reportTx?.farmer_id || null,
      category: reportCategory,
      subject: reportSubject.trim(),
      description: reportDescription.trim(),
      status: 'open',
    });
    if (error) { setReportError(error.message); setReportSubmitting(false); return; }
    setReportSubmitting(false);
    setReportSuccess(true);
    setTimeout(() => { setShowReportModal(false); setReportSuccess(false); setReportSubject(''); setReportDescription(''); setReportTx(null); }, 2000);
  }

  async function handleRatingSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!profile) { setRatingError('Please sign in again.'); return; }
    if (!ratingTx || ratingStars === 0) { setRatingError('Please select a star rating.'); return; }
    setRatingError(''); setRatingSubmitting(true);
    const supabase = createClient();
    const { error } = await supabase.from('farmer_ratings').insert({
      farmer_id: ratingTx.farmer_id,
      buyer_id: profile.id,
      transaction_id: ratingTx.id,
      rating: ratingStars,
      comment: ratingComment.trim() || null,
    });
    if (error) { setRatingError(error.message); setRatingSubmitting(false); return; }
    setSubmittedRatings((prev) => new Set([...prev, ratingTx.id]));
    setRatingSubmitting(false);
    setShowRatingModal(false);
    setRatingStars(0); setRatingComment(''); setRatingTx(null);
  }

  if (loading) return <div className="p-6"><TableSkeleton rows={4} cols={3} /></div>;
  if (!profile) return <div className="p-6 text-center text-gray-500">Profile not found. Please sign up again or contact support.</div>;

  const baseAmount = checkoutListing ? checkoutListing.price_per_unit * quantity : 0;
  const fees = checkoutListing ? calculateEscrowFees(baseAmount) : null;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto animate-fade-in">
      {showCheckout && checkoutListing && fees && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 sm:p-8 max-w-md w-full shadow-2xl max-h-[90vh] overflow-y-auto animate-scale-in">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-farm-green to-emerald-green flex items-center justify-center text-white text-lg shadow-sm">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" /></svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Secure Escrow Checkout</h3>
                <p className="text-xs text-gray-500">Your funds are protected</p>
              </div>
            </div>

            <div className="mb-4 p-4 bg-gradient-to-br from-cream to-cream-dark rounded-xl border border-cream-dark/50">
              <p className="font-semibold text-gray-900">{checkoutListing.title}</p>
              <p className="text-sm text-gray-500 mt-0.5">{checkoutListing.farmer?.full_name} &bull; {checkoutListing.farmer?.farm_location}</p>
              <p className="text-sm text-gray-500">{formatCurrency(checkoutListing.price_per_unit)} / unit</p>
            </div>

            {checkoutError && <div className="mb-4 p-3.5 bg-red-50 border border-red-200 text-alert-red text-sm rounded-xl flex items-center gap-2 animate-fade-in"><span className="w-5 h-5 rounded-full bg-red-200 flex items-center justify-center text-xs font-bold shrink-0">✕</span>{checkoutError}</div>}

            <form onSubmit={handleCheckout}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Quantity</label>
                <input type="number" value={quantity} onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))} min="1" className="w-full px-3 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-farm-green focus:border-transparent" required />
              </div>

              <div className="bg-gradient-to-br from-cream to-cream-dark rounded-xl p-5 mb-6 border border-cream-dark/50">
                <h4 className="font-semibold text-sm text-gray-700 mb-3">Payment Breakdown</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between text-gray-600">
                    <span>Base ({quantity} × {formatCurrency(checkoutListing.price_per_unit)})</span>
                    <span>{formatCurrency(baseAmount)}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Buyer Protection Fee (1%)</span>
                    <span className="text-amber-600">{formatCurrency(fees.buyerFee)}</span>
                  </div>
                  <div className="border-t border-amber-200/50 pt-2 mt-2 flex justify-between font-bold text-gray-900">
                    <span>Total You Pay</span>
                    <span className="text-farm-green text-lg">{formatCurrency(fees.totalBuyerPaid)}</span>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-3">Funds held securely in escrow until delivery is confirmed.</p>
              </div>

              <div className="flex gap-3">
                <button type="submit" disabled={checkoutLoading}
                  className="flex-1 py-2.5 bg-farm-green text-white font-semibold rounded-xl hover:bg-farm-green-light transition disabled:opacity-50 shadow-sm hover:shadow-md active:scale-[0.98]">
                  {checkoutLoading ? <span className="flex items-center justify-center gap-2"><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Processing...</span> : `Pay ${formatCurrency(fees.totalBuyerPaid)}`}
                </button>
                <button type="button" onClick={() => { setShowCheckout(false); router.push('/dashboard/buyer'); }}
                  className="px-4 py-2.5 text-gray-600 font-medium rounded-xl border border-gray-300 hover:bg-gray-50 transition">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {profile && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 sm:p-6 mb-6 card-hover-light animate-fade-in">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-farm-green to-emerald-green flex items-center justify-center text-white font-bold text-lg shadow-sm shrink-0">
              {profile.full_name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Welcome back, {profile.full_name.split(' ')[0]}</h2>
              <p className="text-sm text-gray-500 mt-0.5">Manage your orders and track deliveries</p>
            </div>
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

      {searchParams.get('payment') === 'success' && (
        <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm rounded-2xl flex items-center justify-between gap-2 animate-fade-in">
          <span><strong>Payment confirmed.</strong> Your funds are now held securely in escrow.</span>
          <button onClick={() => router.replace('/dashboard/buyer')} className="font-bold hover:opacity-70" aria-label="Dismiss">✕</button>
        </div>
      )}
      {(searchParams.get('payment') === 'failed' || searchParams.get('payment') === 'error') && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-2xl flex items-center justify-between gap-2 animate-fade-in">
          <span><strong>Payment not completed.</strong> No money left your account — please try again.</span>
          <button onClick={() => router.replace('/dashboard/buyer')} className="font-bold hover:opacity-70" aria-label="Dismiss">✕</button>
        </div>
      )}
      {searchParams.get('payment') === 'cancelled' && (
        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-2xl flex items-center justify-between gap-2 animate-fade-in">
          <span>Payment was cancelled. Your order was not created.</span>
          <button onClick={() => router.replace('/dashboard/buyer')} className="font-bold hover:opacity-70" aria-label="Dismiss">✕</button>
        </div>
      )}

      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-2">
          <button onClick={() => setActiveTab('orders')}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition relative ${activeTab === 'orders' ? 'bg-farm-green text-white shadow-md shadow-farm-green/20' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}>
            My Orders
            {transactions.length > 0 && <span className="ml-1.5 text-xs opacity-70">({transactions.length})</span>}
          </button>
          <button onClick={() => setActiveTab('shipments')}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition relative ${activeTab === 'shipments' ? 'bg-farm-green text-white shadow-md shadow-farm-green/20' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}>
            Shipments
            {shipments.length > 0 && <span className="ml-1.5 text-xs opacity-70">({shipments.length})</span>}
          </button>
          <button onClick={() => setActiveTab('requests')}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition relative ${activeTab === 'requests' ? 'bg-farm-green text-white shadow-md shadow-farm-green/20' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}>
            My Requests
            {buyerRequests.length > 0 && <span className="ml-1.5 text-xs opacity-70">({buyerRequests.length})</span>}
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => { setReportTx(null); setReportCategory('other'); setReportSubject(''); setReportDescription(''); setReportError(''); setReportSuccess(false); setShowReportModal(true); }}
            className="px-4 py-2 bg-white text-alert-red text-sm font-semibold rounded-xl border border-red-200 hover:bg-red-50 transition shadow-sm flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}><path d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" /></svg>
            Report to Admin
          </button>
          <Link href="/marketplace" className="px-4 py-2 bg-farm-green text-white text-sm font-semibold rounded-xl hover:bg-farm-green-light transition shadow-sm hover:shadow-md">
            Browse Marketplace
          </Link>
        </div>
      </div>

      {activeTab === 'requests' && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
              <span className="w-1.5 h-5 rounded-full bg-farm-green" />
              Buyer Requests
            </h3>
            <Link href="/dashboard/buyer/requests" className="px-4 py-2 bg-farm-green text-white text-sm font-semibold rounded-xl hover:bg-farm-green-light transition shadow-sm">
              + New Request
            </Link>
          </div>
          {buyerRequests.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 text-center py-12 animate-fade-in">
              <p className="text-gray-500 font-medium mb-1">No requests yet</p>
              <p className="text-gray-400 text-sm mb-4">Post a buyer request to tell farmers what you need.</p>
              <Link href="/dashboard/buyer/requests" className="inline-flex px-5 py-2.5 bg-farm-green text-white text-sm font-semibold rounded-xl hover:bg-farm-green-light transition shadow-sm">
                Create Request
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {buyerRequests.slice(0, 3).map((req) => (
                <div key={req.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 card-hover animate-fade-in">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-gray-900">{req.commodity_title}</h4>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        req.status === 'open' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                        req.status === 'matched' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                        'bg-gray-100 text-gray-500 border border-gray-200'
                      }`}>
                        {req.status}
                      </span>
                    </div>
                    <span className="text-xs text-gray-400">{new Date(req.created_at).toLocaleDateString()}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-500">
                    <span className="font-medium text-farm-green bg-farm-green/10 px-2 py-0.5 rounded-full text-xs">{req.category}</span>
                    <span>{req.quantity_required}</span>
                    <span className="flex items-center gap-1">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}><path d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" /><path d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" /></svg>
                      {req.delivery_location}
                    </span>
                  </div>
                </div>
              ))}
              {buyerRequests.length > 3 && (
                <Link href="/dashboard/buyer/requests" className="block text-center py-3 text-sm font-medium text-farm-green hover:text-farm-green-light transition">
                  View all {buyerRequests.length} requests →
                </Link>
              )}
            </div>
          )}
        </div>
      )}

      {activeTab === 'shipments' && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
              <span className="w-1.5 h-5 rounded-full bg-farm-green" />
              Shipment Tracking
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
              <p className="text-gray-400 text-sm">Shipments will appear here once a farmer dispatches your order.</p>
            </div>
          ) : (
            <div className="space-y-5">
              {shipments.map((shipment) => (
                <ShipmentTracker
                  key={shipment.id}
                  shipment={shipment}
                  history={shipmentHistory[shipment.id] || []}
                  userRole="buyer"
                  onStatusUpdate={(newStatus: import('@/lib/types').ShipmentStatus) => {
                    setShipments((prev) => prev.map((s) => s.id === shipment.id ? { ...s, status: newStatus } : s));
                    if (newStatus === 'delivery_confirmed') {
                      setShipmentHistory((prev) => ({
                        ...prev,
                        [shipment.id]: [...(prev[shipment.id] || []), {
                          id: Date.now(),
                          shipment_id: shipment.id,
                          from_status: shipment.status,
                          to_status: newStatus,
                          note: 'Delivery confirmed by buyer',
                          changed_by: profile?.id || null,
                          created_at: new Date().toISOString(),
                        }],
                      }));
                    }
                  }}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'orders' && transactions.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 text-center py-20 animate-fade-in">
          <h3 className="text-lg font-semibold text-gray-900 mb-1">No orders yet</h3>
          <p className="text-gray-500 text-sm mb-5">Browse the marketplace to find what you need.</p>
          <Link href="/marketplace" className="inline-flex px-5 py-2.5 bg-farm-green text-white font-semibold rounded-xl hover:bg-farm-green-light transition shadow-sm">
            Browse Marketplace
          </Link>
        </div>
      ) : (
        <div className="space-y-5">
          {transactions.map((tx) => (
            <div key={tx.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden card-hover animate-fade-in">
              <div className="p-5 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-gray-900">{tx.listing?.title || `Transaction #${tx.id}`}</h4>
                      <StatusBadge type="escrow" value={tx.status} />
                    </div>
                    <p className="text-sm text-gray-500 mt-0.5">Farmer: {tx.farmer?.full_name || 'N/A'} &bull; Paid: {formatCurrency(tx.total_buyer_paid)}</p>
                  </div>
                  <div className="flex gap-2 shrink-0 flex-wrap justify-end">
                    {tx.status === 'released' && !submittedRatings.has(tx.id) && (
                      <button onClick={() => { setRatingTx(tx); setRatingStars(0); setRatingComment(''); setRatingError(''); setShowRatingModal(true); }}
                        className="px-3 py-1.5 bg-gradient-to-r from-amber-400 to-amber-500 text-white text-xs font-semibold rounded-lg hover:from-amber-500 hover:to-amber-600 transition shadow-sm flex items-center gap-1.5">
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.9 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l7.1-1.01L12 2z" /></svg>
                        Rate Farmer
                      </button>
                    )}
                    {tx.status === 'released' && submittedRatings.has(tx.id) && (
                      <span className="px-3 py-1.5 text-xs font-semibold text-amber-600 bg-amber-50 rounded-lg border border-amber-200 flex items-center gap-1">
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.9 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l7.1-1.01L12 2z" /></svg>
                        Rated
                      </span>
                    )}
                    <button onClick={() => { setReportTx(tx); setReportCategory('other'); setReportSubject(''); setReportDescription(''); setReportError(''); setReportSuccess(false); setShowReportModal(true); }}
                      className="px-3 py-1.5 bg-white text-alert-red text-xs font-semibold rounded-lg border border-red-200 hover:bg-red-50 transition shadow-sm flex items-center gap-1.5">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}><path d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" /></svg>
                      Report
                    </button>
                  </div>
                </div>

                {tx.status === 'pending_deposit' && (
                  <div className="p-4 bg-gradient-to-br from-amber-50 to-amber-100/50 border border-amber-200 rounded-xl animate-fade-in">
                    <p className="text-sm font-semibold text-amber-800">Awaiting Payment</p>
                    <p className="text-xs text-amber-700 mt-1">Complete payment to move funds into escrow. Unpaid orders are removed automatically.</p>
                  </div>
                )}

                {tx.status === 'held_in_escrow' && (
                  <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100/50 border border-blue-200 rounded-xl animate-fade-in">
                    <p className="text-sm font-semibold text-blue-800 flex items-center gap-1.5">Your Secure Delivery Token</p>
                    <p className="text-3xl font-bold text-blue-600 tracking-[0.3em] my-3 font-mono select-all">{tx.delivery_token}</p>
                    <p className="text-xs text-blue-600/80">Share this token with the farmer <strong>only after</strong> you have inspected and accepted the goods.</p>
                  </div>
                )}

                {tx.status === 'dispatched' && tx.vehicle_license_plate && (
                  <div className="p-4 bg-gradient-to-br from-purple-50 to-purple-100/50 border border-purple-200 rounded-xl animate-fade-in">
                    <p className="text-sm font-semibold text-purple-800 flex items-center gap-1.5">Goods Dispatched</p>
                    <div className="mt-3 grid sm:grid-cols-2 gap-3 text-sm">
                      <div className="bg-white/60 rounded-lg p-3">
                        <span className="text-xs text-purple-500 block mb-0.5">Vehicle</span>
                        <span className="font-medium text-purple-900">{tx.vehicle_license_plate}</span>
                      </div>
                      <div className="bg-white/60 rounded-lg p-3">
                        <span className="text-xs text-purple-500 block mb-0.5">Driver</span>
                        <span className="font-medium text-purple-900">{tx.driver_phone_number}</span>
                      </div>
                    </div>
                    {tx.waybill_receipt_url && (
                      <div className="mt-3 bg-white/60 rounded-lg p-3">
                        <span className="text-xs text-purple-500 block mb-1.5">Waybill Receipt</span>
                        <StorageImage url={tx.waybill_receipt_url} alt="Waybill receipt" className="max-h-48 rounded-lg object-contain" />
                      </div>
                    )}
                    <p className="text-xs text-purple-600 mt-3">Inspect goods within <strong>2 hours</strong> of delivery. Do NOT share the delivery token until verified.</p>
                  </div>
                )}

                {tx.status === 'released' && (
                  <div className="p-4 bg-gradient-to-br from-emerald-50 to-emerald-100/50 border border-emerald-200 rounded-xl animate-fade-in">
                    <p className="text-sm font-semibold text-emerald-800 flex items-center gap-1.5">Transaction Complete</p>
                    <p className="text-sm text-emerald-600 mt-1">Funds have been released to the farmer.</p>
                  </div>
                )}
              </div>

              <div className="border-t border-gray-100 p-5 sm:p-6">
                <EscrowTracker transaction={tx} />
              </div>
            </div>
          ))}
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

      {/* ── Report Modal ── */}
      {showReportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm" onClick={() => setShowReportModal(false)}>
          <div className="bg-white rounded-2xl p-6 sm:p-8 max-w-lg w-full shadow-2xl animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center text-alert-red">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}><path d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" /></svg>
                </div>
                <div>
                  <h3 className="text-base font-semibold text-gray-900">Report to Admin</h3>
                  <p className="text-xs text-gray-400">{reportTx ? `Re: ${reportTx.listing?.title || `Transaction #${reportTx.id}`}` : 'General report'}</p>
                </div>
              </div>
              <button onClick={() => setShowReportModal(false)} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            {reportSuccess ? (
              <div className="py-8 text-center">
                <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-3">
                  <svg className="w-7 h-7 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                </div>
                <p className="font-semibold text-gray-900">Report Submitted</p>
                <p className="text-sm text-gray-500 mt-1">The admin team will review it shortly.</p>
              </div>
            ) : (
              <form onSubmit={handleReportSubmit} className="space-y-4">
                {reportError && <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl">{reportError}</div>}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Report Category</label>
                  <select value={reportCategory} onChange={(e) => setReportCategory(e.target.value as ReportCategory)}
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-400 bg-white text-sm">
                    <option value="fraud">Fraud / Scam</option>
                    <option value="delivery_issue">Delivery Issue</option>
                    <option value="listing_issue">Listing Issue</option>
                    <option value="account_issue">Account Issue</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Subject</label>
                  <input type="text" value={reportSubject} onChange={(e) => setReportSubject(e.target.value)}
                    placeholder="Brief summary of the issue"
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-400 bg-white text-sm" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
                  <textarea value={reportDescription} onChange={(e) => setReportDescription(e.target.value)}
                    placeholder="Describe the issue in detail — what happened, when, and any other relevant information..."
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-400 bg-white text-sm resize-none" rows={4} />
                </div>

                <div className="flex gap-3 pt-1">
                  <button type="submit" disabled={reportSubmitting}
                    className="flex-1 py-2.5 bg-alert-red text-white font-semibold rounded-xl hover:bg-red-700 transition disabled:opacity-50 shadow-sm text-sm active:scale-[0.98]">
                    {reportSubmitting ? <span className="flex items-center justify-center gap-2"><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Submitting...</span> : 'Submit Report'}
                  </button>
                  <button type="button" onClick={() => setShowReportModal(false)}
                    className="px-5 py-2.5 text-gray-600 font-medium rounded-xl border border-gray-200 hover:bg-gray-50 transition text-sm">
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ── Rating Modal ── */}
      {showRatingModal && ratingTx && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm" onClick={() => setShowRatingModal(false)}>
          <div className="bg-white rounded-2xl p-6 sm:p-8 max-w-md w-full shadow-2xl animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-amber-600">
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.9 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l7.1-1.01L12 2z" /></svg>
                </div>
                <div>
                  <h3 className="text-base font-semibold text-gray-900">Rate Farmer</h3>
                  <p className="text-xs text-gray-400">{ratingTx.farmer?.full_name} · {ratingTx.listing?.title}</p>
                </div>
              </div>
              <button onClick={() => setShowRatingModal(false)} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <form onSubmit={handleRatingSubmit} className="space-y-5">
              {ratingError && <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl">{ratingError}</div>}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3 text-center">How was your experience with this farmer?</label>
                <div className="flex justify-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button key={star} type="button" onClick={() => setRatingStars(star)}
                      className="transition-transform hover:scale-110 active:scale-95">
                      <svg className={`w-10 h-10 transition-colors ${star <= ratingStars ? 'text-amber-400' : 'text-gray-200'}`} viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2l2.9 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l7.1-1.01L12 2z" />
                      </svg>
                    </button>
                  ))}
                </div>
                {ratingStars > 0 && (
                  <p className="text-center text-sm text-gray-500 mt-2">
                    {['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'][ratingStars]}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Comment <span className="text-gray-400">(optional)</span></label>
                <textarea value={ratingComment} onChange={(e) => setRatingComment(e.target.value)}
                  placeholder="Share your experience with other buyers..."
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white text-sm resize-none" rows={3} />
              </div>

              <div className="flex gap-3">
                <button type="submit" disabled={ratingSubmitting || ratingStars === 0}
                  className="flex-1 py-2.5 bg-gradient-to-r from-amber-400 to-amber-500 text-white font-semibold rounded-xl hover:from-amber-500 hover:to-amber-600 transition disabled:opacity-50 shadow-sm text-sm active:scale-[0.98]">
                  {ratingSubmitting ? <span className="flex items-center justify-center gap-2"><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Submitting...</span> : 'Submit Rating'}
                </button>
                <button type="button" onClick={() => setShowRatingModal(false)}
                  className="px-5 py-2.5 text-gray-600 font-medium rounded-xl border border-gray-200 hover:bg-gray-50 transition text-sm">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
