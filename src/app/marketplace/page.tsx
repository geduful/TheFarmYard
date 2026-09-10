'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import type { Listing, Category, SortOption } from '@/lib/types';
import { formatCurrency, formatPriceUnit, sortByOption } from '@/lib/utils';
import { CardSkeleton } from '@/components/ui/LoadingSkeleton';

const PAGE_SIZE = 24;

const categories: Category[] = ['Crops & Grains', 'Livestock', 'Poultry', 'Aquaculture', 'Other'];

const sortOptions: { value: SortOption; label: string }[] = [
  { value: 'recommended', label: 'Recommended' },
  { value: 'newest', label: 'Newest' },
  { value: 'price_asc', label: 'Price: Low → High' },
  { value: 'price_desc', label: 'Price: High → Low' },
  { value: 'highest_rated', label: 'Highest Rated' },
  { value: 'most_trusted', label: 'Most Trusted' },
];

function FiltersPanel({
  selectedCategory,
  selectedLocation,
  locations,
  onSelectCategory,
  onSelectLocation,
}: {
  selectedCategory: string;
  selectedLocation: string;
  locations: string[];
  onSelectCategory: (c: string) => void;
  onSelectLocation: (l: string) => void;
}) {
  return (
    <>
      <div className="mb-8">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-[0.15em] mb-3">Category</h3>
        <div className="space-y-1">
          {[{ key: '', label: 'All Categories' }, ...categories.map((c) => ({ key: c, label: c }))].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => onSelectCategory(key)}
              className={`flex items-center gap-2.5 w-full text-left text-sm px-3 py-2.5 rounded-xl transition-all font-medium ${
                selectedCategory === key ? 'bg-farm-green text-white shadow-sm' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <div>
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-[0.15em] mb-3">Location</h3>
        <div className="space-y-1">
          <button
            onClick={() => onSelectLocation('')}
            className={`flex items-center gap-2.5 w-full text-left text-sm px-3 py-2.5 rounded-xl transition-all font-medium ${
              selectedLocation === '' ? 'bg-farm-green text-white shadow-sm' : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            All Locations
          </button>
          {locations.map((loc) => (
            <button
              key={loc}
              onClick={() => onSelectLocation(loc)}
              className={`flex items-center gap-2.5 w-full text-left text-sm px-3 py-2.5 rounded-xl transition-all font-medium ${
                selectedLocation === loc ? 'bg-farm-green text-white shadow-sm' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              {loc}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}

export default function MarketplacePage() {
  const router = useRouter();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedLocation, setSelectedLocation] = useState<string>('');
  const [locations, setLocations] = useState<string[]>([]);
  const [profile, setProfile] = useState<{ role: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('recommended');
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [notice, setNotice] = useState('');
  const [loadError, setLoadError] = useState('');
  const [retryKey, setRetryKey] = useState(0);
  const [page, setPage] = useState(0);
  const [totalResults, setTotalResults] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(0);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setLoadError('');
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (cancelled) return;
        if (user) {
          const { data: p } = await supabase.from('profiles').select('role').eq('id', user.id).single();
          if (!cancelled) setProfile(p);
        }

        const { data: locData } = await supabase
          .from('profiles')
          .select('farm_location')
          .not('farm_location', 'is', null);
        if (!cancelled && locData) {
          const unique = [...new Set(locData.map((p) => p.farm_location).filter(Boolean))] as string[];
          setLocations(unique);
        }

        let query = supabase
          .from('listings')
          .select('*, farmer:profiles!listings_farmer_id_fkey(full_name, farm_location, is_verified)', { count: 'exact' })
          .eq('is_approved', true);

        if (selectedCategory) query = query.eq('category', selectedCategory);

        if (selectedLocation) {
          const { data: farmerProfiles } = await supabase
            .from('profiles')
            .select('id')
            .eq('farm_location', selectedLocation);
          const farmerIds = farmerProfiles?.map((p) => p.id) || [];
          if (farmerIds.length === 0) {
            setListings([]);
            setTotalResults(0);
            setLoading(false);
            return;
          }
          query = query.in('farmer_id', farmerIds);
        }

        if (debouncedSearch.trim()) {
          const q = debouncedSearch.trim();
          query = query.or(`title.ilike.%${q}%,description.ilike.%${q}%,category.ilike.%${q}%,location.ilike.%${q}%`);
        }

        switch (sortBy) {
          case 'newest':
            query = query.order('created_at', { ascending: false });
            break;
          case 'price_asc':
            query = query.order('price_per_unit', { ascending: true });
            break;
          case 'price_desc':
            query = query.order('price_per_unit', { ascending: false });
            break;
          case 'recommended':
          default:
            query = query.order('is_promoted', { ascending: false }).order('created_at', { ascending: false });
            break;
        }

        const from = page * PAGE_SIZE;
        const to = from + PAGE_SIZE - 1;
        query = query.range(from, to);

        const { data, error, count } = await query;
        if (cancelled) return;
        if (error) throw new Error(error.message);
        setListings((data || []) as Listing[]);
        setTotalResults(count || 0);
      } catch (err) {
        if (!cancelled) setLoadError(err instanceof Error ? err.message : 'Could not load listings.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [selectedCategory, selectedLocation, debouncedSearch, sortBy, page, retryKey]);

  const displayListings = useMemo(() => {
    if (sortBy === 'highest_rated' || sortBy === 'most_trusted') {
      return sortByOption(
        listings,
        sortBy,
        (l) => (l as Listing & { average_rating?: number }).average_rating,
        (l) => (l as Listing & { trust_score?: number }).trust_score,
      );
    }
    return listings;
  }, [listings, sortBy]);

  const totalPages = Math.ceil(totalResults / PAGE_SIZE);

  function handleBuy(listing: Listing) {
    if (!profile) { router.push('/login'); return; }
    if (profile.role === 'farmer') { setNotice('Farmers cannot purchase listings. Please use a buyer account.'); return; }
    const encoded = encodeURIComponent(JSON.stringify({ listingId: listing.id, farmerId: listing.farmer_id }));
    router.push(`/dashboard/buyer?checkout=${encoded}`);
  }

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/');
  }

  function handleSelectCategory(c: string) {
    setSelectedCategory(c);
    setPage(0);
    setShowMobileFilters(false);
  }

  function handleSelectLocation(l: string) {
    setSelectedLocation(l);
    setPage(0);
    setShowMobileFilters(false);
  }

  function handleSortChange(value: SortOption) {
    setSortBy(value);
    setPage(0);
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push('/')} className="hover:scale-105 transition-transform"><Image src="/logo.png" alt="TheFarmYard" width={32} height={32} className="h-8 w-auto" /></button>
            <div className="h-5 w-px bg-gray-200" />
            <h1 className="font-bold text-gray-900">Marketplace</h1>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2">
            {profile?.role === 'farmer' && (
              <button onClick={() => router.push('/dashboard/farmer')} className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-farm-green bg-farm-green/5 hover:bg-farm-green/10 rounded-xl transition border border-farm-green/20">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
                </svg>
                Dashboard
              </button>
            )}
            {profile?.role === 'buyer' && (
              <button onClick={() => router.push('/dashboard/buyer')} className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-farm-green bg-farm-green/5 hover:bg-farm-green/10 rounded-xl transition border border-farm-green/20">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
                My Orders
              </button>
            )}
            {profile?.role === 'admin' && (
              <button onClick={() => router.push('/dashboard/admin')} className="px-4 py-2 text-sm font-semibold text-farm-green bg-farm-green/5 hover:bg-farm-green/10 rounded-xl transition flex items-center gap-1.5">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}><path d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281zM15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                Admin Panel
              </button>
            )}
            {profile ? (
              <button onClick={handleSignOut} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-xl transition" title="Sign Out">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
              </button>
            ) : (
              <button onClick={() => router.push('/login')} className="px-5 py-2 bg-farm-green text-white text-sm font-semibold rounded-xl hover:bg-farm-green-light transition shadow-sm">Sign In</button>
            )}
          </div>
        </div>
      </header>

      <div className="flex-1 flex">
        <aside className="w-64 bg-white border-r border-gray-100 p-6 hidden md:block shrink-0">
          <FiltersPanel
            selectedCategory={selectedCategory}
            selectedLocation={selectedLocation}
            locations={locations}
            onSelectCategory={handleSelectCategory}
            onSelectLocation={handleSelectLocation}
          />
        </aside>

        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            {notice && (
              <div className="mb-4 p-3.5 bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-xl flex items-center justify-between gap-2 animate-fade-in">
                <span>{notice}</span>
                <button onClick={() => setNotice('')} className="text-amber-500 hover:text-amber-700 font-bold" aria-label="Dismiss">✕</button>
              </div>
            )}
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-8">
              <div className="relative flex-1 max-w-lg">
                <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                <input
                  type="text"
                  placeholder="Search listings, farmers, locations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-farm-green/20 focus:border-farm-green shadow-sm"
                />
              </div>
              <div className="flex items-center gap-2 sm:gap-3">
                <button onClick={() => setShowMobileFilters(true)} className="md:hidden px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium shadow-sm hover:bg-gray-50 transition">Filters</button>
                <select
                  value={sortBy}
                  onChange={(e) => handleSortChange(e.target.value as SortOption)}
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
                <div className="absolute left-0 top-0 bottom-0 w-72 bg-white p-6 overflow-y-auto shadow-xl animate-slide-in-right" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="font-semibold text-gray-900">Filters</h2>
                    <button onClick={() => setShowMobileFilters(false)} className="p-1 hover:bg-gray-100 rounded-lg transition"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
                  </div>
                  <FiltersPanel
                    selectedCategory={selectedCategory}
                    selectedLocation={selectedLocation}
                    locations={locations}
                    onSelectCategory={handleSelectCategory}
                    onSelectLocation={handleSelectLocation}
                  />
                </div>
              </div>
            )}

            {loading ? (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {Array.from({ length: 8 }).map((_, i) => <CardSkeleton key={i} />)}
              </div>
            ) : loadError ? (
              <div className="text-center py-24 animate-fade-in">
                <div className="max-w-md mx-auto bg-white rounded-2xl shadow-sm border border-red-200 p-8">
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Listings couldn&apos;t load</h3>
                  <p className="text-sm text-red-600 mb-1">{loadError}</p>
                  <p className="text-sm text-gray-500 mb-5">Check your connection and try again.</p>
                  <button
                    onClick={() => { setLoading(true); setRetryKey((k) => k + 1); setPage(0); }}
                    className="px-5 py-2.5 bg-farm-green text-white text-sm font-semibold rounded-xl hover:bg-farm-green-light transition shadow-sm"
                  >
                    Reload listings
                  </button>
                </div>
              </div>
            ) : displayListings.length === 0 ? (
              <div className="text-center py-32 animate-fade-in">
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No listings found</h3>
                <p className="text-gray-500">{debouncedSearch ? 'Try a different search term.' : 'No listings match your filters.'}</p>
              </div>
            ) : (
              <>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {displayListings.map((listing) => (
                    <div key={listing.id} className="group bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden card-hover animate-fade-in relative">
                      {listing.is_promoted && (
                        <div className="absolute top-3 left-3 z-10">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-amber-400 to-amber-500 text-white shadow-lg">
                            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.9 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l7.1-1.01L12 2z" /></svg>
                            Featured
                          </span>
                        </div>
                      )}
                      <div
                        className="aspect-[4/3] bg-gradient-to-br from-gray-50 to-gray-100 relative overflow-hidden cursor-pointer"
                        onClick={() => router.push(`/marketplace/${listing.id}`)}
                      >
                        {listing.image_url ? (
                          <Image src={listing.image_url} alt={listing.title} fill className="object-cover group-hover:scale-105 transition-transform duration-500" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-300 text-4xl">
                            <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" /></svg>
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                        {listing.farmer?.is_verified && (
                          <div className="absolute top-3 right-3">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500 text-white shadow-lg">✓ Verified</span>
                          </div>
                        )}
                      </div>
                      <div className="p-5">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs font-semibold text-farm-green bg-farm-green/10 px-2.5 py-1 rounded-full">{listing.category}</span>
                          {listing.farmer?.farm_location && (
                            <span className="text-xs text-gray-400">{listing.location || listing.farmer.farm_location}</span>
                          )}
                        </div>
                        <h3
                          className="font-semibold text-gray-900 text-base mb-1 leading-snug cursor-pointer hover:text-farm-green transition"
                          onClick={() => router.push(`/marketplace/${listing.id}`)}
                        >
                          {listing.title}
                        </h3>
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <span className="text-xl font-bold text-farm-green">{formatCurrency(listing.price_per_unit)}</span>
                            <span className="text-xs text-gray-400 ml-1">{formatPriceUnit(listing.price_unit || 'unit')}</span>
                          </div>
                          <span className="text-xs font-medium text-gray-500 bg-gray-50 px-2.5 py-1 rounded-lg border border-gray-100">
                            {listing.quantity_available}
                          </span>
                        </div>
                        {listing.description && (
                          <p className="text-sm text-gray-500 mb-4 line-clamp-2 leading-relaxed">{listing.description}</p>
                        )}
                        {profile?.role === 'buyer' ? (
                          <div className="flex gap-2">
                            <button onClick={() => router.push(`/marketplace/${listing.id}`)} className="flex-1 py-2.5 border border-farm-green text-farm-green font-semibold rounded-xl hover:bg-farm-green/5 transition text-sm">
                              View Details
                            </button>
                            <button onClick={() => handleBuy(listing)} className="flex-1 py-2.5 bg-farm-green text-white font-semibold rounded-xl hover:bg-farm-green-light transition shadow-sm text-sm">
                              Buy Now
                            </button>
                          </div>
                        ) : !profile ? (
                          <button onClick={() => router.push('/login')} className="w-full py-2.5 bg-farm-green text-white font-semibold rounded-xl hover:bg-farm-green-light transition shadow-sm text-sm">
                            Sign In to Buy
                          </button>
                        ) : null}
                      </div>
                    </div>
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
