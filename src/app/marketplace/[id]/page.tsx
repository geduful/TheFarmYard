'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import type { Listing, Profile, FarmerRating } from '@/lib/types';
import { formatCurrency, formatPriceUnit, getTrustLevel } from '@/lib/utils';
import { CardSkeleton } from '@/components/ui/LoadingSkeleton';

export default function ListingDetailPage() {
  const router = useRouter();
  const params = useParams();
  const listingId = params.id as string;

  const [listing, setListing] = useState<Listing | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [ratings, setRatings] = useState<FarmerRating[]>([]);
  const [farmerStats, setFarmerStats] = useState<{ avgRating: number; totalRatings: number; completedTx: number; trustScore: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const supabase = createClient();

        const { data: { user } } = await supabase.auth.getUser();
        if (!cancelled && user) {
          const { data: p } = await supabase.from('profiles').select('id, full_name, phone_number, role, is_verified, is_blocked, blocked_warning, verification_tier, farm_location, created_at').eq('id', user.id).single();
          if (!cancelled) setProfile(p);
        }

        const { data: listingData, error: listingError } = await supabase
          .from('listings')
          .select('*, farmer:profiles!listings_farmer_id_fkey(full_name, farm_location, is_verified, verification_tier)')
          .eq('id', listingId)
          .eq('is_approved', true)
          .single();

        if (cancelled) return;
        if (listingError || !listingData) {
          setError('Listing not found or no longer available.');
          setLoading(false);
          return;
        }

        setListing(listingData as Listing);

        const { data: farmerRatings } = await supabase
          .from('farmer_ratings')
          .select('*, buyer:profiles!farmer_ratings_buyer_id_fkey(full_name)')
          .eq('farmer_id', listingData.farmer_id)
          .order('created_at', { ascending: false });

        if (!cancelled) {
          const r = farmerRatings || [];
          setRatings(r);
          const avg = r.length > 0 ? r.reduce((sum, rating) => sum + rating.rating, 0) / r.length : 0;

          const { count: completedTx } = await supabase
            .from('escrow_transactions')
            .select('*', { count: 'exact', head: true })
            .eq('farmer_id', listingData.farmer_id)
            .eq('status', 'released');

          const { count: totalListings } = await supabase
            .from('listings')
            .select('*', { count: 'exact', head: true })
            .eq('farmer_id', listingData.farmer_id)
            .eq('is_approved', true);

          const { data: farmerProfile } = await supabase
            .from('profiles')
            .select('verification_tier, created_at')
            .eq('id', listingData.farmer_id)
            .single();

          const trustData = {
            avgRating: avg,
            totalRatings: r.length,
            completedTx: completedTx || 0,
            trustScore: 0,
          };

          if (farmerProfile) {
            const accountAgeDays = Math.floor((Date.now() - new Date(farmerProfile.created_at).getTime()) / 86400000);
            const tierScore = farmerProfile.verification_tier === 'supreme' ? 30
              : farmerProfile.verification_tier === 'premium' ? 25
              : farmerProfile.verification_tier === 'verified' ? 18 : 5;
            const ratingScore = r.length > 0 ? (avg / 5) * 20 + Math.min(r.length, 10) * 0.5 : 0;
            const txScore = Math.min((completedTx || 0) * 2, 20);
            const listingScore = Math.min((totalListings || 0) * 3, 15);
            const ageScore = Math.min(accountAgeDays / 30, 10);
            trustData.trustScore = Math.round(Math.min(Math.max(tierScore + ratingScore + txScore + listingScore + ageScore, 0), 100) * 10) / 10;
          }

          setFarmerStats(trustData);
        }
      } catch {
        if (!cancelled) setError('Failed to load listing.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [listingId]);

  function handleBuy() {
    if (!profile) { router.push('/login'); return; }
    if (profile.role === 'farmer') { setNotice('Farmers cannot purchase listings. Please use a buyer account.'); return; }
    if (listing && listing.farmer_id === profile.id) { setNotice('You cannot purchase your own listing.'); return; }
    const encoded = encodeURIComponent(JSON.stringify({ listingId: listing!.id, farmerId: listing!.farmer_id, quantity }));
    router.push(`/dashboard/buyer?checkout=${encoded}`);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white border-b border-gray-100 sticky top-0 z-30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center">
            <button onClick={() => router.push('/marketplace')} className="hover:scale-105 transition-transform"><Image src="/logo.png" alt="TheFarmYard" width={32} height={32} className="h-8 w-auto" /></button>
          </div>
        </header>
        <div className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8">
          <div className="grid lg:grid-cols-5 gap-8">
            <div className="lg:col-span-3"><CardSkeleton /></div>
            <div className="lg:col-span-2"><CardSkeleton /></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !listing) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white border-b border-gray-100 sticky top-0 z-30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center">
            <button onClick={() => router.push('/marketplace')} className="hover:scale-105 transition-transform"><Image src="/logo.png" alt="TheFarmYard" width={32} height={32} className="h-8 w-auto" /></button>
          </div>
        </header>
        <div className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8 text-center py-24 animate-fade-in">
          <div className="max-w-md mx-auto bg-white rounded-2xl shadow-sm border border-red-200 p-8">
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Listing Not Found</h3>
            <p className="text-sm text-red-600 mb-5">{error || 'This listing may have been removed.'}</p>
            <Link href="/marketplace" className="px-5 py-2.5 bg-farm-green text-white text-sm font-semibold rounded-xl hover:bg-farm-green-light transition shadow-sm">
              Back to Marketplace
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const trustLevel = farmerStats ? getTrustLevel(farmerStats.trustScore) : null;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push('/marketplace')} className="hover:scale-105 transition-transform"><Image src="/logo.png" alt="TheFarmYard" width={32} height={32} className="h-8 w-auto" /></button>
            <div className="h-5 w-px bg-gray-200" />
            <button onClick={() => router.push('/marketplace')} className="text-sm text-gray-500 hover:text-gray-900 transition flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
              Marketplace
            </button>
          </div>
          <div className="flex items-center gap-2">
            {profile?.role === 'buyer' && (
              <button onClick={() => router.push('/dashboard/buyer')} className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-xl transition">My Orders</button>
            )}
            {!profile && (
              <button onClick={() => router.push('/login')} className="px-5 py-2 bg-farm-green text-white text-sm font-semibold rounded-xl hover:bg-farm-green-light transition shadow-sm">Sign In</button>
            )}
          </div>
        </div>
      </header>

      {notice && (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-4">
          <div className="p-3.5 bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-xl flex items-center justify-between gap-2 animate-fade-in">
            <span>{notice}</span>
            <button onClick={() => setNotice('')} className="text-amber-500 hover:text-amber-700 font-bold" aria-label="Dismiss">✕</button>
          </div>
        </div>
      )}

      <main className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8 animate-fade-in">
        <div className="grid lg:grid-cols-5 gap-8">
          <div className="lg:col-span-3 space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="aspect-[16/10] bg-gradient-to-br from-gray-50 to-gray-100 relative">
                {listing.image_url ? (
                  <Image src={listing.image_url} alt={listing.title} fill className="object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-300">
                    <svg className="w-20 h-20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" /></svg>
                  </div>
                )}
                {listing.is_promoted && (
                  <div className="absolute top-4 left-4">
                    <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold bg-gradient-to-r from-amber-400 to-amber-500 text-white shadow-lg">
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.9 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l7.1-1.01L12 2z" /></svg>
                      Featured
                    </span>
                  </div>
                )}
              </div>

              <div className="p-6 sm:p-8">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs font-semibold text-farm-green bg-farm-green/10 px-3 py-1 rounded-full">{listing.category}</span>
                  {listing.quality_grade && (
                    <span className="text-xs font-semibold text-amber-600 bg-amber-50 border border-amber-200 px-3 py-1 rounded-full">{listing.quality_grade}</span>
                  )}
                </div>

                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">{listing.title}</h1>

                <div className="flex items-center gap-3 text-sm text-gray-500 mb-6">
                  <span className="flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}><path d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" /><path d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" /></svg>
                    {listing.location || listing.farmer?.farm_location || 'Ghana'}
                  </span>
                  <span className="w-1 h-1 rounded-full bg-gray-300" />
                  <span>{listing.availability || 'In Stock'}</span>
                </div>

                <div className="flex items-baseline gap-2 mb-6">
                  <span className="text-3xl font-bold text-farm-green">{formatCurrency(listing.price_per_unit)}</span>
                  <span className="text-sm text-gray-400">{formatPriceUnit(listing.price_unit || 'unit')}</span>
                </div>

                {listing.description && (
                  <div className="border-t border-gray-100 pt-6">
                    <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-3">About This Product</h3>
                    <p className="text-gray-600 leading-relaxed whitespace-pre-line">{listing.description}</p>
                  </div>
                )}

                <div className="border-t border-gray-100 pt-6 mt-6">
                  <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-4">Product Details</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-50 rounded-xl p-3">
                      <span className="text-xs text-gray-400 block mb-0.5">Available Quantity</span>
                      <span className="text-sm font-semibold text-gray-900">{listing.quantity_available}</span>
                    </div>
                    {listing.minimum_order && (
                      <div className="bg-gray-50 rounded-xl p-3">
                        <span className="text-xs text-gray-400 block mb-0.5">Minimum Order</span>
                        <span className="text-sm font-semibold text-gray-900">{listing.minimum_order}</span>
                      </div>
                    )}
                    {listing.harvest_date && (
                      <div className="bg-gray-50 rounded-xl p-3">
                        <span className="text-xs text-gray-400 block mb-0.5">Harvest Date</span>
                        <span className="text-sm font-semibold text-gray-900">{new Date(listing.harvest_date).toLocaleDateString()}</span>
                      </div>
                    )}
                    <div className="bg-gray-50 rounded-xl p-3">
                      <span className="text-xs text-gray-400 block mb-0.5">Listed</span>
                      <span className="text-sm font-semibold text-gray-900">{new Date(listing.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {ratings.length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-4 flex items-center gap-2">
                  <span className="w-1.5 h-5 rounded-full bg-amber-400" />
                  Buyer Reviews ({ratings.length})
                </h3>
                <div className="space-y-4">
                  {ratings.slice(0, 5).map((r) => (
                    <div key={r.id} className="border-b border-gray-50 pb-4 last:border-0 last:pb-0">
                      <div className="flex items-center gap-2 mb-1.5">
                        <div className="flex gap-0.5">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <svg key={star} className={`w-3.5 h-3.5 ${star <= r.rating ? 'text-amber-400' : 'text-gray-200'}`} viewBox="0 0 24 24" fill="currentColor">
                              <path d="M12 2l2.9 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l7.1-1.01L12 2z" />
                            </svg>
                          ))}
                        </div>
                        <span className="text-xs font-semibold text-gray-600">{r.buyer?.full_name || 'Buyer'}</span>
                        <span className="text-xs text-gray-400">{new Date(r.created_at).toLocaleDateString()}</span>
                      </div>
                      {r.comment && <p className="text-sm text-gray-600 italic">&ldquo;{r.comment}&rdquo;</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sticky top-24">
              <div className="mb-6">
                <p className="text-sm text-gray-500 mb-1">Total Price</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-farm-green">{formatCurrency(listing.price_per_unit * quantity)}</span>
                  <span className="text-sm text-gray-400">({quantity} × {formatCurrency(listing.price_per_unit)})</span>
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Quantity</label>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="w-10 h-10 rounded-xl border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50 transition font-bold"
                  >
                    −
                  </button>
                  <input
                    type="number"
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                    min="1"
                    className="flex-1 px-3 py-2.5 border border-gray-200 rounded-xl text-center font-semibold focus:outline-none focus:ring-2 focus:ring-farm-green/20 focus:border-farm-green"
                  />
                  <button
                    onClick={() => setQuantity(quantity + 1)}
                    className="w-10 h-10 rounded-xl border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50 transition font-bold"
                  >
                    +
                  </button>
                </div>
                <p className="text-xs text-gray-400 mt-2">Available: {listing.quantity_available}</p>
              </div>

              {profile?.role === 'buyer' ? (
                <button onClick={handleBuy} className="w-full py-3 bg-farm-green text-white font-semibold rounded-xl hover:bg-farm-green-light transition shadow-sm hover:shadow-md active:scale-[0.98] text-sm mb-3">
                  Buy Securely via Escrow
                </button>
              ) : !profile ? (
                <button onClick={() => router.push('/login')} className="w-full py-3 bg-farm-green text-white font-semibold rounded-xl hover:bg-farm-green-light transition shadow-sm hover:shadow-md active:scale-[0.98] text-sm mb-3">
                  Sign In to Buy
                </button>
              ) : null}

              <div className="p-4 bg-gradient-to-br from-cream to-cream-dark rounded-xl border border-cream-dark/50">
                <p className="text-xs text-gray-500 flex items-center gap-1.5 mb-1">
                  <svg className="w-3.5 h-3.5 text-farm-green" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}><path d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" /></svg>
                  Protected by TheFarmYard Escrow
                </p>
                <p className="text-xs text-gray-500">Payment held until delivery confirmed.</p>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-4">Seller</h3>
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-farm-green to-emerald-green flex items-center justify-center text-white font-bold text-xl shadow-sm shrink-0">
                  {listing.farmer?.full_name?.charAt(0).toUpperCase() || 'F'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-semibold text-gray-900 truncate">{listing.farmer?.full_name}</h4>
                    {listing.farmer?.is_verified && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        Verified
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 flex items-center gap-1">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}><path d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" /><path d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" /></svg>
                    {listing.farmer?.farm_location}
                  </p>
                </div>
              </div>

              {farmerStats && (
                <div className="mt-4 pt-4 border-t border-gray-100 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">Trust Score</span>
                    <span className="text-lg font-bold text-gray-900">{farmerStats.trustScore}<span className="text-xs font-normal text-gray-400">/100</span></span>
                  </div>
                  {trustLevel && (
                    <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${trustLevel.color}`}>
                      {trustLevel.label}
                    </div>
                  )}
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Rating</span>
                    <span className="flex items-center gap-1 font-semibold text-gray-900">
                      {farmerStats.avgRating > 0 ? (
                        <>
                          <svg className="w-4 h-4 text-amber-400" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.9 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l7.1-1.01L12 2z" /></svg>
                          {farmerStats.avgRating.toFixed(1)} ({farmerStats.totalRatings})
                        </>
                      ) : 'No ratings yet'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Completed Sales</span>
                    <span className="font-semibold text-gray-900">{farmerStats.completedTx}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
