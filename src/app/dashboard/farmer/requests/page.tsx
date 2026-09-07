'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import type { BuyRequest, Listing, Profile } from '@/lib/types';
import { formatCurrency, formatPriceUnit, getTrustLevel } from '@/lib/utils';
import { TableSkeleton } from '@/components/ui/LoadingSkeleton';

export default function FarmerRequestsPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [requests, setRequests] = useState<BuyRequest[]>([]);
  const [myListings, setMyListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'open'>('open');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [matchModal, setMatchModal] = useState<BuyRequest | null>(null);
  const [matches, setMatches] = useState<{ listing: Listing; score: number; reasons: string[] }[]>([]);
  const [matchLoading, setMatchLoading] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }
      const { data: p } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      if (!p) { setLoading(false); return; }
      if (p.role !== 'farmer') { router.push('/marketplace'); return; }
      setProfile(p);

      const { data: r } = await supabase
        .from('buy_requests')
        .select('*')
        .order('created_at', { ascending: false });

      setRequests(r || []);

      const { data: l } = await supabase
        .from('listings')
        .select('*, farmer:profiles!listings_farmer_id_fkey(full_name, farm_location, is_verified, verification_tier)')
        .eq('farmer_id', user.id)
        .eq('is_approved', true);

      setMyListings(l || []);
      setLoading(false);
    }
    load();
  }, [router]);

  function findMatches(request: BuyRequest) {
    setMatchLoading(true);
    setMatchModal(request);

    const scored = myListings
      .filter((l) => l.category === request.category)
      .map((listing) => {
        let score = 0;
        const reasons: string[] = [];

        score += 30;
        reasons.push('Category match');

        const requestLoc = request.delivery_location.toLowerCase();
        const listingLoc = (listing.location || listing.farmer?.farm_location || '').toLowerCase();
        if (listingLoc.includes(requestLoc) || requestLoc.includes(listingLoc)) {
          score += 25;
          reasons.push('Location match');
        }

        if (request.max_price_per_unit && listing.price_per_unit <= request.max_price_per_unit) {
          score += 20;
          reasons.push('Within budget');
        } else if (!request.max_price_per_unit) {
          score += 10;
          reasons.push('No price constraint');
        }

        if (listing.farmer?.verification_tier === 'supreme' || listing.farmer?.verification_tier === 'premium') {
          score += 15;
          reasons.push('High trust tier');
        } else if (listing.farmer?.is_verified) {
          score += 10;
          reasons.push('Verified farmer');
        }

        return { listing, score, reasons };
      })
      .filter((m) => m.score >= 30)
      .sort((a, b) => b.score - a.score);

    setMatches(scored);
    setMatchLoading(false);
  }

  const filtered = requests.filter((r) => {
    if (filter === 'open' && r.status !== 'open') return false;
    if (categoryFilter !== 'all' && r.category !== categoryFilter) return false;
    return true;
  });

  if (loading) return <div className="p-6"><TableSkeleton rows={4} cols={3} /></div>;
  if (!profile) return <div className="p-6 text-center text-gray-500">Profile not found.</div>;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto animate-fade-in">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <span className="w-1.5 h-6 rounded-full bg-farm-green" />
          Buyer Requests
        </h1>
        <p className="text-sm text-gray-500 mt-1">See what buyers are looking for and match with your listings</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="flex gap-2">
          {(['open', 'all'] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition ${
                filter === f ? 'bg-farm-green text-white shadow-sm' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}>
              {f === 'open' ? 'Open Requests' : 'All Requests'}
            </button>
          ))}
        </div>
        <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-600 focus:outline-none focus:ring-2 focus:ring-farm-green/20">
          <option value="all">All Categories</option>
          <option value="Crops & Grains">Crops & Grains</option>
          <option value="Livestock">Livestock</option>
          <option value="Poultry">Poultry</option>
          <option value="Aquaculture">Aquaculture</option>
          <option value="Other">Other</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 text-center py-20 animate-fade-in">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-farm-green/10 to-emerald-green/10 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-farm-green" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}><path d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" /></svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">No open requests</h3>
          <p className="text-sm text-gray-500">Check back later for buyer requests in your category.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((req) => {
            const matchingListings = myListings.filter((l) => l.category === req.category);
            return (
              <div key={req.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 sm:p-6 card-hover animate-fade-in">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-gray-900">{req.commodity_title}</h3>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                        Open
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
                  {matchingListings.length > 0 && (
                    <button onClick={() => findMatches(req)}
                      className="px-4 py-2 bg-farm-green text-white text-sm font-semibold rounded-xl hover:bg-farm-green-light transition shadow-sm flex items-center gap-2 shrink-0">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}><path d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" /></svg>
                      Match My Listings ({matchingListings.length})
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
            );
          })}
        </div>
      )}

      {matchModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm" onClick={() => setMatchModal(null)}>
          <div className="bg-white rounded-2xl p-6 sm:p-8 max-w-2xl w-full shadow-2xl max-h-[90vh] overflow-y-auto animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Smart Match Results</h3>
                <p className="text-sm text-gray-500">Matching your listings against: {matchModal.commodity_title}</p>
              </div>
              <button onClick={() => setMatchModal(null)} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            {matchLoading ? (
              <div className="text-center py-12">
                <div className="w-12 h-12 border-4 border-farm-green/20 border-t-farm-green rounded-full animate-spin mx-auto mb-4" />
                <p className="text-sm text-gray-500">Analyzing your listings...</p>
              </div>
            ) : matches.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}><path d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" /></svg>
                </div>
                <h4 className="font-semibold text-gray-900 mb-1">No matching listings found</h4>
                <p className="text-sm text-gray-500">Create a listing in the &ldquo;{matchModal.category}&rdquo; category to match with this request.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {matches.map((match) => {
                  const trustLevel = getTrustLevel(match.listing.farmer?.verification_tier === 'supreme' ? 85 : match.listing.farmer?.verification_tier === 'premium' ? 70 : match.listing.farmer?.is_verified ? 50 : 20);
                  return (
                    <div key={match.listing.id} className="bg-gradient-to-br from-farm-green/5 to-emerald-green/5 rounded-2xl border border-farm-green/10 p-5">
                      <div className="flex items-start justify-between gap-4 mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-semibold text-gray-900">{match.listing.title}</h4>
                            <span className="px-2 py-0.5 bg-farm-green text-white text-xs font-bold rounded-full">{match.score}%</span>
                          </div>
                          <p className="text-sm text-gray-500">{match.listing.quantity_available} available at {formatCurrency(match.listing.price_per_unit)}{formatPriceUnit(match.listing.price_unit || 'unit')}</p>
                        </div>
                        <div className={`px-3 py-1 rounded-full text-xs font-semibold border ${trustLevel.color}`}>
                          {trustLevel.label}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {match.reasons.map((reason, i) => (
                          <span key={i} className="inline-flex items-center gap-1 px-2.5 py-1 bg-white rounded-lg text-xs font-medium text-gray-600 border border-gray-100">
                            <svg className="w-3 h-3 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                            {reason}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
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
