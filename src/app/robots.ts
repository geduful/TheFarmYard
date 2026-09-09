import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/dashboard/',
          '/api/',
          '/auth/',
          '/login',
          '/signup',
          '/forgot-password',
        ],
      },
    ],
    sitemap: 'https://thefarmyard.vercel.app/sitemap.xml',
  };
}
