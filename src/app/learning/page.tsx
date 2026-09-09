'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import { createClient } from '@/lib/supabase/client';
import type { LearningResource, LearningCategory, LearningContentType, LearningDifficulty } from '@/lib/types';
import { LEARNING_CONTENT_TYPE_CONFIG, LEARNING_DIFFICULTY_CONFIG } from '@/lib/types';
import { formatReadingTime } from '@/lib/utils';
import { CardSkeleton } from '@/components/ui/LoadingSkeleton';

const AiChat = dynamic(() => import('@/components/AiChat'), { ssr: false, loading: () => <div className="min-h-[600px] flex items-center justify-center"><div className="w-6 h-6 border-2 border-farm-green/30 border-t-farm-green rounded-full animate-spin" /></div> });

const PAGE_SIZE = 12;

function ResourceCard({ resource }: { resource: LearningResource }) {
  const typeCfg = LEARNING_CONTENT_TYPE_CONFIG[resource.content_type];
  const diffCfg = LEARNING_DIFFICULTY_CONFIG[resource.difficulty];

  return (
    <Link
      href={`/learning/${resource.slug}`}
      className="group block bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-lg hover:border-farm-green/20 transition-all duration-200"
    >
      {resource.featured_image && (
        <div className="relative aspect-[16/9] overflow-hidden bg-gray-100">
          <Image
            src={resource.featured_image}
            alt={resource.title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        </div>
      )}
      <div className="p-5">
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${typeCfg.color}`}>
            {typeCfg.label}
          </span>
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${diffCfg.color}`}>
            {diffCfg.label}
          </span>
        </div>
        <h3 className="text-base font-semibold text-gray-900 group-hover:text-farm-green transition-colors line-clamp-2 mb-2">
          {resource.title}
        </h3>
        {resource.summary && (
          <p className="text-sm text-gray-500 line-clamp-2 mb-3">{resource.summary}</p>
        )}
        <div className="flex items-center justify-between text-xs text-gray-400">
          <span className="flex items-center gap-1">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2" />
            </svg>
            {formatReadingTime(resource.reading_time_min)}
          </span>
          {resource.view_count > 0 && (
            <span>{resource.view_count} view{resource.view_count !== 1 ? 's' : ''}</span>
          )}
        </div>
      </div>
    </Link>
  );
}

function CategoryPill({
  category,
  selected,
  onSelect,
}: {
  category: { slug: string; name: string };
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
        selected
          ? 'bg-farm-green text-white shadow-sm'
          : 'bg-white text-gray-600 border border-gray-200 hover:border-farm-green/40 hover:text-farm-green'
      }`}
    >
      {category.name}
    </button>
  );
}

export default function LearningHubPage() {
  const [resources, setResources] = useState<LearningResource[]>([]);
  const [categories, setCategories] = useState<LearningCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [selectedType, setSelectedType] = useState<LearningContentType | ''>('');
  const [selectedDifficulty, setSelectedDifficulty] = useState<LearningDifficulty | ''>('');
  const [page, setPage] = useState(1);
  const [activeView, setActiveView] = useState<'ai' | 'browse'>('ai');

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      const supabase = createClient();
      const [catRes, resRes] = await Promise.all([
        supabase.from('learning_categories').select('*').eq('is_active', true).order('display_order'),
        supabase
          .from('learning_resources')
          .select('*, category:learning_categories(name, slug)')
          .eq('status', 'published')
          .order('is_featured', { ascending: false })
          .order('published_at', { ascending: false })
          .limit(100),
      ]);
      if (!cancelled) {
        if (catRes.data) setCategories(catRes.data);
        if (resRes.data) setResources(resRes.data as LearningResource[]);
        setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  const filtered = useMemo(() => {
    let list = [...resources];
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (r) =>
          r.title.toLowerCase().includes(q) ||
          r.summary?.toLowerCase().includes(q) ||
          r.tags.some((t) => t.toLowerCase().includes(q)),
      );
    }
    if (selectedCategory) {
      list = list.filter((r) => r.category_id === selectedCategory);
    }
    if (selectedType) {
      list = list.filter((r) => r.content_type === selectedType);
    }
    if (selectedDifficulty) {
      list = list.filter((r) => r.difficulty === selectedDifficulty);
    }
    return list;
  }, [resources, search, selectedCategory, selectedType, selectedDifficulty]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paged = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const featured = useMemo(() => resources.filter((r) => r.is_featured).slice(0, 3), [resources]);

  return (
    <div className="min-h-screen bg-[#FAF8F5]">
      {/* Hero */}
      <section className="bg-farm-green text-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
          <Link href="/dashboard/farmer" className="inline-flex items-center gap-1.5 text-sm text-white/60 hover:text-white transition-colors mb-6">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Back to Dashboard
          </Link>
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold mb-3">Learning Hub</h1>
              <p className="text-white/80 text-lg max-w-2xl">
                Ask our AI assistant anything about farming, or browse our knowledge base of articles, guides, and tutorials.
              </p>
            </div>
            {/* View toggle */}
            <div className="flex gap-1.5 p-1 bg-white/10 rounded-xl shrink-0">
              <button
                onClick={() => setActiveView('ai')}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                  activeView === 'ai' ? 'bg-white text-farm-green shadow-sm' : 'text-white/70 hover:text-white'
                }`}
              >
                <span className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                  </svg>
                  AI Assistant
                </span>
              </button>
              <button
                onClick={() => setActiveView('browse')}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                  activeView === 'browse' ? 'bg-white text-farm-green shadow-sm' : 'text-white/70 hover:text-white'
                }`}
              >
                <span className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
                  </svg>
                  Knowledge Base
                </span>
              </button>
            </div>
          </div>
        </div>
      </section>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {/* AI Assistant View */}
        {activeView === 'ai' && (
          <div className="max-w-3xl mx-auto">
            <AiChat className="min-h-[600px]" />

            {/* Quick feature links */}
            <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Link href="/dashboard/farmer/storage" className="flex items-center gap-3 p-4 bg-white rounded-2xl border border-gray-100 hover:shadow-md hover:border-farm-green/20 transition-all">
                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                  <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">Find Storage</p>
                  <p className="text-xs text-gray-500">Book warehouses & cold rooms</p>
                </div>
              </Link>
              <Link href="/marketplace" className="flex items-center gap-3 p-4 bg-white rounded-2xl border border-gray-100 hover:shadow-md hover:border-farm-green/20 transition-all">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
                  <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a.75.75 0 01.75-.75h3a.75.75 0 01.75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349m-16.5 11.65V9.35m0 0a3.001 3.001 0 003.75-.615A2.993 2.993 0 009.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 002.25 1.016c.896 0 1.7-.393 2.25-1.015A3.001 3.001 0 0021 9.35V3.75" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">Marketplace</p>
                  <p className="text-xs text-gray-500">Buy & sell produce</p>
                </div>
              </Link>
              <Link href="/dashboard/farmer" className="flex items-center gap-3 p-4 bg-white rounded-2xl border border-gray-100 hover:shadow-md hover:border-farm-green/20 transition-all">
                <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center shrink-0">
                  <svg className="w-5 h-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">My Dashboard</p>
                  <p className="text-xs text-gray-500">Manage your farm</p>
                </div>
              </Link>
            </div>
          </div>
        )}

        {/* Knowledge Base View */}
        {activeView === 'browse' && (
          <>
            {/* Search bar */}
            <div className="mb-8">
              <div className="relative max-w-xl">
                <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search articles, guides, tutorials..."
                  className="w-full pl-11 pr-4 py-3 rounded-xl bg-white border border-gray-200 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-farm-green/30 text-sm"
                />
              </div>
            </div>

            {/* Categories */}
            {categories.length > 0 && (
              <div className="mb-8">
                <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
                  <button
                    onClick={() => setSelectedCategory(null)}
                    className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                      selectedCategory === null
                        ? 'bg-farm-green text-white shadow-sm'
                        : 'bg-white text-gray-600 border border-gray-200 hover:border-farm-green/40 hover:text-farm-green'
                    }`}
                  >
                    All
                  </button>
                  {categories.map((cat) => (
                    <CategoryPill
                      key={cat.id}
                      category={cat}
                      selected={selectedCategory === cat.id}
                      onSelect={() => setSelectedCategory(selectedCategory === cat.id ? null : cat.id)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Filters row */}
            <div className="flex flex-wrap items-center gap-3 mb-8">
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value as LearningContentType | '')}
                className="px-3 py-2 rounded-xl border border-gray-200 text-sm bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-farm-green/30"
              >
                <option value="">All Types</option>
                {Object.entries(LEARNING_CONTENT_TYPE_CONFIG).map(([key, cfg]) => (
                  <option key={key} value={key}>{cfg.label}</option>
                ))}
              </select>
              <select
                value={selectedDifficulty}
                onChange={(e) => setSelectedDifficulty(e.target.value as LearningDifficulty | '')}
                className="px-3 py-2 rounded-xl border border-gray-200 text-sm bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-farm-green/30"
              >
                <option value="">All Levels</option>
                {Object.entries(LEARNING_DIFFICULTY_CONFIG).map(([key, cfg]) => (
                  <option key={key} value={key}>{cfg.label}</option>
                ))}
              </select>
              <span className="text-sm text-gray-400 ml-auto">
                {filtered.length} resource{filtered.length !== 1 ? 's' : ''}
              </span>
            </div>

            {/* Featured */}
            {!search && !selectedCategory && !selectedType && !selectedDifficulty && featured.length > 0 && (
              <div className="mb-10">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Featured</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {featured.map((r) => (
                    <ResourceCard key={r.id} resource={r} />
                  ))}
                </div>
              </div>
            )}

            {/* Resources grid */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                {search || selectedCategory || selectedType || selectedDifficulty ? 'Results' : 'All Resources'}
              </h2>
              {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <CardSkeleton key={i} />
                  ))}
                </div>
              ) : paged.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
                  <svg className="w-12 h-12 text-gray-300 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
                  </svg>
                  <p className="text-gray-500 text-sm">No learning resources found.</p>
                  <p className="text-gray-400 text-xs mt-1">Try adjusting your search or filters.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {paged.map((r) => (
                    <ResourceCard key={r.id} resource={r} />
                  ))}
                </div>
              )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-8">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={safePage === 1}
                  className="px-3 py-2 rounded-lg text-sm font-medium border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <span className="text-sm text-gray-500 px-3">
                  Page {safePage} of {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={safePage === totalPages}
                  className="px-3 py-2 rounded-lg text-sm font-medium border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
