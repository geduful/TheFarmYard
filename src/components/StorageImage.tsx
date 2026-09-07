'use client';

import { useEffect, useState } from 'react';
import { resolveFileUrl } from '@/lib/supabase/storage';

/** Resolve a stored file value (storage://, https://, or legacy data:) to a URL. */
export function useResolvedFileUrl(storedUrl: string | null | undefined): string | null {
  const [signed, setSigned] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!storedUrl || !storedUrl.startsWith('storage://')) return;
    resolveFileUrl(storedUrl)
      .then((url) => { if (!cancelled) setSigned(url); })
      .catch(() => { if (!cancelled) setSigned(null); });
    return () => { cancelled = true; };
  }, [storedUrl]);

  if (!storedUrl) return null;
  if (!storedUrl.startsWith('storage://')) return storedUrl;
  return signed;
}

interface StorageImageProps {
  url: string;
  alt: string;
  className?: string;
  width?: number;
  height?: number;
  loading?: 'lazy' | 'eager';
}

/** Image that understands storage:// refs, public URLs, and legacy data: URLs. */
export default function StorageImage({ url, alt, className, width, height, loading = 'lazy' }: StorageImageProps) {
  const resolved = useResolvedFileUrl(url);
  if (!resolved) {
    return <div className={`skeleton ${className ?? ''}`} aria-label="Loading file" />;
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={resolved} alt={alt} className={className} width={width} height={height} loading={loading} />;
}
