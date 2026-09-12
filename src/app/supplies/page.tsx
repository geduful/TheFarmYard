'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { SupplyProduct, SupplyProductCategory } from '@/lib/types';
import { SUPPLY_PRODUCT_CATEGORY_CONFIG } from '@/lib/types';

const PAGE_SIZE = 24;
const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest' },
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
  { value: 'name', label: 'Name' },
] as const;

const CATEGORIES: { value: SupplyProductCategory | ''; label: string }[] = [
  { value: '', label: 'All Categories' },
  ...Object.entries(SUPPLY_PRODUCT_CATEGORY_CONFIG).map(([k, v]) => ({ value: k as SupplyProductCategory, label: v.label })),
];

export default function SuppliesPage() {
  const [products, setProducts] = useState<SupplyProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [sort, setSort] = useState('newest');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const params = new URLSearchParams({ mode: 'public', sort, page: String(page), limit: String(PAGE_SIZE) });
        if (search) params.set('search', search);
        if (category) params.set('category', category);
        const res = await fetch(`/api/supplier/products?${params}`);
        if (!cancelled && res.ok) {
          const data = await res.json();
          setProducts(data.products || []);
          setTotalPages(data.pagination?.totalPages || 1);
          setTotal(data.pagination?.total || 0);
        }
      } catch (e) { console.error(e); }
      if (!cancelled) setLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, [search, category, sort, page]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-cream to-white">
      {/* Header */}
      <div className="bg-gradient-to-r from-farm-green to-emerald-green text-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
          <div className="flex items-center gap-3 mb-3">
            <Link href="/" className="text-white/70 hover:text-white text-sm transition">Home</Link>
            <svg className="w-4 h-4 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            <span className="text-white/90 text-sm font-medium">Agricultural Supplies</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold mb-2">Agricultural Supplies & Inputs</h1>
          <p className="text-white/80 text-base sm:text-lg max-w-2xl">
            Browse genuine agricultural inputs from verified suppliers. Seeds, fertilizers, equipment, and more.
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Search & Sort */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="flex-1 relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" /></svg>
            <input
              type="text"
              placeholder="Search products, brands, categories..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full pl-10 pr-4 py-3 bg-white rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-farm-green focus:border-farm-green transition"
            />
          </div>
          <select
            value={sort}
            onChange={(e) => { setSort(e.target.value); setPage(1); }}
            className="px-4 py-3 bg-white rounded-xl border border-gray-200 text-sm font-medium focus:ring-2 focus:ring-farm-green"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        {/* Mobile filter toggle */}
        <button
          onClick={() => setShowMobileFilters(!showMobileFilters)}
          className="sm:hidden flex items-center gap-2 px-4 py-2.5 bg-white rounded-xl border border-gray-200 text-sm font-medium text-gray-700 mb-4 w-full justify-center"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" /></svg>
          Filters {category ? '(1)' : ''}
        </button>

        {/* Categories */}
        <div className={`${showMobileFilters ? 'block' : 'hidden'} sm:block mb-6`}>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((cat) => {
              const config = cat.value ? SUPPLY_PRODUCT_CATEGORY_CONFIG[cat.value] : null;
              return (
                <button
                  key={cat.value}
                  onClick={() => { setCategory(cat.value); setPage(1); }}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                    category === cat.value
                      ? 'bg-farm-green text-white shadow-sm'
                      : 'bg-white text-gray-600 border border-gray-200 hover:border-farm-green hover:text-farm-green'
                  }`}
                >
                  {config?.label || cat.label}
                </button>
              );
            })}
          </div>
        </div>

        <p className="text-sm text-gray-500 mb-4">{total} product{total !== 1 ? 's' : ''} found</p>

        {/* Products Grid */}
        {loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="aspect-[4/3] skeleton" />
                <div className="p-4 space-y-3">
                  <div className="h-4 skeleton w-1/3 rounded" />
                  <div className="h-5 skeleton w-3/4 rounded" />
                  <div className="h-4 skeleton w-1/2 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
            <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" /></svg>
            </div>
            <p className="text-gray-500 font-medium">No products found</p>
            <p className="text-gray-400 text-sm mt-1">Try adjusting your search or filters.</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {products.map((product) => {
              const config = SUPPLY_PRODUCT_CATEGORY_CONFIG[product.category];
              const supplier = product.supplier as Record<string, unknown> | undefined;
              return (
                <div key={product.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden card-hover animate-fade-in flex flex-col">
                  {product.image_url ? (
                    <div className="aspect-[4/3] bg-gray-100 relative">
                      <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                      <span className={`absolute top-3 left-3 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config?.color || 'bg-gray-100 text-gray-600'}`}>
                        {config?.label}
                      </span>
                    </div>
                  ) : (
                    <div className="aspect-[4/3] bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center relative">
                      <span className="text-4xl text-gray-300"><svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" /></svg></span>
                      <span className={`absolute top-3 left-3 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config?.color || 'bg-gray-100 text-gray-600'}`}>
                        {config?.label}
                      </span>
                    </div>
                  )}
                  <div className="p-4 flex flex-col flex-1">
                    <h3 className="font-semibold text-gray-900 text-sm mb-1 line-clamp-2">
                      <Link href={`/supplies/${product.id}`} className="hover:text-farm-green transition-colors">{product.name}</Link>
                    </h3>
                    {supplier && (
                      <div className="flex items-center gap-1.5 mb-2">
                        <span className="text-xs text-gray-500">{String(supplier.business_name)}</span>
                        {supplier.verification_status === 'approved' && (
                          <svg className="w-3.5 h-3.5 text-farm-green" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                        )}
                      </div>
                    )}
                    <div className="mt-auto">
                      <div className="flex items-baseline gap-1 mb-2">
                        <span className="text-lg font-bold text-farm-green">GH₵ {Number(product.price).toFixed(2)}</span>
                        <span className="text-xs text-gray-400">/ {product.unit}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-gray-400">
                        <span>Min: {product.min_order_quantity} {product.unit}</span>
                        <span className={product.stock_quantity > 0 ? 'text-emerald-600' : 'text-red-500'}>
                          {product.stock_quantity > 0 ? `${product.stock_quantity} available` : 'Out of stock'}
                        </span>
                      </div>
                      <Link
                        href={`/supplies/${product.id}`}
                        className="mt-3 block text-center px-4 py-2 bg-farm-green text-white text-sm font-semibold rounded-xl hover:bg-farm-green-light transition active:scale-[0.97]"
                      >
                        View Details
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-8">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-3 py-2 text-sm font-medium rounded-lg border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              Previous
            </button>
            <span className="px-4 py-2 text-sm text-gray-600">Page {page} of {totalPages}</span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="px-3 py-2 text-sm font-medium rounded-lg border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
