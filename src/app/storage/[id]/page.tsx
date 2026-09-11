'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import type { StorageFacility, StorageRating, Profile } from '@/lib/types';
import { STORAGE_FACILITY_TYPE_CONFIG } from '@/lib/types';
import { formatCurrency, calculateStorageFee } from '@/lib/utils';

export default function FacilityDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = React.use(params);
  const router = useRouter();

  const [facility, setFacility] = useState<StorageFacility | null>(null);
  const [ratings, setRatings] = useState<StorageRating[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [bookingForm, setBookingForm] = useState({
    produce_name: '',
    category: 'Crops & Grains',
    quantity: '',
    quantity_unit: 'kg',
    storage_start: '',
    storage_end: '',
    special_notes: '',
  });
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [bookingError, setBookingError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const supabase = createClient();

        // Fetch user profile
        const { data: { user } } = await supabase.auth.getUser();
        if (!cancelled && user) {
          const { data: p } = await supabase
            .from('profiles')
            .select('id, full_name, phone_number, role, is_verified, is_blocked, blocked_warning, verification_tier, farm_location, created_at')
            .eq('id', user.id)
            .single();
          if (!cancelled) setProfile(p);
        }

        // Fetch facility
        const { data: facilityData, error: facilityError } = await supabase
          .from('storage_facilities')
          .select('*')
          .eq('id', id)
          .single();

        if (cancelled) return;
        if (facilityError || !facilityData) {
          setError('Facility not found or no longer available.');
          setLoading(false);
          return;
        }

        setFacility(facilityData as StorageFacility);

        // Fetch ratings
        const { data: ratingsData } = await supabase
          .from('storage_ratings')
          .select('*, farmer:profiles!storage_ratings_farmer_id_fkey(full_name)')
          .eq('facility_id', id)
          .order('created_at', { ascending: false });

        if (!cancelled) {
          setRatings(ratingsData || []);
        }
      } catch {
        if (!cancelled) setError('Failed to load facility details.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [id]);

  async function handleBooking(e: React.FormEvent) {
    e.preventDefault();
    if (!facility) return;
    setBookingError('');
    setBookingLoading(true);

    const quantity = parseFloat(bookingForm.quantity);
    if (isNaN(quantity) || quantity <= 0) {
      setBookingError('Enter a valid quantity.');
      setBookingLoading(false);
      return;
    }

    if (!bookingForm.produce_name.trim()) {
      setBookingError('Enter a produce name.');
      setBookingLoading(false);
      return;
    }

    if (!bookingForm.storage_start || !bookingForm.storage_end) {
      setBookingError('Select start and end dates.');
      setBookingLoading(false);
      return;
    }

    if (new Date(bookingForm.storage_end) <= new Date(bookingForm.storage_start)) {
      setBookingError('End date must be after start date.');
      setBookingLoading(false);
      return;
    }

    if (quantity > facility.available_capacity) {
      setBookingError(`Insufficient capacity. Available: ${facility.available_capacity} ${facility.capacity_unit}.`);
      setBookingLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/storage/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          facilityId: facility.id,
          produceName: bookingForm.produce_name.trim(),
          category: bookingForm.category,
          quantity,
          quantityUnit: bookingForm.quantity_unit,
          storageStart: bookingForm.storage_start,
          storageEnd: bookingForm.storage_end,
          specialNotes: bookingForm.special_notes.trim() || null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setBookingError(data.error || 'Booking failed. Please try again.');
        setBookingLoading(false);
        return;
      }

      setBookingSuccess(true);
      setBookingLoading(false);

      // Update local facility capacity
      setFacility((prev) => prev ? { ...prev, available_capacity: Math.max(0, prev.available_capacity - quantity) } : prev);
    } catch {
      setBookingError('An unexpected error occurred. Please try again.');
      setBookingLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white border-b border-gray-100 sticky top-0 z-30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center">
            <button onClick={() => router.push('/dashboard/farmer/storage')} className="hover:scale-105 transition-transform">
              <Image src="/logo.png" alt="TheFarmYard" width={32} height={32} className="h-8 w-auto" />
            </button>
          </div>
        </header>
        <div className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8">
          <div className="grid lg:grid-cols-5 gap-8">
            <div className="lg:col-span-3 space-y-6">
              {/* Image skeleton */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="aspect-[16/10] bg-gray-200 animate-pulse" />
                <div className="p-6 space-y-4">
                  <div className="h-4 bg-gray-200 rounded w-24 animate-pulse" />
                  <div className="h-8 bg-gray-200 rounded w-3/4 animate-pulse" />
                  <div className="h-4 bg-gray-200 rounded w-1/2 animate-pulse" />
                  <div className="h-4 bg-gray-200 rounded w-full animate-pulse" />
                </div>
              </div>
              {/* Details skeleton */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
                <div className="h-5 bg-gray-200 rounded w-40 animate-pulse" />
                <div className="grid grid-cols-2 gap-4">
                  {[1, 2, 3, 4].map((i) => <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />)}
                </div>
              </div>
            </div>
            <div className="lg:col-span-2">
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4 sticky top-24">
                <div className="h-6 bg-gray-200 rounded w-32 animate-pulse" />
                <div className="h-4 bg-gray-200 rounded w-full animate-pulse" />
                <div className="h-4 bg-gray-200 rounded w-full animate-pulse" />
                <div className="h-10 bg-gray-200 rounded w-full animate-pulse" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !facility) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white border-b border-gray-100 sticky top-0 z-30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center">
            <button onClick={() => router.push('/dashboard/farmer/storage')} className="hover:scale-105 transition-transform">
              <Image src="/logo.png" alt="TheFarmYard" width={32} height={32} className="h-8 w-auto" />
            </button>
          </div>
        </header>
        <div className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8 text-center py-24 animate-fade-in">
          <div className="max-w-md mx-auto bg-white rounded-2xl shadow-sm border border-red-200 p-8">
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Facility Not Found</h3>
            <p className="text-sm text-red-600 mb-5">{error || 'This facility may have been removed.'}</p>
            <Link href="/dashboard/farmer/storage" className="px-5 py-2.5 bg-farm-green text-white text-sm font-semibold rounded-xl hover:bg-farm-green-light transition shadow-sm">
              Back to Storage
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const typeCfg = STORAGE_FACILITY_TYPE_CONFIG[facility.facility_type];
  const occupancyPct = facility.total_capacity > 0
    ? Math.round(((facility.total_capacity - facility.available_capacity) / facility.total_capacity) * 100)
    : 0;
  const avgRating = ratings.length > 0
    ? Math.round((ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length) * 10) / 10
    : 0;

  const estimatedCost = bookingForm.quantity && bookingForm.storage_start && bookingForm.storage_end
    ? calculateStorageFee(
        facility.price_per_unit,
        parseFloat(bookingForm.quantity) || 0,
        bookingForm.storage_start,
        bookingForm.storage_end,
      )
    : 0;

  const capacityBarColor = occupancyPct > 90 ? 'bg-red-400' : occupancyPct > 70 ? 'bg-amber-400' : 'bg-emerald-400';

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push('/dashboard/farmer/storage')} className="hover:scale-105 transition-transform">
              <Image src="/logo.png" alt="TheFarmYard" width={32} height={32} className="h-8 w-auto" />
            </button>
            <div className="h-5 w-px bg-gray-200" />
            <button onClick={() => router.push('/dashboard/farmer/storage')} className="text-sm text-gray-500 hover:text-gray-900 transition flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
              Storage
            </button>
          </div>
          <div className="flex items-center gap-2">
            {profile?.role === 'farmer' && (
              <button onClick={() => router.push('/dashboard/farmer/storage')} className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-xl transition">My Bookings</button>
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
            <button onClick={() => setNotice('')} className="text-amber-500 hover:text-amber-700 font-bold" aria-label="Dismiss">&#x2715;</button>
          </div>
        </div>
      )}

      <main className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8 animate-fade-in">
        <div className="grid lg:grid-cols-5 gap-8">
          {/* ─── LEFT: Facility Details ───────────────────────────────────── */}
          <div className="lg:col-span-3 space-y-6">
            {/* Hero image */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="aspect-[16/10] bg-gradient-to-br from-gray-50 to-gray-100 relative">
                {facility.image_url ? (
                  <Image src={facility.image_url} alt={facility.name} fill className="object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-300">
                    <svg className="w-20 h-20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3H21m-3.75 3H21" /></svg>
                  </div>
                )}
                {facility.is_featured && (
                  <div className="absolute top-4 left-4">
                    <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold bg-gradient-to-r from-amber-400 to-amber-500 text-white shadow-lg">
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.9 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l7.1-1.01L12 2z" /></svg>
                      Featured
                    </span>
                  </div>
                )}
              </div>

              <div className="p-6 sm:p-8">
                {/* Type badge + rating */}
                <div className="flex items-center gap-2 mb-3 flex-wrap">
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${typeCfg.color}`}>
                    {typeCfg.label}
                  </span>
                  {facility.status === 'maintenance' && (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-orange-100 text-orange-700">
                      Under Maintenance
                    </span>
                  )}
                  {avgRating > 0 && (
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.9 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l7.1-1.01L12 2z" /></svg>
                      {avgRating} ({ratings.length})
                    </span>
                  )}
                </div>

                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">{facility.name}</h1>

                <div className="flex items-center gap-3 text-sm text-gray-500 mb-6">
                  <span className="flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}><path d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" /><path d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" /></svg>
                    {facility.location}
                  </span>
                  {facility.address && (
                    <>
                      <span className="w-1 h-1 rounded-full bg-gray-300" />
                      <span>{facility.address}</span>
                    </>
                  )}
                </div>

                {facility.description && (
                  <div className="border-t border-gray-100 pt-6">
                    <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-3">About This Facility</h3>
                    <p className="text-gray-600 leading-relaxed whitespace-pre-line">{facility.description}</p>
                  </div>
                )}

                {/* Capacity bar */}
                <div className="border-t border-gray-100 pt-6 mt-6">
                  <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-4">Capacity</h3>
                  <div className="mb-3">
                    <div className="flex items-center justify-between text-sm mb-1.5">
                      <span className="text-gray-500">Available / Total</span>
                      <span className="font-semibold text-gray-900">{facility.available_capacity.toLocaleString()} / {facility.total_capacity.toLocaleString()} {facility.capacity_unit}</span>
                    </div>
                    <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all ${capacityBarColor}`} style={{ width: `${occupancyPct}%` }} />
                    </div>
                    <p className="text-xs text-gray-400 mt-1.5">
                      {occupancyPct}% occupied
                      {facility.available_capacity <= 0 && <span className="text-red-500 font-medium ml-2">- Fully booked</span>}
                    </p>
                  </div>
                </div>

                {/* Facility details grid */}
                <div className="border-t border-gray-100 pt-6 mt-6">
                  <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-4">Facility Details</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-50 rounded-xl p-3">
                      <span className="text-xs text-gray-400 block mb-0.5">Facility Type</span>
                      <span className="text-sm font-semibold text-gray-900">{typeCfg.label}</span>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-3">
                      <span className="text-xs text-gray-400 block mb-0.5">Pricing</span>
                      <span className="text-sm font-semibold text-farm-green">{formatCurrency(facility.price_per_unit)} / {facility.capacity_unit} / day</span>
                    </div>
                    {facility.pricing_model && (
                      <div className="bg-gray-50 rounded-xl p-3">
                        <span className="text-xs text-gray-400 block mb-0.5">Pricing Model</span>
                        <span className="text-sm font-semibold text-gray-900">{facility.pricing_model}</span>
                      </div>
                    )}
                    <div className="bg-gray-50 rounded-xl p-3">
                      <span className="text-xs text-gray-400 block mb-0.5">Listed</span>
                      <span className="text-sm font-semibold text-gray-900">{new Date(facility.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>

                {/* Supported crops */}
                {facility.supported_crops && facility.supported_crops.length > 0 && (
                  <div className="border-t border-gray-100 pt-6 mt-6">
                    <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-3">Supported Crops</h3>
                    <div className="flex flex-wrap gap-2">
                      {facility.supported_crops.map((crop) => (
                        <span key={crop} className="px-3 py-1 rounded-full text-xs font-medium bg-farm-green/10 text-farm-green border border-farm-green/20">
                          {crop}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Operating hours */}
                {facility.operating_hours && (
                  <div className="border-t border-gray-100 pt-6 mt-6">
                    <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-3">Operating Hours</h3>
                    <p className="text-sm text-gray-600">{facility.operating_hours}</p>
                  </div>
                )}

                {/* Features */}
                <div className="border-t border-gray-100 pt-6 mt-6">
                  <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-4">Features</h3>
                  <div className="flex flex-wrap gap-2">
                    {facility.has_climate_control && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-blue-50 text-blue-600 border border-blue-200">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.25 15a4.5 4.5 0 004.5 4.5H18a3.75 3.75 0 001.332-7.257 3 3 0 00-3.758-3.848 5.25 5.25 0 00-10.233 2.33A4.502 4.502 0 002.25 15z" /></svg>
                        Climate Control
                      </span>
                    )}
                    {facility.has_security && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-600 border border-emerald-200">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" /></svg>
                        24/7 Security
                      </span>
                    )}
                    {facility.has_loading_dock && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-amber-50 text-amber-600 border border-amber-200">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" /></svg>
                        Loading Dock
                      </span>
                    )}
                    {!facility.has_climate_control && !facility.has_security && !facility.has_loading_dock && (
                      <span className="text-sm text-gray-400">No features listed</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* ─── REVIEWS / RATINGS ─────────────────────────────────────────── */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-4 flex items-center gap-2">
                <span className="w-1.5 h-5 rounded-full bg-amber-400" />
                Reviews ({ratings.length})
              </h3>

              {ratings.length === 0 ? (
                <div className="text-center py-10">
                  <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
                    <svg className="w-7 h-7 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}>
                      <path d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
                    </svg>
                  </div>
                  <p className="text-gray-500 font-medium">No reviews yet</p>
                  <p className="text-gray-400 text-sm mt-1">Be the first to review this facility after your stay.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {ratings.map((r) => (
                    <div key={r.id} className="border-b border-gray-50 pb-4 last:border-0 last:pb-0">
                      <div className="flex items-center gap-2 mb-1.5">
                        <div className="flex gap-0.5">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <svg key={star} className={`w-3.5 h-3.5 ${star <= r.rating ? 'text-amber-400' : 'text-gray-200'}`} viewBox="0 0 24 24" fill="currentColor">
                              <path d="M12 2l2.9 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l7.1-1.01L12 2z" />
                            </svg>
                          ))}
                        </div>
                        <span className="text-xs font-semibold text-gray-600">{r.farmer?.full_name || 'Farmer'}</span>
                        <span className="text-xs text-gray-400">{new Date(r.created_at).toLocaleDateString()}</span>
                      </div>
                      {(r.condition_rating || r.handling_rating || r.reliability_rating) && (
                        <div className="flex flex-wrap gap-3 mb-1.5 text-xs text-gray-500">
                          {r.condition_rating && <span>Condition: <span className="font-medium text-gray-700">{r.condition_rating}/5</span></span>}
                          {r.handling_rating && <span>Handling: <span className="font-medium text-gray-700">{r.handling_rating}/5</span></span>}
                          {r.reliability_rating && <span>Reliability: <span className="font-medium text-gray-700">{r.reliability_rating}/5</span></span>}
                        </div>
                      )}
                      {r.comment && <p className="text-sm text-gray-600 italic">&ldquo;{r.comment}&rdquo;</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ─── RIGHT: Booking Sidebar ─────────────────────────────────────── */}
          <div className="lg:col-span-2 space-y-6">
            {/* Quick info card */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sticky top-24">
              <div className="mb-5">
                <p className="text-sm text-gray-500 mb-1">Price per day</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-farm-green">{formatCurrency(facility.price_per_unit)}</span>
                  <span className="text-sm text-gray-400">per {facility.capacity_unit}</span>
                </div>
              </div>

              {/* Availability summary */}
              <div className="p-4 bg-gray-50 rounded-xl mb-5">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-gray-500">Availability</span>
                  <span className={`font-semibold ${facility.available_capacity > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    {facility.available_capacity > 0 ? `${facility.available_capacity.toLocaleString()} ${facility.capacity_unit} available` : 'Fully Booked'}
                  </span>
                </div>
                <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${capacityBarColor}`} style={{ width: `${occupancyPct}%` }} />
                </div>
              </div>

              {bookingSuccess ? (
                <div className="text-center py-6">
                  <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-3">
                    <svg className="w-7 h-7 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}>
                      <path d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h4 className="text-lg font-bold text-gray-900 mb-2">Booking Submitted</h4>
                  <p className="text-sm text-gray-500 mb-4">Your booking request has been sent. The admin will review and confirm it.</p>
                  <button onClick={() => router.push('/dashboard/farmer/storage')} className="px-6 py-2.5 bg-farm-green text-white text-sm font-semibold rounded-xl hover:bg-farm-green-light transition">
                    View My Bookings
                  </button>
                </div>
              ) : profile?.role === 'farmer' ? (
                <form onSubmit={handleBooking} className="space-y-4">
                  {bookingError && (
                    <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl">{bookingError}</div>
                  )}

                  {/* Facility rate reminder */}
                  <div className="p-3 bg-farm-green/5 rounded-xl border border-farm-green/10">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Rate</span>
                      <span className="font-semibold text-gray-900">{formatCurrency(facility.price_per_unit)} / {facility.capacity_unit} / day</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Produce Name</label>
                    <input
                      type="text"
                      value={bookingForm.produce_name}
                      onChange={(e) => setBookingForm({ ...bookingForm, produce_name: e.target.value })}
                      placeholder="e.g. Tomatoes, Maize, Cassava"
                      required
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl bg-white text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-farm-green/30 focus:border-farm-green"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5">Category</label>
                      <select
                        value={bookingForm.category}
                        onChange={(e) => setBookingForm({ ...bookingForm, category: e.target.value })}
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl bg-white text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-farm-green/30"
                      >
                        <option>Crops & Grains</option>
                        <option>Livestock</option>
                        <option>Poultry</option>
                        <option>Aquaculture</option>
                        <option>Other</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5">Unit</label>
                      <select
                        value={bookingForm.quantity_unit}
                        onChange={(e) => setBookingForm({ ...bookingForm, quantity_unit: e.target.value })}
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl bg-white text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-farm-green/30"
                      >
                        <option value="kg">Kilograms (kg)</option>
                        <option value="tonne">Tonnes</option>
                        <option value="bag">Bags</option>
                        <option value="crate">Crates</option>
                        <option value="box">Boxes</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Quantity</label>
                    <input
                      type="number"
                      value={bookingForm.quantity}
                      onChange={(e) => setBookingForm({ ...bookingForm, quantity: e.target.value })}
                      placeholder={`Amount in ${bookingForm.quantity_unit}`}
                      required
                      min="0.01"
                      step="0.01"
                      max={facility.available_capacity}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl bg-white text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-farm-green/30 focus:border-farm-green"
                    />
                    <p className="text-xs text-gray-400 mt-1">Max: {facility.available_capacity.toLocaleString()} {facility.capacity_unit}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5">Start Date</label>
                      <input
                        type="date"
                        value={bookingForm.storage_start}
                        onChange={(e) => setBookingForm({ ...bookingForm, storage_start: e.target.value })}
                        required
                        min={new Date().toISOString().split('T')[0]}
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl bg-white text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-farm-green/30 focus:border-farm-green"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5">End Date</label>
                      <input
                        type="date"
                        value={bookingForm.storage_end}
                        onChange={(e) => setBookingForm({ ...bookingForm, storage_end: e.target.value })}
                        required
                        min={bookingForm.storage_start || new Date().toISOString().split('T')[0]}
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl bg-white text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-farm-green/30 focus:border-farm-green"
                      />
                    </div>
                  </div>

                  {/* Estimated cost */}
                  {estimatedCost > 0 && (
                    <div className="p-3 bg-farm-green/5 rounded-xl border border-farm-green/20">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Estimated Total</span>
                        <span className="font-bold text-farm-green text-lg">{formatCurrency(estimatedCost)}</span>
                      </div>
                      <p className="text-xs text-gray-400 mt-1">This is an estimate. Final amount calculated server-side.</p>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Special Notes (optional)</label>
                    <textarea
                      value={bookingForm.special_notes}
                      onChange={(e) => setBookingForm({ ...bookingForm, special_notes: e.target.value })}
                      rows={2}
                      placeholder="Any special storage requirements..."
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl bg-white text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-farm-green/30 focus:border-farm-green resize-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={bookingLoading || facility.available_capacity <= 0}
                    className="w-full py-3 bg-farm-green text-white font-semibold rounded-xl hover:bg-farm-green-light active:scale-[0.98] transition-all disabled:opacity-60 shadow-md flex items-center justify-center gap-2"
                  >
                    {bookingLoading ? (
                      <>
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Submitting...
                      </>
                    ) : facility.available_capacity <= 0 ? (
                      'Fully Booked'
                    ) : (
                      'Submit Booking Request'
                    )}
                  </button>
                </form>
              ) : !profile ? (
                <div className="text-center py-4">
                  <button onClick={() => router.push('/login')} className="w-full py-3 bg-farm-green text-white font-semibold rounded-xl hover:bg-farm-green-light transition shadow-sm hover:shadow-md active:scale-[0.98] text-sm mb-3">
                    Sign In to Book
                  </button>
                  <p className="text-xs text-gray-400">You need a farmer account to book storage.</p>
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-sm text-gray-500 mb-2">Only farmers can book storage facilities.</p>
                  <p className="text-xs text-gray-400">Switch to a farmer account to make a booking.</p>
                </div>
              )}

              {/* Trust badge */}
              <div className="mt-5 p-4 bg-gradient-to-br from-cream to-cream-dark rounded-xl border border-cream-dark/50">
                <p className="text-xs text-gray-500 flex items-center gap-1.5 mb-1">
                  <svg className="w-3.5 h-3.5 text-farm-green" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}><path d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" /></svg>
                  Managed by TheFarmYard
                </p>
                <p className="text-xs text-gray-500">Bookings verified and capacity validated.</p>
              </div>
            </div>

            {/* Contact info */}
            {(facility.contact_name || facility.contact_phone) && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-4">Contact Information</h3>
                <div className="space-y-3">
                  {facility.contact_name && (
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-farm-green to-emerald-green flex items-center justify-center text-white font-bold text-sm shadow-sm shrink-0">
                        {facility.contact_name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{facility.contact_name}</p>
                        {facility.contact_email && <p className="text-xs text-gray-500">{facility.contact_email}</p>}
                      </div>
                    </div>
                  )}
                  {facility.contact_phone && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}>
                        <path d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
                      </svg>
                      <a href={`tel:${facility.contact_phone}`} className="hover:text-farm-green transition">{facility.contact_phone}</a>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
