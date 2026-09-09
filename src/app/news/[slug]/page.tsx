'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

interface Article {
  id: number;
  title: string;
  slug: string;
  summary: string | null;
  content: string | null;
  source_name: string | null;
  source_url: string | null;
  image_url: string | null;
  tags: string[];
  region: string | null;
  country: string;
  author_name: string | null;
  is_featured: boolean;
  ai_summary: string | null;
  view_count: number;
  published_at: string | null;
  created_at: string;
  category: { name: string; slug: string } | null;
  source: { name: string; website_url: string | null; trust_level: string } | null;
}

interface RelatedArticle {
  id: number;
  title: string;
  slug: string;
  summary: string | null;
  published_at: string | null;
  category: { name: string } | null;
}

export default function ArticleDetailPage() {
  const params = useParams();
  const slug = params.slug as string;

  const [article, setArticle] = useState<Article | null>(null);
  const [related, setRelated] = useState<RelatedArticle[]>([]);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchArticle() {
      try {
        const res = await fetch(`/api/news/articles?slug=${slug}`);
        const data = await res.json();
        if (data.article) {
          setArticle(data.article);
          // Fetch related
          const relRes = await fetch(`/api/news/articles?related=${data.article.category?.slug || ''}&exclude=${data.article.id}`);
          const relData = await relRes.json();
          setRelated(relData.articles || []);
        }
      } catch {
        // Article not found
      } finally {
        setLoading(false);
      }
    }
    if (slug) fetchArticle();
  }, [slug]);

  const handleAiExplain = async () => {
    if (!article) return;
    setAiLoading(true);
    try {
      const res = await fetch('/api/news/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          articleId: article.id,
          articleTitle: article.title,
          articleContent: article.content,
          articleSummary: article.summary,
          sourceName: article.source_name,
          mode: 'explain',
        }),
      });
      const data = await res.json();
      setAiSummary(data.summary);
    } catch {
      setAiSummary('Failed to generate explanation. Please try again.');
    } finally {
      setAiLoading(false);
    }
  };

  const formatTimestamp = (ts: string | null) => {
    if (!ts) return '—';
    return new Date(ts).toLocaleDateString('en-GH', {
      year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-farm-cream flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-farm-green border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-500">Loading article...</p>
        </div>
      </div>
    );
  }

  if (!article) {
    return (
      <div className="min-h-screen bg-farm-cream flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Article Not Found</h1>
          <p className="text-gray-500 mb-4">The article you are looking for does not exist or has been removed.</p>
          <Link href="/news" className="text-farm-green hover:underline font-medium">← Back to News</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-farm-cream">
      {/* Header */}
      <div className="bg-white border-b border-emerald-200">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-3">
            <Link href="/dashboard/farmer" className="text-farm-green hover:underline">Dashboard</Link>
            <span>/</span>
            <Link href="/news" className="text-farm-green hover:underline">News</Link>
            <span>/</span>
            {article.category && (
              <>
                <Link href={`/news?category=${article.category.slug}`} className="text-farm-green hover:underline">
                  {article.category.name}
                </Link>
                <span>/</span>
              </>
            )}
            <span className="text-gray-400 truncate">{article.title}</span>
          </div>
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <article className="bg-white rounded-xl shadow-sm overflow-hidden">
          {article.image_url && (
            <div className="aspect-video bg-emerald-100">
              <img src={article.image_url} alt={article.title} className="w-full h-full object-cover" />
            </div>
          )}

          <div className="p-6 md:p-8">
            {/* Meta */}
            <div className="flex flex-wrap items-center gap-2 mb-4 text-sm text-gray-500">
              {article.category && (
                <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 font-medium text-xs">
                  {article.category.name}
                </span>
              )}
              {article.source_name && <span className="font-medium text-gray-700">{article.source_name}</span>}
              <span>·</span>
              <time>{formatTimestamp(article.published_at)}</time>
              {article.region && (
                <>
                  <span>·</span>
                  <span>{article.region}, {article.country}</span>
                </>
              )}
            </div>

            <h1 className="text-3xl font-bold text-gray-900 mb-4">{article.title}</h1>

            {article.summary && (
              <p className="text-lg text-gray-600 mb-6 leading-relaxed border-l-4 border-farm-green pl-4 italic">
                {article.summary}
              </p>
            )}

            {/* AI Explain Button */}
            <div className="mb-6 p-4 bg-emerald-50 rounded-xl border border-emerald-200">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-farm-green">AI Explanation</h3>
                  <p className="text-sm text-gray-600">Get a simplified explanation for farmers</p>
                </div>
                <button
                  onClick={handleAiExplain}
                  disabled={aiLoading}
                  className="px-4 py-2 bg-farm-green text-white rounded-lg text-sm font-medium hover:bg-emerald-800 transition-colors disabled:opacity-50"
                >
                  {aiLoading ? 'Generating...' : 'Explain for Me'}
                </button>
              </div>
              {aiSummary && (
                <div className="mt-4 p-4 bg-white rounded-lg border border-emerald-100 prose prose-sm max-w-none">
                  {aiSummary.split('\n').map((line, i) => {
                    if (line.startsWith('### ')) {
                      return <h3 key={i} className="text-lg font-bold text-farm-green mt-4 mb-2">{line.replace('### ', '')}</h3>;
                    }
                    if (line.startsWith('- ')) {
                      return <li key={i} className="text-gray-700 ml-4">{line.replace('- ', '')}</li>;
                    }
                    return line.trim() ? <p key={i} className="text-gray-700 mb-2">{line}</p> : null;
                  })}
                </div>
              )}
            </div>

            {/* Content */}
            {article.content && (
              <div
                className="prose prose-lg max-w-none prose-headings:text-farm-green prose-a:text-farm-green"
                dangerouslySetInnerHTML={{ __html: article.content }}
              />
            )}

            {/* Tags */}
            {article.tags && article.tags.length > 0 && (
              <div className="mt-8 pt-6 border-t border-gray-200">
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Tags</h4>
                <div className="flex flex-wrap gap-2">
                  {article.tags.map((tag) => (
                    <Link
                      key={tag}
                      href={`/news?tag=${tag}`}
                      className="px-3 py-1 rounded-full bg-gray-100 text-gray-700 text-sm hover:bg-gray-200 transition-colors"
                    >
                      {tag}
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Source & Stats */}
            <div className="mt-8 pt-6 border-t border-gray-200 flex flex-wrap items-center justify-between gap-4 text-sm text-gray-500">
              <div className="flex items-center gap-4">
                {article.source && (
                  <div className="flex items-center gap-2">
                    <span>Source:</span>
                    {article.source.website_url ? (
                      <a href={article.source.website_url} target="_blank" rel="noopener noreferrer" className="text-farm-green hover:underline font-medium">
                        {article.source.name}
                      </a>
                    ) : (
                      <span className="font-medium text-gray-700">{article.source.name}</span>
                    )}
                    {article.source.trust_level === 'verified' && (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-medium">Verified</span>
                    )}
                  </div>
                )}
                {article.source_url && (
                  <a href={article.source_url} target="_blank" rel="noopener noreferrer" className="text-farm-green hover:underline">
                    Read Original →
                  </a>
                )}
              </div>
              <span>{article.view_count} views</span>
            </div>
          </div>
        </article>

        {/* Related Articles */}
        {related.length > 0 && (
          <section className="mt-10">
            <h2 className="text-xl font-bold text-farm-green mb-4">Related News</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {related.map((rel) => (
                <Link
                  key={rel.id}
                  href={`/news/${rel.slug}`}
                  className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow group"
                >
                  <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
                    {rel.category && (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-medium">
                        {rel.category.name}
                      </span>
                    )}
                    <span>{formatTimestamp(rel.published_at)}</span>
                  </div>
                  <h3 className="font-semibold text-gray-900 group-hover:text-farm-green transition-colors line-clamp-2">
                    {rel.title}
                  </h3>
                  {rel.summary && (
                    <p className="text-sm text-gray-600 mt-1 line-clamp-2">{rel.summary}</p>
                  )}
                </Link>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
