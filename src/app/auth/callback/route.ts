import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { EmailOtpType } from '@supabase/supabase-js';

const OTP_TYPES: ReadonlySet<string> = new Set([
  'signup',
  'email',
  'recovery',
  'email_change',
  'phone_change',
]);

/**
 * GET /auth/callback — landing for all Supabase email links AND OAuth PKCE.
 * Supabase sends two formats:
 *   1. `?code=...`                    (PKCE / OAuth) → exchangeCodeForSession
 *   2. `?token_hash=...&type=...`     (email confirm, recovery) → verifyOtp
 * The old code only handled (1), so every email link died with auth_failed.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const tokenHash = searchParams.get('token_hash');
  const type = searchParams.get('type');
  const next = searchParams.get('next') ?? '/marketplace';

  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {}
        },
      },
    }
  );

  const destination =
    type === 'recovery' ? `${origin}/forgot-password?step=reset` : `${origin}${next}`;

  if (tokenHash && type && OTP_TYPES.has(type)) {
    const { error } = await supabase.auth.verifyOtp({
      type: type as EmailOtpType,
      token_hash: tokenHash,
    });
    if (!error) return NextResponse.redirect(destination);
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(destination);
  }

  return NextResponse.redirect(`${origin}/login?error=auth_failed`);
}
