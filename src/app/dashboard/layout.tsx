'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import type { Profile } from '@/lib/types';

const navConfig = {
  farmer: {
    title: 'Farmer',
    items: [
      { href: '/dashboard/farmer', label: 'Dashboard', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" /></svg> },
      { href: '/dashboard/farmer/listings/new', label: 'New Listing', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v6m3-3H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> },
      { href: '/marketplace', label: 'Marketplace', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" /></svg> },
      { href: '/dashboard/farmer/storage', label: 'Storage', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3H21" /></svg> },
      { href: '/learning', label: 'Learning Hub', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.26 10.147a60.438 60.438 0 0 0-.491 6.347A48.62 48.62 0 0 1 12 20.904a48.62 48.62 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a50.636 50.636 0 0 0-2.658-.813A59.906 59.906 0 0 1 12 3.493a59.903 59.903 0 0 1 10.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0 1 12 13.489a50.702 50.702 0 0 1 7.74-3.342" /></svg> },
      { href: '/news', label: 'News & Intel', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 7.5h1.5m-1.5 3h1.5m-7.5 3h7.5m-7.5 3h7.5m3-9h3.375c.621 0 1.125.504 1.125 1.125V18a2.25 2.25 0 01-2.25 2.25M16.5 7.5V4.875c0-.621-.504-1.125-1.125-1.125H4.125C3.504 3.75 3 4.254 3 4.875V18a2.25 2.25 0 002.25 2.25h13.5" /></svg> },
    ],
  },
  buyer: {
    title: 'Buyer',
    items: [
      { href: '/dashboard/buyer', label: 'My Orders', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg> },
      { href: '/marketplace', label: 'Marketplace', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" /></svg> },
      { href: '/news', label: 'News & Intel', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 7.5h1.5m-1.5 3h1.5m-7.5 3h7.5m-7.5 3h7.5m3-9h3.375c.621 0 1.125.504 1.125 1.125V18a2.25 2.25 0 01-2.25 2.25M16.5 7.5V4.875c0-.621-.504-1.125-1.125-1.125H4.125C3.504 3.75 3 4.254 3 4.875V18a2.25 2.25 0 002.25 2.25h13.5" /></svg> },
    ],
  },
  admin: {
    title: 'Admin',
    items: [
      { href: '/dashboard/admin', label: 'Admin Panel', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281zM15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg> },
      { href: '/marketplace', label: 'Marketplace', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" /></svg> },
      { href: '/news', label: 'News & Intel', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 7.5h1.5m-1.5 3h1.5m-7.5 3h7.5m-7.5 3h7.5m3-9h3.375c.621 0 1.125.504 1.125 1.125V18a2.25 2.25 0 01-2.25 2.25M16.5 7.5V4.875c0-.621-.504-1.125-1.125-1.125H4.125C3.504 3.75 3 4.254 3 4.875V18a2.25 2.25 0 002.25 2.25h13.5" /></svg> },
    ],
  },
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const closeSidebar = useCallback(() => setSidebarOpen(false), []);

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (cancelled) return;
      if (!user) { router.push(`/login?redirect=${encodeURIComponent(pathname)}`); return; }
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      if (!cancelled) setProfile(data);
    })();
    return () => { cancelled = true; };
  }, [router, pathname]);

  // Lock body scroll when sidebar is open on mobile
  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [sidebarOpen]);

  // Close sidebar on Escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && sidebarOpen) closeSidebar();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [sidebarOpen, closeSidebar]);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.refresh();
    router.push('/');
  }

  const config = profile ? navConfig[profile.role as keyof typeof navConfig] : null;
  const isProfilePage = pathname === '/dashboard/profile' || pathname === '/dashboard/profile/edit';

  return (
    <div className="flex flex-col flex-1 min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-40 shadow-sm">
        <div className="flex items-center justify-between px-4 sm:px-6 h-14">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(!sidebarOpen)}
              className="md:hidden p-2 hover:bg-gray-50 rounded-lg transition" aria-label="Toggle sidebar">
              {sidebarOpen ? (
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
            <Link href="/" className="flex items-center gap-2 hover:scale-105 transition-transform">
              <Image src="/logo.webp" alt="TheFarmYard Logo" width={44} height={44} className="object-contain" />
              <span className="font-bold text-base text-farm-green hidden sm:block">TheFarmYard</span>
            </Link>
            {config && !isProfilePage && <span className="hidden sm:inline text-sm text-gray-300 mx-1">/</span>}
            {config && !isProfilePage && <span className="hidden sm:inline text-sm text-gray-500 font-medium">{config.title}</span>}
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <Link href="/dashboard/profile"
              className="flex items-center gap-2 px-2 sm:px-3 py-1.5 text-sm bg-gray-50 rounded-lg hover:bg-gray-100 transition border border-gray-100">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-green to-farm-green flex items-center justify-center text-xs font-bold text-white shadow-sm">
                {profile?.full_name?.charAt(0).toUpperCase() || '?'}
              </div>
              <span className="hidden sm:inline text-sm font-medium text-gray-700">{profile?.full_name?.split(' ')[0] || 'Profile'}</span>
            </Link>
            <button onClick={handleSignOut}
              className="p-2 text-gray-400 hover:text-alert-red hover:bg-red-50 rounded-lg transition" title="Sign Out">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      <div className="flex flex-1 relative">
        {sidebarOpen && (
          <div className="fixed inset-0 bg-black/40 z-40 md:hidden backdrop-blur-sm transition-opacity"
            onClick={closeSidebar} />
        )}

        <aside className={`w-64 bg-white border-r border-gray-100 flex-shrink-0 fixed md:sticky top-0 md:top-14 bottom-0 z-50 transform transition-transform duration-250 ease-out md:transform-none overflow-y-auto ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
          <div className="p-4 pt-18 md:pt-4">
            <div className="flex items-center gap-3 mb-5 p-3 bg-gradient-to-br from-farm-green to-farm-green-dark rounded-xl shadow-sm">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white font-bold shrink-0 backdrop-blur-sm">
                {profile?.full_name?.charAt(0).toUpperCase() || '?'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate">{profile?.full_name}</p>
                <p className="text-xs text-emerald-200 capitalize flex items-center gap-1">
                  <span className={`w-1.5 h-1.5 rounded-full ${profile?.is_verified ? 'bg-emerald-300' : 'bg-white/40'}`} />
                  {profile?.role}{profile?.is_verified && ' • Verified'}
                </p>
              </div>
            </div>

            {config && (
              <nav className="space-y-1 mb-5">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-3 mb-2">Main</p>
                {config.items.map((item) => {
                  const isActive = pathname === item.href || (item.href !== '/dashboard/farmer' && item.href !== '/dashboard/buyer' && item.href !== '/dashboard/admin' && pathname.startsWith(item.href));
                  return (
                    <Link key={item.href} href={item.href} onClick={closeSidebar}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all relative ${
                        isActive
                          ? 'bg-farm-green text-white shadow-md shadow-farm-green/20'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      }`}>
                      {isActive && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-white rounded-r-full" />}
                      {item.icon}
                      {item.label}
                    </Link>
                  );
                })}
              </nav>
            )}

            <div className="border-t border-gray-100 pt-4">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-3 mb-2">Account</p>
              {[
                { href: '/dashboard/profile', label: 'My Profile', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" /></svg> },
                { href: '/dashboard/profile/edit', label: 'Edit Profile', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" /></svg> },
              ].map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link key={item.href} href={item.href} onClick={closeSidebar}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all relative ${
                      isActive
                        ? 'bg-farm-green text-white shadow-md shadow-farm-green/20'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`}>
                    {isActive && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-white rounded-r-full" />}
                    {item.icon}
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        </aside>

        <main className="flex-1 min-w-0">
          <div className="animate-fade-in">{children}</div>
        </main>
      </div>
    </div>
  );
}
