'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Opportunity {
  id: number;
  title: string;
  slug: string;
  description: string;
  organization: string | null;
  opportunity_type: string;
  location: string | null;
  eligibility: string | null;
  deadline: string | null;
  source_url: string | null;
  image_url: string | null;
  status: string;
  is_featured: boolean;
  tags: string[];
  published_at: string | null;
}

export default function OpportunitiesPage() {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('open');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    async function fetchOpportunities() {
      setLoading(true);
      try {
        let url = '/api/news/opportunities?';
        if (filterType) url += `type=${filterType}&`;
        if (filterStatus) url += `status=${filterStatus}&`;
        if (searchQuery) url += `search=${encodeURIComponent(searchQuery)}&`;
        const res = await fetch(url);
        const data = await res.json();
        setOpportunities(data.opportunities || []);
      } catch {
        // Error
      } finally {
        setLoading(false);
      }
    }
    fetchOpportunities();
  }, [filterType, filterStatus, searchQuery]);

  const formatDeadline = (d: string | null) => {
    if (!d) return 'No deadline';
    const date = new Date(d);
    const now = new Date();
    const diffDays = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return 'Expired';
    if (diffDays === 0) return 'Today!';
    if (diffDays === 1) return 'Tomorrow';
    if (diffDays <= 7) return `${diffDays} days left`;
    return date.toLocaleDateString('en-GH', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const deadlineUrgency = (d: string | null) => {
    if (!d) return 'text-gray-500';
    const date = new Date(d);
    const now = new Date();
    const diffDays = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return 'text-gray-400';
    if (diffDays <= 3) return 'text-red-600 font-bold';
    if (diffDays <= 7) return 'text-amber-600 font-semibold';
    return 'text-gray-600';
  };

  const opportunityTypeConfig: Record<string, { label: string; color: string; icon: string }> = {
    government_program: { label: 'Gov. Program', color: 'bg-blue-100 text-blue-700', icon: '🏛' },
    grant: { label: 'Grant', color: 'bg-emerald-100 text-emerald-700', icon: '💰' },
    training: { label: 'Training', color: 'bg-purple-100 text-purple-700', icon: '📚' },
    procurement: { label: 'Procurement', color: 'bg-amber-100 text-amber-700', icon: '📦' },
    buyer: { label: 'Buyer', color: 'bg-teal-100 text-teal-700', icon: '🤝' },
    investment: { label: 'Investment', color: 'bg-indigo-100 text-indigo-700', icon: '📈' },
    export: { label: 'Export', color: 'bg-cyan-100 text-cyan-700', icon: '🌍' },
    competition: { label: 'Competition', color: 'bg-rose-100 text-rose-700', icon: '🏆' },
    event: { label: 'Event', color: 'bg-violet-100 text-violet-700', icon: '📅' },
    other: { label: 'Other', color: 'bg-gray-100 text-gray-700', icon: '📌' },
  };

  return (
    <div className="min-h-screen bg-farm-cream">
      {/* Header */}
      <section className="bg-gradient-to-br from-earth to-amber-800 text-white py-12 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-2 text-sm text-amber-200 mb-4">
            <Link href="/dashboard/farmer" className="hover:text-white transition-colors">Dashboard</Link>
            <span>/</span>
            <Link href="/news" className="hover:text-white transition-colors">News</Link>
            <span>/</span>
            <span>Opportunities</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold mb-2">Agricultural Opportunities</h1>
          <p className="text-amber-100">Grants, programs, buyers, training, and more for Ghanaian farmers</p>
        </div>
      </section>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Filters */}
        <div className="bg-white rounded-xl p-4 shadow-sm mb-6">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-[200px]">
              <input
                type="text"
                placeholder="Search opportunities..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-earth focus:border-transparent"
              />
            </div>
            <div className="min-w-[160px]">
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-earth focus:border-transparent"
              >
                <option value="">All Types</option>
                {Object.entries(opportunityTypeConfig).map(([key, cfg]) => (
                  <option key={key} value={key}>{cfg.label}</option>
                ))}
              </select>
            </div>
            <div className="min-w-[140px]">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-earth focus:border-transparent"
              >
                <option value="open">Open</option>
                <option value="">All Statuses</option>
                <option value="upcoming">Upcoming</option>
                <option value="closed">Closed</option>
              </select>
            </div>
          </div>
        </div>

        {/* Results */}
        {loading ? (
          <div className="text-center py-12">
            <div className="w-10 h-10 border-4 border-earth border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-gray-500">Loading opportunities...</p>
          </div>
        ) : opportunities.length > 0 ? (
          <div className="grid md:grid-cols-2 gap-6">
            {opportunities.map((opp) => {
              const typeCfg = opportunityTypeConfig[opp.opportunity_type] || opportunityTypeConfig.other;
              return (
                <div
                  key={opp.id}
                  id={opp.slug}
                  className={`bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow overflow-hidden ${opp.is_featured ? 'ring-2 ring-earth/30' : ''}`}
                >
                  {opp.image_url && (
                    <div className="aspect-[2/1] bg-amber-50 overflow-hidden">
                      <img src={opp.image_url} alt={opp.title} className="w-full h-full object-cover" />
                    </div>
                  )}
                  <div className="p-5">
                    <div className="flex items-center gap-2 mb-3 flex-wrap">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${typeCfg.color}`}>
                        {typeCfg.icon} {typeCfg.label}
                      </span>
                      {opp.is_featured && (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-earth text-white">
                          Featured
                        </span>
                      )}
                      {opp.deadline && (
                        <span className={`text-xs ${deadlineUrgency(opp.deadline)}`}>
                          {formatDeadline(opp.deadline)}
                        </span>
                      )}
                    </div>

                    <h3 className="font-bold text-gray-900 text-lg mb-2">{opp.title}</h3>

                    {opp.organization && (
                      <p className="text-sm text-gray-600 mb-2">By: {opp.organization}</p>
                    )}

                    <p className="text-sm text-gray-600 line-clamp-3 mb-3">{opp.description}</p>

                    {opp.eligibility && (
                      <div className="bg-amber-50 rounded-lg p-3 mb-3">
                        <p className="text-xs font-semibold text-amber-800 mb-1">Eligibility</p>
                        <p className="text-xs text-amber-700">{opp.eligibility}</p>
                      </div>
                    )}

                    {opp.tags && opp.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-3">
                        {opp.tags.slice(0, 4).map((tag) => (
                          <span key={tag} className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 text-xs">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                      <div className="text-xs text-gray-500">
                        {opp.location && <span>{opp.location} · </span>}
                        {opp.published_at && new Date(opp.published_at).toLocaleDateString('en-GH', { month: 'short', day: 'numeric' })}
                      </div>
                      {opp.source_url && (
                        <a
                          href={opp.source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-medium text-earth hover:text-amber-700 transition-colors"
                        >
                          Learn More →
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-white rounded-xl p-8 text-center shadow-sm">
            <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 00.75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 00-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0112 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 01-.673-.38m0 0A2.18 2.18 0 013 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 013.413-.387m7.5 0V5.25A2.25 2.25 0 0013.5 3h-3a2.25 2.25 0 00-2.25 2.25v.894m7.5 0a48.667 48.667 0 00-7.5 0M12 12.75h.008v.008H12v-.008z" />
            </svg>
            <p className="text-gray-500">No opportunities found</p>
            <p className="text-sm text-gray-400 mt-1">Try adjusting your filters or check back later</p>
          </div>
        )}
      </main>
    </div>
  );
}
