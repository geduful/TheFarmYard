import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServerSupabaseClient } from '@/lib/supabase/server';

const OLLAMA_API_KEY = process.env.OLLAMA_API_KEY;
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'gpt-oss:20b';
const OLLAMA_BASE_URL = 'https://ollama.com/api';

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error('Missing Supabase env vars');
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function POST(request: NextRequest) {
  if (!OLLAMA_API_KEY) {
    return NextResponse.json(
      { error: 'AI service is not configured. Please contact the administrator.' },
      { status: 503 },
    );
  }

  // Verify admin role
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }
  const { data: profile } = await supabase.from('profiles').select('role, full_name').eq('id', user.id).single();
  if (!profile || profile.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
  }

  const adminName = profile.full_name || 'TheFarmYard Admin';

  try {
    const { topic, category, contentType } = await request.json();

    if (!topic || typeof topic !== 'string') {
      return NextResponse.json({ error: 'Topic is required.' }, { status: 400 });
    }

    // Get existing categories for context
    const serviceSupabase = getSupabase();
    const { data: categories } = await serviceSupabase
      .from('learning_categories')
      .select('id, name, description')
      .eq('is_active', true);

    const categoryContext = categories?.map((c) => c.name).join(', ') || 'General agriculture';

    // Featured image sources (free, reliable agricultural image providers)
    const imageSources = [
      'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=800',
      'https://images.unsplash.com/photo-1574943320219-553eb213f72d?w=800',
      'https://images.unsplash.com/photo-1625246333195-78d9c38ad449?w=800',
      'https://images.unsplash.com/photo-1592982537447-6f2a6a0c7c18?w=800',
      'https://images.unsplash.com/photo-1464226184884-fa280b87c399?w=800',
      'https://images.unsplash.com/photo-1530836369250-ef72a3f5cda8?w=800',
      'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=800',
      'https://images.unsplash.com/photo-1586771107445-d3ca888129ff?w=800',
    ];

    const response = await fetch(`${OLLAMA_BASE_URL}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OLLAMA_API_KEY}`,
      },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        messages: [
          {
            role: 'system',
            content: `You are an agricultural content writer for TheFarmYard, a Ghanaian agricultural marketplace. Generate educational content for farmers.

Available categories: ${categoryContext}

When generating content:
1. Write in clear, practical language suitable for Ghanaian farmers
2. Include specific, actionable steps
3. Reference local conditions (Ghanaian climate, crops, practices)
4. Use HTML formatting for headings, paragraphs, lists, and bold text
5. Keep content accurate and evidence-based
6. Include practical tips and common mistakes to avoid
7. Aim for 500-1000 words of meaningful content
8. At the end of the content, add an attribution line in this format:
   <p style="margin-top:2rem;padding-top:1rem;border-top:1px solid #e5e7eb;font-size:0.85rem;color:#6b7280;"><strong>CC:</strong> This content was curated by ${adminName} for TheFarmYard Learning Hub. Sources: [list the agricultural knowledge sources, extension services, or references you used to compile this information, e.g. "MOFA Ghana Guidelines, FAO Post-Harvest Manual, Ghana Agricultural Sector Investment Programme"].</p>

Return a JSON object with:
{
  "title": "Content title (max 100 chars)",
  "summary": "2-3 sentence summary (max 200 chars)",
  "content": "Full HTML content with <h2>, <h3>, <p>, <ul>, <li>, <strong>, <em> tags. Must include the CC attribution line at the end.",
  "tags": ["tag1", "tag2", "tag3"],
  "category": "exact category name from the available list",
  "difficulty": "beginner|intermediate|advanced",
  "readingTime": number (minutes),
  "featuredImageIndex": number (0-7, pick the most relevant image index for this topic)
}

Image index mapping:
0 = farm landscape
1 = harvested crops/grains
2 = rice paddy/farming
3 = fresh produce/vegetables
4 = farm market/selling
5 = farming tools/work
6 = garden/cultivation
7 = food storage/preservation

Only return the JSON object, no other text.`,
          },
          {
            role: 'user',
            content: `Generate a ${contentType || 'article'} about: ${topic}${category ? `\nPreferred category: ${category}` : ''}`,
          },
        ],
        stream: false,
      }),
    });

    if (!response.ok) {
      console.error('Ollama API error:', response.status);
      return NextResponse.json(
        { error: 'AI content generation failed. Please try again.' },
        { status: 502 },
      );
    }

    const data = await response.json();
    const content = data.message?.content || '';

    // Parse JSON from response
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return NextResponse.json({ error: 'Failed to parse AI response.' }, { status: 502 });
      }
      const parsed = JSON.parse(jsonMatch[0]);

      // Add featured image URL based on AI-selected index
      const imageIndex = typeof parsed.featuredImageIndex === 'number'
        ? Math.min(Math.max(parsed.featuredImageIndex, 0), imageSources.length - 1)
        : 0;
      parsed.featuredImage = imageSources[imageIndex];

      // Set author to admin
      parsed.authorName = adminName;

      // Match category to existing category ID
      if (parsed.category && categories) {
        const matchedCat = categories.find(
          (c) => c.name.toLowerCase() === String(parsed.category).toLowerCase(),
        );
        if (matchedCat) {
          parsed.categoryId = matchedCat.id;
        }
      }

      return NextResponse.json(parsed);
    } catch {
      return NextResponse.json({ error: 'Invalid AI response format.' }, { status: 502 });
    }
  } catch (error) {
    console.error('Suggestion API error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred.' },
      { status: 500 },
    );
  }
}
