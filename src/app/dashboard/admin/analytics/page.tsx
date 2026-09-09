'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { formatCurrency } from '@/lib/utils';

interface AdminAnalyticsData {
  overview: {
    totalUsers: number; farmers: number; buyers: number; verifiedFarmers: number;
    newUsersPeriod: number; newFarmersPeriod: number; newBuyersPeriod: number;
    activeListings: number; totalListings: number;
    totalTransactions: number; totalVolume: number; platformRevenue: number; farmerEarnings: number;
    avgRating: number; totalRatings: number; openReports: number;
  };
  users: { byMonth: Array<{ month: string; farmers: number; buyers: number }> };
  transactions: { byMonth: Array<{ month: string; amount: number }> };
  marketplace: {
    byCategory: Array<{ category: string; count: number }>;
    byLocation: Array<{ location: string; count: number }>;
  };
  supplyDemand: Array<{ category: string; supply: number; demand: number; signal: string }>;
  demand: { byLocation: Array<{ location: string; count: number }> };
  logistics: { total: number; delivered: number; inTransit: number; failed: number; successRate: number | null };
  storage: { activeBookings: number; totalBookings: number; revenue: number };
  learning: { totalResources: number; published: number; totalViews: number };
  news: { totalArticles: number; published: number; totalViews: number };
  period: string;
}

const PERIODS = [
  { value: '7d', label: '7 Days' },
  { value: '30d', label: '30 Days' },
  { value: '90d', label: '90 Days' },
  { value: '12m', label: '12 Months' },
];

function StatCard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div className="bg-white rounded-xl p-4 shadow-sm">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className={`text-xl font-bold ${color || 'text-gray-900'}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

function BarChart({ data, maxVal, labelFn, color = 'bg-farm-green' }: {
  data: Array<{ label: string; value: number }>; maxVal: number; labelFn?: (v: number) => string; color?: string;
}) {
  const max = maxVal || Math.max(...data.map(d => d.value), 1);
  return (
    <div className="space-y-2">
      {data.map((d, i) => (
        <div key={i} className="flex items-center gap-3">
          <span className="text-xs text-gray-500 w-28 truncate text-right">{d.label}</span>
          <div className="flex-1 h-6 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full ${color} rounded-full transition-all duration-500`}
              style={{ width: `${Math.max((d.value / max) * 100, d.value > 0 ? 4 : 0)}%` }}
            />
          </div>
          <span className="text-xs font-medium text-gray-700 w-20 text-right">
            {labelFn ? labelFn(d.value) : d.value.toLocaleString()}
          </span>
        </div>
      ))}
      {data.length === 0 && <p className="text-sm text-gray-400 text-center py-4">No data</p>}
    </div>
  );
}

export default function AdminAnalyticsPage() {
  const router = useRouter();
  const [data, setData] = useState<AdminAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('30d');
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }

      const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
      if (profile?.role !== 'admin') { router.push('/dashboard'); return; }

      try {
        const res = await fetch(`/api/analytics/admin?period=${period}`);
        if (!res.ok) throw new Error('Failed to load');
        if (!cancelled) setData(await res.json());
      } catch {
        if (!cancelled) setError('Failed to load analytics.');
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
          <Link href="/dashboard/admin" className="text-farm-green hover:underline text-sm">Back to Dashboard</Link>
        </div>
      </div>
    );
  }

  const { overview, users, transactions, marketplace, supplyDemand, demand, logistics, storage, learning, news } = data;

  return (
    <div className="min-h-screen bg-farm-cream">
      <section className="bg-gradient-to-br from-farm-green via-emerald-800 to-teal-900 text-white py-5 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="mb-3">
            <Link href="/dashboard/admin" className="inline-flex items-center gap-2 text-sm text-white/70 hover:text-white transition-colors group">
              <svg className="w-4 h-4 group-hover:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              Back to Dashboard
            </Link>
          </div>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold">Platform Analytics</h1>
              <p className="text-emerald-100/80 text-sm mt-1">TheFarmYard overview</p>
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

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Overview */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard label="Total Users" value={overview.totalUsers} sub={`${overview.farmers} farmers · ${overview.buyers} buyers`} />
          <StatCard label="Active Listings" value={overview.activeListings} sub={`${overview.totalListings} total`} />
          <StatCard label="Total Volume" value={formatCurrency(overview.totalVolume)} sub={`${overview.totalTransactions} transactions`} color="text-emerald-700" />
          <StatCard label="Platform Revenue" value={formatCurrency(overview.platformRevenue)} color="text-farm-green" />
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard label="New Users" value={overview.newUsersPeriod} sub={`${overview.newFarmersPeriod} farmers · ${overview.newBuyersPeriod} buyers`} />
          <StatCard label="Avg Rating" value={overview.avgRating > 0 ? overview.avgRating : '—'} sub={`${overview.totalRatings} ratings`} />
          <StatCard label="Open Reports" value={overview.openReports} color={overview.openReports > 0 ? 'text-red-600' : 'text-gray-900'} />
          <StatCard label="Storage Revenue" value={formatCurrency(storage.revenue)} sub={`${storage.activeBookings} active`} />
        </div>

        {/* User Growth */}
        {users.byMonth.length > 0 && (
          <div className="bg-white rounded-xl p-5 shadow-sm">
            <h3 className="font-bold text-gray-900 mb-4">User Growth</h3>
            <div className="flex items-end gap-1 h-40">
              {users.byMonth.slice(-12).map((m, i) => {
                const total = m.farmers + m.buyers;
                const max = Math.max(...users.byMonth.map(x => x.farmers + x.buyers), 1);
                const height = Math.max((total / max) * 100, 2);
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-[10px] text-gray-500">{total}</span>
                    <div
                      className="w-full bg-farm-green rounded-t-md transition-all duration-500"
                      style={{ height: `${height}%`, minHeight: '4px' }}
                      title={`${m.month}: ${m.farmers} farmers, ${m.buyers} buyers`}
                    />
                    <span className="text-[10px] text-gray-400">{m.month.substring(5)}</span>
                  </div>
                );
              })}
            </div>
            <div className="flex items-center gap-4 mt-3 justify-center">
              <div className="flex items-center gap-1.5"><div className="w-3 h-3 bg-farm-green rounded" /><span className="text-xs text-gray-500">Farmers + Buyers</span></div>
            </div>
          </div>
        )}

        {/* Revenue Trend */}
        {transactions.byMonth.length > 0 && (
          <div className="bg-white rounded-xl p-5 shadow-sm">
            <h3 className="font-bold text-gray-900 mb-4">Transaction Volume</h3>
            <div className="flex items-end gap-1 h-40">
              {transactions.byMonth.slice(-12).map((m, i) => {
                const max = Math.max(...transactions.byMonth.map(x => x.amount), 1);
                const height = Math.max((m.amount / max) * 100, 2);
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-[10px] text-gray-500">{formatCurrency(m.amount)}</span>
                    <div
                      className="w-full bg-emerald-600 rounded-t-md transition-all duration-500"
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
          {/* Marketplace by Category */}
          {marketplace.byCategory.length > 0 && (
            <div className="bg-white rounded-xl p-5 shadow-sm">
              <h3 className="font-bold text-gray-900 mb-3">Listings by Category</h3>
              <BarChart
                data={marketplace.byCategory.slice(0, 8).map(c => ({ label: c.category, value: c.count }))}
                maxVal={Math.max(...marketplace.byCategory.map(c => c.count))}
              />
            </div>
          )}

          {/* Listings by Location */}
          {marketplace.byLocation.length > 0 && (
            <div className="bg-white rounded-xl p-5 shadow-sm">
              <h3 className="font-bold text-gray-900 mb-3">Listings by Location</h3>
              <BarChart
                data={marketplace.byLocation.slice(0, 8).map(l => ({ label: l.location, value: l.count }))}
                maxVal={Math.max(...marketplace.byLocation.map(l => l.count))}
                color="bg-blue-500"
              />
            </div>
          )}
        </div>

        {/* Supply vs Demand */}
        {supplyDemand.length > 0 && (
          <div className="bg-white rounded-xl p-5 shadow-sm">
            <h3 className="font-bold text-gray-900 mb-3">Supply vs Demand</h3>
            <p className="text-xs text-gray-500 mb-4">Comparing active listings (supply) against buyer requests (demand)</p>
            <div className="space-y-3">
              {supplyDemand.slice(0, 10).map((sd, i) => {
                const max = Math.max(sd.supply, sd.demand, 1);
                const supplyPct = (sd.supply / max) * 100;
                const demandPct = (sd.demand / max) * 100;
                const signalColor = sd.signal === 'high_demand' ? 'bg-amber-500' : sd.signal === 'high_supply' ? 'bg-blue-500' : 'bg-emerald-500';
                const signalLabel = sd.signal === 'high_demand' ? 'High Demand' : sd.signal === 'high_supply' ? 'High Supply' : 'Balanced';
                return (
                  <div key={i}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-700">{sd.category}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${signalColor} text-white`}>{signalLabel}</span>
                    </div>
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <div className="text-[10px] text-gray-400 mb-0.5">Supply: {sd.supply}</div>
                        <div className="h-4 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-farm-green rounded-full" style={{ width: `${supplyPct}%` }} />
                        </div>
                      </div>
                      <div className="flex-1">
                        <div className="text-[10px] text-gray-400 mb-0.5">Demand: {sd.demand}</div>
                        <div className="h-4 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-amber-500 rounded-full" style={{ width: `${demandPct}%` }} />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex items-center gap-4 mt-4 justify-center">
              <div className="flex items-center gap-1.5"><div className="w-3 h-3 bg-farm-green rounded" /><span className="text-xs text-gray-500">Supply</span></div>
              <div className="flex items-center gap-1.5"><div className="w-3 h-3 bg-amber-500 rounded" /><span className="text-xs text-gray-500">Demand</span></div>
            </div>
          </div>
        )}

        {/* Demand by Location */}
        {demand.byLocation.length > 0 && (
          <div className="bg-white rounded-xl p-5 shadow-sm">
            <h3 className="font-bold text-gray-900 mb-3">High-Demand Locations</h3>
            <div className="flex flex-wrap gap-2">
              {demand.byLocation.map((l, i) => (
                <div key={i} className="flex items-center gap-2 px-3 py-2 bg-amber-50 rounded-xl border border-amber-100">
                  <svg className="w-4 h-4 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                  </svg>
                  <span className="text-sm text-amber-800">{l.location}</span>
                  <span className="text-xs text-amber-500">({l.count})</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid md:grid-cols-3 gap-4">
          {/* Logistics */}
          <div className="bg-white rounded-xl p-5 shadow-sm">
            <h3 className="font-bold text-gray-900 mb-3">Logistics</h3>
            <div className="grid grid-cols-2 gap-2">
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
              <p className="text-xs text-gray-500 text-center mt-3">
                Success rate: <span className="font-medium">{logistics.successRate}%</span>
              </p>
            )}
            {logistics.failed > 0 && (
              <p className="text-xs text-red-500 text-center mt-1">{logistics.failed} failed</p>
            )}
          </div>

          {/* Content */}
          <div className="bg-white rounded-xl p-5 shadow-sm">
            <h3 className="font-bold text-gray-900 mb-3">Content</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-purple-50 rounded-xl">
                <div>
                  <p className="text-sm font-medium text-purple-800">Learning Hub</p>
                  <p className="text-xs text-purple-600">{learning.published} published</p>
                </div>
                <span className="text-lg font-bold text-purple-700">{learning.totalViews}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-cyan-50 rounded-xl">
                <div>
                  <p className="text-sm font-medium text-cyan-800">News</p>
                  <p className="text-xs text-cyan-600">{news.published} published</p>
                </div>
                <span className="text-lg font-bold text-cyan-700">{news.totalViews}</span>
              </div>
            </div>
          </div>

          {/* Farmer Earnings */}
          <div className="bg-white rounded-xl p-5 shadow-sm">
            <h3 className="font-bold text-gray-900 mb-3">Earnings Distribution</h3>
            <div className="space-y-3">
              <div className="text-center p-4 bg-farm-green/10 rounded-xl">
                <p className="text-xs text-gray-500 mb-1">Farmer Earnings</p>
                <p className="text-2xl font-bold text-farm-green">{formatCurrency(overview.farmerEarnings)}</p>
              </div>
              <div className="text-center p-4 bg-emerald-50 rounded-xl">
                <p className="text-xs text-gray-500 mb-1">Platform Revenue</p>
                <p className="text-2xl font-bold text-emerald-700">{formatCurrency(overview.platformRevenue)}</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
