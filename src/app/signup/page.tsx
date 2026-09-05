'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import type { Role } from '@/lib/types';
import PhoneInput from '@/components/ui/PhoneInput';

function LeafIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <path d="M32 4C32 4 8 16 8 38C8 50 18 58 32 60C46 58 56 50 56 38C56 16 32 4 32 4Z" fill="currentColor" fillOpacity="0.9" />
      <path d="M32 60V20" stroke="white" strokeWidth="2" strokeLinecap="round" />
      <path d="M32 36C26 32 18 30 14 28" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M32 44C38 40 46 38 50 36" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <path d="M3 8L6.5 11.5L13 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function FarmerIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <circle cx="7" cy="17" r="2.5" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="17" cy="17" r="2.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M4.5 17H3V11L6 7h8l3 4h1.5a1.5 1.5 0 0 1 0 3H19.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9.5 17H14.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M6 7V5H10V7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function BuyerIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3 6h18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M16 10a4 4 0 0 1-8 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function LocationIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="12" cy="9" r="2.5" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[#FAFAF8]">
        <div className="flex items-center gap-3 text-gray-400">
          <span className="w-5 h-5 border-2 border-gray-300 border-t-farm-green rounded-full animate-spin" />
          Loading...
        </div>
      </div>
    }>
      <SignupPageContent />
    </Suspense>
  );
}

function SignupPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const defaultRole = searchParams.get('role') || '';

  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [location, setLocation] = useState('');
  const [role, setRole] = useState<Role>(defaultRole === 'farmer' ? 'farmer' : 'buyer');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const supabase = createClient();
    const { data, error: signUpError } = await supabase.auth.signUp({
      email, password,
      options: { data: { full_name: fullName, phone_number: phoneNumber, role, farm_location: location } },
    });
    if (signUpError) { setError(signUpError.message); setLoading(false); return; }
    if (data.user?.identities?.length === 0) { setError('An account with this email already exists.'); setLoading(false); return; }
    if (role === 'farmer') router.push('/dashboard/farmer');
    else router.push('/marketplace');
  }

  return (
    <div className="min-h-screen flex flex-row-reverse">

      {/* ── Right panel: Agriculture Image ── */}
      <div className="hidden lg:flex lg:w-[40%] xl:w-[42%] relative overflow-hidden">
        {/* Photo */}
        <Image
          src="https://images.unsplash.com/photo-1464226184884-fa280b87c399?w=1200&q=85&fit=crop"
          alt="Fresh harvest produce at an African farm"
          fill
          priority
          className="object-cover object-center"
          sizes="(min-width: 1024px) 42vw"
        />

        {/* Gradient: transparent top, deep green bottom */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a1f0b] via-[#0a1f0b]/55 to-transparent" />

        {/* Top-left logo */}
        <Link href="/" className="absolute top-8 left-8 z-10 flex items-center gap-2.5 hover:opacity-80 transition-opacity">
          <Image src="/logo.png" alt="TheFarmYard Logo" width={52} height={52} className="object-contain" />
          <span className="text-white font-semibold text-base tracking-tight">TheFarmYard</span>
        </Link>

        {/* Bottom content — anchored, clean */}
        <div className="absolute bottom-0 left-0 right-0 px-8 pb-12 z-10">
          <p className="text-green-400 text-xs font-semibold uppercase tracking-[0.18em] mb-4">
            Join the Community
          </p>
          <h2 className="text-white text-3xl xl:text-4xl font-bold leading-[1.15] tracking-tight mb-4">
            Grow your farm.<br />
            <span className="text-green-300">Feed a nation.</span>
          </h2>
          <p className="text-white/60 text-sm leading-relaxed mb-8 max-w-xs">
            Join thousands of farmers and buyers building a transparent agricultural economy across Ghana.
          </p>

          {/* Stats — clean inline list, no boxes */}
          <div className="space-y-2.5">
            {[
              { value: '2,400+', label: 'Verified Farmers' },
              { value: '8,100+', label: 'Active Buyers' },
              { value: '500+',   label: 'Fresh Listings' },
            ].map(({ value, label }) => (
              <div key={label} className="flex items-center gap-3">
                <CheckIcon className="w-3.5 h-3.5 text-green-400 shrink-0" />
                <span className="text-white font-semibold text-sm">{value}</span>
                <span className="text-white/55 text-sm">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Left panel: Signup Form ── */}
      <div className="flex-1 flex items-start justify-center bg-[#FAFAF8] px-6 py-8 overflow-y-auto">
        <div className="w-full max-w-[440px] animate-fade-in-up">

          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 mb-7 hover:opacity-80 transition-opacity w-fit">
            <div className="w-8 h-8 rounded-lg bg-farm-green flex items-center justify-center">
              <LeafIcon className="w-4 h-4 text-white" />
            </div>
            <span className="text-farm-green font-semibold text-base tracking-tight">TheFarmYard</span>
          </Link>

          {/* Header */}
          <div className="mb-6">
            <h1 className="text-[1.6rem] font-bold text-gray-900 tracking-tight">Create your account</h1>
            <p className="text-gray-500 mt-1.5 text-sm">Join Ghana&apos;s premier agricultural marketplace</p>
          </div>

          {/* Role selector */}
          <div className="mb-5">
            <p className="text-sm font-semibold text-gray-700 mb-2.5">I want to...</p>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setRole('farmer')}
                className={`relative flex flex-col items-center gap-2 py-4 px-3 rounded-xl border-2 font-semibold text-sm transition-all ${
                  role === 'farmer'
                    ? 'border-farm-green bg-farm-green text-white shadow-md'
                    : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:shadow-sm'
                }`}
              >
                <FarmerIcon className={`w-5 h-5 ${role === 'farmer' ? 'text-white' : 'text-gray-400'}`} />
                <span>Sell as Farmer</span>
                {role === 'farmer' && (
                  <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-green-400 rounded-full flex items-center justify-center">
                    <CheckIcon className="w-2.5 h-2.5 text-white" />
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={() => setRole('buyer')}
                className={`relative flex flex-col items-center gap-2 py-4 px-3 rounded-xl border-2 font-semibold text-sm transition-all ${
                  role === 'buyer'
                    ? 'border-farm-green bg-farm-green text-white shadow-md'
                    : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:shadow-sm'
                }`}
              >
                <BuyerIcon className={`w-5 h-5 ${role === 'buyer' ? 'text-white' : 'text-gray-400'}`} />
                <span>Buy as Buyer</span>
                {role === 'buyer' && (
                  <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-green-400 rounded-full flex items-center justify-center">
                    <CheckIcon className="w-2.5 h-2.5 text-white" />
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-4 p-3.5 bg-red-50 border border-red-200 text-alert-red text-sm rounded-xl flex items-center gap-2 animate-fade-in">
              <span className="w-5 h-5 rounded-full bg-red-100 border border-red-300 flex items-center justify-center text-xs font-bold shrink-0">✕</span>
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Full Name</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-farm-green/30 focus:border-farm-green transition-all shadow-sm"
                  placeholder="Your full name"
                  required
                  autoComplete="name"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Phone Number</label>
                <PhoneInput value={phoneNumber} onChange={setPhoneNumber} required />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Email address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-farm-green/30 focus:border-farm-green transition-all shadow-sm"
                placeholder="you@example.com"
                required
                autoComplete="email"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 pr-11 border border-gray-200 rounded-xl bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-farm-green/30 focus:border-farm-green transition-all shadow-sm"
                  placeholder="Min. 6 characters"
                  minLength={6}
                  required
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5">
                <LocationIcon className="w-3.5 h-3.5 text-gray-400" />
                {role === 'farmer' ? 'Farm Location' : 'Delivery Region'}
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g., Eastern Region, Koforidua"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-farm-green/30 focus:border-farm-green transition-all shadow-sm"
                required
              />
            </div>

            {/* Policy checkbox */}
            <div className="flex items-start gap-3 py-1">
              <input
                type="checkbox"
                id="agree-policies"
                required
                className="mt-0.5 w-4 h-4 border-gray-300 rounded focus:ring-farm-green text-farm-green shrink-0 cursor-pointer"
              />
              <label htmlFor="agree-policies" className="text-xs text-gray-500 leading-relaxed cursor-pointer">
                I agree to the{' '}
                <Link href="/policy?from=signup" className="text-farm-green font-semibold hover:underline underline-offset-2">Platform Policy</Link>
                {role === 'farmer' ? (
                  <> and{' '}<Link href="/policy/farmer?from=signup" className="text-farm-green font-semibold hover:underline underline-offset-2">Farmer Policy</Link></>
                ) : (
                  <> and{' '}<Link href="/policy/buyer?from=signup" className="text-farm-green font-semibold hover:underline underline-offset-2">Buyer Policy</Link></>
                )}
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-farm-green text-white font-semibold rounded-xl hover:bg-farm-green-light active:scale-[0.98] transition-all disabled:opacity-60 shadow-md hover:shadow-lg flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Creating account...
                </>
              ) : (
                <>
                  Create Account
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                  </svg>
                </>
              )}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-5">
            Already have an account?{' '}
            <Link href="/login" className="text-farm-green font-semibold hover:underline underline-offset-2">
              Sign in
            </Link>
          </p>

          <div className="mt-8 pt-6 border-t border-gray-100 text-center">
            <p className="text-xs text-gray-400">
              &copy; {new Date().getFullYear()} TheFarmYard &mdash; Designed &amp; Developed by{' '}
              <a href="https://kpgroupofcompanies.netlify.app/kpmedia.html" target="_blank" rel="noopener noreferrer" className="text-farm-green font-medium hover:underline underline-offset-2 transition">
                KP Media
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
