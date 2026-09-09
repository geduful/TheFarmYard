'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

interface Commodity {
  id: number;
  name: string;
  slug: string;
  category: string;
  unit: string;
}

interface MarketPrice {
  id: number;
  commodity_id: number;
  market_name: string;
  region: string | null;
  price: number;
  currency: string;
  unit: string;
  previous_price: number | null;
  price_change: number | null;
  price_change_pct: number | null;
  trend: 'up' | 'down' | 'stable' | 'unknown';
  data_date: string;
  fetched_at: string;
  commodity: { name: string; slug: string; unit: string; category: string } | null;
}

interface MarketAlert {
  id: number;
  commodity_id: number;
  market_name: string | null;
  alert_type: 'above' | 'below';
  threshold_price: number;
  is_active: boolean;
  commodity: { name: string; slug: string; unit: string } | null;
}

export default function MarketContent() {
  const searchParams = useSearchParams();
  const initialCommodity = searchParams.get('commodity') || '';

  const [commodities, setCommodities] = useState<Commodity[]>([]);
  const [prices, setPrices] = useState<MarketPrice[]>([]);
  const [alerts, setAlerts] = useState<MarketAlert[]>([]);
  const [selectedCommodity, setSelectedCommodity] = useState(initialCommodity);
  const [selectedMarket, setSelectedMarket] = useState('');
  const [loading, setLoading] = useState(true);
  const [showAlertForm, setShowAlertForm] = useState(false);
  const [alertForm, setAlertForm] = useState({ commodityId: 0, marketName: '', alertType: 'above' as 'above' | 'below', thresholdPrice: 0 });

  useEffect(() => {
    async function fetchCommodities() {
      const res = await fetch('/api/news/prices');
      const data = await res.json();
      const unique = new Map<number, Commodity>();
      for (const p of data.prices || []) {
        if (p.commodity && !unique.has(p.commodity_id)) {
          unique.set(p.commodity_id, {
            id: p.commodity_id,
            name: p.commodity.name,
            slug: p.commodity.slug,
            category: p.commodity.category,
            unit: p.commodity.unit,
          });
        }
      }
      setCommodities(Array.from(unique.values()));
    }
    fetchCommodities();
  }, []);

  useEffect(() => {
    async function fetchPrices() {
      setLoading(true);
      let url = '/api/news/prices?';
      if (selectedCommodity) {
        const comm = commodities.find(c => c.slug === selectedCommodity);
        if (comm) url += `commodity_id=${comm.id}&`;
      }
      if (selectedMarket) url += `market=${encodeURIComponent(selectedMarket)}`;
      const res = await fetch(url);
      const data = await res.json();
      setPrices(data.prices || []);
      setLoading(false);
    }
    fetchPrices();
  }, [selectedCommodity, selectedMarket, commodities]);

  useEffect(() => {
    async function fetchAlerts() {
      try {
        const res = await fetch('/api/news/alerts');
        const data = await res.json();
        setAlerts(data.alerts || []);
      } catch {
        // Not logged in or error
      }
    }
    fetchAlerts();
  }, []);

  const formatPrice = (price: number) => `GH₵ ${price.toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const formatTrend = (change: number | null, pct: number | null) => {
    if (change === null || pct === null) return { text: '—', color: 'text-gray-400' };
    const sign = change >= 0 ? '+' : '';
    return {
      text: `${sign}${change.toFixed(2)} (${sign}${pct.toFixed(1)}%)`,
      color: change > 0 ? 'text-red-600' : change < 0 ? 'text-emerald-600' : 'text-gray-600',
    };
  };

  const formatDataDate = (d: string) => {
    const date = new Date(d);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays <= 7) return `${diffDays} days ago`;
    return date.toLocaleDateString('en-GH', { month: 'short', day: 'numeric' });
  };

  const handleCreateAlert = async () => {
    try {
      const res = await fetch('/api/news/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(alertForm),
      });
      if (res.ok) {
        const data = await res.json();
        setAlerts(prev => [data.alert, ...prev]);
        setShowAlertForm(false);
        setAlertForm({ commodityId: 0, marketName: '', alertType: 'above', thresholdPrice: 0 });
      }
    } catch {
      // Error
    }
  };

  const handleDeleteAlert = async (alertId: number) => {
    try {
      await fetch('/api/news/alerts', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alertId }),
      });
      setAlerts(prev => prev.filter(a => a.id !== alertId));
    } catch {
      // Error
    }
  };

  const pricesByCommodity = prices.reduce((acc, p) => {
    const name = p.commodity?.name || 'Unknown';
    if (!acc[name]) acc[name] = [];
    acc[name].push(p);
    return acc;
  }, {} as Record<string, MarketPrice[]>);

  const uniqueMarkets = [...new Set(prices.map(p => p.market_name))].sort();

  return (
    <main className="max-w-6xl mx-auto px-4 py-8">
      {/* Filters */}
      <div className="bg-white rounded-xl p-4 shadow-sm mb-6">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">Commodity</label>
            <select
              value={selectedCommodity}
              onChange={(e) => setSelectedCommodity(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-farm-green focus:border-transparent"
            >
              <option value="">All Commodities</option>
              {commodities.map(c => (
                <option key={c.id} value={c.slug}>{c.name} ({c.unit})</option>
              ))}
            </select>
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">Market</label>
            <select
              value={selectedMarket}
              onChange={(e) => setSelectedMarket(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-farm-green focus:border-transparent"
            >
              <option value="">All Markets</option>
              {uniqueMarkets.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
          <button
            onClick={() => setShowAlertForm(!showAlertForm)}
            className="px-4 py-2 bg-farm-green text-white rounded-lg text-sm font-medium hover:bg-emerald-800 transition-colors"
          >
            + Price Alert
          </button>
        </div>
      </div>

      {/* Price Alert Form */}
      {showAlertForm && (
        <div className="bg-white rounded-xl p-5 shadow-sm mb-6 border border-emerald-200">
          <h3 className="font-bold text-farm-green mb-4">Create Price Alert</h3>
          <div className="grid sm:grid-cols-4 gap-4">
            <select
              value={alertForm.commodityId}
              onChange={(e) => setAlertForm(prev => ({ ...prev, commodityId: parseInt(e.target.value) }))}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
            >
              <option value={0}>Select commodity</option>
              {commodities.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <input
              type="text"
              placeholder="Market (optional)"
              value={alertForm.marketName}
              onChange={(e) => setAlertForm(prev => ({ ...prev, marketName: e.target.value }))}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
            <select
              value={alertForm.alertType}
              onChange={(e) => setAlertForm(prev => ({ ...prev, alertType: e.target.value as 'above' | 'below' }))}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
            >
              <option value="above">Price goes above</option>
              <option value="below">Price goes below</option>
            </select>
            <div className="flex gap-2">
              <input
                type="number"
                placeholder="GH₵ threshold"
                value={alertForm.thresholdPrice || ''}
                onChange={(e) => setAlertForm(prev => ({ ...prev, thresholdPrice: parseFloat(e.target.value) || 0 }))}
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
              <button
                onClick={handleCreateAlert}
                disabled={!alertForm.commodityId || !alertForm.thresholdPrice}
                className="px-4 py-2 bg-farm-green text-white rounded-lg text-sm font-medium hover:bg-emerald-800 transition-colors disabled:opacity-50"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Active Alerts */}
      {alerts.length > 0 && (
        <div className="bg-white rounded-xl p-5 shadow-sm mb-6">
          <h3 className="font-bold text-farm-green mb-3">Your Price Alerts</h3>
          <div className="flex flex-wrap gap-2">
            {alerts.map(alert => (
              <div key={alert.id} className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-sm">
                <span className="font-medium">{alert.commodity?.name}</span>
                {alert.market_name && <span className="text-gray-500">at {alert.market_name}</span>}
                <span className={alert.alert_type === 'above' ? 'text-red-600' : 'text-emerald-600'}>
                  {alert.alert_type === 'above' ? '≥' : '≤'} {formatPrice(alert.threshold_price)}
                </span>
                <button
                  onClick={() => handleDeleteAlert(alert.id)}
                  className="ml-1 text-gray-400 hover:text-red-500"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Prices Grid */}
      {loading ? (
        <div className="text-center py-12">
          <div className="w-10 h-10 border-4 border-farm-green border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-500">Loading market prices...</p>
        </div>
      ) : Object.keys(pricesByCommodity).length > 0 ? (
        <div className="space-y-6">
          {Object.entries(pricesByCommodity).map(([commodityName, commodityPrices]) => (
            <div key={commodityName} className="bg-white rounded-xl shadow-sm overflow-hidden">
              <div className="px-5 py-3 bg-emerald-50 border-b border-emerald-200">
                <h3 className="font-bold text-farm-green">{commodityName}</h3>
              </div>
              <div className="divide-y divide-gray-100">
                {commodityPrices.map((p) => {
                  const trend = formatTrend(p.price_change, p.price_change_pct);
                  return (
                    <div key={p.id} className="flex items-center justify-between px-5 py-3 hover:bg-gray-50">
                      <div>
                        <p className="font-medium text-gray-900">{p.market_name}</p>
                        <p className="text-xs text-gray-500">
                          {p.region && `${p.region} · `}
                          {formatDataDate(p.data_date)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-lg text-gray-900">{formatPrice(p.price)}</p>
                        <p className={`text-xs font-medium ${trend.color}`}>{trend.text}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-xl p-8 text-center shadow-sm">
          <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
          </svg>
          <p className="text-gray-500">No market prices available</p>
          <p className="text-sm text-gray-400 mt-1">Prices will appear once data is collected from market sources</p>
        </div>
      )}
    </main>
  );
}
