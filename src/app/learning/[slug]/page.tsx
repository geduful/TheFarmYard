'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import type {
  LearningResource,
  LearningBookmark,
  LearningProgress,
  LearningProgressStatus,
} from '@/lib/types';
import {
  LEARNING_CONTENT_TYPE_CONFIG,
  LEARNING_DIFFICULTY_CONFIG,
} from '@/lib/types';
import { formatReadingTime, sanitizeHtml, getProgressColor } from '@/lib/utils';

export default function LearningResourcePage() {
  const { slug } = useParams<{ slug: string }>();
  const supabase = useMemo(() => createClient(), []);

  const [resource, setResource] = useState<LearningResource | null>(null);
  const [related, setRelated] = useState<LearningResource[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [bookmark, setBookmark] = useState<LearningBookmark | null>(null);
  const [progress, setProgress] = useState<LearningProgress | null>(null);
  const [bookmarkLoading, setBookmarkLoading] = useState(false);
  const [progressLoading, setProgressLoading] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user?.id ?? null);

      const { data: res } = await supabase
        .from('learning_resources')
        .select('*, category:learning_categories(name, slug)')
        .eq('slug', slug)
        .eq('status', 'published')
        .single();

      if (!res) {
        setLoading(false);
        return;
      }

      setResource(res as LearningResource);

      // Increment view count (fire and forget)
      void supabase.from('learning_resources').update({ view_count: (res.view_count ?? 0) + 1 }).eq('id', res.id);

      // Load related resources
      const { data: relData } = await supabase
        .from('learning_resources')
        .select('id, title, slug, summary, featured_image, content_type, difficulty, reading_time_min, tags, category:learning_categories(name, slug)')
        .eq('status', 'published')
        .eq('category_id', res.category_id)
        .neq('id', res.id)
        .order('published_at', { ascending: false })
        .limit(3);

      if (relData) setRelated(relData as unknown as LearningResource[]);

      // Load bookmark & progress if authenticated
      if (user) {
        const [bmRes, pgRes] = await Promise.all([
          supabase.from('learning_bookmarks').select('*').eq('user_id', user.id).eq('resource_id', res.id).maybeSingle(),
          supabase.from('learning_progress').select('*').eq('user_id', user.id).eq('resource_id', res.id).maybeSingle(),
        ]);
        if (bmRes.data) setBookmark(bmRes.data as LearningBookmark);
        if (pgRes.data) setProgress(pgRes.data as LearningProgress);
      }

      setLoading(false);
    }
    load();
  }, [slug, supabase]);

  const toggleBookmark = useCallback(async () => {
    if (!userId || !resource) return;
    setBookmarkLoading(true);
    if (bookmark) {
      await supabase.from('learning_bookmarks').delete().eq('id', bookmark.id);
      setBookmark(null);
    } else {
      const { data } = await supabase
        .from('learning_bookmarks')
        .insert({ user_id: userId, resource_id: resource.id })
        .select()
        .single();
      if (data) setBookmark(data as LearningBookmark);
    }
    setBookmarkLoading(false);
  }, [userId, resource, bookmark, supabase]);

  const updateProgress = useCallback(async (status: LearningProgressStatus, pct: number) => {
    if (!userId || !resource) return;
    setProgressLoading(true);
    const payload = {
      user_id: userId,
      resource_id: resource.id,
      status,
      progress_pct: pct,
      last_read_at: new Date().toISOString(),
    };
    if (progress) {
      const { data } = await supabase
        .from('learning_progress')
        .update(payload)
        .eq('id', progress.id)
        .select()
        .single();
      if (data) setProgress(data as LearningProgress);
    } else {
      const { data } = await supabase
        .from('learning_progress')
        .insert(payload)
        .select()
        .single();
      if (data) setProgress(data as LearningProgress);
    }
    setProgressLoading(false);
  }, [userId, resource, progress, supabase]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAF8F5] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-farm-green/30 border-t-farm-green rounded-full animate-spin" />
      </div>
    );
  }

  if (!resource) {
    return (
      <div className="min-h-screen bg-[#FAF8F5] flex flex-col items-center justify-center text-center px-4">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Resource not found</h1>
        <p className="text-gray-500 mb-6">The learning resource you are looking for does not exist or is not published.</p>
        <Link href="/learning" className="px-5 py-2.5 bg-farm-green text-white rounded-xl text-sm font-medium hover:bg-farm-green/90 transition-colors">
          Back to Learning Hub
        </Link>
      </div>
    );
  }

  const typeCfg = LEARNING_CONTENT_TYPE_CONFIG[resource.content_type];
  const diffCfg = LEARNING_DIFFICULTY_CONFIG[resource.difficulty];

  return (
    <div className="min-h-screen bg-[#FAF8F5]">
      {/* Header */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center gap-3 mb-4">
            <Link href="/dashboard/farmer" className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-farm-green font-medium transition-colors">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              Dashboard
            </Link>
            <span className="text-gray-300">/</span>
            <Link href="/learning" className="inline-flex items-center gap-1.5 text-sm text-farm-green hover:text-farm-green/80 font-medium transition-colors">
              Learning Hub
            </Link>
          </div>

          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${typeCfg.color}`}>
              {typeCfg.label}
            </span>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${diffCfg.color}`}>
              {diffCfg.label}
            </span>
            {resource.category && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-farm-green/10 text-farm-green">
                {resource.category.name}
              </span>
            )}
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3 leading-tight">
            {resource.title}
          </h1>

          <div className="flex items-center flex-wrap gap-4 text-sm text-gray-500">
            <span className="flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2" />
              </svg>
              {formatReadingTime(resource.reading_time_min)}
            </span>
            {resource.author_name && (
              <span className="flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0" />
                </svg>
                {resource.author_name}
              </span>
            )}
            {resource.published_at && (
              <span>{new Date(resource.published_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
            )}
          </div>
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Content */}
          <article className="flex-1 min-w-0">
            {resource.featured_image && (
              <div className="relative aspect-[16/9] rounded-2xl overflow-hidden mb-8 bg-gray-100">
                <Image
                  src={resource.featured_image}
                  alt={resource.title}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 768px"
                  priority
                />
              </div>
            )}

            {resource.summary && (
              <p className="text-lg text-gray-600 mb-8 leading-relaxed font-medium italic border-l-4 border-farm-green/30 pl-4">
                {resource.summary}
              </p>
            )}

            <div
              className="prose prose-gray max-w-none prose-headings:text-gray-900 prose-p:text-gray-700 prose-li:text-gray-700 prose-strong:text-gray-900 prose-a:text-farm-green"
              dangerouslySetInnerHTML={{ __html: sanitizeHtml(resource.content) }}
            />

            {resource.tags.length > 0 && (
              <div className="mt-8 pt-6 border-t border-gray-100">
                <div className="flex flex-wrap gap-2">
                  {resource.tags.map((tag) => (
                    <span key={tag} className="px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </article>

          {/* Sidebar */}
          <aside className="lg:w-72 shrink-0">
            <div className="sticky top-24 space-y-4">
              {/* Actions */}
              <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
                <h3 className="text-sm font-semibold text-gray-900">Actions</h3>

                {userId ? (
                  <>
                    <button
                      onClick={toggleBookmark}
                      disabled={bookmarkLoading}
                      className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                        bookmark
                          ? 'bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100'
                          : 'bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100'
                      } disabled:opacity-50`}
                    >
                      <svg className="w-4 h-4" fill={bookmark ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" />
                      </svg>
                      {bookmark ? 'Saved' : 'Save Resource'}
                    </button>

                    {progress?.status === 'completed' ? (
                      <div className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Completed
                      </div>
                    ) : (
                      <button
                        onClick={() => updateProgress('in_progress', Math.min(100, (progress?.progress_pct ?? 0) + 25))}
                        disabled={progressLoading}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-farm-green text-white hover:bg-farm-green/90 transition-colors disabled:opacity-50"
                      >
                        {progress ? 'Update Progress' : 'Start Reading'}
                      </button>
                    )}

                    {progress && progress.progress_pct > 0 && (
                      <div>
                        <div className="flex items-center justify-between text-xs text-gray-500 mb-1.5">
                          <span>Progress</span>
                          <span>{progress.progress_pct}%</span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full transition-all ${getProgressColor(progress.progress_pct)}`}
                            style={{ width: `${progress.progress_pct}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <Link
                    href="/login"
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-farm-green text-white hover:bg-farm-green/90 transition-colors"
                  >
                    Sign in to track progress
                  </Link>
                )}
              </div>

              {/* Related actions */}
              <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3">
                <h3 className="text-sm font-semibold text-gray-900">Explore</h3>
                <Link
                  href="/marketplace"
                  className="flex items-center gap-2 text-sm text-gray-600 hover:text-farm-green transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a.75.75 0 01.75-.75h3a.75.75 0 01.75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349m-16.5 11.65V9.35m0 0a3.001 3.001 0 003.75-.615A2.993 2.993 0 009.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 002.25 1.016c.896 0 1.7-.393 2.25-1.015A3.001 3.001 0 0021 9.35V3.75" />
                  </svg>
                  Browse Marketplace
                </Link>
                <Link
                  href="/dashboard/farmer/storage"
                  className="flex items-center gap-2 text-sm text-gray-600 hover:text-farm-green transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
                  </svg>
                  Find Storage
                </Link>
              </div>
            </div>
          </aside>
        </div>

        {/* Related Resources */}
        {related.length > 0 && (
          <div className="mt-12 pt-8 border-t border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Related Resources</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {related.map((r) => {
                const rTypeCfg = LEARNING_CONTENT_TYPE_CONFIG[r.content_type];
                return (
                  <Link
                    key={r.id}
                    href={`/learning/${r.slug}`}
                    className="group block bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-lg hover:border-farm-green/20 transition-all duration-200"
                  >
                    {r.featured_image && (
                      <div className="relative aspect-[16/9] overflow-hidden bg-gray-100">
                        <Image
                          src={r.featured_image}
                          alt={r.title}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-300"
                          sizes="(max-width: 640px) 100vw, 33vw"
                        />
                      </div>
                    )}
                    <div className="p-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${rTypeCfg.color} mb-2`}>
                        {rTypeCfg.label}
                      </span>
                      <h3 className="text-sm font-semibold text-gray-900 group-hover:text-farm-green transition-colors line-clamp-2">
                        {r.title}
                      </h3>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
