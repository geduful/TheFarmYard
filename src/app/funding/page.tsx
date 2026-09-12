'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import type {
  FundingOpportunity,
  FundingType,
  FundingOpportunityStatus,
} from '@/lib/types';
import { FUNDING_TYPE_CONFIG, FUNDING_OPPORTUNITY_STATUS_CONFIG } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';

const PAGE_SIZE = 12;

type SortOption = 'recommended' | 'deadline_soonest' | 'highest_funding' | 'lowest_funding' | 'recently_added';

const sortOptions: { value: SortOption; label: string }[] = [
  { value: 'recommended', label: 'Recommended' },
  { value: 'deadline_soonest', label: 'Deadline Soonest' },
  { value: 'highest_funding', label: 'Highest Funding' },
  { value: 'lowest_funding', label: 'Lowest Funding' },
  { value: 'recently_added', label: 'Recently Added' },
];

const FUNDING_TYPES: FundingType[] = Object.keys(FUNDING_TYPE_CONFIG) as FundingType[];

function getDaysRemaining(deadline: string | null): { text: string; color: string; urgent: boolean } {
  if (!deadline) return { text: 'No deadline', color: 'text-gray-500', urgent: false };
  const date = new Date(deadline);
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return { text: 'Application closed', color: 'text-gray-400', urgent: false };
  if (diffDays === 0) return { text: 'Closes today!', color: 'text-red-600 font-bold', urgent: true };
  if (diffDays === 1) return { text: 'Closes tomorrow', color: 'text-red-600 font-bold', urgent: true };
  if (diffDays <= 3) return { text: `${diffDays} days remaining`, color: 'text-red-600 font-semibold', urgent: true };
  if (diffDays <= 7) return { text: `${diffDays} days remaining`, color: 'text-amber-600 font-semibold', urgent: false };
  if (diffDays <= 30) return { text: `${diffDays} days remaining`, color: 'text-gray-600', urgent: false };
  return {
    text: date.toLocaleDateString('en-GH', { month: 'short', day: 'numeric', year: 'numeric' }),
    color: 'text-gray-500',
    urgent: false,
  };
}

function formatAmountRange(min: number, max: number, currency: string): string {
  const formattedMin = formatCurrency(min);
  const formattedMax = formatCurrency(max);
  if (min === max) return formattedMin;
  if (min === 0) return `Up to ${formattedMax}`;
  return `${formattedMin} – ${formattedMax}`;
}

function OpportunityCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="p-5 space-y-4">
        <div className="flex items-center gap-2">
          <div className="skeleton h-5 w-24 rounded-full" />
          <div className="skeleton h-5 w-16 rounded-full" />
        </div>
        <div className="skeleton h-5 w-3/4" />
        <div className="flex items-center gap-2">
          <div className="skeleton h-4 w-4 rounded-full" />
          <div className="skeleton h-4 w-28" />
        </div>
        <div className="skeleton h-7 w-40" />
        <div className="skeleton h-4 w-32" />
        <div className="flex gap-2 flex-wrap">
          <div className="skeleton h-6 w-16 rounded-full" />
          <div className="skeleton h-6 w-20 rounded-full" />
        </div>
        <div className="skeleton h-4 w-24" />
        <div className="pt-2">
          <div className="skeleton h-10 w-full rounded-xl" />
        </div>
      </div>
    </div>
  );
}

function OpportunityCard({ opportunity }: { opportunity: FundingOpportunity }) {
  const deadline = getDaysRemaining(opportunity.application_deadline);
  const typeCfg = FUNDING_TYPE_CONFIG[opportunity.funding_type];
  const statusCfg = FUNDING_OPPORTUNITY_STATUS_CONFIG[opportunity.status];
  const isClosed = opportunity.status === 'closed' || opportunity.status === 'suspended';
  const isVerified = opportunity.provider?.verification_status === 'verified';

  return (
    <div
      className={`group bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden card-hover animate-fade-in flex flex-col ${
        isClosed ? 'opacity-60' : ''
      }`}
    >
      <div className="p-5 flex flex-col flex-1">
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${typeCfg.color}`}>
            {typeCfg.label}
          </span>
          {opportunity.status !== 'open' && (
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusCfg.color}`}>
              {statusCfg.label}
            </span>
          )}
        </div>

        <h3 className="font-semibold text-gray-900 text-base mb-2 leading-snug line-clamp-2">
          <Link href={`/funding/${opportunity.id}`} className="hover:text-farm-green transition-colors">
            {opportunity.title}
          </Link>
        </h3>

        {opportunity.provider && (
          <div className="flex items-center gap-1.5 mb-3">
            <span className="text-sm text-gray-600">{opportunity.provider.name}</span>
            {isVerified && (
              <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-emerald-500 text-white" title="Verified Provider">
                <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              </span>
            )}
          </div>
        )}

        <div className="mb-3">
          <span className="text-lg font-bold text-farm-green">
            {formatAmountRange(opportunity.min_amount, opportunity.max_amount, opportunity.currency)}
          </span>
        </div>

        <div className={`flex items-center gap-1.5 text-sm mb-3 ${deadline.color}`}>
          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{deadline.text}</span>
        </div>

        {opportunity.supported_locations.length > 0 && (
          <div className="flex items-center gap-1.5 text-sm text-gray-500 mb-3">
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
            </svg>
            <span className="line-clamp-1">
              {opportunity.supported_locations.length <= 3
                ? opportunity.supported_locations.join(', ')
                : `${opportunity.supported_locations.slice(0, 3).join(', ')} +${opportunity.supported_locations.length - 3} more`}
            </span>
          </div>
        )}

        {(opportunity.supported_crops.length > 0 || opportunity.supported_activities.length > 0) && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {[...opportunity.supported_crops, ...opportunity.supported_activities]
              .slice(0, 4)
              .map((item, idx) => (
                <span key={idx} className="px-2 py-0.5 rounded-full bg-cream text-earth text-xs font-medium border border-earth/10">
                  {item}
                </span>
              ))}
            {opportunity.supported_crops.length + opportunity.supported_activities.length > 4 && (
              <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 text-xs font-medium">
                +{opportunity.supported_crops.length + opportunity.supported_activities.length - 4} more
              </span>
            )}
          </div>
        )}

        <div className="mt-auto pt-3 border-t border-gray-100">
          <Link
            href={`/funding/${opportunity.id}`}
            className={`block w-full text-center py-2.5 rounded-xl text-sm font-semibold transition-all ${
              isClosed
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed pointer-events-none'
                : 'bg-farm-green text-white hover:bg-farm-green-light shadow-sm hover:shadow-md'
            }`}
          >
            {isClosed ? 'Closed' : 'View Opportunity'}
          </Link>
        </div>
      </div>
    </div>
  );
}

function FilterSidebar({
  selectedType,
  selectedLocation,
  minAmount,
  maxAmount,
  locations,
  onSelectType,
  onSelectLocation,
  onMinAmountChange,
  onMaxAmountChange,
  onClearFilters,
}: {
  selectedType: string;
  selectedLocation: string;
  minAmount: string;
  maxAmount: string;
  locations: string[];
  onSelectType: (t: string) => void;
  onSelectLocation: (l: string) => void;
  onMinAmountChange: (v: string) => void;
  onMaxAmountChange: (v: string) => void;
  onClearFilters: () => void;
}) {
  const hasActiveFilters = selectedType || selectedLocation || minAmount || maxAmount;

  return (
    <div className="space-y-6">
      {hasActiveFilters && (
        <button
          onClick={onClearFilters}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 transition border border-red-100"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
          Clear All Filters
        </button>
      )}

      <div>
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-[0.15em] mb-3">Funding Type</h3>
        <div className="space-y-1">
          <button
            onClick={() => onSelectType('')}
            className={`w-full text-left text-sm px-3 py-2.5 rounded-xl transition-all font-medium ${
              !selectedType ? 'bg-farm-green text-white shadow-sm' : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            All Types
          </button>
          {FUNDING_TYPES.map((type) => {
            const cfg = FUNDING_TYPE_CONFIG[type];
            return (
              <button
                key={type}
                onClick={() => onSelectType(type)}
                className={`w-full text-left text-sm px-3 py-2.5 rounded-xl transition-all font-medium ${
                  selectedType === type ? 'bg-farm-green text-white shadow-sm' : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                {cfg.label}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-[0.15em] mb-3">Location</h3>
        <div className="space-y-1">
          <button
            onClick={() => onSelectLocation('')}
            className={`w-full text-left text-sm px-3 py-2.5 rounded-xl transition-all font-medium ${
              !selectedLocation ? 'bg-farm-green text-white shadow-sm' : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            All Locations
          </button>
          {locations.map((loc) => (
            <button
              key={loc}
              onClick={() => onSelectLocation(loc)}
              className={`w-full text-left text-sm px-3 py-2.5 rounded-xl transition-all font-medium ${
                selectedLocation === loc ? 'bg-farm-green text-white shadow-sm' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              {loc}
            </button>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-[0.15em] mb-3">Funding Amount (GH₵)</h3>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Minimum</label>
            <input
              type="number"
              min="0"
              step="100"
              placeholder="0"
              value={minAmount}
              onChange={(e) => onMinAmountChange(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-farm-green/20 focus:border-farm-green"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Maximum</label>
            <input
              type="number"
              min="0"
              step="100"
              placeholder="No limit"
              value={maxAmount}
              onChange={(e) => onMaxAmountChange(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-farm-green/20 focus:border-farm-green"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function FundingPage() {
  const [opportunities, setOpportunities] = useState<FundingOpportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [retryKey, setRetryKey] = useState(0);

  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('');
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('recommended');
  const [page, setPage] = useState(0);
  const [totalResults, setTotalResults] = useState(0);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [locations, setLocations] = useState<string[]>([]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(0);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const fetchOpportunities = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const params = new URLSearchParams();
      if (debouncedSearch.trim()) params.set('search', debouncedSearch.trim());
      if (selectedType) params.set('funding_type', selectedType);
      if (selectedLocation) params.set('location', selectedLocation);
      if (minAmount) params.set('min_amount', minAmount);
      if (maxAmount) params.set('max_amount', maxAmount);
      params.set('sort', sortBy);
      params.set('page', String(page));
      params.set('limit', String(PAGE_SIZE));

      const res = await fetch(`/api/funding/opportunities?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to load funding opportunities');

      const data = await res.json();
      setOpportunities(data.opportunities || []);
      setTotalResults(data.total || 0);
      if (data.locations) setLocations(data.locations);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Could not load funding opportunities.');
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, selectedType, selectedLocation, minAmount, maxAmount, sortBy, page, retryKey]);

  useEffect(() => {
    fetchOpportunities();
  }, [fetchOpportunities]);

  const totalPages = Math.ceil(totalResults / PAGE_SIZE);

  function handleSelectType(t: string) {
    setSelectedType(t);
    setPage(0);
    setShowMobileFilters(false);
  }

  function handleSelectLocation(l: string) {
    setSelectedLocation(l);
    setPage(0);
    setShowMobileFilters(false);
  }

  function handleClearFilters() {
    setSelectedType('');
    setSelectedLocation('');
    setMinAmount('');
    setMaxAmount('');
    setPage(0);
    setShowMobileFilters(false);
  }

  function handleSortChange(value: SortOption) {
    setSortBy(value);
    setPage(0);
  }

  return (
    <div className="flex flex-col min-h-screen bg-cream">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="hover:scale-105 transition-transform">
              <img src="/logo.png" alt="TheFarmYard" className="h-8 w-auto" />
            </Link>
            <div className="h-5 w-px bg-gray-200" />
            <h1 className="font-bold text-gray-900">Funding</h1>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <Link
              href="/dashboard/funding"
              className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-farm-green bg-farm-green/5 hover:bg-farm-green/10 rounded-xl transition border border-farm-green/20"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
              My Applications
            </Link>
          </div>
        </div>
      </header>

      <div className="flex-1 flex">
        <aside className="w-72 bg-white border-r border-gray-100 p-6 hidden md:block shrink-0 overflow-y-auto">
          <h2 className="font-semibold text-gray-900 mb-6">Filters</h2>
          <FilterSidebar
            selectedType={selectedType}
            selectedLocation={selectedLocation}
            minAmount={minAmount}
            maxAmount={maxAmount}
            locations={locations}
            onSelectType={handleSelectType}
            onSelectLocation={handleSelectLocation}
            onMinAmountChange={setMinAmount}
            onMaxAmountChange={setMaxAmount}
            onClearFilters={handleClearFilters}
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
                  placeholder="Search funding opportunities..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-farm-green/20 focus:border-farm-green shadow-sm"
                />
              </div>
              <div className="flex items-center gap-2 sm:gap-3">
                <button
                  onClick={() => setShowMobileFilters(true)}
                  className="md:hidden flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium shadow-sm hover:bg-gray-50 transition"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" />
                  </svg>
                  Filters
                </button>
                <select
                  value={sortBy}
                  onChange={(e) => handleSortChange(e.target.value as SortOption)}
                  className="px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-600 focus:outline-none focus:ring-2 focus:ring-farm-green/20 shadow-sm"
                >
                  {sortOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                <div className="text-sm text-gray-500 hidden sm:block">
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
                  <FilterSidebar
                    selectedType={selectedType}
                    selectedLocation={selectedLocation}
                    minAmount={minAmount}
                    maxAmount={maxAmount}
                    locations={locations}
                    onSelectType={handleSelectType}
                    onSelectLocation={handleSelectLocation}
                    onMinAmountChange={setMinAmount}
                    onMaxAmountChange={setMaxAmount}
                    onClearFilters={handleClearFilters}
                  />
                </div>
              </div>
            )}

            {loading ? (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {Array.from({ length: 6 }).map((_, i) => (
                  <OpportunityCardSkeleton key={i} />
                ))}
              </div>
            ) : loadError ? (
              <div className="text-center py-24 animate-fade-in">
                <div className="max-w-md mx-auto bg-white rounded-2xl shadow-sm border border-red-200 p-8">
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Opportunities couldn&apos;t load</h3>
                  <p className="text-sm text-red-600 mb-1">{loadError}</p>
                  <p className="text-sm text-gray-500 mb-5">Check your connection and try again.</p>
                  <button
                    onClick={() => { setRetryKey((k) => k + 1); setPage(0); }}
                    className="px-5 py-2.5 bg-farm-green text-white text-sm font-semibold rounded-xl hover:bg-farm-green-light transition shadow-sm"
                  >
                    Reload opportunities
                  </button>
                </div>
              </div>
            ) : opportunities.length === 0 ? (
              <div className="text-center py-32 animate-fade-in">
                <div className="max-w-md mx-auto">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-farm-green/10 flex items-center justify-center">
                    <svg className="w-8 h-8 text-farm-green" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 00.75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 00-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0112 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 01-.673-.38m0 0A2.18 2.18 0 013 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 013.413-.387m7.5 0V5.25A2.25 2.25 0 0013.5 3h-3a2.25 2.25 0 00-2.25 2.25v.894m7.5 0a48.667 48.667 0 00-7.5 0M12 12.75h.008v.008H12v-.008z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">No funding opportunities found</h3>
                  <p className="text-gray-500 mb-1">
                    {debouncedSearch || selectedType || selectedLocation || minAmount || maxAmount
                      ? 'Try adjusting your search or filters.'
                      : 'Check back soon for new funding opportunities.'}
                  </p>
                  {(debouncedSearch || selectedType || selectedLocation || minAmount || maxAmount) && (
                    <button
                      onClick={handleClearFilters}
                      className="mt-4 px-4 py-2 text-sm font-medium text-farm-green bg-farm-green/10 rounded-xl hover:bg-farm-green/20 transition"
                    >
                      Clear all filters
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {opportunities.map((opp) => (
                    <OpportunityCard key={opp.id} opportunity={opp} />
                  ))}
                </div>

                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 mt-10 mb-4">
                    <button
                      onClick={() => setPage((p) => Math.max(0, p - 1))}
                      disabled={page === 0}
                      className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition shadow-sm"
                    >
                      ← Previous
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
                      Next →
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
