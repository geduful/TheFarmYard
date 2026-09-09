import type { MetadataRoute } from 'next';
import { createClient } from '@supabase/supabase-js';

const BASE_URL = 'https://thefarmyard.vercel.app';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  );
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = getSupabase();

  const staticPages: MetadataRoute.Sitemap = [
    { url: BASE_URL, lastModified: new Date(), changeFrequency: 'weekly', priority: 1 },
    { url: `${BASE_URL}/marketplace`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    { url: `${BASE_URL}/learning`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.7 },
    { url: `${BASE_URL}/news`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.8 },
    { url: `${BASE_URL}/news/market`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.7 },
    { url: `${BASE_URL}/news/opportunities`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.6 },
    { url: `${BASE_URL}/login`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.3 },
    { url: `${BASE_URL}/signup`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.3 },
  ];

  const dynamicPages: MetadataRoute.Sitemap = [];

  try {
    const { data: listings } = await supabase
      .from('listings')
      .select('id, created_at')
      .eq('is_approved', true)
      .order('created_at', { ascending: false })
      .limit(5000);

    if (listings) {
      for (const listing of listings) {
        dynamicPages.push({
          url: `${BASE_URL}/marketplace/${listing.id}`,
          lastModified: new Date(listing.created_at),
          changeFrequency: 'weekly',
          priority: 0.6,
        });
      }
    }
  } catch {
    // If listings query fails, skip dynamic pages
  }

  try {
    const { data: resources } = await supabase
      .from('learning_resources')
      .select('slug, published_at')
      .eq('status', 'published')
      .order('published_at', { ascending: false })
      .limit(500);

    if (resources) {
      for (const resource of resources) {
        if (resource.slug) {
          dynamicPages.push({
            url: `${BASE_URL}/learning/${resource.slug}`,
            lastModified: new Date(resource.published_at || new Date()),
            changeFrequency: 'monthly',
            priority: 0.5,
          });
        }
      }
    }
  } catch {
    // If resources query fails, skip
  }

  try {
    const { data: articles } = await supabase
      .from('news_articles')
      .select('slug, published_at')
      .eq('status', 'published')
      .order('published_at', { ascending: false })
      .limit(500);

    if (articles) {
      for (const article of articles) {
        if (article.slug) {
          dynamicPages.push({
            url: `${BASE_URL}/news/${article.slug}`,
            lastModified: new Date(article.published_at || new Date()),
            changeFrequency: 'weekly',
            priority: 0.6,
          });
        }
      }
    }
  } catch {
    // If articles query fails, skip
  }

  return [...staticPages, ...dynamicPages];
}
