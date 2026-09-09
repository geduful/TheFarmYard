'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { formatCurrency } from '@/lib/utils';

interface BuyerAnalyticsData {
  overview: {
    totalSpending: number; periodSpending: number; prevSpending: number; spendingChange: number | null;
    totalPurchases: number; periodPurchases: number; prevPurchases: number; purchasesChange: number | null;
    avgPurchaseValue: number; activeRequests: number; matchedRequests: number; fulfilledRequests: number;
    totalRequests: number; ratingsGiven: number; avgRating: number; verificationTier: string;
  };
  spending: {
    byMonth: Array<{ month: string; amount: number }>;
    byCategory: Array<{ category: string; amount: number }>;
  };
  purchases: {
    topCategories: Array<{ category: string; count: number; spending: number }>;
    totalCategories: number;
  };
  requests: {
    total: number; open: number; matched: number; fulfilled: number;
    topCategories: Array<{ category: string; count: number }>;
    topLocations: Array<{ location: string; count: number }>;
  };
  logistics: { total: number; delivered: number; inTransit: number };
  period: string;
}

const PERIODS = [
  { value: '7d', label: '7 Days' },
  { value: '30d', label: '30 Days' },
  { value: '90d', label: '90 Days' },
  { value: '12m', label: '12 Months' },
  { value: 'all', label: 'All Time' },
];

function TrendArrow({ change }: { change: number | null }) {
  if (change === null) return <span className="text-xs text-gray-400">—</span>;
  const color = change > 0 ? 'text-emerald-600' : change < 0 ? 'text-red-500' : 'text-gray-500';
  const arrow = change > 0 ? '↑' : change < 0 ? '↓' : '→';
  return <span className={`text-xs font-medium ${color}`}>{arrow} {Math.abs(change)}%</span>;
}

function BarChart({ data, maxVal, labelFn }: { data: Array<{ label: string; value: number }>; maxVal: number; labelFn?: (v: number) => string }) {
  const max = maxVal || Math.max(...data.map(d => d.value), 1);
  return (
    <div className="space-y-2">
      {data.map((d, i) => (
        <div key={i} className="flex items-center gap-3">
          <span className="text-xs text-gray-500 w-24 truncate text-right">{d.label}</span>
          <div className="flex-1 h-6 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 rounded-full transition-all duration-500"
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

export default function BuyerAnalyticsPage() {
  const router = useRouter();
  const [data, setData] = useState<BuyerAnalyticsData | null>(null);
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
        const res = await fetch(`/api/analytics/buyer?period=${period}`);
        if (!res.ok) throw new Error('Failed to load');
        if (!cancelled) setData(await res.json());
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
          <Link href="/dashboard/buyer" className="text-farm-green hover:underline text-sm">Back to Dashboard</Link>
        </div>
      </div>
    );
  }

  const { overview, spending, requests } = data;
  const hasData = overview.totalPurchases > 0 || overview.totalRequests > 0;

  return (
    <div className="min-h-screen bg-farm-cream">
      <section className="bg-gradient-to-br from-farm-green via-emerald-800 to-teal-900 text-white py-5 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="mb-3">
            <Link href="/dashboard/buyer" className="inline-flex items-center gap-2 text-sm text-white/70 hover:text-white transition-colors group">
              <svg className="w-4 h-4 group-hover:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              Back to Dashboard
            </Link>
          </div>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold">Analytics</h1>
              <p className="text-emerald-100/80 text-sm mt-1">Your purchasing activity</p>
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
            <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121 0 2.09-.773 2.34-1.872l1.836-8.046A1.125 1.125 0 0018.054 3H4.897m0 0l-.383 1.437A1.125 1.125 0 013.506 3h.386m12 5.25a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No purchase data yet</h3>
            <p className="text-gray-500 text-sm max-w-md mx-auto mb-4">
              Browse the marketplace, create buyer requests, or complete purchases to see your analytics.
            </p>
            <Link href="/marketplace" className="inline-flex items-center gap-2 bg-farm-green text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-emerald-800 transition-colors">
              Browse Marketplace
            </Link>
          </div>
        )}

        {hasData && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <p className="text-xs text-gray-500 mb-1">Spending</p>
              <p className="text-xl font-bold text-gray-900">{formatCurrency(overview.periodSpending)}</p>
              <div className="mt-1"><TrendArrow change={overview.spendingChange} /></div>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <p className="text-xs text-gray-500 mb-1">Purchases</p>
              <p className="text-xl font-bold text-gray-900">{overview.periodPurchases}</p>
              <div className="mt-1"><TrendArrow change={overview.purchasesChange} /></div>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <p className="text-xs text-gray-500 mb-1">Avg Purchase</p>
              <p className="text-xl font-bold text-gray-900">{formatCurrency(overview.avgPurchaseValue)}</p>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <p className="text-xs text-gray-500 mb-1">Buyer Requests</p>
              <p className="text-xl font-bold text-gray-900">{overview.totalRequests}</p>
              <p className="text-xs text-gray-400 mt-1">{overview.activeRequests} active</p>
            </div>
          </div>
        )}

        {hasData && (
          <>
            {spending.byMonth.length > 0 && (
              <div className="bg-white rounded-xl p-5 shadow-sm">
                <h3 className="font-bold text-gray-900 mb-4">Spending Trend</h3>
                <div className="flex items-end gap-1 h-40">
                  {spending.byMonth.slice(-12).map((m, i) => {
                    const max = Math.max(...spending.byMonth.map(x => x.amount), 1);
                    const height = Math.max((m.amount / max) * 100, 2);
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center gap-1">
                        <span className="text-[10px] text-gray-500">{formatCurrency(m.amount)}</span>
                        <div
                          className="w-full bg-blue-500 rounded-t-md transition-all duration-500 hover:bg-blue-600"
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
              {spending.byCategory.length > 0 && (
                <div className="bg-white rounded-xl p-5 shadow-sm">
                  <h3 className="font-bold text-gray-900 mb-3">Spending by Category</h3>
                  <BarChart
                    data={spending.byCategory.map(c => ({ label: c.category, value: c.amount }))}
                    maxVal={Math.max(...spending.byCategory.map(c => c.amount))}
                    labelFn={(v) => formatCurrency(v)}
                  />
                </div>
              )}

              {requests.topCategories.length > 0 && (
                <div className="bg-white rounded-xl p-5 shadow-sm">
                  <h3 className="font-bold text-gray-900 mb-3">Most Requested Categories</h3>
                  <BarChart
                    data={requests.topCategories.map(c => ({ label: c.category, value: c.count }))}
                    maxVal={Math.max(...requests.topCategories.map(c => c.count))}
                    labelFn={(v) => `${v} requests`}
                  />
                </div>
              )}
            </div>

            {requests.topLocations.length > 0 && (
              <div className="bg-white rounded-xl p-5 shadow-sm">
                <h3 className="font-bold text-gray-900 mb-3">High-Demand Locations</h3>
                <p className="text-xs text-gray-500 mb-3">Where buyers are looking for produce</p>
                <div className="flex flex-wrap gap-2">
                  {requests.topLocations.map((l, i) => (
                    <div key={i} className="flex items-center gap-2 px-3 py-2 bg-blue-50 rounded-xl border border-blue-100">
                      <svg className="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                      </svg>
                      <span className="text-sm text-blue-800">{l.location}</span>
                      <span className="text-xs text-blue-500">({l.count})</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-white rounded-xl p-5 shadow-sm">
              <h3 className="font-bold text-gray-900 mb-3">Request Status</h3>
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center p-3 bg-emerald-50 rounded-xl">
                  <p className="text-2xl font-bold text-emerald-700">{requests.open}</p>
                  <p className="text-xs text-emerald-600">Open</p>
                </div>
                <div className="text-center p-3 bg-amber-50 rounded-xl">
                  <p className="text-2xl font-bold text-amber-700">{requests.matched}</p>
                  <p className="text-xs text-amber-600">Matched</p>
                </div>
                <div className="text-center p-3 bg-blue-50 rounded-xl">
                  <p className="text-2xl font-bold text-blue-700">{requests.fulfilled}</p>
                  <p className="text-xs text-blue-600">Fulfilled</p>
                </div>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
