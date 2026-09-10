'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import type { Profile } from '@/lib/types';
import { Skeleton } from '@/components/ui/LoadingSkeleton';
import PhoneInput from '@/components/ui/PhoneInput';
import { LocationSelect } from '@/components/ui/LocationSelect';

export default function EditProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [location, setLocation] = useState('');
  const [payoutBank, setPayoutBank] = useState('');
  const [payoutNumber, setPayoutNumber] = useState('');
  const [payoutName, setPayoutName] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }
      const { data: p } = await supabase.from('profiles').select('id, full_name, phone_number, role, is_verified, is_blocked, blocked_warning, verification_tier, farm_location, created_at').eq('id', user.id).single();
      setProfile(p);
      setFullName(p?.full_name || '');
      setPhoneNumber(p?.phone_number || '');
      setLocation(p?.farm_location || '');

      // Fetch payout details from secure API (farmers only)
      if (p?.role === 'farmer') {
        try {
          const res = await fetch('/api/payout-details');
          const data = await res.json();
          if (data.payoutDetails) {
            setPayoutBank(data.payoutDetails.bank_name || '');
            setPayoutNumber(data.payoutDetails.account_number || '');
            setPayoutName(data.payoutDetails.account_name || '');
          }
        } catch { /* payout details not yet set */ }
      }
      setLoading(false);
    }
    load();
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess(false);
    if (!profile) { setError('Profile not found. Please sign up again.'); return; }
    if (!location.trim() || location.split('>').length < 3) { setError('Please complete your location — select region, district, and town.'); return; }
    setSaving(true);
    const supabase = createClient();
    const { error: updateError } = await supabase.from('profiles').update({
      full_name: fullName,
      phone_number: phoneNumber,
      farm_location: location,
    }).eq('id', profile?.id);
    if (updateError) { setError(updateError.message); setSaving(false); return; }

    // Save payout details via secure API (farmers only)
    if (profile.role === 'farmer') {
      try {
        await fetch('/api/payout-details', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            bank_name: payoutBank.trim() || null,
            account_number: payoutNumber.trim() || null,
            account_name: payoutName.trim() || null,
          }),
        });
      } catch { /* payout save failed silently — profile still saved */ }
    }

    setSuccess(true);
    setSaving(false);
    setTimeout(() => router.push('/dashboard/profile'), 1500);
  }

  if (loading) {
    return <div className="max-w-2xl mx-auto p-4 sm:p-6 space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-64 rounded-2xl" /></div>;
  }

  return (
    <div className="max-w-2xl mx-auto p-4 sm:p-6 lg:p-8 animate-fade-in">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-farm-green to-emerald-green flex items-center justify-center text-white text-lg shadow-sm">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" /></svg>
        </div>
        <div>
          <h1 className="text-lg font-bold text-gray-900">Edit Profile</h1>
          <p className="text-sm text-gray-500">Update your personal information</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8">
        {error && (
          <div className="mb-5 p-3.5 bg-red-50 border border-red-200 text-alert-red text-sm rounded-xl flex items-center gap-2 animate-fade-in">
            <span className="w-5 h-5 rounded-full bg-red-200 flex items-center justify-center text-xs font-bold shrink-0">✕</span> {error}
          </div>
        )}

        {success && (
          <div className="mb-5 p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-green text-sm rounded-xl flex items-center gap-2 animate-fade-in">
            <span className="w-5 h-5 rounded-full bg-emerald-200 flex items-center justify-center text-xs font-bold shrink-0">✓</span> Profile updated successfully! Redirecting...
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-5">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name</label>
            <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)}
              className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-farm-green focus:border-transparent bg-white" required />
          </div>
          <div className="mb-5">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone Number</label>
            <PhoneInput value={phoneNumber} onChange={setPhoneNumber} required />
          </div>
          <div className="mb-6">
            <LocationSelect
              value={location}
              onChange={setLocation}
              label={profile?.role === 'farmer' ? 'Farm Location' : 'Delivery Region'}
              required
            />
          </div>

          {profile?.role === 'farmer' && (
            <div className="mb-6 p-4 bg-gradient-to-br from-cream to-cream-dark rounded-xl border border-cream-dark/50">
              <p className="text-sm font-semibold text-gray-900 mb-1">Payout Details <span className="font-normal text-gray-400">(optional)</span></p>
              <p className="text-xs text-gray-500 mb-3">Where released escrow funds are sent (MoMo number or bank account).</p>
              <div className="space-y-3">
                <input type="text" value={payoutBank} onChange={(e) => setPayoutBank(e.target.value)}
                  placeholder="Bank / telco code (e.g. MTN)"
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-farm-green focus:border-transparent bg-white" />
                <input type="text" value={payoutNumber} onChange={(e) => setPayoutNumber(e.target.value)}
                  placeholder="Account / MoMo number"
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-farm-green focus:border-transparent bg-white" />
                <input type="text" value={payoutName} onChange={(e) => setPayoutName(e.target.value)}
                  placeholder="Account name"
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-farm-green focus:border-transparent bg-white" />
              </div>
            </div>
          )}

          <div className="flex items-center gap-3">
            <button type="submit" disabled={saving || success}
              className="px-6 py-2.5 bg-farm-green text-white font-semibold rounded-xl hover:bg-farm-green-light transition disabled:opacity-50 shadow-sm hover:shadow-md active:scale-[0.98]">
              {saving ? <span className="flex items-center gap-2"><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Saving...</span> : 'Save Changes'}
            </button>
            <Link href="/dashboard/profile" className="px-6 py-2.5 text-gray-600 font-medium rounded-xl border border-gray-200 hover:bg-gray-50 transition">
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
