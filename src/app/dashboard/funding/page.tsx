'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import type { FundingApplication } from '@/lib/types';
import { FUNDING_APPLICATION_STATUS_CONFIG, FUNDING_TYPE_CONFIG } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';

type TabFilter = 'all' | 'draft' | 'submitted' | 'under_review' | 'approved' | 'rejected';

const TABS: { key: TabFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'draft', label: 'Draft' },
  { key: 'submitted', label: 'Submitted' },
  { key: 'under_review', label: 'Under Review' },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
];

export default function FarmerFundingPage() {
  const router = useRouter();
  const [applications, setApplications] = useState<FundingApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabFilter>('all');

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }

      const { data } = await supabase
        .from('funding_applications')
        .select('*, opportunity:funding_opportunities!funding_applications_opportunity_id_fkey(title, funding_type, min_amount, max_amount, currency, application_deadline), farmer:profiles!funding_applications_farmer_id_fkey(full_name, phone_number, farm_location)')
        .eq('farmer_id', user.id)
        .order('created_at', { ascending: false })
        .limit(200);

      setApplications(data || []);
      setLoading(false);
    }
    load();
  }, [router]);

  const filtered = activeTab === 'all'
    ? applications
    : applications.filter((a) => a.status === activeTab);

  const stats = {
    total: applications.length,
    under_review: applications.filter((a) => ['submitted', 'under_review', 'shortlisted'].includes(a.status)).length,
    approved: applications.filter((a) => a.status === 'approved').length,
    rejected: applications.filter((a) => a.status === 'rejected').length,
  };

  if (loading) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-48" />
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => <div key={i} className="h-24 bg-gray-200 rounded-2xl" />)}
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            {[1, 2, 3].map((i) => <div key={i} className="h-40 bg-gray-200 rounded-2xl" />)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <Link href="/dashboard/farmer" className="text-sm text-farm-green hover:underline mb-2 inline-block">&larr; Back to Dashboard</Link>
          <h1 className="text-2xl font-bold text-gray-900">Funding & Finance</h1>
          <p className="text-gray-500 text-sm mt-1">Track your funding applications and discover new opportunities</p>
        </div>
        <Link
          href="/funding"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-farm-green text-white text-sm font-semibold rounded-xl hover:bg-farm-green-light transition shadow-sm shrink-0"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          Browse Funding
        </Link>
      </div>

      {/* Overview Cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              <p className="text-xs text-gray-500">Total Applications</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
              <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.under_review}</p>
              <p className="text-xs text-gray-500">Under Review</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
              <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.approved}</p>
              <p className="text-xs text-gray-500">Approved</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
              <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.rejected}</p>
              <p className="text-xs text-gray-500">Rejected</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap items-center gap-2 mb-6">
        {TABS.map((tab) => {
          const count = tab.key === 'all'
            ? applications.length
            : applications.filter((a) => a.status === tab.key).length;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition relative ${
                activeTab === tab.key
                  ? 'bg-farm-green text-white shadow-md shadow-farm-green/20'
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              {tab.label}
              {count > 0 && <span className="ml-1.5 text-xs opacity-70">({count})</span>}
            </button>
          );
        })}
      </div>

      {/* Application List */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 text-center py-16">
          <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}>
              <path d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
          </div>
          <p className="text-gray-500 font-medium">
            {activeTab === 'all' ? 'No applications yet' : `No ${activeTab.replace('_', ' ')} applications`}
          </p>
          <p className="text-gray-400 text-sm mt-1 mb-4">
            {activeTab === 'all'
              ? 'Browse funding opportunities to get started.'
              : 'Try selecting a different tab.'}
          </p>
          {activeTab === 'all' && (
            <Link
              href="/funding"
              className="inline-flex px-5 py-2.5 bg-farm-green text-white text-sm font-semibold rounded-xl hover:bg-farm-green-light transition shadow-sm"
            >
              Browse Funding
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((app) => {
            const statusCfg = FUNDING_APPLICATION_STATUS_CONFIG[app.status] || FUNDING_APPLICATION_STATUS_CONFIG.draft;
            const typeCfg = app.opportunity?.funding_type ? FUNDING_TYPE_CONFIG[app.opportunity.funding_type] : null;
            const statusCfgOpp = app.opportunity?.application_deadline
              ? new Date(app.opportunity.application_deadline) < new Date()
              : false;

            return (
              <Link
                key={app.id}
                href={`/funding/${app.opportunity_id}`}
                className="block bg-white rounded-2xl shadow-sm border border-gray-100 p-5 card-hover animate-fade-in hover:shadow-md transition"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <h4 className="font-bold text-gray-900 line-clamp-1">{app.opportunity?.title || 'Funding Opportunity'}</h4>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusCfg.color}`}>
                        {statusCfg.label}
                      </span>
                      {typeCfg && (
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${typeCfg.color}`}>
                          {typeCfg.label}
                        </span>
                      )}
                    </div>

                    {app.opportunity && (
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500">
                        {app.opportunity.min_amount != null && app.opportunity.max_amount != null && (
                          <span className="flex items-center gap-1">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {formatCurrency(app.opportunity.min_amount)} — {formatCurrency(app.opportunity.max_amount)}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                          </svg>
                          {new Date(app.created_at).toLocaleDateString('en-GH', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                      </div>
                    )}

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500 mt-1">
                      <span className="flex items-center gap-1">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Requested: {formatCurrency(app.amount_requested)}
                      </span>
                      {app.submitted_at && (
                        <span className="flex items-center gap-1">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                          </svg>
                          Submitted {new Date(app.submitted_at).toLocaleDateString('en-GH', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {statusCfgOpp && app.opportunity?.application_deadline && (
                      <span className="text-xs text-red-500 font-medium">Deadline passed</span>
                    )}
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                    </svg>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
