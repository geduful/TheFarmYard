import { createClient as createSupabaseClient } from '@supabase/supabase-js';

/**
 * Service-role client for server-only code (webhooks, cron).
 * Bypasses RLS — NEVER import from client components.
 * Requires SUPABASE_SERVICE_ROLE_KEY in the server environment.
 */
export function createServiceSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY');
  }
  return createSupabaseClient(url, serviceKey, {
    auth: { persistSession: false },
  });
}
