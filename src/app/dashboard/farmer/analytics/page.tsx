'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { formatCurrency } from '@/lib/utils';

interface AnalyticsData {
  overview: {
    totalRevenue: number; periodRevenue: number; prevRevenue: number; revenueChange: number | null;
    totalSales: number; periodSales: number; prevSales: number; salesChange: number | null;
    activeListings: number; pendingListings: number;
    avgRating: number; totalRatings: number; trustScore: number;
    verificationTier: string; accountAgeDays: number;
  };
  revenue: {
    byMonth: Array<{ month: string; amount: number }>;
    byCategory: Array<{ category: string; amount: number }>;
  };
  products: {
    top: Array<{ category: string; count: number; revenue: number }>;
    totalCategories: number;
  };
  ratings: {
    average: number; total: number;
    distribution: Array<{ stars: number; count: number; pct: number }>;
    recent: Array<{ rating: number; comment: string | null; created_at: string; buyer: string }>;
  };
  logistics: {
    total: number; delivered: number; inTransit: number; failed: number;
    avgDeliveryDays: number | null; successRate: number | null;
  };
  storage: { activeBookings: number; totalBookings: number; totalSpending: number };
  demand: { openRequests: number; topRequested: Array<{ commodity: string; category: string; quantity: string; location: string }> };
}

const PERIODS = [
  { value: '7d', label: '7 Days' },
  { value: '30d', label: '30 Days' },
  { value: '90d', label: '90 Days' },
  { value: '12m', label: '12 Months' },
  { value: 'all', label: 'All Time' },
];

function BarChart({ data, maxVal, labelFn }: { data: Array<{ label: string; value: number }>; maxVal: number; labelFn?: (v: number) => string }) {
  const max = maxVal || Math.max(...data.map(d => d.value), 1);
  return (
    <div className="space-y-2">
      {data.map((d, i) => (
        <div key={i} className="flex items-center gap-3">
          <span className="text-xs text-gray-500 w-24 truncate text-right">{d.label}</span>
          <div className="flex-1 h-6 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-farm-green rounded-full transition-all duration-500"
              style={{ width: `${Math.max((d.value / max) * 100, d.value > 0 ? 4 : 0)}%` }}
            />
          </div>
          <span className="text-xs font-medium text-gray-700 w-20 text-right">
            {labelFn ? labelFn(d.value) : d.value.toLocaleString()}
          </span>
        </div>
      ))}
      {data.length === 0 && <p className="text-sm text-gray-400 text-center py-4">No data available</p>}
    </div>
  );
}

function TrendArrow({ change }: { change: number | null }) {
  if (change === null) return <span className="text-xs text-gray-400">—</span>;
  const color = change > 0 ? 'text-emerald-600' : change < 0 ? 'text-red-500' : 'text-gray-500';
  const arrow = change > 0 ? '↑' : change < 0 ? '↓' : '→';
  return <span className={`text-xs font-medium ${color}`}>{arrow} {Math.abs(change)}%</span>;
}

export default function FarmerAnalyticsPage() {
  const router = useRouter();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('30d');
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }

      try {
        const res = await fetch(`/api/analytics/farmer?period=${period}`);
        if (!res.ok) throw new Error('Failed to load');
        const analytics = await res.json();
        if (!cancelled) setData(analytics);
      } catch {
        if (!cancelled) setError('Failed to load analytics data.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [period, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-farm-cream flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-farm-green border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-500">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-farm-cream flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 mb-3">{error || 'No data available'}</p>
          <Link href="/dashboard/farmer" className="text-farm-green hover:underline text-sm">Back to Dashboard</Link>
        </div>
      </div>
    );
  }

  const { overview, revenue, products, ratings, logistics, storage, demand } = data;
  const hasData = overview.totalSales > 0 || overview.activeListings > 0;

  return (
    <div className="min-h-screen bg-farm-cream">
      {/* Header */}
      <section className="bg-gradient-to-br from-farm-green via-emerald-800 to-teal-900 text-white py-5 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="mb-3">
            <Link href="/dashboard/farmer" className="inline-flex items-center gap-2 text-sm text-white/70 hover:text-white transition-colors group">
              <svg className="w-4 h-4 group-hover:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              Back to Dashboard
            </Link>
          </div>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold">Analytics</h1>
              <p className="text-emerald-100/80 text-sm mt-1">Your performance at a glance</p>
            </div>
            <div className="flex gap-1.5 bg-white/10 rounded-xl p-1">
              {PERIODS.map(p => (
                <button
                  key={p.value}
                  onClick={() => { setPeriod(p.value); setLoading(true); }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    period === p.value ? 'bg-white text-farm-green' : 'text-white/70 hover:text-white'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {!hasData && (
          <div className="bg-white rounded-2xl p-8 text-center shadow-sm">
            <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-farm-green" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No analytics data yet</h3>
            <p className="text-gray-500 text-sm max-w-md mx-auto mb-4">
              Complete transactions, receive ratings, or create listings to start seeing your performance analytics.
            </p>
            <Link href="/dashboard/farmer/listings/new" className="inline-flex items-center gap-2 bg-farm-green text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-emerald-800 transition-colors">
              Create Your First Listing
            </Link>
          </div>
        )}

        {/* Overview Cards */}
        {hasData && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <p className="text-xs text-gray-500 mb-1">Revenue</p>
              <p className="text-xl font-bold text-gray-900">{formatCurrency(overview.periodRevenue)}</p>
              <div className="mt-1"><TrendArrow change={overview.revenueChange} /></div>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <p className="text-xs text-gray-500 mb-1">Sales</p>
              <p className="text-xl font-bold text-gray-900">{overview.periodSales}</p>
              <div className="mt-1"><TrendArrow change={overview.salesChange} /></div>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <p className="text-xs text-gray-500 mb-1">Active Listings</p>
              <p className="text-xl font-bold text-gray-900">{overview.activeListings}</p>
              {overview.pendingListings > 0 && (
                <p className="text-xs text-amber-600 mt-1">{overview.pendingListings} pending review</p>
              )}
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <p className="text-xs text-gray-500 mb-1">Avg Rating</p>
              <div className="flex items-baseline gap-1.5">
                <p className="text-xl font-bold text-gray-900">{overview.avgRating > 0 ? overview.avgRating : '—'}</p>
                {overview.totalRatings > 0 && (
                  <span className="text-xs text-gray-400">({overview.totalRatings})</span>
                )}
              </div>
              <div className="flex gap-0.5 mt-1">
                {[1,2,3,4,5].map(s => (
                  <svg key={s} className={`w-3.5 h-3.5 ${s <= Math.round(overview.avgRating) ? 'text-amber-400' : 'text-gray-200'}`} fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
            </div>
          </div>
        )}

        {hasData && (
          <>
            {/* Revenue Trend */}
            {revenue.byMonth.length > 0 && (
              <div className="bg-white rounded-xl p-5 shadow-sm">
                <h3 className="font-bold text-gray-900 mb-4">Revenue Trend</h3>
                <div className="flex items-end gap-1 h-40">
                  {revenue.byMonth.slice(-12).map((m, i) => {
                    const max = Math.max(...revenue.byMonth.map(x => x.amount), 1);
                    const height = Math.max((m.amount / max) * 100, 2);
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center gap-1">
                        <span className="text-[10px] text-gray-500">{formatCurrency(m.amount)}</span>
                        <div
                          className="w-full bg-farm-green rounded-t-md transition-all duration-500 hover:bg-emerald-700"
                          style={{ height: `${height}%`, minHeight: '4px' }}
                          title={`${m.month}: ${formatCurrency(m.amount)}`}
                        />
                        <span className="text-[10px] text-gray-400">{m.month.substring(5)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="grid md:grid-cols-2 gap-4">
              {/* Top Products */}
              {products.top.length > 0 && (
                <div className="bg-white rounded-xl p-5 shadow-sm">
                  <h3 className="font-bold text-gray-900 mb-3">Top Products</h3>
                  <BarChart
                    data={products.top.map(p => ({ label: p.category, value: p.count }))}
                    maxVal={Math.max(...products.top.map(p => p.count))}
                    labelFn={(v) => `${v} sales`}
                  />
                </div>
              )}

              {/* Revenue by Category */}
              {revenue.byCategory.length > 0 && (
                <div className="bg-white rounded-xl p-5 shadow-sm">
                  <h3 className="font-bold text-gray-900 mb-3">Revenue by Category</h3>
                  <BarChart
                    data={revenue.byCategory.map(c => ({ label: c.category, value: c.amount }))}
                    maxVal={Math.max(...revenue.byCategory.map(c => c.amount))}
                    labelFn={(v) => formatCurrency(v)}
                  />
                </div>
              )}
            </div>

            {/* Rating Distribution */}
            {ratings.total > 0 && (
              <div className="bg-white rounded-xl p-5 shadow-sm">
                <h3 className="font-bold text-gray-900 mb-3">Rating Distribution</h3>
                <div className="space-y-2">
                  {ratings.distribution.map(d => (
                    <div key={d.stars} className="flex items-center gap-3">
                      <span className="text-xs text-gray-500 w-8 text-right">{d.stars}★</span>
                      <div className="flex-1 h-5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-amber-400 rounded-full transition-all duration-500"
                          style={{ width: `${d.pct}%`, minWidth: d.count > 0 ? '8px' : '0' }}
                        />
                      </div>
                      <span className="text-xs text-gray-500 w-12 text-right">{d.count} ({d.pct}%)</span>
                    </div>
                  ))}
                </div>
                {ratings.recent.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <p className="text-xs font-medium text-gray-500 mb-2">Recent Reviews</p>
                    {ratings.recent.map((r, i) => (
                      <div key={i} className="py-2 border-b border-gray-50 last:border-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium text-gray-700">{r.buyer}</span>
                          <span className="text-amber-400 text-xs">{'★'.repeat(r.rating)}</span>
                          <span className="text-xs text-gray-400">{new Date(r.created_at).toLocaleDateString()}</span>
                        </div>
                        {r.comment && <p className="text-xs text-gray-500">{r.comment}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Logistics & Storage */}
            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-white rounded-xl p-5 shadow-sm">
                <h3 className="font-bold text-gray-900 mb-3">Delivery Performance</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="text-center p-3 bg-emerald-50 rounded-xl">
                    <p className="text-2xl font-bold text-emerald-700">{logistics.delivered}</p>
                    <p className="text-xs text-emerald-600">Delivered</p>
                  </div>
                  <div className="text-center p-3 bg-blue-50 rounded-xl">
                    <p className="text-2xl font-bold text-blue-700">{logistics.inTransit}</p>
                    <p className="text-xs text-blue-600">In Transit</p>
                  </div>
                </div>
                {logistics.successRate !== null && (
                  <div className="mt-3 text-center">
                    <span className="text-sm text-gray-500">Success Rate: </span>
                    <span className="text-sm font-bold text-gray-900">{logistics.successRate}%</span>
                  </div>
                )}
                {logistics.avgDeliveryDays !== null && (
                  <p className="text-xs text-gray-400 text-center mt-1">
                    Avg delivery: {logistics.avgDeliveryDays} days
                  </p>
                )}
              </div>

              <div className="bg-white rounded-xl p-5 shadow-sm">
                <h3 className="font-bold text-gray-900 mb-3">Storage</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="text-center p-3 bg-purple-50 rounded-xl">
                    <p className="text-2xl font-bold text-purple-700">{storage.activeBookings}</p>
                    <p className="text-xs text-purple-600">Active</p>
                  </div>
                  <div className="text-center p-3 bg-gray-50 rounded-xl">
                    <p className="text-2xl font-bold text-gray-700">{storage.totalBookings}</p>
                    <p className="text-xs text-gray-600">Total</p>
                  </div>
                </div>
                {storage.totalSpending > 0 && (
                  <p className="text-xs text-gray-500 text-center mt-3">
                    Total spent: <span className="font-medium">{formatCurrency(storage.totalSpending)}</span>
                  </p>
                )}
              </div>
            </div>

            {/* Buyer Demand */}
            {demand.topRequested.length > 0 && (
              <div className="bg-white rounded-xl p-5 shadow-sm">
                <h3 className="font-bold text-gray-900 mb-3">Buyer Demand on Platform</h3>
                <p className="text-xs text-gray-500 mb-3">Open buyer requests matching your categories</p>
                <div className="space-y-2">
                  {demand.topRequested.map((r, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{r.commodity}</p>
                        <p className="text-xs text-gray-500">{r.category} · {r.location}</p>
                      </div>
                      <span className="text-xs text-gray-400">{r.quantity}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
