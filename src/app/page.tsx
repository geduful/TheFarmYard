'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

const sectors = [
  { name: 'Crops & Grains', desc: 'Maize, rice, wheat, beans, and more' },
  { name: 'Livestock', desc: 'Cattle, goats, sheep, and dairy' },
  { name: 'Poultry', desc: 'Chickens, turkeys, ducks, and eggs' },
  { name: 'Aquaculture', desc: 'Catfish, tilapia, shrimp, and fish feed' },
];

const stats = [
  { value: '500+', label: 'Verified Farmers' },
  { value: 'GH₵50M+', label: 'Transaction Volume' },
  { value: '98%', label: 'Satisfaction Rate' },
  { value: '48hr', label: 'Auto-Release' },
];

export default function Home() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { setChecking(false); return; }
      supabase.from('profiles').select('role').eq('id', user.id).single().then(({ data }) => {
        if (data?.role === 'farmer') router.replace('/dashboard/farmer');
        else if (data?.role === 'buyer') router.replace('/dashboard/buyer');
        else if (data?.role === 'admin') router.replace('/dashboard/admin');
        else router.replace('/marketplace');
      });
    });
  }, [router]);

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-farm-green/30 border-t-farm-green rounded-full animate-spin" />
          <p className="text-sm text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-white">
      <header className="fixed top-0 inset-x-0 z-50 bg-white/80 backdrop-blur-xl border-b border-gray-100/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
            <Image src="/logo.png" alt="TheFarmYard Logo" width={52} height={52} className="object-contain" priority />
            <span className="text-lg font-bold text-farm-green tracking-tight">TheFarmYard</span>
          </Link>
          <nav className="flex items-center gap-2">
            <Link href="/login" className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition rounded-lg hover:bg-gray-50">
              Log In
            </Link>
            <Link href="/signup" className="px-5 py-2 bg-farm-green text-white text-sm font-semibold rounded-xl hover:bg-farm-green-light transition-all shadow-sm hover:shadow-md">
              Get Started
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <section className="relative min-h-[90vh] flex items-center overflow-hidden">
          <div className="absolute inset-0 bg-farm-green-dark">
            <div className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-60"
              style={{ backgroundImage: 'url("https://images.unsplash.com/photo-1590682680695-43b964a3ae17?w=1600&q=80")' }} />
            <div className="absolute inset-0" style={{
              background: `
                linear-gradient(to bottom, rgba(20,48,21,0.55) 0%, rgba(30,70,32,0.65) 50%, rgba(20,48,21,0.92) 100%),
                linear-gradient(45deg, rgba(0,0,0,0.06) 25%, transparent 25%, transparent 75%, rgba(0,0,0,0.06) 75%),
                linear-gradient(45deg, rgba(0,0,0,0.06) 25%, transparent 25%, transparent 75%, rgba(0,0,0,0.06) 75%)
              `,
              backgroundSize: '100% 100%, 100px 100px, 100px 100px',
              backgroundPosition: '0 0, 0 0, 50px 50px',
            }} />
            <div className="absolute top-20 left-10 w-72 h-72 bg-emerald-green/15 rounded-full blur-3xl animate-drift" />
            <div className="absolute bottom-20 right-10 w-96 h-96 bg-amber-500/8 rounded-full blur-3xl animate-drift" style={{ animationDelay: '-3s' }} />
            <div className="absolute top-1/3 right-1/4 w-48 h-48 bg-white/[0.04] rounded-full blur-3xl animate-drift" style={{ animationDelay: '-1.5s' }} />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-white/[0.03] rounded-full blur-3xl" />
          </div>

          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-32 sm:py-40">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/10 backdrop-blur-md rounded-full text-sm font-medium text-white/90 mb-8 border border-white/10 animate-fade-in">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse-soft" />
                Trusted by farmers & buyers across Africa
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-7xl font-bold text-white leading-[1.05] mb-6 tracking-tight animate-fade-in-up">
                From Farm to Table,
                <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-amber-400 to-amber-500">
                  Directly & Securely
                </span>
              </h1>
              <p className="text-lg sm:text-xl text-white/70 max-w-xl mb-10 leading-relaxed animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
                TheFarmYard connects verified farmers directly to buyers. Secure escrow payments,
                fair pricing, and trusted transactions across all agricultural sectors.
              </p>
              <div className="flex flex-wrap gap-4 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
                <Link href="/signup?role=farmer" className="group relative px-8 py-3.5 bg-gradient-to-r from-amber-500 to-amber-600 text-white font-semibold rounded-xl hover:from-amber-600 hover:to-amber-700 transition-all shadow-lg shadow-amber-600/25 hover:shadow-xl hover:shadow-amber-600/30 active:scale-[0.98]">
                  <span className="relative z-10 flex items-center gap-2">Start Selling<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg></span>
                </Link>
                <Link href="/signup?role=buyer" className="px-8 py-3.5 bg-white/10 backdrop-blur-md text-white font-semibold rounded-xl hover:bg-white/20 transition-all border border-white/10 shadow-lg">
                  <span className="flex items-center gap-2">Start Buying<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg></span>
                </Link>
              </div>
            </div>
          </div>

          <div className="absolute bottom-0 inset-x-0 h-32 bg-gradient-to-t from-gray-50 to-transparent" />
        </section>

        <section className="py-20 sm:py-28 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {stats.map((stat, i) => (
                <div key={i} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 text-center card-hover animate-fade-in-up" style={{ animationDelay: `${i * 0.05}s` }}>
                  <p className="text-3xl font-bold text-farm-green mb-1">{stat.value}</p>
                  <p className="text-sm text-gray-500">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-20 sm:py-28 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <span className="text-xs font-semibold text-farm-green uppercase tracking-[0.2em] bg-farm-green/10 px-4 py-1.5 rounded-full">
              All Agricultural Sectors
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mt-5 mb-4">
              Everything Under One Marketplace
            </h2>
            <p className="text-gray-500 max-w-lg mx-auto">
              From crops to aquaculture, find exactly what you need from verified farmers.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {sectors.map((sector, i) => (
              <div key={i} className="group relative bg-white rounded-2xl p-8 shadow-sm border border-gray-100 card-hover animate-fade-in-up" style={{ animationDelay: `${i * 0.1}s` }}>
                {i === 0 && (
                   <svg className="w-12 h-12 mb-4 text-farm-green" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                     <path strokeLinecap="round" strokeLinejoin="round" d="M12 19V9m0 0a7 7 0 0 1 7-7h1v1a7 7 0 0 1-7 7Zm0 0a7 7 0 0 0-7-7H4v1a7 7 0 0 0 7 7Z" />
                   </svg>
                 )}
                 {i === 1 && (
                   <svg className="w-12 h-12 mb-4 text-farm-green" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                     <circle cx="12" cy="12" r="7" />
                     <circle cx="9" cy="10" r="1.5" />
                     <circle cx="15" cy="10" r="1.5" />
                     <path strokeLinecap="round" strokeLinejoin="round" d="M8 15c1.5 1.5 4.5 1.5 6 0" />
                     <path strokeLinecap="round" strokeLinejoin="round" d="M6 8L4 4M18 8l2-4" />
                   </svg>
                 )}
                 {i === 2 && (
                   <svg className="w-12 h-12 mb-4 text-farm-green" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                     <path strokeLinecap="round" strokeLinejoin="round" d="M12 4c-3 0-5 2-5 5 0 2 1 3 2 4h6c1-1 2-2 2-4 0-3-2-5-5-5Z" />
                     <path strokeLinecap="round" strokeLinejoin="round" d="M8 13c0 2 1 3 2 3h4c1 0 2-1 2-3" />
                     <path strokeLinecap="round" strokeLinejoin="round" d="M12 16v4" />
                     <path strokeLinecap="round" strokeLinejoin="round" d="M10 20h4" />
                   </svg>
                 )}
                 {i === 3 && (
                   <svg className="w-12 h-12 mb-4 text-farm-green" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                     <path strokeLinecap="round" strokeLinejoin="round" d="M3 12c0-2 2-4 9-4s9 2 9 4-2 4-9 4-9-2-9-4Z" />
                     <path strokeLinecap="round" strokeLinejoin="round" d="M21 12l2 1v-2l-2 1Z" />
                     <circle cx="16" cy="10" r=".5" fill="currentColor" />
                   </svg>
                 )}
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{sector.name}</h3>
                <p className="text-sm text-gray-500">{sector.desc}</p>
                <div className="absolute bottom-0 left-0 right-0 h-1 rounded-b-2xl bg-gradient-to-r from-farm-green to-emerald-green scale-x-0 group-hover:scale-x-100 transition-transform duration-300" />
              </div>
            ))}
          </div>
        </section>

        <section className="py-20 sm:py-28 bg-gradient-to-br from-gray-50 to-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <span className="text-xs font-semibold text-farm-green uppercase tracking-[0.2em] bg-farm-green/10 px-4 py-1.5 rounded-full">
                How It Works
              </span>
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mt-5 mb-4">
                Three Steps to Trade
              </h2>
              <p className="text-gray-500 max-w-lg mx-auto">
                Simple, secure, and built for real-world agricultural logistics.
              </p>
            </div>
            <div className="relative">
              <div className="hidden lg:block absolute top-1/2 left-[15%] right-[15%] h-0.5 bg-gradient-to-r from-farm-green/20 via-emerald-green/40 to-farm-green/20 -translate-y-1/2" />
              <div className="grid lg:grid-cols-3 gap-8">
                  {[
                    { step: '01', title: 'Farmers List Goods', desc: 'Verified farmers post their produce with real images, quantities, and competitive prices. Every listing is admin-approved.', color: 'from-farm-green to-emerald-green' },
                    { step: '02', title: 'Buy via Escrow', desc: 'Buyers pay securely into escrow. Funds are held safely until delivery is confirmed with a 6-digit token system.', color: 'from-amber-500 to-amber-600' },
                    { step: '03', title: 'Funds Released', desc: 'Farmer enters the delivery token to receive payment instantly. Auto-release depends on delivery location (max 48 hours).', color: 'from-emerald-green to-emerald-600' },
                  ].map((item, i) => (
                  <div key={i} className="relative bg-white rounded-2xl p-8 shadow-sm border border-gray-100 card-hover animate-fade-in-up" style={{ animationDelay: `${i * 0.15}s` }}>
                    <div className="flex items-center gap-4 mb-6">
                      <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${item.color} flex items-center justify-center shadow-lg`}>
                         {i === 0 && (
                           <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                             <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 3h6m-6-6h6" />
                             <path strokeLinecap="round" strokeLinejoin="round" d="M15 3H9a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2Z" />
                           </svg>
                         )}
                         {i === 1 && (
                           <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                             <path strokeLinecap="round" strokeLinejoin="round" d="M12 3.5L4 7v5c0 5.5 3.5 10.5 8 12 4.5-1.5 8-6.5 8-12V7l-8-3.5Z" />
                             <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4" />
                           </svg>
                         )}
                         {i === 2 && (
                           <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                             <path strokeLinecap="round" strokeLinejoin="round" d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                           </svg>
                         )}
                       </div>
                      <span className="text-4xl font-bold text-gray-100 select-none">{item.step}</span>
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-3">{item.title}</h3>
                    <p className="text-gray-500 leading-relaxed">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="py-20 sm:py-28 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <span className="text-xs font-semibold text-farm-green uppercase tracking-[0.2em] bg-farm-green/10 px-4 py-1.5 rounded-full">
                Why TheFarmYard
              </span>
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mt-5 mb-4">
                Built for Real Agriculture
              </h2>
              <p className="text-gray-500 max-w-lg mx-auto">
                Every feature designed around the real-world needs of farmers and buyers.
              </p>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                { title: 'Secure Escrow', desc: 'Funds held safely until delivery is confirmed via 6-digit token. Both parties protected.' },
                { title: 'Verified Farmers', desc: 'Every farmer is vetted. Listings are admin-approved for quality and trust.' },
                { title: 'Delivery Tracking', desc: 'Real-world logistics with vehicle tracking, driver details, and waybill capture.' },
                { title: 'Location-Based Release', desc: 'Auto-release depends on delivery location (max 48 hours). Fair for everyone.' },
                { title: 'Farmer Dashboard', desc: 'Manage listings, track transactions, dispatch goods from one place.' },
                { title: 'Buyer Portal', desc: 'Full order history, delivery tracking, and token management.' },
              ].map((feature, i) => (
                <div key={i} className="p-6 rounded-2xl border border-gray-100 bg-gray-50 card-hover animate-fade-in-up" style={{ animationDelay: `${i * 0.05}s` }}>
                  <div className="w-12 h-12 rounded-xl bg-white shadow-sm border border-gray-100 flex items-center justify-center mb-4">
                     {i === 0 && (
                       <svg className="w-6 h-6 text-farm-green" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                         <path strokeLinecap="round" strokeLinejoin="round" d="M12 3.5L4 7v5c0 5.5 3.5 10.5 8 12 4.5-1.5 8-6.5 8-12V7l-8-3.5Z" />
                       </svg>
                     )}
                     {i === 1 && (
                       <svg className="w-6 h-6 text-farm-green" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                         <circle cx="12" cy="12" r="9" />
                         <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4" />
                       </svg>
                     )}
                     {i === 2 && (
                       <svg className="w-6 h-6 text-farm-green" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                         <path strokeLinecap="round" strokeLinejoin="round" d="M3 15a2 2 0 1 0 4 0 2 2 0 0 0-4 0Zm12 0a2 2 0 1 0 4 0 2 2 0 0 0-4 0ZM3 15V5h11l4 4v6" />
                       </svg>
                     )}
                     {i === 3 && (
                       <svg className="w-6 h-6 text-farm-green" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                         <circle cx="12" cy="12" r="9" />
                         <path strokeLinecap="round" strokeLinejoin="round" d="M12 7v5l3 3" />
                       </svg>
                     )}
                     {i === 4 && (
                       <svg className="w-6 h-6 text-farm-green" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                         <path strokeLinecap="round" strokeLinejoin="round" d="M4 20h16M6 16V9m4 7V5m4 11v-6m4 6v-3" />
                       </svg>
                     )}
                     {i === 5 && (
                       <svg className="w-6 h-6 text-farm-green" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                         <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10" />
                       </svg>
                     )}
                   </div>
                  <h3 className="font-semibold text-gray-900 mb-2">{feature.title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{feature.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="relative overflow-hidden py-20 sm:py-28 px-4 sm:px-6 lg:px-8">
          <div className="absolute inset-0 farm-gradient">
            <div className="absolute top-0 right-0 w-96 h-96 bg-white/[0.03] rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-amber-500/[0.05] rounded-full blur-3xl" />
            <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.03) 1px, transparent 0)', backgroundSize: '40px 40px' }} />
          </div>
          <div className="relative max-w-3xl mx-auto text-center">
            <span className="text-xs font-semibold uppercase tracking-[0.2em] bg-white/10 text-white/80 px-4 py-1.5 rounded-full">
              Get Started Today
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold text-white mt-6 mb-4 text-balance">
              Ready to Transform Your Agricultural Trade?
            </h2>
            <p className="text-white/70 mb-10 max-w-lg mx-auto">
              Join thousands of farmers and buyers already using TheFarmYard.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link href="/signup?role=farmer" className="px-8 py-3.5 bg-white text-farm-green font-semibold rounded-xl hover:bg-cream transition-all shadow-lg hover:shadow-xl active:scale-[0.98]">
                <span className="flex items-center gap-2">Start as Farmer<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg></span>
              </Link>
              <Link href="/signup?role=buyer" className="px-8 py-3.5 bg-white/10 backdrop-blur-md text-white font-semibold rounded-xl hover:bg-white/20 transition-all border border-white/10">
                <span className="flex items-center gap-2">Start as Buyer<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg></span>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-gray-950 text-gray-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-10 mb-12">
            <div className="sm:col-span-2">
              <div className="flex items-center gap-2.5 mb-4">
                <svg className="w-6 h-6 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 19V9m0 0a7 7 0 0 1 7-7h1v1a7 7 0 0 1-7 7Zm0 0a7 7 0 0 0-7-7H4v1a7 7 0 0 0 7 7Z" />
                </svg>
                <span className="text-lg font-bold text-white">TheFarmYard</span>
              </div>
              <p className="text-sm leading-relaxed max-w-md text-gray-500">
                Connecting farmers directly to buyers across all agricultural sectors.
                Secure escrow payments, verified farmers, and trusted transactions.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-sm text-white mb-4">Platform</h4>
              <div className="space-y-3 text-sm">
                <Link href="/marketplace" className="block text-gray-400 hover:text-white transition">Marketplace</Link>
                <Link href="/signup" className="block text-gray-400 hover:text-white transition">Get Started</Link>
                <Link href="/login" className="block text-gray-400 hover:text-white transition">Sign In</Link>
              </div>
            </div>
            <div>
              <h4 className="font-semibold text-sm text-white mb-4">Policies</h4>
              <div className="space-y-3 text-sm">
                <Link href="/policy" className="block text-gray-400 hover:text-white transition">Platform Policy</Link>
                <Link href="/policy/farmer" className="block text-gray-400 hover:text-white transition">Farmer Policy</Link>
                <Link href="/policy/buyer" className="block text-gray-400 hover:text-white transition">Buyer Policy</Link>
              </div>
            </div>
            <div>
              <h4 className="font-semibold text-sm text-white mb-4">Sectors</h4>
              <div className="space-y-3 text-sm">
                  {sectors.map((s) => (
                  <p key={s.name} className="text-gray-400">{s.name}</p>
                ))}
              </div>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-8 text-sm text-center text-gray-500">
            &copy; {new Date().getFullYear()} TheFarmYard. All rights reserved. Designed and Developed by{' '}
            <a href="https://kpgroupofcompanies.netlify.app/kpmedia.html" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white transition underline underline-offset-2">
              KP Media
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
