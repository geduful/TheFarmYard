'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import type { StorageFacility, StorageBooking } from '@/lib/types';
import { STORAGE_FACILITY_TYPE_CONFIG } from '@/lib/types';
import { formatCurrency, calculateStorageFee, getStorageDaysRemaining } from '@/lib/utils';
import StatusBadge from '@/components/ui/StatusBadge';

export default function FarmerStoragePage() {
  const router = useRouter();
  const [facilities, setFacilities] = useState<StorageFacility[]>([]);
  const [bookings, setBookings] = useState<StorageBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'browse' | 'bookings'>('browse');
  const [bookingFacility, setBookingFacility] = useState<StorageFacility | null>(null);
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
  const [filterType, setFilterType] = useState<string>('all');
  const [filterLocation, setFilterLocation] = useState('');

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }

      const [facilitiesRes, bookingsRes] = await Promise.all([
        supabase.from('storage_facilities').select('*').eq('is_approved', true).eq('status', 'active').order('created_at', { ascending: false }),
        supabase.from('storage_bookings').select('*, facility:storage_facilities(name, facility_type, location, capacity_unit, price_per_unit)').eq('farmer_id', user.id).order('created_at', { ascending: false }),
      ]);

      setFacilities(facilitiesRes.data || []);
      setBookings(bookingsRes.data || []);
      setLoading(false);
    }
    load();
  }, [router]);

  async function handleBooking(e: React.FormEvent) {
    e.preventDefault();
    if (!bookingFacility) return;
    setBookingError('');
    setBookingLoading(true);

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setBookingError('Not authenticated'); setBookingLoading(false); return; }

    const quantity = parseFloat(bookingForm.quantity);
    if (isNaN(quantity) || quantity <= 0) { setBookingError('Enter a valid quantity.'); setBookingLoading(false); return; }

    const totalFee = calculateStorageFee(
      bookingFacility.price_per_unit,
      quantity,
      bookingForm.storage_start,
      bookingForm.storage_end,
    );

    const { error } = await supabase.from('storage_bookings').insert({
      facility_id: bookingFacility.id,
      farmer_id: user.id,
      produce_name: bookingForm.produce_name.trim(),
      category: bookingForm.category,
      quantity,
      quantity_unit: bookingForm.quantity_unit,
      storage_start: bookingForm.storage_start,
      storage_end: bookingForm.storage_end,
      total_fee: totalFee,
      currency: 'GHS',
      special_notes: bookingForm.special_notes.trim() || null,
      status: 'pending',
    });

    if (error) { setBookingError(error.message); setBookingLoading(false); return; }

    setBookingSuccess(true);
    setBookingLoading(false);

    // Refresh bookings
    const { data: updatedBookings } = await supabase.from('storage_bookings').select('*, facility:storage_facilities(name, facility_type, location, capacity_unit, price_per_unit)').eq('farmer_id', user.id).order('created_at', { ascending: false });
    setBookings(updatedBookings || []);
  }

  async function handleCancelBooking(bookingId: number) {
    const supabase = createClient();
    await supabase.from('storage_bookings').update({ status: 'cancelled' }).eq('id', bookingId);
    setBookings((prev) => prev.map((b) => b.id === bookingId ? { ...b, status: 'cancelled' as const } : b));
  }

  const filteredFacilities = facilities.filter((f) => {
    if (filterType !== 'all' && f.facility_type !== filterType) return false;
    if (filterLocation && !f.location.toLowerCase().includes(filterLocation.toLowerCase())) return false;
    return true;
  });

  const locations = [...new Set(facilities.map((f) => f.location))];

  if (loading) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-48" />
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => <div key={i} className="h-64 bg-gray-200 rounded-2xl" />)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 animate-fade-in">
      <div className="mb-6">
        <Link href="/dashboard/farmer" className="text-sm text-farm-green hover:underline mb-2 inline-block">&larr; Back to Dashboard</Link>
        <h1 className="text-2xl font-bold text-gray-900">Storage & Warehousing</h1>
        <p className="text-gray-500 text-sm mt-1">Browse storage facilities and manage your bookings</p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 mb-6">
        <button onClick={() => setActiveTab('browse')}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition relative ${activeTab === 'browse' ? 'bg-farm-green text-white shadow-md shadow-farm-green/20' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}>
          Browse Facilities
          {facilities.length > 0 && <span className="ml-1.5 text-xs opacity-70">({facilities.length})</span>}
        </button>
        <button onClick={() => setActiveTab('bookings')}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition relative ${activeTab === 'bookings' ? 'bg-farm-green text-white shadow-md shadow-farm-green/20' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}>
          My Bookings
          {bookings.length > 0 && <span className="ml-1.5 text-xs opacity-70">({bookings.length})</span>}
        </button>
      </div>

      {/* ─── BROWSE FACILITIES TAB ─────────────────────────────────────────── */}
      {activeTab === 'browse' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap gap-3">
            <select value={filterType} onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-xl bg-white text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-farm-green/30">
              <option value="all">All Types</option>
              {Object.entries(STORAGE_FACILITY_TYPE_CONFIG).map(([key, cfg]) => (
                <option key={key} value={key}>{cfg.label}</option>
              ))}
            </select>
            <select value={filterLocation} onChange={(e) => setFilterLocation(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-xl bg-white text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-farm-green/30">
              <option value="">All Locations</option>
              {locations.map((loc) => <option key={loc} value={loc}>{loc}</option>)}
            </select>
          </div>

          {filteredFacilities.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 text-center py-16">
              <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}>
                  <path d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3H21" />
                </svg>
              </div>
              <p className="text-gray-500 font-medium">No storage facilities found</p>
              <p className="text-gray-400 text-sm mt-1">Check back later for available facilities in your area.</p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredFacilities.map((facility) => {
                const typeCfg = STORAGE_FACILITY_TYPE_CONFIG[facility.facility_type];
                const occupancyPct = facility.total_capacity > 0
                  ? Math.round(((facility.total_capacity - facility.available_capacity) / facility.total_capacity) * 100)
                  : 0;

                return (
                  <div key={facility.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden card-hover animate-fade-in">
                    {/* Image or gradient header */}
                    <div className="h-36 bg-gradient-to-br from-farm-green/10 to-earth/10 relative">
                      {facility.image_url ? (
                        <Image src={facility.image_url} alt={facility.name} fill className="object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <svg className="w-12 h-12 text-farm-green/30" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}>
                            <path d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3H21" />
                          </svg>
                        </div>
                      )}
                      <div className="absolute top-3 left-3">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${typeCfg.color}`}>
                          {typeCfg.label}
                        </span>
                      </div>
                    </div>

                    <div className="p-4">
                      <h3 className="font-bold text-gray-900 mb-1">{facility.name}</h3>
                      <p className="text-xs text-gray-500 flex items-center gap-1 mb-3">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" /></svg>
                        {facility.location}
                      </p>

                      {facility.description && (
                        <p className="text-xs text-gray-500 mb-3 line-clamp-2">{facility.description}</p>
                      )}

                      {/* Capacity bar */}
                      <div className="mb-3">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="text-gray-500">Capacity</span>
                          <span className="font-medium text-gray-700">{facility.available_capacity.toLocaleString()} / {facility.total_capacity.toLocaleString()} {facility.capacity_unit}</span>
                        </div>
                        <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full transition-all ${occupancyPct > 90 ? 'bg-red-400' : occupancyPct > 70 ? 'bg-amber-400' : 'bg-emerald-400'}`}
                            style={{ width: `${occupancyPct}%` }} />
                        </div>
                      </div>

                      {/* Features */}
                      <div className="flex flex-wrap gap-1.5 mb-3">
                        {facility.has_climate_control && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-blue-50 text-blue-600">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.25 15a4.5 4.5 0 004.5 4.5H18a3.75 3.75 0 001.332-7.257 3 3 0 00-3.758-3.848 5.25 5.25 0 00-10.233 2.33A4.502 4.502 0 002.25 15z" /></svg>
                            Climate
                          </span>
                        )}
                        {facility.has_security && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-emerald-50 text-emerald-600">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" /></svg>
                            Security
                          </span>
                        )}
                        {facility.has_loading_dock && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-amber-50 text-amber-600">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" /></svg>
                            Loading Dock
                          </span>
                        )}
                      </div>

                      {/* Price and booking */}
                      <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                        <div>
                          <p className="text-lg font-bold text-farm-green">{formatCurrency(facility.price_per_unit)}</p>
                          <p className="text-xs text-gray-400">per {facility.capacity_unit} per day</p>
                        </div>
                        <button onClick={() => { setBookingFacility(facility); setBookingSuccess(false); setBookingError(''); }}
                          className="px-4 py-2 bg-farm-green text-white text-sm font-semibold rounded-xl hover:bg-farm-green-light transition shadow-sm active:scale-[0.97]"
                          disabled={facility.available_capacity <= 0}>
                          {facility.available_capacity > 0 ? 'Book Now' : 'Full'}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ─── MY BOOKINGS TAB ───────────────────────────────────────────────── */}
      {activeTab === 'bookings' && (
        <div className="space-y-3">
          {bookings.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 text-center py-16">
              <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}>
                  <path d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5m8.25 3v6.75m0 0l-3-3m3 3l3-3M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
                </svg>
              </div>
              <p className="text-gray-500 font-medium">No bookings yet</p>
              <p className="text-gray-400 text-sm mt-1 mb-4">Browse storage facilities to book space for your produce.</p>
              <button onClick={() => setActiveTab('browse')}
                className="inline-flex px-5 py-2.5 bg-farm-green text-white text-sm font-semibold rounded-xl hover:bg-farm-green-light transition shadow-sm">
                Browse Facilities
              </button>
            </div>
          ) : (
            bookings.map((booking) => {
              const typeCfg = booking.facility ? STORAGE_FACILITY_TYPE_CONFIG[booking.facility.facility_type] : null;
              const isTerminal = ['checked_out', 'cancelled', 'expired'].includes(booking.status);
              const daysLeft = booking.storage_end ? getStorageDaysRemaining(booking.storage_end) : '';

              return (
                <div key={booking.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 card-hover animate-fade-in">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <h4 className="font-bold text-gray-900">{booking.produce_name}</h4>
                        <StatusBadge type="storage_booking" value={booking.status} />
                        {typeCfg && (
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${typeCfg.color}`}>
                            {typeCfg.label}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" /></svg>
                          {booking.facility?.name} — {booking.facility?.location}
                        </span>
                        <span>{booking.quantity.toLocaleString()} {booking.quantity_unit}</span>
                        <span>{booking.storage_start} to {booking.storage_end}</span>
                        <span className="font-semibold text-farm-green">{formatCurrency(booking.total_fee)}</span>
                      </div>
                      {!isTerminal && daysLeft && (
                        <p className="text-xs text-amber-600 mt-1.5 font-medium">{daysLeft}</p>
                      )}
                    </div>
                    {!isTerminal && booking.status !== 'cancelled' && (
                      <button onClick={() => handleCancelBooking(booking.id)}
                        className="px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition shrink-0">
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ─── BOOKING MODAL ─────────────────────────────────────────────────── */}
      {bookingFacility && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40 animate-fade-in" onClick={() => setBookingFacility(null)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto animate-fade-in-up">
              <div className="p-6">
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">Book Storage Space</h3>
                    <p className="text-sm text-gray-500">{bookingFacility.name}</p>
                  </div>
                  <button onClick={() => setBookingFacility(null)} className="p-2 hover:bg-gray-100 rounded-lg transition">
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>

                {bookingSuccess ? (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}>
                        <path d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <h4 className="text-lg font-bold text-gray-900 mb-2">Booking Submitted</h4>
                    <p className="text-sm text-gray-500 mb-4">Your booking request has been sent. The admin will review and confirm it.</p>
                    <button onClick={() => { setBookingFacility(null); setActiveTab('bookings'); }}
                      className="px-6 py-2.5 bg-farm-green text-white text-sm font-semibold rounded-xl hover:bg-farm-green-light transition">
                      View My Bookings
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleBooking} className="space-y-4">
                    {bookingError && (
                      <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl">{bookingError}</div>
                    )}

                    {/* Facility info */}
                    <div className="p-3 bg-gray-50 rounded-xl">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">Rate</span>
                        <span className="font-semibold text-gray-900">{formatCurrency(bookingFacility.price_per_unit)} / {bookingFacility.capacity_unit} / day</span>
                      </div>
                      <div className="flex items-center justify-between text-sm mt-1">
                        <span className="text-gray-500">Available</span>
                        <span className="font-semibold text-gray-900">{bookingFacility.available_capacity.toLocaleString()} {bookingFacility.capacity_unit}</span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5">Produce Name</label>
                      <input type="text" value={bookingForm.produce_name} onChange={(e) => setBookingForm({ ...bookingForm, produce_name: e.target.value })}
                        placeholder="e.g. Tomatoes, Maize, Cassava" required
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl bg-white text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-farm-green/30 focus:border-farm-green" />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">Category</label>
                        <select value={bookingForm.category} onChange={(e) => setBookingForm({ ...bookingForm, category: e.target.value })}
                          className="w-full px-4 py-2.5 border border-gray-200 rounded-xl bg-white text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-farm-green/30">
                          <option>Crops & Grains</option>
                          <option>Livestock</option>
                          <option>Poultry</option>
                          <option>Aquaculture</option>
                          <option>Other</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">Unit</label>
                        <select value={bookingForm.quantity_unit} onChange={(e) => setBookingForm({ ...bookingForm, quantity_unit: e.target.value })}
                          className="w-full px-4 py-2.5 border border-gray-200 rounded-xl bg-white text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-farm-green/30">
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
                      <input type="number" value={bookingForm.quantity} onChange={(e) => setBookingForm({ ...bookingForm, quantity: e.target.value })}
                        placeholder={`Amount in ${bookingForm.quantity_unit}`} required min="0.01" step="0.01"
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl bg-white text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-farm-green/30 focus:border-farm-green" />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">Start Date</label>
                        <input type="date" value={bookingForm.storage_start} onChange={(e) => setBookingForm({ ...bookingForm, storage_start: e.target.value })}
                          required min={new Date().toISOString().split('T')[0]}
                          className="w-full px-4 py-2.5 border border-gray-200 rounded-xl bg-white text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-farm-green/30 focus:border-farm-green" />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">End Date</label>
                        <input type="date" value={bookingForm.storage_end} onChange={(e) => setBookingForm({ ...bookingForm, storage_end: e.target.value })}
                          required min={bookingForm.storage_start || new Date().toISOString().split('T')[0]}
                          className="w-full px-4 py-2.5 border border-gray-200 rounded-xl bg-white text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-farm-green/30 focus:border-farm-green" />
                      </div>
                    </div>

                    {/* Fee estimate */}
                    {bookingForm.quantity && bookingForm.storage_start && bookingForm.storage_end && (
                      <div className="p-3 bg-farm-green/5 rounded-xl border border-farm-green/20">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600">Estimated Total</span>
                          <span className="font-bold text-farm-green text-lg">
                            {formatCurrency(
                              calculateStorageFee(
                                bookingFacility.price_per_unit,
                                parseFloat(bookingForm.quantity) || 0,
                                bookingForm.storage_start,
                                bookingForm.storage_end,
                              )
                            )}
                          </span>
                        </div>
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5">Special Notes (optional)</label>
                      <textarea value={bookingForm.special_notes} onChange={(e) => setBookingForm({ ...bookingForm, special_notes: e.target.value })}
                        rows={2} placeholder="Any special storage requirements..."
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl bg-white text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-farm-green/30 focus:border-farm-green resize-none" />
                    </div>

                    <button type="submit" disabled={bookingLoading}
                      className="w-full py-3 bg-farm-green text-white font-semibold rounded-xl hover:bg-farm-green-light active:scale-[0.98] transition-all disabled:opacity-60 shadow-md flex items-center justify-center gap-2">
                      {bookingLoading ? (
                        <>
                          <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Submitting...
                        </>
                      ) : (
                        'Submit Booking Request'
                      )}
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
