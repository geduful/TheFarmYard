'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { Listing, Category } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';
import StatusBadge from '@/components/ui/StatusBadge';
import { CardSkeleton } from '@/components/ui/LoadingSkeleton';

const categories: Category[] = ['Crops & Grains', 'Livestock', 'Poultry', 'Aquaculture', 'Other'];

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
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    const supabase = createClient();
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: p } = await supabase.from('profiles').select('role').eq('id', user.id).single();
        setProfile(p);
      }

      let query = supabase
        .from('listings')
        .select('*, farmer:profiles!listings_farmer_id_fkey(full_name, farm_location, is_verified)')
        .eq('is_approved', true)
        .order('created_at', { ascending: false });

      if (selectedCategory) query = query.eq('category', selectedCategory);

      const { data } = await query;
      setListings((data || []) as Listing[]);
      const uniqueLocations = [...new Set((data || []).map((l: Listing) => l.farmer?.farm_location).filter(Boolean))] as string[];
      setLocations(uniqueLocations);
      setLoading(false);
    }
    load();
  }, [selectedCategory]);

  const filteredListings = useMemo(() => {
    let result = selectedLocation
      ? listings.filter((l) => l.farmer?.farm_location === selectedLocation)
      : [...listings];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((l) =>
        l.title.toLowerCase().includes(q) ||
        l.description?.toLowerCase().includes(q) ||
        l.category.toLowerCase().includes(q)
      );
    }
    return result;
  }, [listings, selectedLocation, searchQuery]);

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
    setShowMobileFilters(false);
  }

  function handleSelectLocation(l: string) {
    setSelectedLocation(l);
    setShowMobileFilters(false);
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push('/')} className="text-lg font-bold text-gray-900 hover:scale-105 transition-transform">TFY</button>
            <div className="h-5 w-px bg-gray-200" />
            <h1 className="font-bold text-gray-900">Marketplace</h1>
          </div>
          <div className="flex items-center gap-2">
            {profile?.role === 'farmer' && (
              <button onClick={() => router.push('/dashboard/farmer')} className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-xl transition">Dashboard</button>
            )}
            {profile?.role === 'buyer' && (
              <button onClick={() => router.push('/dashboard/buyer')} className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-xl transition">My Orders</button>
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
                  placeholder="Search listings..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-farm-green/20 focus:border-farm-green shadow-sm"
                />
              </div>
              <div className="flex items-center gap-3">
                <button onClick={() => setShowMobileFilters(true)} className="md:hidden px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium shadow-sm hover:bg-gray-50 transition">Filters</button>
                <div className="text-sm text-gray-500">
                  <span className="font-semibold text-gray-900">{filteredListings.length}</span> result{filteredListings.length !== 1 ? 's' : ''}
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
            ) : filteredListings.length === 0 ? (
              <div className="text-center py-32 animate-fade-in">
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No listings found</h3>
                <p className="text-gray-500">{searchQuery ? 'Try a different search term.' : 'No listings match your filters.'}</p>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredListings.map((listing) => (
                  <div key={listing.id} className="group bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden card-hover animate-fade-in">
                    <div className="aspect-[4/3] bg-gradient-to-br from-gray-50 to-gray-100 relative overflow-hidden">
                      {listing.image_url ? (
                        <img src={listing.image_url} alt={listing.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-300 text-4xl">
                          <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" /></svg>
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      <div className="absolute top-3 left-3 flex flex-col gap-2">
                        <StatusBadge type="approval" value={listing.is_approved} />
                      </div>
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
                          <span className="text-xs text-gray-400">{listing.farmer.farm_location}</span>
                        )}
                      </div>
                      <h3 className="font-semibold text-gray-900 text-base mb-1 leading-snug">{listing.title}</h3>
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <span className="text-xl font-bold text-farm-green">{formatCurrency(listing.price_per_unit)}</span>
                          <span className="text-xs text-gray-400 ml-1">/ unit</span>
                        </div>
                        <span className="text-xs font-medium text-gray-500 bg-gray-50 px-2.5 py-1 rounded-lg border border-gray-100">
                          {listing.quantity_available}
                        </span>
                      </div>
                      {listing.description && (
                        <p className="text-sm text-gray-500 mb-4 line-clamp-2 leading-relaxed">{listing.description}</p>
                      )}
                      {profile?.role === 'buyer' ? (
                        <button onClick={() => handleBuy(listing)} className="w-full py-2.5 bg-farm-green text-white font-semibold rounded-xl hover:bg-farm-green-light transition shadow-sm text-sm">
                          Buy Securely via Escrow
                        </button>
                      ) : !profile ? (
                        <button onClick={() => router.push('/login')} className="w-full py-2.5 bg-farm-green text-white font-semibold rounded-xl hover:bg-farm-green-light transition shadow-sm text-sm">
                          Sign In to Buy
                        </button>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
