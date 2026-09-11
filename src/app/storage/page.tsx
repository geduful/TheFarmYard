'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import type { StorageFacility, StorageFacilityType } from '@/lib/types';
import { STORAGE_FACILITY_TYPE_CONFIG } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';
import { GHANA_REGIONS } from '@/lib/locations';

const PAGE_SIZE = 24;

const sortOptions: { value: string; label: string }[] = [
  { value: 'featured', label: 'Recommended' },
  { value: 'price_asc', label: 'Lowest Price' },
  { value: 'capacity', label: 'Highest Capacity' },
  { value: 'rating', label: 'Highest Rating' },
  { value: 'newest', label: 'Newest' },
];

const facilityTypes = Object.keys(STORAGE_FACILITY_TYPE_CONFIG) as StorageFacilityType[];

const commonCrops = [
  'Maize', 'Rice', 'Cassava', 'Yam', 'Cocoa', 'Soybean',
  'Plantain', 'Tomato', 'Pepper', 'Onion', 'Groundnut', 'Millet',
  'Sorghum', 'Wheat', 'Shea', 'Cashew',
];

const commonCropsSorted = [...commonCrops].sort();

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <svg
          key={star}
          className={`w-3.5 h-3.5 ${
            star <= Math.round(rating) ? 'text-amber-400' : 'text-gray-200'
          }`}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
}

function FacilityCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="aspect-[4/3] bg-gradient-to-br from-gray-50 to-gray-100 skeleton rounded-none" />
      <div className="p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-20 rounded-full" />
          <Skeleton className="h-4 w-16" />
        </div>
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <div className="flex items-center justify-between pt-2">
          <Skeleton className="h-6 w-28" />
          <Skeleton className="h-6 w-16" />
        </div>
        <div className="flex gap-2 pt-1">
          <Skeleton className="h-5 w-14 rounded-full" />
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-5 w-12 rounded-full" />
        </div>
      </div>
    </div>
  );
}

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`skeleton ${className}`} />;
}

function FiltersPanel({
  selectedType,
  selectedLocation,
  selectedCrop,
  minCapacity,
  maxPrice,
  minRating,
  onSelectType,
  onSelectLocation,
  onSelectCrop,
  onMinCapacityChange,
  onMaxPriceChange,
  onMinRatingChange,
}: {
  selectedType: string;
  selectedLocation: string;
  selectedCrop: string;
  minCapacity: string;
  maxPrice: string;
  minRating: string;
  onSelectType: (v: string) => void;
  onSelectLocation: (v: string) => void;
  onSelectCrop: (v: string) => void;
  onMinCapacityChange: (v: string) => void;
  onMaxPriceChange: (v: string) => void;
  onMinRatingChange: (v: string) => void;
}) {
  return (
    <>
      <div className="mb-8">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-[0.15em] mb-3">Facility Type</h3>
        <div className="space-y-1">
          <button
            onClick={() => onSelectType('')}
            className={`flex items-center gap-2.5 w-full text-left text-sm px-3 py-2.5 rounded-xl transition-all font-medium ${
              selectedType === '' ? 'bg-farm-green text-white shadow-sm' : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            All Types
          </button>
          {facilityTypes.map((type) => {
            const config = STORAGE_FACILITY_TYPE_CONFIG[type];
            return (
              <button
                key={type}
                onClick={() => onSelectType(type)}
                className={`flex items-center gap-2.5 w-full text-left text-sm px-3 py-2.5 rounded-xl transition-all font-medium ${
                  selectedType === type ? 'bg-farm-green text-white shadow-sm' : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                {config.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mb-8">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-[0.15em] mb-3">Location</h3>
        <div className="space-y-1">
          <button
            onClick={() => onSelectLocation('')}
            className={`flex items-center gap-2.5 w-full text-left text-sm px-3 py-2.5 rounded-xl transition-all font-medium ${
              selectedLocation === '' ? 'bg-farm-green text-white shadow-sm' : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            All Regions
          </button>
          {GHANA_REGIONS.map((region) => (
            <button
              key={region}
              onClick={() => onSelectLocation(region)}
              className={`flex items-center gap-2.5 w-full text-left text-sm px-3 py-2.5 rounded-xl transition-all font-medium ${
                selectedLocation === region ? 'bg-farm-green text-white shadow-sm' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              {region}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-8">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-[0.15em] mb-3">Crop Support</h3>
        <div className="space-y-1">
          <button
            onClick={() => onSelectCrop('')}
            className={`flex items-center gap-2.5 w-full text-left text-sm px-3 py-2.5 rounded-xl transition-all font-medium ${
              selectedCrop === '' ? 'bg-farm-green text-white shadow-sm' : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            All Crops
          </button>
          {commonCropsSorted.map((crop) => (
            <button
              key={crop}
              onClick={() => onSelectCrop(crop)}
              className={`flex items-center gap-2.5 w-full text-left text-sm px-3 py-2.5 rounded-xl transition-all font-medium ${
                selectedCrop === crop ? 'bg-farm-green text-white shadow-sm' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              {crop}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-8">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-[0.15em] mb-3">Min Capacity</h3>
        <div className="relative">
          <input
            type="number"
            placeholder="No minimum"
            value={minCapacity}
            onChange={(e) => onMinCapacityChange(e.target.value)}
            className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-farm-green/20 focus:border-farm-green"
            min="0"
          />
        </div>
      </div>

      <div className="mb-8">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-[0.15em] mb-3">Max Price (per unit/day)</h3>
        <div className="relative">
          <input
            type="number"
            placeholder="No maximum"
            value={maxPrice}
            onChange={(e) => onMaxPriceChange(e.target.value)}
            className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-farm-green/20 focus:border-farm-green"
            min="0"
          />
        </div>
      </div>

      <div className="mb-8">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-[0.15em] mb-3">Minimum Rating</h3>
        <div className="space-y-1">
          {['', '4', '3', '2'].map((val) => (
            <button
              key={val}
              onClick={() => onMinRatingChange(val)}
              className={`flex items-center gap-2.5 w-full text-left text-sm px-3 py-2.5 rounded-xl transition-all font-medium ${
                minRating === val ? 'bg-farm-green text-white shadow-sm' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              {val === '' ? (
                'Any Rating'
              ) : (
                <span className="flex items-center gap-1.5">
                  {val}+ <StarRating rating={Number(val)} />
                </span>
              )}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}

export default function StorageMarketplacePage() {
  const [facilities, setFacilities] = useState<StorageFacility[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [retryKey, setRetryKey] = useState(0);

  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('');
  const [selectedCrop, setSelectedCrop] = useState('');
  const [minCapacity, setMinCapacity] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [minRating, setMinRating] = useState('');
  const [sortBy, setSortBy] = useState('featured');
  const [page, setPage] = useState(0);
  const [totalResults, setTotalResults] = useState(0);

  const [showMobileFilters, setShowMobileFilters] = useState(false);

  const [debouncedMinCapacity, setDebouncedMinCapacity] = useState('');
  const [debouncedMaxPrice, setDebouncedMaxPrice] = useState('');
  const [debouncedMinRating, setDebouncedMinRating] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedMinCapacity(minCapacity), 500);
    return () => clearTimeout(t);
  }, [minCapacity]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedMaxPrice(maxPrice), 500);
    return () => clearTimeout(t);
  }, [maxPrice]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedMinRating(minRating), 300);
    return () => clearTimeout(t);
  }, [minRating]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setLoadError('');
      try {
        const params = new URLSearchParams();
        if (debouncedSearch.trim()) params.set('search', debouncedSearch.trim());
        if (selectedType) params.set('type', selectedType);
        if (selectedLocation) params.set('location', selectedLocation);
        if (selectedCrop) params.set('crop', selectedCrop);
        if (debouncedMinCapacity) params.set('min_capacity', debouncedMinCapacity);
        if (debouncedMaxPrice) params.set('max_price', debouncedMaxPrice);
        if (debouncedMinRating) params.set('min_rating', debouncedMinRating);
        params.set('sort', sortBy);
        params.set('page', String(page + 1));
        params.set('limit', String(PAGE_SIZE));

        const res = await fetch(`/api/storage/facilities?${params.toString()}`);
        if (!res.ok) throw new Error('Failed to load facilities');
        const json = await res.json();

        if (cancelled) return;
        setFacilities(json.facilities || []);
        setTotalResults(json.total || 0);
      } catch (err) {
        if (!cancelled) setLoadError(err instanceof Error ? err.message : 'Could not load storage facilities.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [
    debouncedSearch,
    selectedType,
    selectedLocation,
    selectedCrop,
    debouncedMinCapacity,
    debouncedMaxPrice,
    debouncedMinRating,
    sortBy,
    page,
    retryKey,
  ]);

  const totalPages = Math.ceil(totalResults / PAGE_SIZE);

  function handleTypeSelect(v: string) {
    setSelectedType(v);
    setPage(0);
    setShowMobileFilters(false);
  }

  function handleLocationSelect(v: string) {
    setSelectedLocation(v);
    setPage(0);
    setShowMobileFilters(false);
  }

  function handleCropSelect(v: string) {
    setSelectedCrop(v);
    setPage(0);
    setShowMobileFilters(false);
  }

  function handleMinCapacityChange(v: string) {
    setMinCapacity(v);
    setPage(0);
  }

  function handleMaxPriceChange(v: string) {
    setMaxPrice(v);
    setPage(0);
  }

  function handleMinRatingChange(v: string) {
    setMinRating(v);
    setPage(0);
  }

  function handleSortChange(v: string) {
    setSortBy(v);
    setPage(0);
  }

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (selectedType) count++;
    if (selectedLocation) count++;
    if (selectedCrop) count++;
    if (debouncedMinCapacity) count++;
    if (debouncedMaxPrice) count++;
    if (debouncedMinRating) count++;
    return count;
  }, [selectedType, selectedLocation, selectedCrop, debouncedMinCapacity, debouncedMaxPrice, debouncedMinRating]);

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="hover:scale-105 transition-transform">
              <svg className="h-8 w-auto" viewBox="0 0 32 32" fill="none">
                <rect width="32" height="32" rx="8" className="fill-farm-green" />
                <path d="M8 22V14l8-6 8 6v8" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M13 22v-5h6v5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
            <div className="h-5 w-px bg-gray-200" />
            <h1 className="font-bold text-gray-900">Storage Marketplace</h1>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <Link
              href="/marketplace"
              className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-xl transition border border-gray-200"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
              </svg>
              Marketplace
            </Link>
            <Link
              href="/dashboard/farmer/storage"
              className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-farm-green bg-farm-green/5 hover:bg-farm-green/10 rounded-xl transition border border-farm-green/20"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
              </svg>
              My Storage
            </Link>
          </div>
        </div>
      </header>

      <div className="flex-1 flex">
        <aside className="w-64 bg-white border-r border-gray-100 p-6 hidden md:block shrink-0 overflow-y-auto max-h-[calc(100vh-4rem)]">
          <div className="mb-6">
            <h2 className="font-semibold text-gray-900 mb-1">Filters</h2>
            {activeFilterCount > 0 && (
              <button
                onClick={() => {
                  setSelectedType('');
                  setSelectedLocation('');
                  setSelectedCrop('');
                  setMinCapacity('');
                  setMaxPrice('');
                  setMinRating('');
                  setPage(0);
                }}
                className="text-xs text-farm-green font-medium hover:underline"
              >
                Clear all ({activeFilterCount})
              </button>
            )}
          </div>
          <FiltersPanel
            selectedType={selectedType}
            selectedLocation={selectedLocation}
            selectedCrop={selectedCrop}
            minCapacity={minCapacity}
            maxPrice={maxPrice}
            minRating={minRating}
            onSelectType={handleTypeSelect}
            onSelectLocation={handleLocationSelect}
            onSelectCrop={handleCropSelect}
            onMinCapacityChange={handleMinCapacityChange}
            onMaxPriceChange={handleMaxPriceChange}
            onMinRatingChange={handleMinRatingChange}
          />
        </aside>

        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-8">
              <div className="relative flex-1 max-w-lg">
                <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="Search facilities by name or location..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-farm-green/20 focus:border-farm-green shadow-sm"
                />
              </div>
              <div className="flex items-center gap-2 sm:gap-3">
                <button
                  onClick={() => setShowMobileFilters(true)}
                  className="md:hidden px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium shadow-sm hover:bg-gray-50 transition flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" />
                  </svg>
                  Filters
                  {activeFilterCount > 0 && (
                    <span className="w-5 h-5 flex items-center justify-center bg-farm-green text-white text-xs font-bold rounded-full">
                      {activeFilterCount}
                    </span>
                  )}
                </button>
                <select
                  value={sortBy}
                  onChange={(e) => handleSortChange(e.target.value)}
                  className="px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-600 focus:outline-none focus:ring-2 focus:ring-farm-green/20 shadow-sm"
                >
                  {sortOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                <div className="text-sm text-gray-500">
                  <span className="font-semibold text-gray-900">{totalResults}</span> result{totalResults !== 1 ? 's' : ''}
                </div>
              </div>
            </div>

            {showMobileFilters && (
              <div className="fixed inset-0 bg-black/30 z-50 md:hidden backdrop-blur-sm" onClick={() => setShowMobileFilters(false)}>
                <div className="absolute left-0 top-0 bottom-0 w-80 bg-white p-6 overflow-y-auto shadow-xl animate-slide-in-right" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="font-semibold text-gray-900">Filters</h2>
                    <button
                      onClick={() => setShowMobileFilters(false)}
                      className="p-1 hover:bg-gray-100 rounded-lg transition"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  {activeFilterCount > 0 && (
                    <button
                      onClick={() => {
                        setSelectedType('');
                        setSelectedLocation('');
                        setSelectedCrop('');
                        setMinCapacity('');
                        setMaxPrice('');
                        setMinRating('');
                        setPage(0);
                      }}
                      className="mb-4 w-full px-4 py-2 text-sm font-medium text-farm-green bg-farm-green/5 border border-farm-green/20 rounded-xl hover:bg-farm-green/10 transition"
                    >
                      Clear all filters ({activeFilterCount})
                    </button>
                  )}
                  <FiltersPanel
                    selectedType={selectedType}
                    selectedLocation={selectedLocation}
                    selectedCrop={selectedCrop}
                    minCapacity={minCapacity}
                    maxPrice={maxPrice}
                    minRating={minRating}
                    onSelectType={handleTypeSelect}
                    onSelectLocation={handleLocationSelect}
                    onSelectCrop={handleCropSelect}
                    onMinCapacityChange={handleMinCapacityChange}
                    onMaxPriceChange={handleMaxPriceChange}
                    onMinRatingChange={handleMinRatingChange}
                  />
                </div>
              </div>
            )}

            {loading ? (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {Array.from({ length: 8 }).map((_, i) => (
                  <FacilityCardSkeleton key={i} />
                ))}
              </div>
            ) : loadError ? (
              <div className="text-center py-24 animate-fade-in">
                <div className="max-w-md mx-auto bg-white rounded-2xl shadow-sm border border-red-200 p-8">
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Facilities couldn&apos;t load</h3>
                  <p className="text-sm text-red-600 mb-1">{loadError}</p>
                  <p className="text-sm text-gray-500 mb-5">Check your connection and try again.</p>
                  <button
                    onClick={() => { setLoading(true); setRetryKey((k) => k + 1); setPage(0); }}
                    className="px-5 py-2.5 bg-farm-green text-white text-sm font-semibold rounded-xl hover:bg-farm-green-light transition shadow-sm"
                  >
                    Reload facilities
                  </button>
                </div>
              </div>
            ) : facilities.length === 0 ? (
              <div className="text-center py-32 animate-fade-in">
                <div className="max-w-md mx-auto">
                  <div className="w-20 h-20 mx-auto mb-6 bg-gray-100 rounded-2xl flex items-center justify-center">
                    <svg className="w-10 h-10 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 7.5h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">No storage facilities found</h3>
                  <p className="text-gray-500 mb-6">
                    {debouncedSearch || selectedType || selectedLocation || selectedCrop || debouncedMinCapacity || debouncedMaxPrice || debouncedMinRating
                      ? 'Try adjusting your filters or search terms.'
                      : 'No storage facilities are available at the moment. Check back soon.'}
                  </p>
                  {(debouncedSearch || selectedType || selectedLocation || selectedCrop || debouncedMinCapacity || debouncedMaxPrice || debouncedMinRating) && (
                    <button
                      onClick={() => {
                        setSearchQuery('');
                        setSelectedType('');
                        setSelectedLocation('');
                        setSelectedCrop('');
                        setMinCapacity('');
                        setMaxPrice('');
                        setMinRating('');
                        setPage(0);
                      }}
                      className="px-5 py-2.5 bg-farm-green text-white text-sm font-semibold rounded-xl hover:bg-farm-green-light transition shadow-sm"
                    >
                      Clear all filters
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {facilities.map((facility) => {
                    const typeConfig = STORAGE_FACILITY_TYPE_CONFIG[facility.facility_type];
                    const capacityPct = facility.total_capacity > 0
                      ? Math.round((facility.available_capacity / facility.total_capacity) * 100)
                      : 0;
                    return (
                      <Link
                        key={facility.id}
                        href={`/storage/${facility.id}`}
                        className="group bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden card-hover animate-fade-in relative"
                      >
                        {facility.is_featured && (
                          <div className="absolute top-3 left-3 z-10">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-amber-400 to-amber-500 text-white shadow-lg">
                              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 2l2.9 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l7.1-1.01L12 2z" />
                              </svg>
                              Featured
                            </span>
                          </div>
                        )}
                        <div className="aspect-[4/3] bg-gradient-to-br from-gray-50 to-gray-100 relative overflow-hidden">
                          {facility.image_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={facility.image_url}
                              alt={facility.name}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-300">
                              <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 7.5h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008z" />
                              </svg>
                            </div>
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                          <div className="absolute top-3 right-3">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${typeConfig.color} shadow-sm`}>
                              {typeConfig.label}
                            </span>
                          </div>
                        </div>
                        <div className="p-5">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                              </svg>
                              <span className="text-xs text-gray-500 truncate max-w-[160px]">{facility.location}</span>
                            </div>
                            {facility.rating_avg != null && facility.rating_avg > 0 && (
                              <div className="flex items-center gap-1">
                                <StarRating rating={facility.rating_avg} />
                                <span className="text-xs font-medium text-gray-600">{facility.rating_avg.toFixed(1)}</span>
                              </div>
                            )}
                          </div>

                          <h3 className="font-semibold text-gray-900 text-base mb-2 leading-snug group-hover:text-farm-green transition">
                            {facility.name}
                          </h3>

                          <div className="flex items-center gap-2 mb-3">
                            {facility.has_climate_control && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-100">
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
                                </svg>
                                Climate
                              </span>
                            )}
                            {facility.has_security && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-100">
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                                </svg>
                                Secure
                              </span>
                            )}
                            {facility.has_loading_dock && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-100">
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.139-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
                                </svg>
                                Dock
                              </span>
                            )}
                          </div>

                          {facility.supported_crops && facility.supported_crops.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mb-4">
                              {facility.supported_crops.slice(0, 3).map((crop) => (
                                <span key={crop} className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-farm-green/5 text-farm-green border border-farm-green/10">
                                  {crop}
                                </span>
                              ))}
                              {facility.supported_crops.length > 3 && (
                                <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-gray-50 text-gray-500 border border-gray-100">
                                  +{facility.supported_crops.length - 3} more
                                </span>
                              )}
                            </div>
                          )}

                          <div className="mb-3">
                            <div className="flex items-center justify-between text-xs mb-1.5">
                              <span className="text-gray-500">
                                <span className="font-semibold text-gray-900">{facility.available_capacity.toLocaleString()}</span>
                                <span className="text-gray-400"> / {facility.total_capacity.toLocaleString()} {facility.capacity_unit}</span>
                              </span>
                              <span className={`font-medium ${capacityPct > 50 ? 'text-emerald-600' : capacityPct > 20 ? 'text-amber-600' : 'text-red-500'}`}>
                                {capacityPct}% available
                              </span>
                            </div>
                            <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${capacityPct > 50 ? 'bg-emerald-500' : capacityPct > 20 ? 'bg-amber-500' : 'bg-red-400'}`}
                                style={{ width: `${capacityPct}%` }}
                              />
                            </div>
                          </div>

                          <div className="flex items-center justify-between">
                            <div>
                              <span className="text-xl font-bold text-farm-green">{formatCurrency(facility.price_per_unit)}</span>
                              <span className="text-xs text-gray-400 ml-1">/ {facility.capacity_unit}/day</span>
                            </div>
                            {facility.is_approved && (
                              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-100">
                                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                                Verified
                              </span>
                            )}
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>

                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 mt-10 mb-4">
                    <button
                      onClick={() => setPage((p) => Math.max(0, p - 1))}
                      disabled={page === 0}
                      className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition shadow-sm"
                    >
                      &larr; Previous
                    </button>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: totalPages }, (_, i) => i).map((i) => (
                        <button
                          key={i}
                          onClick={() => setPage(i)}
                          className={`w-9 h-9 text-sm font-medium rounded-lg transition ${
                            i === page
                              ? 'bg-farm-green text-white shadow-sm'
                              : 'text-gray-500 hover:bg-gray-100'
                          }`}
                        >
                          {i + 1}
                        </button>
                      ))}
                    </div>
                    <button
                      onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                      disabled={page >= totalPages - 1}
                      className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition shadow-sm"
                    >
                      Next &rarr;
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
