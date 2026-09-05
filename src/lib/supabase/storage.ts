'use client';

import { createClient } from './client';

export const LISTING_IMAGES_BUCKET = 'listing-images';
export const WAYBILLS_BUCKET = 'waybills';
export const VERIFICATION_DOCS_BUCKET = 'verification-docs';

/** Parse our `storage://bucket/path` references. Returns null for legacy URLs. */
export function parseStorageRef(url: string): { bucket: string; path: string } | null {
  if (!url.startsWith('storage://')) return null;
  const rest = url.slice('storage://'.length);
  const slash = rest.indexOf('/');
  if (slash <= 0) return null;
  return { bucket: rest.slice(0, slash), path: rest.slice(slash + 1) };
}

/** Upload a file into the caller's own folder. Returns a storable reference. */
export async function uploadFile(
  bucket: string,
  file: File,
  opts?: { publicBucket?: boolean }
): Promise<string> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Please sign in again.');
  const ext = file.name.split('.').pop()?.toLowerCase() || 'bin';
  const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    cacheControl: '3600',
    upsert: false,
  });
  if (error) throw new Error(error.message);
  if (opts?.publicBucket) {
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return data.publicUrl;
  }
  return `storage://${bucket}/${path}`;
}

/** Resolve any stored file value to a viewable URL (passthrough for legacy). */
export async function resolveFileUrl(url: string, expiresIn = 3600): Promise<string> {
  const ref = parseStorageRef(url);
  if (!ref) return url; // legacy https:// or data: URL
  const supabase = createClient();
  const { data, error } = await supabase.storage
    .from(ref.bucket)
    .createSignedUrl(ref.path, expiresIn);
  if (error || !data?.signedUrl) throw new Error(error?.message || 'Could not load file.');
  return data.signedUrl;
}
