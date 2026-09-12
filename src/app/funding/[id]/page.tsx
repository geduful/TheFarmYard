'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import type { FundingOpportunity, FundingApplication, Profile } from '@/lib/types';
import { FUNDING_TYPE_CONFIG, FUNDING_APPLICATION_STATUS_CONFIG, FUNDING_OPPORTUNITY_STATUS_CONFIG } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';

export default function FundingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = React.use(params);
  const router = useRouter();

  const [opportunity, setOpportunity] = useState<FundingOpportunity | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [existingApplication, setExistingApplication] = useState<FundingApplication | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showApplyForm, setShowApplyForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [form, setForm] = useState({
    amount_requested: '',
    agricultural_activity: '',
    crop_details: '',
    funding_purpose: '',
    additional_info: '',
  });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const supabase = createClient();

        const { data: { user } } = await supabase.auth.getUser();
        if (!cancelled && user) {
          const { data: p } = await supabase
            .from('profiles')
            .select('id, full_name, phone_number, role, is_verified, is_blocked, blocked_warning, verification_tier, farm_location, created_at')
            .eq('id', user.id)
            .single();
          if (!cancelled) setProfile(p);
        }

        const { data: oppData, error: oppError } = await supabase
          .from('funding_opportunities')
          .select('*, provider:funding_providers!funding_opportunities_provider_id_fkey(name, provider_type, logo_url, verification_status)')
          .eq('id', id)
          .single();

        if (cancelled) return;
        if (oppError || !oppData) {
          setError('Funding opportunity not found.');
          setLoading(false);
          return;
        }

        setOpportunity(oppData as FundingOpportunity);

        if (user) {
          const { data: appData } = await supabase
            .from('funding_applications')
            .select('*, opportunity:funding_opportunities(title, funding_type, min_amount, max_amount, currency, application_deadline), farmer:profiles!funding_applications_farmer_id_fkey(full_name, phone_number, farm_location)')
            .eq('opportunity_id', id)
            .eq('farmer_id', user.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          if (!cancelled) {
            setExistingApplication(appData as FundingApplication | null);
          }
        }
      } catch {
        if (!cancelled) setError('Failed to load funding opportunity.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [id]);

  function getDeadlineInfo(deadline: string | null) {
    if (!deadline) return null;
    const d = new Date(deadline);
    const now = new Date();
    const diffMs = d.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return { text: 'Deadline passed', urgency: 'passed' as const };
    if (diffDays === 0) return { text: 'Closes today', urgency: 'critical' as const };
    if (diffDays <= 7) return { text: `${diffDays} day${diffDays > 1 ? 's' : ''} left`, urgency: 'warning' as const };
    return { text: `${diffDays} days left`, urgency: 'normal' as const };
  }

  async function handleApply(e: React.FormEvent) {
    e.preventDefault();
    if (!opportunity || !profile) return;
    setSubmitError('');
    setSubmitting(true);

    try {
      const res = await fetch('/api/funding/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          opportunityId: opportunity.id,
          amountRequested: parseFloat(form.amount_requested),
          agriculturalActivity: form.agricultural_activity.trim(),
          cropDetails: form.crop_details.trim(),
          fundingPurpose: form.funding_purpose.trim(),
          additionalInfo: form.additional_info.trim() || null,
          applicantName: profile.full_name,
          applicantPhone: profile.phone_number,
          applicantEmail: profile.email || null,
          farmLocation: profile.farm_location,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setSubmitError(data.error || 'Application failed. Please try again.');
        setSubmitting(false);
        return;
      }

      setSubmitSuccess(true);
      setSubmitting(false);

      setExistingApplication(data.application || {
        id: Date.now(),
        opportunity_id: opportunity.id,
        farmer_id: profile.id,
        amount_requested: parseFloat(form.amount_requested),
        status: 'submitted' as const,
        created_at: new Date().toISOString(),
      });
    } catch {
      setSubmitError('An unexpected error occurred. Please try again.');
      setSubmitting(false);
    }
  }

  function checkEligibility() {
    if (!opportunity || !profile) return null;

    const reasons: string[] = [];
    let potentialMatch = true;

    if (opportunity.supported_locations && opportunity.supported_locations.length > 0) {
      const locationMatch = opportunity.supported_locations.some(
        (loc) => profile.farm_location?.toLowerCase().includes(loc.toLowerCase())
      );
      if (!locationMatch) {
        potentialMatch = false;
        reasons.push(`Farm location "${profile.farm_location}" may not be in supported areas (${opportunity.supported_locations.join(', ')})`);
      }
    }

    if (opportunity.target_farmer_categories && opportunity.target_farmer_categories.length > 0) {
      const tierOrder = ['none', 'verified', 'premium', 'supreme'];
      const farmerTierIndex = tierOrder.indexOf(profile.verification_tier);
      const meetsTier = opportunity.target_farmer_categories.some((cat) => {
        const catLower = cat.toLowerCase();
        if (catLower.includes('verified')) return farmerTierIndex >= 1;
        if (catLower.includes('premium')) return farmerTierIndex >= 2;
        if (catLower.includes('supreme')) return farmerTierIndex >= 3;
        return true;
      });
      if (!meetsTier) {
        reasons.push(`Verification tier "${profile.verification_tier}" may not meet category requirements`);
      }
    }

    return { potentialMatch, reasons };
  }

  function canApply() {
    if (!opportunity || !profile) return false;
    if (existingApplication) return false;
    if (opportunity.status !== 'open' && opportunity.status !== 'closing_soon') return false;
    if (opportunity.application_deadline) {
      if (new Date(opportunity.application_deadline) < new Date()) return false;
    }
    return true;
  }

  function isDeadlinePassed() {
    if (!opportunity?.application_deadline) return false;
    return new Date(opportunity.application_deadline) < new Date();
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white border-b border-gray-100 sticky top-0 z-30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center">
            <button onClick={() => router.push('/funding')} className="hover:scale-105 transition-transform">
              <Image src="/logo.png" alt="TheFarmYard" width={32} height={32} className="h-8 w-auto" />
            </button>
          </div>
        </header>
        <div className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8">
          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
                <div className="h-6 bg-gray-200 rounded w-24 animate-pulse" />
                <div className="h-8 bg-gray-200 rounded w-3/4 animate-pulse" />
                <div className="h-4 bg-gray-200 rounded w-1/2 animate-pulse" />
                <div className="h-20 bg-gray-100 rounded-xl animate-pulse" />
              </div>
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
                <div className="h-5 bg-gray-200 rounded w-40 animate-pulse" />
                <div className="grid grid-cols-2 gap-4">
                  {[1, 2, 3, 4].map((i) => <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />)}
                </div>
              </div>
            </div>
            <div className="space-y-6">
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4 sticky top-24">
                <div className="h-6 bg-gray-200 rounded w-32 animate-pulse" />
                <div className="h-4 bg-gray-200 rounded w-full animate-pulse" />
                <div className="h-10 bg-gray-200 rounded w-full animate-pulse" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !opportunity) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white border-b border-gray-100 sticky top-0 z-30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center">
            <button onClick={() => router.push('/funding')} className="hover:scale-105 transition-transform">
              <Image src="/logo.png" alt="TheFarmYard" width={32} height={32} className="h-8 w-auto" />
            </button>
          </div>
        </header>
        <div className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8 text-center py-24 animate-fade-in">
          <div className="max-w-md mx-auto bg-white rounded-2xl shadow-sm border border-red-200 p-8">
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Opportunity Not Found</h3>
            <p className="text-sm text-red-600 mb-5">{error || 'This funding opportunity may have been removed.'}</p>
            <Link href="/funding" className="px-5 py-2.5 bg-farm-green text-white text-sm font-semibold rounded-xl hover:bg-farm-green-light transition shadow-sm">
              Browse Funding
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const typeCfg = FUNDING_TYPE_CONFIG[opportunity.funding_type] || FUNDING_TYPE_CONFIG.other;
  const statusCfg = FUNDING_OPPORTUNITY_STATUS_CONFIG[opportunity.status] || FUNDING_OPPORTUNITY_STATUS_CONFIG.open;
  const deadlineInfo = getDeadlineInfo(opportunity.application_deadline);
  const eligibility = checkEligibility();
  const canApplyNow = canApply();
  const deadlinePassed = isDeadlinePassed();
  const appStatusCfg = existingApplication ? FUNDING_APPLICATION_STATUS_CONFIG[existingApplication.status] : null;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push('/funding')} className="hover:scale-105 transition-transform">
              <Image src="/logo.png" alt="TheFarmYard" width={32} height={32} className="h-8 w-auto" />
            </button>
            <div className="h-5 w-px bg-gray-200" />
            <button onClick={() => router.push('/funding')} className="text-sm text-gray-500 hover:text-gray-900 transition flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
              Funding
            </button>
          </div>
          <div className="flex items-center gap-2">
            {profile?.role === 'farmer' && (
              <button onClick={() => router.push('/dashboard/funding')} className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-xl transition">My Applications</button>
            )}
            {!profile && (
              <button onClick={() => router.push('/login')} className="px-5 py-2 bg-farm-green text-white text-sm font-semibold rounded-xl hover:bg-farm-green-light transition shadow-sm">Sign In</button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8 animate-fade-in">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* ─── LEFT: Opportunity Details ─────────────────────────────── */}
          <div className="lg:col-span-2 space-y-6">
            {/* Overview */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8">
              <div className="flex items-center gap-2 mb-4 flex-wrap">
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${typeCfg.color}`}>
                  {typeCfg.label}
                </span>
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${statusCfg.color}`}>
                  {statusCfg.label}
                </span>
                {deadlineInfo && (
                  <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${
                    deadlineInfo.urgency === 'passed' ? 'bg-red-100 text-red-700'
                    : deadlineInfo.urgency === 'critical' ? 'bg-red-100 text-red-700'
                    : deadlineInfo.urgency === 'warning' ? 'bg-orange-100 text-orange-700'
                    : 'bg-blue-100 text-blue-700'
                  }`}>
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    {deadlineInfo.text}
                  </span>
                )}
              </div>

              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3">{opportunity.title}</h1>

              <div className="flex items-center gap-3 text-sm text-gray-500 mb-6">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-farm-green to-emerald-green flex items-center justify-center text-white font-bold text-xs shadow-sm shrink-0">
                    {opportunity.provider?.logo_url ? (
                      <Image src={opportunity.provider.logo_url} alt="" width={32} height={32} className="rounded-full object-cover" />
                    ) : (
                      opportunity.provider?.name?.charAt(0).toUpperCase() || 'P'
                    )}
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">{opportunity.provider?.name || 'Unknown Provider'}</span>
                    {opportunity.provider?.verification_status === 'verified' && (
                      <span className="inline-flex items-center gap-0.5 ml-1.5 text-xs font-medium text-emerald-600">
                        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        Verified
                      </span>
                    )}
                  </div>
                </div>
                {opportunity.provider?.provider_type && (
                  <span className="text-xs text-gray-400 capitalize">{opportunity.provider.provider_type.replace('_', ' ')}</span>
                )}
              </div>

              {opportunity.description && (
                <div className="border-t border-gray-100 pt-6">
                  <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-3">Description</h3>
                  <p className="text-gray-600 leading-relaxed whitespace-pre-line">{opportunity.description}</p>
                </div>
              )}

              <div className="border-t border-gray-100 pt-6 mt-6">
                <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-4">Funding Details</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 rounded-xl p-4">
                    <span className="text-xs text-gray-400 block mb-1">Amount Range</span>
                    <span className="text-lg font-bold text-farm-green">
                      {formatCurrency(opportunity.min_amount)} — {formatCurrency(opportunity.max_amount)}
                    </span>
                    <span className="text-xs text-gray-400 block">{opportunity.currency || 'GHS'}</span>
                  </div>
                  {opportunity.application_start && (
                    <div className="bg-gray-50 rounded-xl p-4">
                      <span className="text-xs text-gray-400 block mb-1">Application Period</span>
                      <span className="text-sm font-semibold text-gray-900">
                        {new Date(opportunity.application_start).toLocaleDateString('en-GH', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                      {opportunity.application_deadline && (
                        <span className="text-sm text-gray-500 block">
                          to {new Date(opportunity.application_deadline).toLocaleDateString('en-GH', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                      )}
                    </div>
                  )}
                  {opportunity.application_deadline && !opportunity.application_start && (
                    <div className="bg-gray-50 rounded-xl p-4">
                      <span className="text-xs text-gray-400 block mb-1">Deadline</span>
                      <span className="text-sm font-semibold text-gray-900">
                        {new Date(opportunity.application_deadline).toLocaleDateString('en-GH', { month: 'long', day: 'numeric', year: 'numeric' })}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Eligibility */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-4 flex items-center gap-2">
                <span className="w-1.5 h-5 rounded-full bg-blue-400" />
                Eligibility Requirements
              </h3>

              <div className="space-y-4">
                {opportunity.supported_locations && opportunity.supported_locations.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">Location Requirements</h4>
                    <div className="flex flex-wrap gap-2">
                      {opportunity.supported_locations.map((loc) => (
                        <span key={loc} className="px-3 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                          {loc}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {opportunity.supported_crops && opportunity.supported_crops.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">Supported Crops / Activities</h4>
                    <div className="flex flex-wrap gap-2">
                      {opportunity.supported_crops.map((crop) => (
                        <span key={crop} className="px-3 py-1 rounded-full text-xs font-medium bg-farm-green/10 text-farm-green border border-farm-green/20">
                          {crop}
                        </span>
                      ))}
                      {opportunity.supported_activities?.map((act) => (
                        <span key={act} className="px-3 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
                          {act}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {opportunity.target_farmer_categories && opportunity.target_farmer_categories.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">Target Farmer Categories</h4>
                    <div className="flex flex-wrap gap-2">
                      {opportunity.target_farmer_categories.map((cat) => (
                        <span key={cat} className="px-3 py-1 rounded-full text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200">
                          {cat}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {opportunity.eligibility_criteria && (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">Eligibility Criteria</h4>
                    <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">{opportunity.eligibility_criteria}</p>
                  </div>
                )}

                {!opportunity.supported_locations?.length && !opportunity.supported_crops?.length && !opportunity.target_farmer_categories?.length && !opportunity.eligibility_criteria && (
                  <p className="text-sm text-gray-400 italic">No specific eligibility requirements listed.</p>
                )}
              </div>
            </div>

            {/* Requirements */}
            {((opportunity.required_documents && opportunity.required_documents.length > 0) || opportunity.application_instructions) && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-4 flex items-center gap-2">
                  <span className="w-1.5 h-5 rounded-full bg-amber-400" />
                  Application Requirements
                </h3>

                {opportunity.required_documents && opportunity.required_documents.length > 0 && (
                  <div className="mb-5">
                    <h4 className="text-sm font-semibold text-gray-700 mb-3">Required Documents</h4>
                    <div className="space-y-2">
                      {opportunity.required_documents.map((doc, i) => (
                        <div key={i} className="flex items-start gap-2.5 text-sm text-gray-600">
                          <svg className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                          </svg>
                          <span>{doc}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {opportunity.application_instructions && (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">Application Instructions</h4>
                    <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">{opportunity.application_instructions}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ─── RIGHT: Apply Sidebar ─────────────────────────────────── */}
          <div className="space-y-6">
            {/* Apply Card */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sticky top-24">
              <div className="mb-5">
                <p className="text-sm text-gray-500 mb-1">Funding Amount</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-farm-green">
                    {formatCurrency(opportunity.min_amount)}
                    {opportunity.max_amount !== opportunity.min_amount && (
                      <span className="text-lg text-gray-400"> — {formatCurrency(opportunity.max_amount)}</span>
                    )}
                  </span>
                </div>
              </div>

              {/* Deadline countdown */}
              {opportunity.application_deadline && (
                <div className={`p-4 rounded-xl mb-5 ${
                  deadlinePassed ? 'bg-red-50 border border-red-200'
                  : deadlineInfo?.urgency === 'critical' ? 'bg-red-50 border border-red-200'
                  : deadlineInfo?.urgency === 'warning' ? 'bg-orange-50 border border-orange-200'
                  : 'bg-gray-50 border border-gray-100'
                }`}>
                  <div className="flex items-center gap-2 text-sm">
                    <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                    </svg>
                    <div>
                      <span className={`font-semibold ${deadlinePassed ? 'text-red-700' : 'text-gray-900'}`}>
                        {deadlinePassed ? 'Applications Closed' : deadlineInfo?.text}
                      </span>
                      <span className="block text-xs text-gray-400">
                        {new Date(opportunity.application_deadline).toLocaleDateString('en-GH', { month: 'long', day: 'numeric', year: 'numeric' })}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Application status or apply button */}
              {existingApplication ? (
                <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 mb-5">
                  <p className="text-xs text-gray-400 mb-1.5">Your Application</p>
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${appStatusCfg?.color || 'bg-gray-100 text-gray-600'}`}>
                      {appStatusCfg?.label || existingApplication.status}
                    </span>
                  </div>
                  {existingApplication.submitted_at && (
                    <p className="text-xs text-gray-400 mt-1.5">
                      Submitted {new Date(existingApplication.submitted_at).toLocaleDateString('en-GH', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                  )}
                </div>
              ) : canApplyNow && !deadlinePassed ? (
                <button
                  onClick={() => {
                    if (!profile) { router.push('/login'); return; }
                    setShowApplyForm(true);
                  }}
                  className="w-full py-3 bg-farm-green text-white font-semibold rounded-xl hover:bg-farm-green-light active:scale-[0.98] transition-all shadow-md mb-3 text-sm"
                >
                  Apply Now
                </button>
              ) : deadlinePassed || opportunity.status === 'closed' || opportunity.status === 'suspended' ? (
                <div className="p-4 bg-red-50 rounded-xl border border-red-200 mb-5 text-center">
                  <p className="text-sm font-medium text-red-700">Applications Closed</p>
                  <p className="text-xs text-red-500 mt-1">This opportunity is no longer accepting applications.</p>
                </div>
              ) : !profile ? (
                <button
                  onClick={() => router.push('/login')}
                  className="w-full py-3 bg-farm-green text-white font-semibold rounded-xl hover:bg-farm-green-light transition shadow-sm hover:shadow-md active:scale-[0.98] text-sm mb-3"
                >
                  Sign In to Apply
                </button>
              ) : null}

              {opportunity.external_url && (
                <a
                  href={opportunity.external_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-3 bg-white text-farm-green font-semibold rounded-xl border border-farm-green/30 hover:bg-farm-green/5 transition text-sm flex items-center justify-center gap-2"
                >
                  Apply on Provider Website
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                  </svg>
                </a>
              )}

              <div className="mt-5 p-4 bg-gradient-to-br from-cream to-cream-dark rounded-xl border border-cream-dark/50">
                <p className="text-xs text-gray-500 flex items-center gap-1.5 mb-1">
                  <svg className="w-3.5 h-3.5 text-farm-green" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}><path d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" /></svg>
                  Verified by TheFarmYard
                </p>
                <p className="text-xs text-gray-500">All funding opportunities are reviewed before listing.</p>
              </div>
            </div>

            {/* Eligibility Match (logged in only) */}
            {profile && eligibility && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-4 flex items-center gap-2">
                  <span className="w-1.5 h-5 rounded-full bg-indigo-400" />
                  Your Eligibility
                </h3>

                {eligibility.potentialMatch && eligibility.reasons.length === 0 ? (
                  <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200">
                    <div className="flex items-start gap-2">
                      <svg className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div>
                        <p className="text-sm font-semibold text-emerald-800">Potential Match</p>
                        <p className="text-xs text-emerald-600 mt-1">Your profile appears to align with this opportunity&apos;s requirements. Review full details and submit your application.</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="p-4 bg-amber-50 rounded-xl border border-amber-200">
                      <div className="flex items-start gap-2">
                        <svg className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                        </svg>
                        <div>
                          <p className="text-sm font-semibold text-amber-800">Review Full Requirements</p>
                          <p className="text-xs text-amber-600 mt-1">Some criteria may need attention before applying.</p>
                        </div>
                      </div>
                    </div>
                    {eligibility.reasons.map((reason, i) => (
                      <div key={i} className="flex items-start gap-2 text-sm text-gray-600">
                        <svg className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                        </svg>
                        <span>{reason}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* ─── APPLICATION FORM MODAL ─────────────────────────────────── */}
      {showApplyForm && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40 animate-fade-in" onClick={() => { if (!submitSuccess) setShowApplyForm(false); }} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto animate-fade-in-up">
              <div className="p-6">
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">Apply for Funding</h3>
                    <p className="text-sm text-gray-500 line-clamp-1">{opportunity.title}</p>
                  </div>
                  <button onClick={() => { if (!submitSuccess) setShowApplyForm(false); }} className="p-2 hover:bg-gray-100 rounded-lg transition">
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>

                {submitSuccess ? (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}>
                        <path d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <h4 className="text-lg font-bold text-gray-900 mb-2">Application Submitted</h4>
                    <p className="text-sm text-gray-500 mb-4">Your application has been submitted successfully. You will be notified of updates.</p>
                    <button onClick={() => { setShowApplyForm(false); router.push('/dashboard/funding'); }}
                      className="px-6 py-2.5 bg-farm-green text-white text-sm font-semibold rounded-xl hover:bg-farm-green-light transition">
                      View My Applications
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleApply} className="space-y-4">
                    {submitError && (
                      <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl">{submitError}</div>
                    )}

                    {/* Pre-filled profile info */}
                    <div className="p-3 bg-gray-50 rounded-xl">
                      <p className="text-xs text-gray-400 mb-2">Pre-filled from your profile</p>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-gray-400 text-xs">Name</span>
                          <p className="font-medium text-gray-900">{profile?.full_name || '—'}</p>
                        </div>
                        <div>
                          <span className="text-gray-400 text-xs">Phone</span>
                          <p className="font-medium text-gray-900">{profile?.phone_number || '—'}</p>
                        </div>
                        <div>
                          <span className="text-gray-400 text-xs">Email</span>
                          <p className="font-medium text-gray-900">{profile?.email || '—'}</p>
                        </div>
                        <div>
                          <span className="text-gray-400 text-xs">Farm Location</span>
                          <p className="font-medium text-gray-900">{profile?.farm_location || '—'}</p>
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5">Amount Requested (GHS)</label>
                      <input
                        type="number"
                        value={form.amount_requested}
                        onChange={(e) => setForm({ ...form, amount_requested: e.target.value })}
                        placeholder={`Min: ${formatCurrency(opportunity.min_amount)} - Max: ${formatCurrency(opportunity.max_amount)}`}
                        required
                        min={opportunity.min_amount}
                        max={opportunity.max_amount}
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl bg-white text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-farm-green/30 focus:border-farm-green"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5">Agricultural Activity</label>
                      <input
                        type="text"
                        value={form.agricultural_activity}
                        onChange={(e) => setForm({ ...form, agricultural_activity: e.target.value })}
                        placeholder="e.g. Maize farming, Poultry rearing"
                        required
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl bg-white text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-farm-green/30 focus:border-farm-green"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5">Crop / Livestock Details</label>
                      <input
                        type="text"
                        value={form.crop_details}
                        onChange={(e) => setForm({ ...form, crop_details: e.target.value })}
                        placeholder="e.g. 5 acres of maize, 200 broilers"
                        required
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl bg-white text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-farm-green/30 focus:border-farm-green"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5">Purpose of Funding</label>
                      <textarea
                        value={form.funding_purpose}
                        onChange={(e) => setForm({ ...form, funding_purpose: e.target.value })}
                        rows={3}
                        placeholder="Describe how you plan to use the funding..."
                        required
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl bg-white text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-farm-green/30 focus:border-farm-green resize-none"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5">Additional Information (optional)</label>
                      <textarea
                        value={form.additional_info}
                        onChange={(e) => setForm({ ...form, additional_info: e.target.value })}
                        rows={2}
                        placeholder="Any other details you'd like to share..."
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl bg-white text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-farm-green/30 focus:border-farm-green resize-none"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-full py-3 bg-farm-green text-white font-semibold rounded-xl hover:bg-farm-green-light active:scale-[0.98] transition-all disabled:opacity-60 shadow-md flex items-center justify-center gap-2"
                    >
                      {submitting ? (
                        <>
                          <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Submitting...
                        </>
                      ) : (
                        'Submit Application'
                      )}
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
