import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  );
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get('slug');
    const related = searchParams.get('related');
    const exclude = searchParams.get('exclude');
    const category = searchParams.get('category');
    const tag = searchParams.get('tag');
    const search = searchParams.get('search');
    const featured = searchParams.get('featured');
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    const supabase = getSupabase();

    // Fetch single article by slug
    if (slug) {
      const { data, error } = await supabase
        .from('news_articles')
        .select(`
          *,
          category:news_categories(name, slug),
          source:news_sources(name, website_url, trust_level)
        `)
        .eq('slug', slug)
        .in('status', ['published', 'approved'])
        .single();

      if (error || !data) {
        return NextResponse.json({ error: 'Article not found' }, { status: 404 });
      }

      // Increment view count
      await supabase
        .from('news_articles')
        .update({ view_count: (data.view_count || 0) + 1 })
        .eq('id', data.id);

      return NextResponse.json({ article: { ...data, view_count: (data.view_count || 0) + 1 } });
    }

    // Fetch related articles by category slug
    if (related !== null) {
      // First get category ID
      const { data: cat } = await supabase
        .from('news_categories')
        .select('id')
        .eq('slug', related)
        .single();

      if (!cat) {
        return NextResponse.json({ articles: [] });
      }

      let query = supabase
        .from('news_articles')
        .select('id, title, slug, summary, published_at, category:news_categories(name)')
        .eq('status', 'published')
        .eq('category_id', cat.id)
        .order('published_at', { ascending: false })
        .limit(6);

      if (exclude) {
        query = query.neq('id', parseInt(exclude, 10));
      }

      const { data, error } = await query;
      if (error) throw error;
      return NextResponse.json({ articles: data || [] });
    }

    // List articles with filters
    let query = supabase
      .from('news_articles')
      .select(`
        id, title, slug, summary, image_url, source_name, published_at, is_featured, tags,
        category:news_categories(name, slug)
      `)
      .in('status', ['published', 'approved'])
      .order('published_at', { ascending: false });

    if (category) {
      const { data: cat } = await supabase
        .from('news_categories')
        .select('id')
        .eq('slug', category)
        .single();
      if (cat) query = query.eq('category_id', cat.id);
    }

    if (tag) {
      query = query.contains('tags', [tag]);
    }

    if (search) {
      query = query.or(`title.ilike.%${search}%,summary.ilike.%${search}%`);
    }

    if (featured === 'true') {
      query = query.eq('is_featured', true);
    }

    query = query.limit(limit);

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({ articles: data || [] });
  } catch (error) {
    console.error('News articles error:', error);
    return NextResponse.json({ error: 'Failed to fetch articles.' }, { status: 500 });
  }
}
