import { type NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

// Exact match for '/', prefix-with-boundary for the rest.
// NOTE: '/' must NOT use startsWith — every path starts with '/'.
const publicExact = new Set(['/']);
const publicPrefixes = [
  '/login',
  '/signup',
  '/auth/callback',
  '/forgot-password',
  '/marketplace',
  '/policy',
];

function isPublicPath(pathname: string): boolean {
  if (publicExact.has(pathname)) return true;
  return publicPrefixes.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );
}

function isPublicFile(pathname: string): boolean {
  // Skip middleware for static assets (logo.png, *.svg, etc.)
  if (pathname.startsWith('/_next/')) return true;
  return /\.[a-zA-Z0-9]+$/.test(pathname);
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isPublicFile(pathname) || isPublicPath(pathname)) {
    return NextResponse.next();
  }

  let supabaseResponse = NextResponse.next({ request });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('redirect', pathname);
    return NextResponse.redirect(url);
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, is_blocked')
    .eq('id', user.id)
    .single();

  // Blocked users are signed out and redirected to login with a message
  if (profile?.is_blocked) {
    await supabase.auth.signOut();
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('blocked', '1');
    return NextResponse.redirect(url);
  }

  // NOTE: no redirect when the profile row is missing (e.g. signup trigger
  // hasn't run yet). Role checks below use `profile?.role`, so unknown roles
  // safely fall through to /marketplace, while /dashboard/profile stays
  // reachable so the user sees "Profile not found" instead of a bounce loop
  // between /dashboard/* and /signup.

  if (pathname.startsWith('/dashboard/farmer') && profile?.role !== 'farmer') {
    return NextResponse.redirect(new URL('/marketplace', request.url));
  }

  if (pathname.startsWith('/dashboard/buyer') && profile?.role !== 'buyer') {
    return NextResponse.redirect(new URL('/marketplace', request.url));
  }

  if (pathname.startsWith('/dashboard/admin') && profile?.role !== 'admin') {
    return NextResponse.redirect(new URL('/marketplace', request.url));
  }

  return supabaseResponse;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\..*|api/public).*)'],
};
