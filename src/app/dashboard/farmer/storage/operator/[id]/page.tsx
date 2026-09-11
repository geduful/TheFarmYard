'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import type { StorageFacility, StorageBooking, StorageInventory, StorageFacilityType, StorageFacilityStatus, StorageBookingStatus } from '@/lib/types';
import { STORAGE_FACILITY_TYPE_CONFIG, STORAGE_BOOKING_STATUS_CONFIG } from '@/lib/types';
import {
  formatCurrency,
  isStorageBookingTerminal,
  getStorageDaysRemaining,
  formatStorageTimestamp,
} from '@/lib/utils';
import StatusBadge from '@/components/ui/StatusBadge';

const FACILITY_TYPES: StorageFacilityType[] = [
  'cold_storage', 'dry_storage', 'refrigerated', 'open_air',
  'silo', 'grain_storage', 'produce_warehouse', 'livestock_storage', 'other',
];

const FACILITY_STATUSES: StorageFacilityStatus[] = ['active', 'inactive', 'maintenance'];

type Tab = 'overview' | 'bookings' | 'inventory' | 'edit';

export default function FacilityManagePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = React.use(params);
  const router = useRouter();
  const [facility, setFacility] = useState<StorageFacility | null>(null);
  const [bookings, setBookings] = useState<StorageBooking[]>([]);
  const [inventory, setInventory] = useState<StorageInventory[]>([]);
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('overview');

  // ─── Booking action state ─────────────────────────────────────────────
  const [bookingActionLoading, setBookingActionLoading] = useState<number | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState<number | null>(null);

  // ─── Inventory form state ─────────────────────────────────────────────
  const [invBookingId, setInvBookingId] = useState('');
  const [invProduceName, setInvProduceName] = useState('');
  const [invQuantity, setInvQuantity] = useState('');
  const [invUnit, setInvUnit] = useState('kg');
  const [invCondition, setInvCondition] = useState<string>('good');
  const [invStorageLocation, setInvStorageLocation] = useState('');
  const [invNotes, setInvNotes] = useState('');
  const [invLoading, setInvLoading] = useState(false);
  const [invError, setInvError] = useState('');

  // ─── Edit form state ──────────────────────────────────────────────────
  const [editName, setEditName] = useState('');
  const [editType, setEditType] = useState<StorageFacilityType>('dry_storage');
  const [editLocation, setEditLocation] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editCapacityUnit, setEditCapacityUnit] = useState('kg');
  const [editTotalCapacity, setEditTotalCapacity] = useState('');
  const [editPricePerUnit, setEditPricePerUnit] = useState('');
  const [editCurrency, setEditCurrency] = useState('GHS');
  const [editContactName, setEditContactName] = useState('');
  const [editContactPhone, setEditContactPhone] = useState('');
  const [editContactEmail, setEditContactEmail] = useState('');
  const [editClimate, setEditClimate] = useState(false);
  const [editSecurity, setEditSecurity] = useState(false);
  const [editLoadingDock, setEditLoadingDock] = useState(false);
  const [editStatus, setEditStatus] = useState<StorageFacilityStatus>('active');
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState('');
  const [editSuccess, setEditSuccess] = useState(false);

  // ─── Data loading ─────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (cancelled) return;
      if (!user) { router.push('/login'); return; }

      const { data: fac } = await supabase
        .from('storage_facilities')
        .select('*')
        .eq('id', id)
        .single();

      if (cancelled) return;
      if (!fac || fac.owner_id !== user.id) {
        setLoading(false);
        return;
      }

      setAuthorized(true);
      setFacility(fac);

      const [bookingsRes, inventoryRes] = await Promise.all([
        supabase
          .from('storage_bookings')
          .select('*, facility:storage_facilities!storage_bookings_facility_id_fkey(id, name, facility_type, location, capacity_unit, price_per_unit), farmer:profiles!storage_bookings_farmer_id_fkey(full_name, phone_number)')
          .eq('facility_id', fac.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('storage_inventory')
          .select('*, booking:storage_bookings(produce_name, quantity, quantity_unit, storage_start, storage_end), farmer:profiles(full_name)')
          .eq('facility_id', fac.id)
          .order('created_at', { ascending: false }),
      ]);

      if (cancelled) return;
      setBookings(bookingsRes.data || []);
      setInventory(inventoryRes.data || []);

      // Populate edit form
      setEditName(fac.name);
      setEditType(fac.facility_type);
      setEditLocation(fac.location);
      setEditAddress(fac.address || '');
      setEditDescription(fac.description || '');
      setEditCapacityUnit(fac.capacity_unit);
      setEditTotalCapacity(String(fac.total_capacity));
      setEditPricePerUnit(String(fac.price_per_unit));
      setEditCurrency(fac.currency || 'GHS');
      setEditContactName(fac.contact_name || '');
      setEditContactPhone(fac.contact_phone || '');
      setEditContactEmail(fac.contact_email || '');
      setEditClimate(fac.has_climate_control);
      setEditSecurity(fac.has_security);
      setEditLoadingDock(fac.has_loading_dock);
      setEditStatus(fac.status);

      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [id, router]);

  // ─── Booking actions ──────────────────────────────────────────────────
  async function handleBookingAction(bookingId: number, newStatus: StorageBookingStatus) {
    setBookingActionLoading(bookingId);
    try {
      const res = await fetch('/api/storage-bookings/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingId,
          status: newStatus,
          rejection_reason: newStatus === 'cancelled' ? rejectionReason.trim() || undefined : undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        alert(data.error || 'Failed to update booking.');
        return;
      }

      setBookings((prev) =>
        prev.map((b) =>
          b.id === bookingId
            ? { ...b, status: newStatus, rejection_reason: newStatus === 'cancelled' ? rejectionReason.trim() || null : b.rejection_reason }
            : b,
        ),
      );
      setShowRejectModal(null);
      setRejectionReason('');
    } catch {
      alert('An unexpected error occurred.');
    } finally {
      setBookingActionLoading(null);
    }
  }

  function getNextStatus(current: StorageBookingStatus): StorageBookingStatus | null {
    const flow: StorageBookingStatus[] = ['pending', 'confirmed', 'checked_in', 'stored', 'checked_out'];
    const idx = flow.indexOf(current);
    if (idx >= 0 && idx < flow.length - 1) return flow[idx + 1];
    return null;
  }

  // ─── Inventory submission ─────────────────────────────────────────────
  async function handleAddInventory(e: React.FormEvent) {
    e.preventDefault();
    setInvError('');
    if (!invBookingId || !invProduceName.trim() || !invQuantity) {
      setInvError('Booking, produce name, and quantity are required.');
      return;
    }
    const qty = parseFloat(invQuantity);
    if (!Number.isFinite(qty) || qty <= 0) {
      setInvError('Enter a valid quantity.');
      return;
    }

    setInvLoading(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setInvError('Not authenticated.'); setInvLoading(false); return; }

    const { error } = await supabase.from('storage_inventory').insert({
      booking_id: parseInt(invBookingId, 10),
      facility_id: facility!.id,
      farmer_id: user.id,
      produce_name: invProduceName.trim(),
      quantity: qty,
      quantity_unit: invUnit,
      condition: invCondition,
      storage_location: invStorageLocation.trim() || null,
      notes: invNotes.trim() || null,
      checked_in_at: new Date().toISOString(),
    });

    if (error) { setInvError(error.message); setInvLoading(false); return; }

    // Refresh inventory
    const { data: updated } = await supabase
      .from('storage_inventory')
      .select('*, booking:storage_bookings(produce_name, quantity, quantity_unit, storage_start, storage_end), farmer:profiles(full_name)')
      .eq('facility_id', facility!.id)
      .order('created_at', { ascending: false });

    setInventory(updated || []);
    setInvBookingId('');
    setInvProduceName('');
    setInvQuantity('');
    setInvUnit('kg');
    setInvCondition('good');
    setInvStorageLocation('');
    setInvNotes('');
    setInvLoading(false);
  }

  // ─── Edit form submission ─────────────────────────────────────────────
  async function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    setEditError('');
    setEditSuccess(false);

    const totalCap = parseFloat(editTotalCapacity);
    const price = parseFloat(editPricePerUnit);
    if (!editName.trim()) { setEditError('Facility name is required.'); return; }
    if (!editLocation.trim()) { setEditError('Location is required.'); return; }
    if (!Number.isFinite(totalCap) || totalCap <= 0) { setEditError('Total capacity must be greater than zero.'); return; }
    if (!Number.isFinite(price) || price <= 0) { setEditError('Price per unit must be greater than zero.'); return; }

    setEditLoading(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setEditError('Not authenticated.'); setEditLoading(false); return; }

    const { error } = await supabase
      .from('storage_facilities')
      .update({
        name: editName.trim(),
        facility_type: editType,
        location: editLocation.trim(),
        address: editAddress.trim() || null,
        description: editDescription.trim() || null,
        capacity_unit: editCapacityUnit,
        total_capacity: totalCap,
        available_capacity: Math.min(facility!.available_capacity, totalCap),
        price_per_unit: price,
        currency: editCurrency,
        contact_name: editContactName.trim() || null,
        contact_phone: editContactPhone.trim() || null,
        contact_email: editContactEmail.trim() || null,
        has_climate_control: editClimate,
        has_security: editSecurity,
        has_loading_dock: editLoadingDock,
        status: editStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', facility!.id)
      .eq('owner_id', user.id);

    if (error) { setEditError(error.message); setEditLoading(false); return; }

    setFacility((prev) =>
      prev
        ? {
            ...prev,
            name: editName.trim(),
            facility_type: editType,
            location: editLocation.trim(),
            address: editAddress.trim() || null,
            description: editDescription.trim() || null,
            capacity_unit: editCapacityUnit,
            total_capacity: totalCap,
            price_per_unit: price,
            currency: editCurrency,
            contact_name: editContactName.trim() || null,
            contact_phone: editContactPhone.trim() || null,
            contact_email: editContactEmail.trim() || null,
            has_climate_control: editClimate,
            has_security: editSecurity,
            has_loading_dock: editLoadingDock,
            status: editStatus,
            updated_at: new Date().toISOString(),
          }
        : null,
    );
    setEditLoading(false);
    setEditSuccess(true);
  }

  // ─── Loading state ────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-48" />
          <div className="h-4 bg-gray-200 rounded w-96" />
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-40 bg-gray-200 rounded-2xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!authorized || !facility) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        Facility not found or you are not authorized.
      </div>
    );
  }

  const typeCfg = STORAGE_FACILITY_TYPE_CONFIG[facility.facility_type];
  const occupancyPct =
    facility.total_capacity > 0
      ? Math.round(
          ((facility.total_capacity - facility.available_capacity) / facility.total_capacity) * 100,
        )
      : 0;
  const activeBookings = bookings.filter((b) =>
    ['confirmed', 'checked_in', 'stored'].includes(b.status),
  );
  const pendingBookings = bookings.filter((b) => b.status === 'pending');
  const totalRevenue = bookings
    .filter((b) => ['confirmed', 'checked_in', 'stored', 'checked_out'].includes(b.status))
    .reduce((sum, b) => sum + (b.total_fee || 0), 0);

  return (
    <div className="p-4 sm:p-6 lg:p-8 animate-fade-in">
      {/* ─── HEADER ────────────────────────────────────────────────────── */}
      <div className="mb-6">
        <Link
          href="/dashboard/farmer/storage/operator"
          className="text-sm text-farm-green hover:underline mb-2 inline-block"
        >
          &larr; Back to Operator Dashboard
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold text-gray-900">{facility.name}</h1>
              <StatusBadge type="storage_facility" value={facility.status} />
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${typeCfg.color}`}>
                {typeCfg.label}
              </span>
            </div>
            <p className="text-sm text-gray-500 mt-1 flex items-center gap-1">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
              </svg>
              {facility.location}
            </p>
          </div>
        </div>
      </div>

      {/* ─── TABS ──────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-1">
        {(['overview', 'bookings', 'inventory', 'edit'] as Tab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition whitespace-nowrap ${
              activeTab === tab
                ? 'bg-farm-green text-white shadow-md shadow-farm-green/20'
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
            {tab === 'bookings' && bookings.length > 0 && (
              <span className="ml-1.5 text-xs opacity-70">({bookings.length})</span>
            )}
            {tab === 'inventory' && inventory.length > 0 && (
              <span className="ml-1.5 text-xs opacity-70">({inventory.length})</span>
            )}
          </button>
        ))}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* TAB: OVERVIEW                                                     */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Stats row */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <p className="text-sm text-gray-500 mb-1">Total Capacity</p>
              <p className="text-xl font-bold text-gray-900">
                {facility.total_capacity.toLocaleString()} {facility.capacity_unit}
              </p>
            </div>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <p className="text-sm text-gray-500 mb-1">Available</p>
              <p className="text-xl font-bold text-farm-green">
                {facility.available_capacity.toLocaleString()} {facility.capacity_unit}
              </p>
            </div>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <p className="text-sm text-gray-500 mb-1">Rate</p>
              <p className="text-xl font-bold text-gray-900">
                {formatCurrency(facility.price_per_unit)}<span className="text-sm font-normal text-gray-400"> /{facility.capacity_unit}/day</span>
              </p>
            </div>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <p className="text-sm text-gray-500 mb-1">Est. Revenue</p>
              <p className="text-xl font-bold text-gray-900">{formatCurrency(totalRevenue)}</p>
              <p className="text-xs text-gray-400 mt-0.5">from {bookings.length} booking{bookings.length !== 1 ? 's' : ''}</p>
            </div>
          </div>

          {/* Capacity bar */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-gray-900">Capacity Utilization</h3>
              <span className="text-sm font-medium text-gray-700">{occupancyPct}%</span>
            </div>
            <div className="w-full h-4 bg-gray-100 rounded-full overflow-hidden">
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
            <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
              <span>{facility.available_capacity.toLocaleString()} available</span>
              <span>{(facility.total_capacity - facility.available_capacity).toLocaleString()} occupied</span>
            </div>
          </div>

          {/* Features */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <h3 className="font-bold text-gray-900 mb-3">Features</h3>
            <div className="flex flex-wrap gap-2">
              {facility.has_climate_control && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-50 text-blue-600">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.25 15a4.5 4.5 0 004.5 4.5H18a3.75 3.75 0 001.332-7.257 3 3 0 00-3.758-3.848 5.25 5.25 0 00-10.233 2.33A4.502 4.502 0 002.25 15z" />
                  </svg>
                  Climate Control
                </span>
              )}
              {facility.has_security && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-50 text-emerald-600">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                  </svg>
                  Security
                </span>
              )}
              {facility.has_loading_dock && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-amber-50 text-amber-600">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
                  </svg>
                  Loading Dock
                </span>
              )}
              {!facility.has_climate_control && !facility.has_security && !facility.has_loading_dock && (
                <span className="text-sm text-gray-400">No special features enabled</span>
              )}
            </div>
          </div>

          {/* Quick actions */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <h3 className="font-bold text-gray-900 mb-3">Quick Actions</h3>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => setActiveTab('bookings')}
                className="inline-flex items-center gap-2 px-4 py-2 bg-farm-green text-white text-sm font-semibold rounded-xl hover:bg-farm-green-light transition"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}>
                  <path d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                </svg>
                View Bookings
                {pendingBookings.length > 0 && (
                  <span className="px-1.5 py-0.5 bg-white/20 rounded-full text-xs">{pendingBookings.length}</span>
                )}
              </button>
              <button
                onClick={() => setActiveTab('inventory')}
                className="inline-flex items-center gap-2 px-4 py-2 bg-white text-gray-700 text-sm font-semibold rounded-xl border border-gray-200 hover:bg-gray-50 transition"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}>
                  <path d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
                </svg>
                Manage Inventory
              </button>
              <button
                onClick={() => setActiveTab('edit')}
                className="inline-flex items-center gap-2 px-4 py-2 bg-white text-gray-700 text-sm font-semibold rounded-xl border border-gray-200 hover:bg-gray-50 transition"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}>
                  <path d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                </svg>
                Edit Facility
              </button>
            </div>
          </div>

          {/* Description */}
          {facility.description && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <h3 className="font-bold text-gray-900 mb-2">Description</h3>
              <p className="text-sm text-gray-600 leading-relaxed">{facility.description}</p>
            </div>
          )}

          {/* Contact info */}
          {(facility.contact_name || facility.contact_phone || facility.contact_email) && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <h3 className="font-bold text-gray-900 mb-3">Contact Information</h3>
              <div className="space-y-2 text-sm">
                {facility.contact_name && (
                  <p className="text-gray-700"><span className="text-gray-500">Name:</span> {facility.contact_name}</p>
                )}
                {facility.contact_phone && (
                  <p className="text-gray-700"><span className="text-gray-500">Phone:</span> {facility.contact_phone}</p>
                )}
                {facility.contact_email && (
                  <p className="text-gray-700"><span className="text-gray-500">Email:</span> {facility.contact_email}</p>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* TAB: BOOKINGS                                                     */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
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
              <p className="text-gray-400 text-sm mt-1">Bookings will appear here when farmers reserve space.</p>
            </div>
          ) : (
            bookings.map((booking) => {
              const isTerminal = isStorageBookingTerminal(booking.status);
              const nextStatus = getNextStatus(booking.status);
              const canAdvance = nextStatus && !isTerminal;
              const daysLeft = booking.storage_end ? getStorageDaysRemaining(booking.storage_end) : '';

              return (
                <div key={booking.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 card-hover animate-fade-in">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <h4 className="font-bold text-gray-900">{booking.produce_name}</h4>
                        <StatusBadge type="storage_booking" value={booking.status} />
                        {booking.farmer?.full_name && (
                          <span className="text-xs text-gray-500">by {booking.farmer.full_name}</span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500">
                        <span>{booking.quantity.toLocaleString()} {booking.quantity_unit}</span>
                        <span>{booking.storage_start} to {booking.storage_end}</span>
                        <span className="font-semibold text-farm-green">{formatCurrency(booking.total_fee)}</span>
                      </div>
                      {booking.farmer?.phone_number && (
                        <p className="text-xs text-gray-400 mt-1">Contact: {booking.farmer.phone_number}</p>
                      )}
                      {!isTerminal && daysLeft && (
                        <p className="text-xs text-amber-600 mt-1.5 font-medium">{daysLeft}</p>
                      )}
                      {booking.special_notes && (
                        <p className="text-xs text-gray-400 mt-1 italic">&quot;{booking.special_notes}&quot;</p>
                      )}
                    </div>

                    {/* Action buttons */}
                    {!isTerminal && (
                      <div className="flex items-center gap-2 shrink-0 flex-wrap">
                        {booking.status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleBookingAction(booking.id, 'confirmed')}
                              disabled={bookingActionLoading === booking.id}
                              className="px-3 py-1.5 text-xs font-medium text-white bg-farm-green rounded-lg hover:bg-farm-green-light transition disabled:opacity-50"
                            >
                              {bookingActionLoading === booking.id ? 'Processing...' : 'Confirm'}
                            </button>
                            <button
                              onClick={() => setShowRejectModal(booking.id)}
                              disabled={bookingActionLoading === booking.id}
                              className="px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition disabled:opacity-50"
                            >
                              Reject
                            </button>
                          </>
                        )}
                        {canAdvance && (
                          <button
                            onClick={() => handleBookingAction(booking.id, nextStatus!)}
                            disabled={bookingActionLoading === booking.id}
                            className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                          >
                            {bookingActionLoading === booking.id
                              ? 'Processing...'
                              : STORAGE_BOOKING_STATUS_CONFIG[nextStatus!].label}
                          </button>
                        )}
                        {booking.status !== 'pending' && (
                          <button
                            onClick={() => setShowRejectModal(booking.id)}
                            disabled={bookingActionLoading === booking.id}
                            className="px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition disabled:opacity-50"
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* TAB: INVENTORY                                                    */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {activeTab === 'inventory' && (
        <div className="space-y-6">
          {/* Add inventory form */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <h3 className="font-bold text-gray-900 mb-4">Add Inventory Item</h3>
            <form onSubmit={handleAddInventory} className="space-y-4">
              {invError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl">{invError}</div>
              )}
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Booking</label>
                  <select
                    value={invBookingId}
                    onChange={(e) => setInvBookingId(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl bg-white text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-farm-green/30"
                  >
                    <option value="">Select a booking...</option>
                    {bookings
                      .filter((b) => ['checked_in', 'stored'].includes(b.status))
                      .map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.produce_name} - {b.quantity} {b.quantity_unit} ({STORAGE_BOOKING_STATUS_CONFIG[b.status].label})
                        </option>
                      ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Produce Name</label>
                  <input
                    type="text"
                    value={invProduceName}
                    onChange={(e) => setInvProduceName(e.target.value)}
                    placeholder="e.g. Maize, Tomatoes"
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl bg-white text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-farm-green/30 focus:border-farm-green"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Quantity</label>
                  <input
                    type="number"
                    value={invQuantity}
                    onChange={(e) => setInvQuantity(e.target.value)}
                    placeholder="0.00"
                    min="0.01"
                    step="0.01"
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl bg-white text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-farm-green/30 focus:border-farm-green"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Unit</label>
                  <select
                    value={invUnit}
                    onChange={(e) => setInvUnit(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl bg-white text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-farm-green/30"
                  >
                    <option value="kg">Kilograms (kg)</option>
                    <option value="tonne">Tonnes</option>
                    <option value="bag">Bags</option>
                    <option value="crate">Crates</option>
                    <option value="box">Boxes</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Condition</label>
                  <select
                    value={invCondition}
                    onChange={(e) => setInvCondition(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl bg-white text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-farm-green/30"
                  >
                    <option value="excellent">Excellent</option>
                    <option value="good">Good</option>
                    <option value="fair">Fair</option>
                    <option value="poor">Poor</option>
                    <option value="damaged">Damaged</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Storage Location (optional)</label>
                  <input
                    type="text"
                    value={invStorageLocation}
                    onChange={(e) => setInvStorageLocation(e.target.value)}
                    placeholder="e.g. Aisle 3, Shelf B"
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl bg-white text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-farm-green/30 focus:border-farm-green"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Notes (optional)</label>
                <textarea
                  value={invNotes}
                  onChange={(e) => setInvNotes(e.target.value)}
                  rows={2}
                  placeholder="Additional notes about this item..."
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl bg-white text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-farm-green/30 focus:border-farm-green resize-none"
                />
              </div>
              <button
                type="submit"
                disabled={invLoading}
                className="px-5 py-2.5 bg-farm-green text-white text-sm font-semibold rounded-xl hover:bg-farm-green-light active:scale-[0.98] transition-all disabled:opacity-60 shadow-sm flex items-center gap-2"
              >
                {invLoading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Adding...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}>
                      <path d="M12 4.5v15m7.5-7.5h-15" />
                    </svg>
                    Add Item
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Inventory list */}
          {inventory.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 text-center py-12">
              <p className="text-gray-500 font-medium">No inventory items yet</p>
              <p className="text-gray-400 text-sm mt-1">Add items to track what&apos;s stored in this facility.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {inventory.map((item) => (
                <div key={item.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 card-hover animate-fade-in">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h4 className="font-bold text-gray-900">{item.produce_name}</h4>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                          {item.condition}
                        </span>
                        {item.farmer?.full_name && (
                          <span className="text-xs text-gray-500">by {item.farmer.full_name}</span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500">
                        <span>{item.quantity.toLocaleString()} {item.quantity_unit}</span>
                        {item.storage_location && <span>Location: {item.storage_location}</span>}
                        <span>Checked in: {formatStorageTimestamp(item.checked_in_at)}</span>
                      </div>
                      {item.notes && (
                        <p className="text-xs text-gray-400 mt-1 italic">{item.notes}</p>
                      )}
                    </div>
                    {item.checked_out_at && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 shrink-0">
                        Checked Out
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* TAB: EDIT                                                         */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {activeTab === 'edit' && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <h3 className="font-bold text-gray-900 mb-4">Edit Facility Details</h3>
          <form onSubmit={handleEditSubmit} className="space-y-5">
            {editError && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl">{editError}</div>
            )}
            {editSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm rounded-xl">
                Facility updated successfully.
              </div>
            )}

            {/* Basic info */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Facility Name *</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl bg-white text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-farm-green/30 focus:border-farm-green"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Facility Type</label>
                <select
                  value={editType}
                  onChange={(e) => setEditType(e.target.value as StorageFacilityType)}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl bg-white text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-farm-green/30"
                >
                  {FACILITY_TYPES.map((t) => (
                    <option key={t} value={t}>{STORAGE_FACILITY_TYPE_CONFIG[t].label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Location *</label>
                <input
                  type="text"
                  value={editLocation}
                  onChange={(e) => setEditLocation(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl bg-white text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-farm-green/30 focus:border-farm-green"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Address</label>
                <input
                  type="text"
                  value={editAddress}
                  onChange={(e) => setEditAddress(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl bg-white text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-farm-green/30 focus:border-farm-green"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Description</label>
              <textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                rows={3}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl bg-white text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-farm-green/30 focus:border-farm-green resize-none"
              />
            </div>

            {/* Capacity & pricing */}
            <div className="grid sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Capacity Unit</label>
                <input
                  type="text"
                  value={editCapacityUnit}
                  onChange={(e) => setEditCapacityUnit(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl bg-white text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-farm-green/30 focus:border-farm-green"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Total Capacity *</label>
                <input
                  type="number"
                  value={editTotalCapacity}
                  onChange={(e) => setEditTotalCapacity(e.target.value)}
                  min="1"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl bg-white text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-farm-green/30 focus:border-farm-green"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Price Per Unit *</label>
                <input
                  type="number"
                  value={editPricePerUnit}
                  onChange={(e) => setEditPricePerUnit(e.target.value)}
                  min="0.01"
                  step="0.01"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl bg-white text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-farm-green/30 focus:border-farm-green"
                />
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Currency</label>
                <input
                  type="text"
                  value={editCurrency}
                  onChange={(e) => setEditCurrency(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl bg-white text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-farm-green/30 focus:border-farm-green"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Status</label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as StorageFacilityStatus)}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl bg-white text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-farm-green/30"
                >
                  {FACILITY_STATUSES.map((s) => (
                    <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Contact */}
            <div className="grid sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Contact Name</label>
                <input
                  type="text"
                  value={editContactName}
                  onChange={(e) => setEditContactName(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl bg-white text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-farm-green/30 focus:border-farm-green"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Contact Phone</label>
                <input
                  type="text"
                  value={editContactPhone}
                  onChange={(e) => setEditContactPhone(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl bg-white text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-farm-green/30 focus:border-farm-green"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Contact Email</label>
                <input
                  type="email"
                  value={editContactEmail}
                  onChange={(e) => setEditContactEmail(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl bg-white text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-farm-green/30 focus:border-farm-green"
                />
              </div>
            </div>

            {/* Features */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Features</label>
              <div className="flex flex-wrap gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editClimate}
                    onChange={(e) => setEditClimate(e.target.checked)}
                    className="w-4 h-4 text-farm-green border-gray-300 rounded focus:ring-farm-green"
                  />
                  <span className="text-sm text-gray-700">Climate Control</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editSecurity}
                    onChange={(e) => setEditSecurity(e.target.checked)}
                    className="w-4 h-4 text-farm-green border-gray-300 rounded focus:ring-farm-green"
                  />
                  <span className="text-sm text-gray-700">Security</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editLoadingDock}
                    onChange={(e) => setEditLoadingDock(e.target.checked)}
                    className="w-4 h-4 text-farm-green border-gray-300 rounded focus:ring-farm-green"
                  />
                  <span className="text-sm text-gray-700">Loading Dock</span>
                </label>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="submit"
                disabled={editLoading}
                className="px-6 py-2.5 bg-farm-green text-white text-sm font-semibold rounded-xl hover:bg-farm-green-light active:scale-[0.98] transition-all disabled:opacity-60 shadow-sm flex items-center gap-2"
              >
                {editLoading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </button>
              <button
                type="button"
                onClick={() => {
                  if (facility) {
                    setEditName(facility.name);
                    setEditType(facility.facility_type);
                    setEditLocation(facility.location);
                    setEditAddress(facility.address || '');
                    setEditDescription(facility.description || '');
                    setEditCapacityUnit(facility.capacity_unit);
                    setEditTotalCapacity(String(facility.total_capacity));
                    setEditPricePerUnit(String(facility.price_per_unit));
                    setEditCurrency(facility.currency || 'GHS');
                    setEditContactName(facility.contact_name || '');
                    setEditContactPhone(facility.contact_phone || '');
                    setEditContactEmail(facility.contact_email || '');
                    setEditClimate(facility.has_climate_control);
                    setEditSecurity(facility.has_security);
                    setEditLoadingDock(facility.has_loading_dock);
                    setEditStatus(facility.status);
                    setEditError('');
                    setEditSuccess(false);
                  }
                }}
                className="px-5 py-2.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition"
              >
                Reset
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ─── REJECTION MODAL ────────────────────────────────────────────── */}
      {showRejectModal && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-40 animate-fade-in"
            onClick={() => { setShowRejectModal(null); setRejectionReason(''); }}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md animate-fade-in-up">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-gray-900">Reject / Cancel Booking</h3>
                  <button
                    onClick={() => { setShowRejectModal(null); setRejectionReason(''); }}
                    className="p-2 hover:bg-gray-100 rounded-lg transition"
                  >
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    Reason (optional)
                  </label>
                  <textarea
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    rows={3}
                    placeholder="Enter reason for rejection or cancellation..."
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl bg-white text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-farm-green/30 focus:border-farm-green resize-none"
                  />
                </div>
                <div className="flex items-center gap-3 justify-end">
                  <button
                    onClick={() => { setShowRejectModal(null); setRejectionReason(''); }}
                    className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleBookingAction(showRejectModal, 'cancelled')}
                    disabled={bookingActionLoading === showRejectModal}
                    className="px-4 py-2 text-sm font-semibold text-white bg-red-600 rounded-xl hover:bg-red-700 transition disabled:opacity-50 flex items-center gap-2"
                  >
                    {bookingActionLoading === showRejectModal ? (
                      <>
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Processing...
                      </>
                    ) : (
                      'Confirm Rejection'
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
