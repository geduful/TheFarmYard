import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Agricultural News & Market Intelligence | TheFarmYard',
  description: 'Stay informed with the latest agricultural news, market prices, opportunities, and AI-powered insights for Ghanaian farmers.',
};

async function getSupabase() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {}
        },
      },
    }
  );
}

export default async function NewsPage() {
  const supabase = await getSupabase();

  const [featuredRes, latestRes, opportunitiesRes, commoditiesRes] = await Promise.all([
    supabase
      .from('news_articles')
      .select('id, title, slug, summary, image_url, source_name, published_at, is_featured, tags, category:news_categories(name, slug)')
      .eq('status', 'published')
      .eq('is_featured', true)
      .order('published_at', { ascending: false })
      .limit(3),
    supabase
      .from('news_articles')
      .select('id, title, slug, summary, image_url, source_name, published_at, tags, category:news_categories(name, slug)')
      .eq('status', 'published')
      .order('published_at', { ascending: false })
      .limit(12),
    supabase
      .from('opportunities')
      .select('id, title, slug, description, organization, opportunity_type, deadline, status, is_featured')
      .eq('status', 'open')
      .order('is_featured', { ascending: false })
      .order('deadline', { ascending: true })
      .limit(6),
    supabase
      .from('commodities')
      .select('id, name, slug, category, unit')
      .eq('is_active', true)
      .order('category')
      .limit(30),
  ]);

  const featured = featuredRes.data || [];
  const latest = latestRes.data || [];
  const opportunities = opportunitiesRes.data || [];
  const commodities = commoditiesRes.data || [];

  const formatNewsTimestamp = (ts: string | null) => {
    if (!ts) return '—';
    const d = new Date(ts);
    const now = new Date();
    const diffHrs = (now.getTime() - d.getTime()) / (1000 * 60 * 60);
    if (diffHrs < 1) return 'Just now';
    if (diffHrs < 24) return `${Math.floor(diffHrs)}h ago`;
    if (diffHrs < 168) return `${Math.floor(diffHrs / 24)}d ago`;
    return d.toLocaleDateString('en-GH', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatDeadline = (d: string | null) => {
    if (!d) return 'No deadline';
    const date = new Date(d);
    const now = new Date();
    const diffDays = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return 'Expired';
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    if (diffDays <= 7) return `${diffDays} days left`;
    return date.toLocaleDateString('en-GH', { month: 'short', day: 'numeric' });
  };

  const opportunityTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      government_program: 'bg-blue-100 text-blue-700',
      grant: 'bg-emerald-100 text-emerald-700',
      training: 'bg-purple-100 text-purple-700',
      procurement: 'bg-amber-100 text-amber-700',
      buyer: 'bg-teal-100 text-teal-700',
    };
    return colors[type] || 'bg-gray-100 text-gray-700';
  };

  const opportunityTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      government_program: 'Gov. Program',
      grant: 'Grant',
      training: 'Training',
      procurement: 'Procurement',
      buyer: 'Buyer',
    };
    return labels[type] || type.replace(/_/g, ' ');
  };

  return (
    <div className="min-h-screen bg-farm-cream">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-farm-green via-emerald-800 to-teal-900 text-white">
        {/* Animated background shapes */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-32 -right-32 w-72 h-72 bg-emerald-400/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute -bottom-32 -left-32 w-72 h-72 bg-teal-400/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
          <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '40px 40px' }} />
        </div>

        <div className="relative max-w-6xl mx-auto px-4 py-3 md:py-4">
          {/* Back to Dashboard */}
          <div className="mb-2">
            <Link href="/dashboard/farmer" className="inline-flex items-center gap-2 text-sm text-white/70 hover:text-white transition-colors group">
              <svg className="w-4 h-4 group-hover:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              Back to Dashboard
            </Link>
          </div>

          <div className="text-center">
            {/* Brand */}
            <div className="inline-flex items-center gap-2.5 mb-2">
              <img src="/logo.webp" alt="TheFarmYard" className="w-11 h-11 rounded-lg object-contain" />
              <span className="text-xl font-bold tracking-wide text-white/90">TheFarmYard</span>
            </div>

            <h1 className="text-3xl md:text-5xl font-bold mb-1 leading-tight">
              <span className="block">Agricultural News</span>
              <span className="block mt-1 bg-gradient-to-r from-emerald-300 via-teal-300 to-cyan-300 bg-clip-text text-transparent">
                &amp; Market Intelligence
              </span>
            </h1>

            <p className="text-base md:text-lg text-emerald-100/80 max-w-xl mx-auto mb-3 leading-relaxed">
              Stay ahead with verified news, real-time market prices, and opportunities — powered by AI for Ghanaian agriculture.
            </p>

            <div className="flex flex-wrap justify-center gap-3">
              <Link
                href="/news/market"
                className="group inline-flex items-center gap-2 bg-white text-farm-green px-6 py-2.5 rounded-xl font-bold text-sm hover:bg-emerald-50 transition-all shadow-lg shadow-emerald-900/20 hover:shadow-xl hover:scale-105"
              >
                <svg className="w-4 h-4 group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                </svg>
                Market Prices
                <svg className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
              </Link>
              <Link
                href="/news/opportunities"
                className="group inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm text-white px-6 py-2.5 rounded-xl font-bold text-sm hover:bg-white/20 transition-all border border-white/20 hover:border-white/40 hover:scale-105"
              >
                <svg className="w-4 h-4 group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 00.75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 00-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0112 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 01-.673-.38m0 0A2.18 2.18 0 013 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 013.413-.387m7.5 0V5.25A2.25 2.25 0 0013.5 3h-3a2.25 2.25 0 00-2.25 2.25v.894m7.5 0a48.667 48.667 0 00-7.5 0M12 12.75h.008v.008H12v-.008z" />
                </svg>
                Opportunities
                <svg className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
              </Link>
            </div>

            {/* Stats bar */}
            <div className="mt-3 flex justify-center gap-6 md:gap-12">
              <div className="text-center">
                <p className="text-2xl md:text-3xl font-bold text-white">{latest.length}</p>
                <p className="text-xs text-emerald-200/70 mt-0.5">Articles</p>
              </div>
              <div className="w-px bg-white/20" />
              <div className="text-center">
                <p className="text-2xl md:text-3xl font-bold text-white">{commodities.length}</p>
                <p className="text-xs text-emerald-200/70 mt-0.5">Commodities</p>
              </div>
              <div className="w-px bg-white/20" />
              <div className="text-center">
                <p className="text-2xl md:text-3xl font-bold text-white">{opportunities.length}</p>
                <p className="text-xs text-emerald-200/70 mt-0.5">Opportunities</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Quick Commodity Prices Bar */}
      {commodities.length > 0 && (
        <section className="bg-white border-b border-emerald-200">
          <div className="max-w-6xl mx-auto px-4 py-3">
            <div className="flex items-center gap-4 overflow-x-auto text-sm scrollbar-hide">
              <span className="font-semibold text-farm-green whitespace-nowrap">Quick Prices:</span>
              {commodities.slice(0, 8).map((c) => (
                <Link
                  key={c.id}
                  href={`/news/market?commodity=${c.slug}`}
                  className="whitespace-nowrap px-3 py-1 rounded-full bg-emerald-50 text-farm-green hover:bg-emerald-100 transition-colors font-medium"
                >
                  {c.name}
                </Link>
              ))}
              <Link href="/news/market" className="whitespace-nowrap text-farm-green font-semibold hover:underline">
                View All →
              </Link>
            </div>
          </div>
        </section>
      )}

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Featured Articles */}
        {featured.length > 0 && (
          <section className="mb-10">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-farm-green">Featured News</h2>
              <Link href="/news?all=1" className="text-sm text-farm-green hover:underline font-medium">View All</Link>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              {featured.map((article) => (
                <Link
                  key={article.id}
                  href={`/news/${article.slug}`}
                  className="bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow overflow-hidden group"
                >
                  {article.image_url && (
                    <div className="aspect-video bg-emerald-100 overflow-hidden">
                      <img
                        src={article.image_url}
                        alt={article.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                  )}
                  <div className="p-5">
                    <div className="flex items-center gap-2 mb-2 text-xs text-gray-500">
                      {(article.category as unknown as { name: string }[] | null)?.[0]?.name && (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-medium">
                          {(article.category as unknown as { name: string }[])[0].name}
                        </span>
                      )}
                      <span>{article.source_name}</span>
                      <span>·</span>
                      <span>{formatNewsTimestamp(article.published_at)}</span>
                    </div>
                    <h3 className="font-bold text-gray-900 mb-2 group-hover:text-farm-green transition-colors line-clamp-2">
                      {article.title}
                    </h3>
                    {article.summary && (
                      <p className="text-sm text-gray-600 line-clamp-3">{article.summary}</p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content: Latest News */}
          <div className="lg:col-span-2">
            <h2 className="text-2xl font-bold text-farm-green mb-6">Latest News</h2>
            {latest.length > 0 ? (
              <div className="space-y-4">
                {latest.map((article) => (
                  <Link
                    key={article.id}
                    href={`/news/${article.slug}`}
                    className="flex gap-4 bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow group"
                  >
                    {article.image_url && (
                      <div className="w-32 h-24 flex-shrink-0 bg-emerald-100 rounded-lg overflow-hidden hidden sm:block">
                        <img
                          src={article.image_url}
                          alt={article.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 text-xs text-gray-500">
                        {(article.category as unknown as { name: string }[] | null)?.[0]?.name && (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-medium">
                            {(article.category as unknown as { name: string }[])[0].name}
                          </span>
                        )}
                        <span>{article.source_name}</span>
                        <span>·</span>
                        <span>{formatNewsTimestamp(article.published_at)}</span>
                      </div>
                      <h3 className="font-semibold text-gray-900 mb-1 group-hover:text-farm-green transition-colors line-clamp-2">
                        {article.title}
                      </h3>
                      {article.summary && (
                        <p className="text-sm text-gray-600 line-clamp-2">{article.summary}</p>
                      )}
                      {article.tags && article.tags.length > 0 && (
                        <div className="flex gap-1 mt-2 flex-wrap">
                          {article.tags.slice(0, 3).map((tag: string) => (
                            <span key={tag} className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-xl p-8 text-center shadow-sm">
                <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 7.5h1.5m-1.5 3h1.5m-7.5 3h7.5m-7.5 3h7.5m3-9h3.375c.621 0 1.125.504 1.125 1.125V18a2.25 2.25 0 01-2.25 2.25M16.5 7.5V18a2.25 2.25 0 002.25 2.25M16.5 7.5V4.875c0-.621-.504-1.125-1.125-1.125H4.125C3.504 3.75 3 4.254 3 4.875V18a2.25 2.25 0 002.25 2.25h13.5" />
                </svg>
                <p className="text-gray-500">No news articles yet</p>
                <p className="text-sm text-gray-400 mt-1">Check back soon for the latest agricultural updates</p>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Opportunities Widget */}
            {opportunities.length > 0 && (
              <div className="bg-white rounded-xl p-5 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-farm-green">Opportunities</h3>
                  <Link href="/news/opportunities" className="text-xs text-farm-green hover:underline font-medium">View All</Link>
                </div>
                <div className="space-y-3">
                  {opportunities.slice(0, 4).map((opp) => (
                    <Link
                      key={opp.id}
                      href={`/news/opportunities#${opp.slug}`}
                      className="block p-3 rounded-lg bg-emerald-50 hover:bg-emerald-100 transition-colors"
                    >
                      <div className="flex items-start gap-2">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${opportunityTypeColor(opp.opportunity_type)}`}>
                          {opportunityTypeLabel(opp.opportunity_type)}
                        </span>
                      </div>
                      <p className="font-medium text-sm text-gray-900 mt-1 line-clamp-2">{opp.title}</p>
                      <p className="text-xs text-gray-500 mt-1">{formatDeadline(opp.deadline)}</p>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Market Quick Link */}
            <div className="bg-gradient-to-br from-farm-green to-emerald-700 rounded-xl p-5 text-white">
              <h3 className="font-bold mb-2">Market Intelligence</h3>
              <p className="text-sm text-emerald-100 mb-4">Real-time commodity prices across Ghanaian markets</p>
              <Link
                href="/news/market"
                className="inline-block bg-white text-farm-green px-4 py-2 rounded-lg font-semibold text-sm hover:bg-emerald-50 transition-colors"
              >
                View Prices →
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
