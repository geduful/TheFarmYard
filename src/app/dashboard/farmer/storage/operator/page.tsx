'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import type { StorageFacility, StorageBooking } from '@/lib/types';
import { STORAGE_FACILITY_TYPE_CONFIG } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';
import StatusBadge from '@/components/ui/StatusBadge';

export default function StorageOperatorDashboardPage() {
  const router = useRouter();
  const [facilities, setFacilities] = useState<StorageFacility[]>([]);
  const [bookings, setBookings] = useState<StorageBooking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (cancelled) return;
      if (!user) { router.push('/login'); return; }

      const [facilitiesRes, bookingsRes] = await Promise.all([
        supabase
          .from('storage_facilities')
          .select('*')
          .eq('owner_id', user.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('storage_bookings')
          .select('*, facility:storage_facilities!storage_bookings_facility_id_fkey(id, name, facility_type, location, capacity_unit, price_per_unit)')
          .in('facility_id', (
            await supabase
              .from('storage_facilities')
              .select('id')
              .eq('owner_id', user.id)
          ).data?.map((f) => f.id) || [])
          .order('created_at', { ascending: false }),
      ]);

      if (cancelled) return;
      setFacilities(facilitiesRes.data || []);
      setBookings(bookingsRes.data || []);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [router]);

  const totalCapacity = facilities.reduce((sum, f) => sum + (f.total_capacity || 0), 0);
  const occupiedCapacity = facilities.reduce(
    (sum, f) => sum + ((f.total_capacity || 0) - (f.available_capacity || 0)),
    0,
  );
  const availableCapacity = facilities.reduce((sum, f) => sum + (f.available_capacity || 0), 0);
  const activeBookings = bookings.filter(
    (b) => ['confirmed', 'checked_in', 'stored'].includes(b.status),
  ).length;
  const pendingBookings = bookings.filter((b) => b.status === 'pending').length;

  if (loading) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-64" />
          <div className="h-4 bg-gray-200 rounded w-96" />
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-48 bg-gray-200 rounded-2xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <Link href="/dashboard/farmer" className="text-sm text-farm-green hover:underline mb-2 inline-block">
            &larr; Back to Dashboard
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Storage Operator Dashboard</h1>
          <p className="text-gray-500 text-sm mt-1">Manage your storage facilities and bookings</p>
        </div>
        <Link
          href="/dashboard/farmer/storage/operator/new"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-farm-green text-white text-sm font-semibold rounded-xl hover:bg-farm-green-light transition shadow-sm active:scale-[0.97]"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}>
            <path d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Add Facility
        </Link>
      </div>

      {/* ─── OVERVIEW CARDS ─────────────────────────────────────────────── */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-gray-500">Total Facilities</p>
            <div className="w-10 h-10 rounded-xl bg-farm-green/10 flex items-center justify-center">
              <svg className="w-5 h-5 text-farm-green" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}>
                <path d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3H21" />
              </svg>
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900">{facilities.length}</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-gray-500">Total Capacity</p>
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}>
                <path d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375" />
              </svg>
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900">{totalCapacity.toLocaleString()}</p>
          <p className="text-xs text-gray-400 mt-0.5">across all units</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-gray-500">Occupied Capacity</p>
            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
              <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}>
                <path d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
              </svg>
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900">{occupiedCapacity.toLocaleString()}</p>
          {totalCapacity > 0 && (
            <div className="mt-2">
              <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    (occupiedCapacity / totalCapacity) > 0.9
                      ? 'bg-red-400'
                      : (occupiedCapacity / totalCapacity) > 0.7
                        ? 'bg-amber-400'
                        : 'bg-emerald-400'
                  }`}
                  style={{ width: `${Math.round((occupiedCapacity / totalCapacity) * 100)}%` }}
                />
              </div>
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-gray-500">Available Capacity</p>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
              <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}>
                <path d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900">{availableCapacity.toLocaleString()}</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-gray-500">Active Bookings</p>
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}>
                <path d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
              </svg>
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900">{activeBookings}</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-gray-500">Pending Bookings</p>
            <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center">
              <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}>
                <path d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900">{pendingBookings}</p>
        </div>
      </div>

      {/* ─── FACILITIES LIST ────────────────────────────────────────────── */}
      <div className="mb-4">
        <h2 className="text-lg font-bold text-gray-900">Your Facilities</h2>
      </div>

      {facilities.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 text-center py-16">
          <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}>
              <path d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3H21" />
            </svg>
          </div>
          <p className="text-gray-500 font-medium">No facilities yet</p>
          <p className="text-gray-400 text-sm mt-1 mb-4">
            Create your first storage facility to start accepting bookings.
          </p>
          <Link
            href="/dashboard/farmer/storage/operator/new"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-farm-green text-white text-sm font-semibold rounded-xl hover:bg-farm-green-light transition shadow-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}>
              <path d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Add Facility
          </Link>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {facilities.map((facility) => {
            const typeCfg = STORAGE_FACILITY_TYPE_CONFIG[facility.facility_type];
            const occupancyPct =
              facility.total_capacity > 0
                ? Math.round(
                    ((facility.total_capacity - facility.available_capacity) / facility.total_capacity) * 100,
                  )
                : 0;
            const facilityBookings = bookings.filter((b) => b.facility_id === facility.id);
            const facilityActiveCount = facilityBookings.filter((b) =>
              ['confirmed', 'checked_in', 'stored'].includes(b.status),
            ).length;

            return (
              <div
                key={facility.id}
                className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden card-hover animate-fade-in"
              >
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
                  <div className="absolute top-3 right-3">
                    <StatusBadge type="storage_facility" value={facility.status} />
                  </div>
                </div>

                <div className="p-4">
                  <h3 className="font-bold text-gray-900 mb-1">{facility.name}</h3>
                  <p className="text-xs text-gray-500 flex items-center gap-1 mb-3">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                    </svg>
                    {facility.location}
                  </p>

                  <div className="mb-3">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-gray-500">Capacity</span>
                      <span className="font-medium text-gray-700">
                        {facility.available_capacity.toLocaleString()} / {facility.total_capacity.toLocaleString()}{' '}
                        {facility.capacity_unit}
                      </span>
                    </div>
                    <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          occupancyPct > 90
                            ? 'bg-red-400'
                            : occupancyPct > 70
                              ? 'bg-amber-400'
                              : 'bg-emerald-400'
                        }`}
                        style={{ width: `${occupancyPct}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
                    <span>{facilityBookings.length} total booking{facilityBookings.length !== 1 ? 's' : ''}</span>
                    {facilityActiveCount > 0 && (
                      <span className="text-farm-green font-medium">{facilityActiveCount} active</span>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                    <p className="text-sm font-semibold text-gray-900">
                      {formatCurrency(facility.price_per_unit)}
                      <span className="text-xs font-normal text-gray-400"> /{facility.capacity_unit}/day</span>
                    </p>
                    <Link
                      href={`/dashboard/farmer/storage/operator/${facility.id}`}
                      className="px-4 py-2 bg-farm-green text-white text-sm font-semibold rounded-xl hover:bg-farm-green-light transition shadow-sm active:scale-[0.97]"
                    >
                      Manage
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
