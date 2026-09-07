'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';

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

export default function LoginPage() {
  return (
    <Suspense>
      <LoginPageContent />
    </Suspense>
  );
}

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isBlocked = searchParams.get('blocked') === '1';
  const authFailed = searchParams.get('error') === 'auth_failed';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const supabase = createClient();
      const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password });
      if (authError) {
        setError(authError.message);
        return;
      }
      const { data: profile } = await supabase.from('profiles').select('role, is_blocked').eq('id', data.user.id).single();
      if (profile?.is_blocked) {
        await supabase.auth.signOut();
        setError('Your account has been blocked. Please contact support.');
        return;
      }
      const redirect = searchParams.get('redirect');
      if (redirect && redirect.startsWith('/') && !redirect.startsWith('//')) {
        window.location.href = redirect;
        return;
      }
      if (profile?.role === 'farmer') window.location.href = '/dashboard/farmer';
      else if (profile?.role === 'buyer') window.location.href = '/dashboard/buyer';
      else if (profile?.role === 'admin') window.location.href = '/dashboard/admin';
      else window.location.href = '/marketplace';
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex">

      {/* ── Left panel: Agriculture Image ── */}
      <div className="hidden lg:flex lg:w-[55%] xl:w-[58%] relative overflow-hidden">
        {/* Photo */}
        <Image
          src="https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=1400&q=85&fit=crop"
          alt="Lush green farmland at golden hour"
          fill
          priority
          className="object-cover object-center"
          sizes="(min-width: 1024px) 58vw"
        />

        {/* Gradient: transparent top, deep green bottom */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a1f0b] via-[#0a1f0b]/60 to-transparent" />

        {/* Top-left logo */}
        <Link href="/" className="absolute top-8 left-8 z-10 flex items-center gap-2.5 hover:opacity-80 transition-opacity">
          <Image src="/logo.webp" alt="TheFarmYard Logo" width={52} height={52} className="object-contain" />
          <span className="text-white font-semibold text-base tracking-tight">TheFarmYard</span>
        </Link>

        {/* Bottom content — anchored, no floating boxes */}
        <div className="absolute bottom-0 left-0 right-0 px-10 pb-12 z-10">
          <p className="text-green-400 text-xs font-semibold uppercase tracking-[0.18em] mb-4">
            Ghana&apos;s Agricultural Marketplace
          </p>
          <h2 className="text-white text-4xl xl:text-[2.6rem] font-bold leading-[1.15] tracking-tight mb-4">
            From the soil to<br />
            <span className="text-green-300">your doorstep.</span>
          </h2>
          <p className="text-white/60 text-sm leading-relaxed mb-8 max-w-xs">
            Connect directly with verified farmers across Ghana for fresh produce, fair prices, and secure delivery.
          </p>

          {/* Trust indicators — inline, no boxes */}
          <div className="flex items-center gap-6">
            {[
              { label: 'Verified Farmers' },
              { label: 'Secure Escrow' },
              { label: '100% Fresh' },
            ].map(({ label }) => (
              <div key={label} className="flex items-center gap-1.5">
                <CheckIcon className="w-3.5 h-3.5 text-green-400 shrink-0" />
                <span className="text-white/70 text-xs font-medium">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Right panel: Login Form ── */}
      <div className="flex-1 flex items-center justify-center bg-[#FAFAF8] px-6 py-10 lg:py-12">
        <div className="w-full max-w-[400px] animate-fade-in-up">

          {/* Mobile logo */}
          <Link href="/" className="flex lg:hidden items-center gap-2.5 mb-8 hover:opacity-80 transition-opacity">
            <Image src="/logo.webp" alt="TheFarmYard Logo" width={32} height={32} className="object-contain rounded-lg" />
            <span className="text-farm-green font-semibold text-base tracking-tight">TheFarmYard</span>
          </Link>

          {/* Header */}
          <div className="mb-8">
            <h1 className="text-[1.6rem] font-bold text-gray-900 tracking-tight">Welcome back</h1>
            <p className="text-gray-500 mt-1.5 text-sm">Sign in to continue to TheFarmYard</p>
          </div>

          {/* Blocked banner */}
          {isBlocked && (
            <div className="mb-5 p-4 bg-red-50 border border-red-200 rounded-xl animate-fade-in">
              <div className="flex items-center gap-2 mb-1">
                <svg className="w-5 h-5 text-red-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}><path d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>
                <span className="text-sm font-bold text-red-700">Account Blocked</span>
              </div>
              <p className="text-sm text-red-600">Your account has been blocked by the admin due to a violation of our platform policies. If you believe this is a mistake, please contact support.</p>
            </div>
          )}

          {/* Error */}
          {(error || authFailed) && (
            <div className="mb-5 p-3.5 bg-red-50 border border-red-200 text-alert-red text-sm rounded-xl flex items-center gap-2 animate-fade-in">
              <span className="w-5 h-5 rounded-full bg-red-100 border border-red-300 flex items-center justify-center text-xs font-bold shrink-0">✕</span>
              {error || 'Authentication failed. Please try signing in again.'}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-1.5">
                Email address
              </label>
              <input
                id="email"
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
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="password" className="block text-sm font-semibold text-gray-700">
                  Password
                </label>
                <Link href="/forgot-password" className="text-xs text-farm-green font-medium hover:underline underline-offset-2">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 pr-11 border border-gray-200 rounded-xl bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-farm-green/30 focus:border-farm-green transition-all shadow-sm"
                  placeholder="Enter your password"
                  required
                  autoComplete="current-password"
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

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-farm-green text-white font-semibold rounded-xl hover:bg-farm-green-light active:scale-[0.98] transition-all disabled:opacity-60 shadow-md hover:shadow-lg mt-2 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Signing in...
                </>
              ) : (
                <>
                  Sign In
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                  </svg>
                </>
              )}
            </button>
          </form>

          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-xs text-gray-400 font-medium">New to TheFarmYard?</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          <Link
            href="/signup"
            className="w-full flex items-center justify-center py-3 border-2 border-gray-200 rounded-xl text-gray-700 font-semibold text-sm hover:border-farm-green hover:text-farm-green hover:bg-farm-green/5 transition-all active:scale-[0.98]"
          >
            Create a free account
          </Link>

          <p className="text-center text-xs text-gray-400 mt-6 leading-relaxed">
            By signing in, you agree to our{' '}
            <Link href="/policy?from=login" className="text-farm-green hover:underline underline-offset-2">Platform Policy</Link>.
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
