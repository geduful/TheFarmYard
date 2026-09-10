'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { uploadFile, VERIFICATION_DOCS_BUCKET } from '@/lib/supabase/storage';
import type { Profile, VerificationRequest, PremiumVerificationRequest } from '@/lib/types';
import { PREMIUM_REQUIREMENTS } from '@/lib/types';
import StatusBadge from '@/components/ui/StatusBadge';
import { ProfileSkeleton } from '@/components/ui/LoadingSkeleton';

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [listingCount, setListingCount] = useState(0);
  const [transactionCount, setTransactionCount] = useState(0);
  const [accountAgeDays, setAccountAgeDays] = useState(0);
  const [verificationRequest, setVerificationRequest] = useState<VerificationRequest | null>(null);
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [verificationFiles, setVerificationFiles] = useState<File[]>([]);
  const [verificationNotes, setVerificationNotes] = useState('');
  const [verificationSubmitting, setVerificationSubmitting] = useState(false);
  const [verificationError, setVerificationError] = useState('');
  // Premium verification state
  const [premiumRequest, setPremiumRequest] = useState<PremiumVerificationRequest | null>(null);
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [premiumMessage, setPremiumMessage] = useState('');
  const [premiumSubmitting, setPremiumSubmitting] = useState(false);
  const [premiumError, setPremiumError] = useState('');

  useEffect(() => {
    const supabase = createClient();
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }
      const { data: p } = await supabase.from('profiles').select('id, full_name, phone_number, role, is_verified, is_blocked, blocked_warning, verification_tier, farm_location, created_at').eq('id', user.id).single();
      setProfile(p);

      const ageDays = p ? Math.floor((Date.now() - new Date(p.created_at).getTime()) / 86400000) : 0;
      setAccountAgeDays(ageDays);

      const { count: lc } = await supabase.from('listings').select('*', { count: 'exact', head: true }).eq('farmer_id', user.id);
      setListingCount(lc || 0);
      const { count: tc } = await supabase.from('escrow_transactions').select('*', { count: 'exact', head: true }).or(`buyer_id.eq.${user.id},farmer_id.eq.${user.id}`);
      setTransactionCount(tc || 0);

      const { data: vr } = await supabase.from('verification_requests').select('*').eq('profile_id', user.id).order('created_at', { ascending: false }).limit(1).single();
      setVerificationRequest(vr);

      const { data: pvr } = await supabase.from('premium_verification_requests').select('*').eq('profile_id', user.id).order('created_at', { ascending: false }).limit(1).single();
      setPremiumRequest(pvr);

      setLoading(false);
    }
    load();
  }, [router]);

  async function handleVerificationSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (verificationFiles.length === 0) { setVerificationError('Please upload at least one document.'); return; }
    if (verificationFiles.length > 5) { setVerificationError('Maximum 5 documents.'); return; }
    const oversized = verificationFiles.find((f) => f.size > 5 * 1024 * 1024);
    if (oversized) { setVerificationError(`"${oversized.name}" exceeds 5MB.`); return; }
    setVerificationError('');
    setVerificationSubmitting(true);
    try {
      const supabase = createClient();
      const documentUrls = await Promise.all(
        verificationFiles.map((file) => uploadFile(VERIFICATION_DOCS_BUCKET, file))
      );
      const { data, error } = await supabase.from('verification_requests').insert({
        profile_id: profile?.id,
        document_urls: documentUrls,
        notes: verificationNotes || null,
        status: 'pending',
      }).select().single();

      if (error) { setVerificationError(error.message); setVerificationSubmitting(false); return; }
      setVerificationRequest(data);
      setShowVerificationModal(false);
      setVerificationFiles([]);
      setVerificationNotes('');
    } catch (err) {
      setVerificationError(err instanceof Error ? err.message : 'Something went wrong.');
    }
    setVerificationSubmitting(false);
  }

  async function handlePremiumSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPremiumError('');
    setPremiumSubmitting(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase.from('premium_verification_requests').insert({
        profile_id: profile?.id,
        listing_count: listingCount,
        transaction_count: transactionCount,
        account_age_days: accountAgeDays,
        message: premiumMessage || null,
        status: 'pending',
      }).select().single();
      if (error) { setPremiumError(error.message); setPremiumSubmitting(false); return; }
      setPremiumRequest(data);
      setShowPremiumModal(false);
      setPremiumMessage('');
    } catch { setPremiumError('Something went wrong. Please try again.'); }
    setPremiumSubmitting(false);
  }

  if (loading) return <ProfileSkeleton />;
  if (!profile) return <div className="flex items-center justify-center h-64 text-gray-500">Profile not found.</div>;

  const tier = profile.verification_tier ?? 'none';
  const isFarmer = profile.role === 'farmer';
  const meetsListings = isFarmer ? listingCount >= PREMIUM_REQUIREMENTS.minListings : true;
  const meetsOrders = !isFarmer ? transactionCount >= PREMIUM_REQUIREMENTS.minOrders : true;
  const meetsTransactions = transactionCount >= PREMIUM_REQUIREMENTS.minTransactions;
  const meetsAge = accountAgeDays >= PREMIUM_REQUIREMENTS.minAccountAgeDays;
  const isEligibleForPremium = tier === 'verified' && meetsListings && meetsOrders && meetsTransactions && meetsAge;

  const detailItems = [
    { label: 'Full Name', value: profile.full_name, icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}><path d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" /></svg> },
    { label: 'Phone', value: profile.phone_number || '—', icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}><path d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" /></svg> },
    { label: 'Email', value: profile.email || '—', icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}><path d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" /></svg> },
    { label: 'Role', value: profile.role.charAt(0).toUpperCase() + profile.role.slice(1), icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}><path d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" /></svg> },
    { label: 'Location', value: profile.farm_location, icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}><path d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" /><path d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" /></svg> },
    { label: 'Member Since', value: new Date(profile.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }), icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}><path d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" /></svg> },
  ];

  const stats = [
    { value: listingCount, label: 'Listings', color: 'from-farm-green to-emerald-green', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" /><rect x="9" y="3" width="6" height="4" rx="1" /></svg> },
    { value: transactionCount, label: 'Transactions', color: 'from-amber-500 to-amber-600', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}><path d="M7 16l-4-4 4-4" /><path d="M17 8l4 4-4 4" /><path d="M3 12h18" /></svg> },
    { value: profile.is_verified ? 'Verified' : 'Pending', label: 'Status', color: profile.is_verified ? 'from-emerald-500 to-emerald-600' : 'from-gray-400 to-gray-500', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}><path d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> },
  ];

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6 lg:p-8 animate-fade-in">
      {/* Hero Section */}
      <div className="relative rounded-3xl overflow-hidden mb-8 bg-gradient-to-br from-farm-green via-farm-green-light to-emerald-green shadow-2xl shadow-farm-green/20">
        <div className="absolute inset-0">
          <div className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full bg-white/5 blur-3xl -translate-y-1/2 translate-x-1/4" />
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full bg-emerald-300/10 blur-3xl translate-y-1/3 -translate-x-1/4" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.08),transparent_50%)]" />
          <div className="absolute inset-0" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.04'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")` }} />
        </div>

        <div className="relative px-6 sm:px-10 py-8 sm:py-10">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            <div className="relative group">
              <div className="w-24 h-24 rounded-2xl bg-white/95 backdrop-blur-sm flex items-center justify-center text-4xl font-bold text-farm-green shadow-xl shadow-black/10 relative z-10 transition-transform duration-300 group-hover:scale-105">
                {profile.full_name.charAt(0).toUpperCase()}
              </div>
              <div className="absolute -inset-1 rounded-2xl bg-white/20 blur -z-0" />
              {profile.is_verified && (
                <div className="absolute -top-1.5 -right-1.5 w-7 h-7 rounded-full bg-emerald-400 border-[3px] border-white flex items-center justify-center z-20 shadow-lg shadow-emerald-500/30">
                  <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3.5} d="M5 13l4 4L19 7" /></svg>
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">{profile.full_name}</h1>
                <StatusBadge type="tier" value={tier} />
              </div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-emerald-100/80">
                <span className="flex items-center gap-1.5 text-sm">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}><path d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" /></svg>
                  <span className="capitalize font-medium">{profile.role}</span>
                </span>
                <span className="w-1 h-1 rounded-full bg-emerald-100/30" />
                <span className="flex items-center gap-1.5 text-sm">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}><path d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" /><path d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" /></svg>
                  {profile.farm_location}
                </span>
              </div>
            </div>

            <div className="flex gap-2 shrink-0">
              <Link href="/dashboard/profile/edit"
                className="px-5 py-2.5 bg-white/15 backdrop-blur-sm text-white font-semibold rounded-xl hover:bg-white/25 transition border border-white/20 shadow-sm hover:shadow-md active:scale-[0.98] flex items-center gap-2 text-sm">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}><path d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" /></svg>
                Edit
              </Link>
              <Link href={profile.role === 'farmer' ? '/dashboard/farmer' : profile.role === 'buyer' ? '/dashboard/buyer' : '/dashboard/admin'}
                className="px-5 py-2.5 bg-white/10 backdrop-blur-sm text-white/80 font-medium rounded-xl hover:bg-white/20 transition border border-white/10 text-sm">
                Dashboard
              </Link>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 sm:gap-4 mt-8 pt-6 border-t border-white/10">
            {stats.map((stat, i) => (
              <div key={i} className="bg-white/10 backdrop-blur-sm rounded-xl p-4 text-center border border-white/5 hover:bg-white/15 transition card-hover">
                <div className="flex justify-center mb-2">
                  <span className="w-9 h-9 rounded-lg bg-white/15 flex items-center justify-center text-white/80">
                    {stat.icon}
                  </span>
                </div>
                <p className="text-xl font-bold text-white tabular-nums">{stat.value}</p>
                <p className="text-xs text-emerald-100/60 mt-0.5">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Content Grid */}
      <div className="grid md:grid-cols-5 gap-6">
        {/* Account Details */}
        <div className="md:col-span-3 bg-white rounded-2xl shadow-sm border border-gray-100 p-6 card-hover">
          <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2 mb-6">
            <span className="w-1.5 h-5 rounded-full bg-gradient-to-b from-farm-green to-emerald-green" />
            Account Details
          </h2>
          <div className="space-y-0 divide-y divide-gray-50">
            {detailItems.map((item) => (
              <div key={item.label} className="flex items-center gap-4 py-3.5 first:pt-0 last:pb-0">
                <span className="w-8 h-8 rounded-lg bg-cream flex items-center justify-center text-farm-green shrink-0">
                  {item.icon}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-400">{item.label}</p>
                  <p className="text-sm font-medium text-gray-900 truncate">{item.value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Activity / Quick Info */}
        <div className="md:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 card-hover">
            <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2 mb-4">
              <span className="w-1.5 h-5 rounded-full bg-gradient-to-b from-amber-500 to-amber-600" />
              Quick Stats
            </h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-gradient-to-r from-cream to-cream-dark rounded-xl">
                <span className="text-sm text-gray-600">Account Age</span>
                <span className="text-sm font-semibold text-gray-900">
                  {Math.max(1, Math.floor(accountAgeDays / 30))} months
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gradient-to-r from-cream to-cream-dark rounded-xl">
                <span className="text-sm text-gray-600">Total Listings</span>
                <span className="text-sm font-semibold text-gray-900">{listingCount}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gradient-to-r from-cream to-cream-dark rounded-xl">
                <span className="text-sm text-gray-600">Transactions</span>
                <span className="text-sm font-semibold text-gray-900">{transactionCount}</span>
              </div>
            </div>
          </div>

          {/* Standard Verification — only show if not yet verified */}
          {tier === 'none' && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 card-hover">
              <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2 mb-4">
                <span className="w-1.5 h-5 rounded-full bg-gradient-to-b from-emerald-500 to-emerald-600" />
                Get Verified
              </h2>
              {verificationRequest?.status === 'pending' ? (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                    <span className="font-semibold text-amber-800">Under Review</span>
                  </div>
                  <p className="text-amber-700">Your documents are being reviewed by the admin team.</p>
                </div>
              ) : verificationRequest?.status === 'rejected' ? (
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-2 h-2 rounded-full bg-red-400" />
                    <span className="font-semibold text-red-800">Rejected</span>
                  </div>
                  <p className="text-red-700 mb-3">Your request was not approved. Please re-submit with valid documents.</p>
                  <button onClick={() => { setVerificationError(''); setShowVerificationModal(true); }}
                    className="px-4 py-2 bg-farm-green text-white text-xs font-semibold rounded-lg hover:bg-farm-green-light transition">
                    Re-submit
                  </button>
                </div>
              ) : (
                <div>
                  <p className="text-sm text-gray-500 mb-4">Upload a valid ID (passport, driver&apos;s license, or national ID) to become a Verified user.</p>
                  <button onClick={() => { setVerificationError(''); setShowVerificationModal(true); }}
                    className="w-full py-2.5 bg-gradient-to-r from-farm-green to-emerald-green text-white text-sm font-semibold rounded-xl hover:from-farm-green-light hover:to-emerald-700 transition shadow-sm active:scale-[0.98]">
                    Request Verification
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Premium Verification — only show once standard-verified, admin excluded */}
          {tier === 'verified' && (
            <div className="bg-white rounded-2xl shadow-sm border border-purple-100 p-6 card-hover">
              <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2 mb-1">
                <span className="w-1.5 h-5 rounded-full bg-gradient-to-b from-violet-500 to-purple-600" />
                Premium Verification
              </h2>
              <p className="text-xs text-gray-400 mb-4">Exclusive tier for top performers. Cannot be purchased.</p>

              {premiumRequest?.status === 'pending' ? (
                <div className="p-4 bg-purple-50 border border-purple-200 rounded-xl text-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
                    <span className="font-semibold text-purple-800">Request Under Review</span>
                  </div>
                  <p className="text-purple-700">The admin team is reviewing your Premium request.</p>
                </div>
              ) : premiumRequest?.status === 'rejected' ? (
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm mb-4">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="w-2 h-2 rounded-full bg-red-400" />
                    <span className="font-semibold text-red-800">Not Approved</span>
                  </div>
                  {premiumRequest.rejection_reason && <p className="text-red-700">{premiumRequest.rejection_reason}</p>}
                </div>
              ) : null}

              {/* Eligibility checklist */}
              {(!premiumRequest || premiumRequest.status === 'rejected') && (
                <div className="space-y-2 mb-4">
                  {[
                    { label: `${PREMIUM_REQUIREMENTS.minTransactions} completed transactions`, met: meetsTransactions },
                    isFarmer
                      ? { label: `${PREMIUM_REQUIREMENTS.minListings} listings posted`, met: meetsListings }
                      : { label: `${PREMIUM_REQUIREMENTS.minOrders} orders placed`, met: meetsOrders },
                    { label: `Account at least ${PREMIUM_REQUIREMENTS.minAccountAgeDays} days old`, met: meetsAge },
                  ].map(({ label, met }) => (
                    <div key={label} className="flex items-center gap-2 text-sm">
                      {met
                        ? <svg className="w-4 h-4 text-emerald-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                        : <svg className="w-4 h-4 text-gray-300 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                      }
                      <span className={met ? 'text-gray-700' : 'text-gray-400'}>{label}</span>
                    </div>
                  ))}
                </div>
              )}

              {(!premiumRequest || premiumRequest.status === 'rejected') && (
                <button
                  onClick={() => { setPremiumError(''); setShowPremiumModal(true); }}
                  disabled={!isEligibleForPremium}
                  className="w-full py-2.5 bg-gradient-to-r from-violet-600 to-purple-600 text-white text-sm font-semibold rounded-xl hover:from-violet-700 hover:to-purple-700 transition shadow-sm active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed">
                  {isEligibleForPremium ? 'Apply for Premium' : 'Requirements Not Met'}
                </button>
              )}
            </div>
          )}

          {/* Locked Premium card — shown to unverified users so they know it exists */}
          {tier === 'none' && (
            <div className="bg-gradient-to-br from-violet-50/60 to-purple-50/60 rounded-2xl border border-purple-100 border-dashed p-6 opacity-80">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-gray-400 shadow-sm">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}><path d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" /></svg>
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-500">Premium Verification</p>
                  <p className="text-xs text-gray-400">Locked</p>
                </div>
              </div>
              <p className="text-sm text-gray-500 mb-3">
                Premium is an exclusive earned tier. To unlock it, you must first complete <span className="font-semibold text-gray-700">Standard Verification</span> above and get approved by the admin.
              </p>
              <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-100 rounded-xl text-xs text-amber-700">
                <svg className="w-4 h-4 shrink-0 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}><path d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" /></svg>
                Step 1: Get Standard Verified → Step 2: Meet activity standards → Step 3: Apply for Premium
              </div>
            </div>
          )}

          {/* Already premium */}
          {tier === 'premium' && (
            <div className="bg-gradient-to-br from-violet-50 to-purple-50 rounded-2xl border border-purple-200 p-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white shadow-sm">
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.9 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l7.1-1.01L12 2z" /></svg>
                </div>
                <p className="text-sm font-bold text-purple-900">Premium Member</p>
              </div>
              <p className="text-xs text-purple-700">You hold the Premium badge — a mark of excellence earned through performance.</p>
            </div>
          )}

          <div className="bg-gradient-to-br from-farm-green/5 to-emerald-green/5 rounded-2xl border border-farm-green/10 p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-farm-green to-emerald-green flex items-center justify-center text-white shadow-sm">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}><path d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
              <p className="text-sm font-semibold text-farm-green">Go to Dashboard</p>
            </div>
            <p className="text-xs text-gray-500 mb-4">Manage your listings, track orders, and more.</p>
            <Link href={profile.role === 'farmer' ? '/dashboard/farmer' : profile.role === 'buyer' ? '/dashboard/buyer' : '/dashboard/admin'}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-farm-green hover:text-farm-green-light transition">
              View Dashboard
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}><path d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" /></svg>
            </Link>
          </div>
        </div>
      </div>

      {/* Verification Modal */}
      {showVerificationModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm" onClick={() => setShowVerificationModal(false)}>
          <div className="bg-white rounded-2xl p-6 sm:p-8 max-w-lg w-full shadow-2xl animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-farm-green to-emerald-green flex items-center justify-center text-white">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}><path d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Request Verification</h3>
              </div>
              <button onClick={() => setShowVerificationModal(false)} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            {verificationError && (
              <div className="mb-5 p-3.5 bg-red-50 border border-red-200 text-alert-red text-sm rounded-xl flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-red-200 flex items-center justify-center text-xs font-bold shrink-0">✕</span>
                {verificationError}
              </div>
            )}

            <form onSubmit={handleVerificationSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Upload Documents</label>
                <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center hover:border-farm-green/50 transition cursor-pointer"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => { e.preventDefault(); setVerificationFiles(Array.from(e.dataTransfer.files)); }}>
                  <input type="file" multiple accept="image/*,.pdf" className="hidden" id="verification-files"
                    onChange={(e) => setVerificationFiles(Array.from(e.target.files || []))} />
                  <label htmlFor="verification-files" className="cursor-pointer">
                    <svg className="w-8 h-8 text-gray-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}><path d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" /></svg>
                    <p className="text-sm text-gray-500">{verificationFiles.length > 0 ? `${verificationFiles.length} file(s) selected` : 'Click or drag to upload documents'}</p>
                    <p className="text-xs text-gray-400 mt-1">Passport, National ID, Driver&apos;s License (images or PDF)</p>
                  </label>
                </div>
                {verificationFiles.length > 0 && (
                  <div className="mt-3 space-y-1.5">
                    {Array.from(verificationFiles).map((file, i) => (
                      <div key={i} className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg text-sm text-gray-600">
                        <svg className="w-4 h-4 text-farm-green shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}><path d="M9 12h6m-6 3h6m-6-6h6" /><path d="M15 3H9a2 2 0 00-2 2v14a2 2 0 002 2h6a2 2 0 002-2V5a2 2 0 00-2-2z" /></svg>
                        <span className="flex-1 truncate">{file.name}</span>
                        <span className="text-xs text-gray-400">{(file.size / 1024).toFixed(0)} KB</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Additional Notes (optional)</label>
                <textarea value={verificationNotes} onChange={(e) => setVerificationNotes(e.target.value)}
                  placeholder="Any additional information for the admin..."
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-farm-green focus:border-transparent bg-white text-sm" rows={3} />
              </div>

              <div className="flex gap-3">
                <button type="submit" disabled={verificationSubmitting || verificationFiles.length === 0}
                  className="flex-1 py-2.5 bg-gradient-to-r from-farm-green to-emerald-green text-white font-semibold rounded-xl hover:from-farm-green-light hover:to-emerald-700 transition disabled:opacity-50 shadow-sm active:scale-[0.98]">
                  {verificationSubmitting ? <span className="flex items-center justify-center gap-2"><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Submitting...</span> : 'Submit for Review'}
                </button>
                <button type="button" onClick={() => setShowVerificationModal(false)}
                  className="px-5 py-2.5 text-gray-600 font-medium rounded-xl border border-gray-200 hover:bg-gray-50 transition text-sm">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Premium Verification Modal */}
      {showPremiumModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm" onClick={() => setShowPremiumModal(false)}>
          <div className="bg-white rounded-2xl p-6 sm:p-8 max-w-md w-full shadow-2xl animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white shadow-sm">
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.9 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l7.1-1.01L12 2z" /></svg>
                </div>
                <div>
                  <h3 className="text-base font-semibold text-gray-900">Apply for Premium</h3>
                  <p className="text-xs text-gray-400">Reviewed manually by admin</p>
                </div>
              </div>
              <button onClick={() => setShowPremiumModal(false)} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            {premiumError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl">{premiumError}</div>
            )}

            <div className="mb-5 p-4 bg-purple-50 border border-purple-100 rounded-xl space-y-1.5">
              <p className="text-xs font-semibold text-purple-700 uppercase tracking-wide mb-2">Your Eligibility Snapshot</p>
              <div className="flex justify-between text-sm"><span className="text-gray-600">Transactions</span><span className="font-semibold text-gray-900">{transactionCount}</span></div>
              <div className="flex justify-between text-sm"><span className="text-gray-600">{isFarmer ? 'Listings' : 'Orders'}</span><span className="font-semibold text-gray-900">{isFarmer ? listingCount : transactionCount}</span></div>
              <div className="flex justify-between text-sm"><span className="text-gray-600">Account Age</span><span className="font-semibold text-gray-900">{accountAgeDays} days</span></div>
            </div>

            <form onSubmit={handlePremiumSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Why do you deserve Premium? <span className="text-gray-400">(optional)</span></label>
                <textarea value={premiumMessage} onChange={(e) => setPremiumMessage(e.target.value)}
                  placeholder="Tell the admin why you should be awarded Premium status..."
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white text-sm" rows={4} />
              </div>
              <div className="flex gap-3">
                <button type="submit" disabled={premiumSubmitting}
                  className="flex-1 py-2.5 bg-gradient-to-r from-violet-600 to-purple-600 text-white font-semibold rounded-xl hover:from-violet-700 hover:to-purple-700 transition disabled:opacity-50 shadow-sm active:scale-[0.98] text-sm">
                  {premiumSubmitting
                    ? <span className="flex items-center justify-center gap-2"><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Submitting...</span>
                    : 'Submit Application'}
                </button>
                <button type="button" onClick={() => setShowPremiumModal(false)}
                  className="px-5 py-2.5 text-gray-600 font-medium rounded-xl border border-gray-200 hover:bg-gray-50 transition text-sm">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
