import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createServiceSupabaseClient } from '@/lib/supabase/service';
import { stripHtml } from '@/lib/utils';

const OLLAMA_API_KEY = process.env.OLLAMA_API_KEY;
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'gpt-oss:20b';
const OLLAMA_BASE_URL = 'https://ollama.com/api';

const AI_RATE_LIMIT_MAX = 30; // requests per hour
const AI_RATE_LIMIT_WINDOW = 60; // minutes

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error('Missing Supabase env vars');
  return createClient(url, key, { auth: { persistSession: false } });
}

type KbResource = {
  id: number;
  title: string;
  slug: string;
  summary: string | null;
  content: string;
  tags: string[];
  category: { name: string } | null;
  reading_time_min: number;
};

function normalizeResources(data: unknown[]): KbResource[] {
  return (data || []).map((r: unknown) => {
    const row = r as Record<string, unknown>;
    const cat = row.category;
    return {
      id: row.id as number,
      title: row.title as string,
      slug: row.slug as string,
      summary: row.summary as string | null,
      content: row.content as string,
      tags: (row.tags as string[]) || [],
      category: Array.isArray(cat) ? (cat[0] as { name: string } | undefined ?? null) : (cat as { name: string } | null),
      reading_time_min: (row.reading_time_min as number) || 5,
    };
  });
}

async function searchKnowledgeBase(query: string, limit: number = 8): Promise<KbResource[]> {
  const supabase = getSupabase();
  const keywords = query.toLowerCase().split(/\s+/).filter((w) => w.length > 2);

  // Try full-text search first
  const { data: ftsResults } = await supabase
    .from('learning_resources')
    .select('id, title, slug, summary, content, tags, category:learning_categories(name), reading_time_min')
    .eq('status', 'published')
    .textSearch('title', query, { type: 'websearch', config: 'english' })
    .order('published_at', { ascending: false })
    .limit(limit);

  if (ftsResults && ftsResults.length >= 2) {
    return normalizeResources(ftsResults);
  }

  // Fallback to ilike search
  if (keywords.length > 0) {
    const searchPattern = `%${keywords[0]}%`;
    const { data: titleResults } = await supabase
      .from('learning_resources')
      .select('id, title, slug, summary, content, tags, category:learning_categories(name), reading_time_min')
      .eq('status', 'published')
      .or(`title.ilike.${searchPattern},summary.ilike.${searchPattern},content.ilike.${searchPattern}`)
      .order('published_at', { ascending: false })
      .limit(limit);

    if (titleResults && titleResults.length > 0) {
      return normalizeResources(titleResults);
    }
  }

  // Last resort: search tags
  if (keywords.length > 0) {
    const { data: tagResults } = await supabase
      .from('learning_resources')
      .select('id, title, slug, summary, content, tags, category:learning_categories(name), reading_time_min')
      .eq('status', 'published')
      .contains('tags', [keywords[0]])
      .order('published_at', { ascending: false })
      .limit(limit);

    if (tagResults && tagResults.length > 0) {
      return normalizeResources(tagResults);
    }
  }

  // Final fallback: get recent published resources
  const { data: recentResults } = await supabase
    .from('learning_resources')
    .select('id, title, slug, summary, content, tags, category:learning_categories(name), reading_time_min')
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .limit(limit);

  return normalizeResources(recentResults || []);
}

function extractRelevantParagraphs(content: string, query: string, maxParagraphs: number = 3): string[] {
  const plain = stripHtml(content);
  const paragraphs = plain.split(/\n\n+/).filter((p) => p.trim().length > 20);
  const queryWords = query.toLowerCase().split(/\s+/).filter((w) => w.length > 2);

  const scored = paragraphs.map((p) => {
    const lower = p.toLowerCase();
    let score = 0;
    for (const word of queryWords) {
      if (lower.includes(word)) score += 1;
    }
    return { paragraph: p.trim(), score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, maxParagraphs).map((s) => s.paragraph);
}

function buildKbAnswer(resources: KbResource[], query: string): string {
  if (resources.length === 0) {
    return `I couldn't find specific articles about "${query}" in our knowledge base yet.\n\nHere are some things you can try:\n- Browse our Knowledge Base for available articles\n- Rephrase your question with different keywords\n- Ask about specific topics like maize, storage, pricing, or post-harvest handling\n\nOur knowledge base is growing. Check back soon for more content!`;
  }

  const topResources = resources.slice(0, 3);
  let answer = '';

  const queryWords = query.toLowerCase().split(/\s+/).filter((w) => w.length > 2);
  let hasStrongMatch = false;

  for (const r of topResources) {
    const titleLower = r.title.toLowerCase();
    const summaryLower = (r.summary || '').toLowerCase();
    let matches = 0;
    for (const word of queryWords) {
      if (titleLower.includes(word) || summaryLower.includes(word)) matches++;
    }
    if (matches >= 2 || (queryWords.length <= 2 && matches >= 1)) {
      hasStrongMatch = true;
      break;
    }
  }

  if (hasStrongMatch) {
    const primary = topResources[0];
    const relevantParagraphs = extractRelevantParagraphs(primary.content, query, 2);

    if (relevantParagraphs.length > 0) {
      answer = relevantParagraphs.join('\n\n');
    } else if (primary.summary) {
      answer = primary.summary;
    } else {
      answer = stripHtml(primary.content).slice(0, 500) + '...';
    }
  } else {
    const summaries = topResources
      .filter((r) => r.summary)
      .map((r) => `**${r.title}**: ${r.summary}`)
      .slice(0, 3);

    if (summaries.length > 0) {
      answer = `Based on our knowledge base, here are relevant resources:\n\n${summaries.join('\n\n')}`;
    } else {
      const contents = topResources.map((r) => {
        const paras = extractRelevantParagraphs(r.content, query, 1);
        return paras.length > 0 ? `**${r.title}**: ${paras[0]}` : null;
      }).filter(Boolean);

      if (contents.length > 0) {
        answer = contents.join('\n\n');
      } else {
        answer = `I found ${resources.length} resource${resources.length !== 1 ? 's' : ''} that may help. Check the recommended articles below for detailed information.`;
      }
    }
  }

  return answer;
}

function detectFeatureSuggestions(answer: string, query: string): Array<{ name: string; href: string; description: string }> {
  const suggestions: Array<{ name: string; href: string; description: string }> = [];
  const combined = (answer + ' ' + query).toLowerCase();

  if (combined.includes('storage') || combined.includes('warehouse') || combined.includes('store your') || combined.includes('cold room') || combined.includes('silo')) {
    suggestions.push({ name: 'Find Storage', href: '/dashboard/farmer/storage', description: 'Book a warehouse or cold room for your produce' });
  }
  if (combined.includes('sell') || combined.includes('marketplace') || combined.includes('listing') || combined.includes('buyer') || combined.includes('price')) {
    suggestions.push({ name: 'Create Listing', href: '/dashboard/farmer/listings/new', description: 'List your produce on the marketplace' });
  }
  if (combined.includes('transport') || combined.includes('logistics') || combined.includes('delivery') || combined.includes('dispatch')) {
    suggestions.push({ name: 'View Logistics', href: '/marketplace', description: 'Arrange transportation for your produce' });
  }

  return suggestions;
}

// ─── Ollama Cloud-powered answer ────────────────────────────────────────────

const SYSTEM_PROMPT = `You are an Agricultural AI Assistant for TheFarmYard, a Ghanaian agricultural marketplace platform.

Your role is to help farmers, buyers, and agricultural workers with practical, accurate agricultural knowledge. You specialize in:
- Crop production (maize, rice, cassava, yam, vegetables, fruits)
- Livestock management (poultry, goats, sheep, cattle, pigs)
- Post-harvest handling (drying, storage, packaging, loss reduction)
- Farm business (pricing, budgeting, record keeping, finding buyers)
- Agricultural technology and digital farming
- Storage and warehousing
- Transportation and logistics

IMPORTANT RULES:
1. Always be helpful, clear, and practical. Use simple language that farmers can understand.
2. When you are unsure about something, say so clearly. Never present uncertain information as fact.
3. Always cite your sources when referencing knowledge base articles. Use format: [Source: "Article Title"]
4. For potentially dangerous advice (chemicals, pesticides, financial decisions), always recommend consulting local agricultural extension officers or experts.
5. Tailor your response complexity to the question. If the question is basic, keep it beginner-friendly.
6. Connect your answers to TheFarmYard features when relevant:
   - If discussing storage → mention the Storage & Warehousing feature
   - If discussing selling/marketplace → mention creating a listing
   - If discussing transportation → mention the Logistics feature
7. If a question is outside your agricultural expertise, say so rather than guessing.
8. For Ghanaian context, mention local practices, varieties, and conditions where relevant.
9. Keep responses concise but thorough. Aim for 2-4 paragraphs unless more detail is needed.
10. Use bullet points or numbered lists for actionable steps.`;

async function generateWithOllama(query: string, kbResources: KbResource[], history: Array<{ role: string; content: string }>): Promise<string> {
  const kbContext = kbResources.length > 0
    ? `\n\nRELEVANT KNOWLEDGE BASE ARTICLES:\n${kbResources.slice(0, 5).map((r, i) => {
        const plain = stripHtml(r.content).slice(0, 1200);
        return `[${i + 1}] "${r.title}" [Category: ${r.category?.name || 'General'}]\nSummary: ${r.summary || 'N/A'}\nContent: ${plain}`;
      }).join('\n\n')}`
    : '';

  const tfyContext = `
TheFarmYard platform features you can recommend:
- FIND STORAGE: /dashboard/farmer/storage — Book warehouses, cold rooms, and silos
- CREATE LISTING: /dashboard/farmer/listings/new — Sell on the marketplace
- BROWSE MARKETPLACE: /marketplace — Find buyers and products
- LOGISTICS: /dashboard/farmer — Arrange transportation
- LEARNING HUB: /learning — Browse educational content

When relevant, naturally suggest these features.`;

  const messages: Array<{ role: string; content: string }> = [
    { role: 'system', content: SYSTEM_PROMPT + kbContext + tfyContext },
  ];

  if (Array.isArray(history)) {
    const recent = history.slice(-6);
    for (const msg of recent) {
      messages.push({
        role: msg.role === 'user' ? 'user' : 'assistant',
        content: msg.content,
      });
    }
  }

  messages.push({ role: 'user', content: query });

  const response = await fetch(`${OLLAMA_BASE_URL}/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OLLAMA_API_KEY}`,
    },
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      messages,
      stream: false,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    console.error('Ollama API error:', response.status, errorText);
    throw new Error(`Ollama API request failed: ${response.status}`);
  }

  const data = await response.json();
  return data.message?.content || '';
}

// ─── Main handler ───────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    // Require authentication
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Please sign in to use the AI assistant.' }, { status: 401 });
    }

    // Rate limit check
    const serviceClient = createServiceSupabaseClient();
    const { data: rateOk } = await serviceClient
      .rpc('check_ai_rate_limit', {
        p_user_id: user.id,
        p_endpoint: 'learning_ai',
        p_max_requests: AI_RATE_LIMIT_MAX,
        p_window_minutes: AI_RATE_LIMIT_WINDOW,
      });
    if (rateOk === false) {
      return NextResponse.json({ error: 'Rate limit exceeded. Please try again later.' }, { status: 429 });
    }

    const { message, history } = await request.json();

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Message is required.' }, { status: 400 });
    }

    if (message.length > 2000) {
      return NextResponse.json({ error: 'Message is too long. Please keep it under 2000 characters.' }, { status: 400 });
    }

    // Validate and sanitize history
    const safeHistory = Array.isArray(history)
      ? history
          .filter((msg: unknown) => msg && typeof msg === 'object' && 'role' in msg && 'content' in msg)
          .slice(-6)
          .map((msg: { role: unknown; content: unknown }) => ({
            role: msg.role === 'user' ? 'user' : 'assistant',
            content: typeof msg.content === 'string' ? msg.content.slice(0, 2000) : '',
          }))
      : [];

    // Search knowledge base
    const kbResources = await searchKnowledgeBase(message, 8);

    let answer: string;
    let poweredBy: 'ai' | 'knowledge-base' = 'knowledge-base';

    // Try Ollama Cloud if API key is available
    if (OLLAMA_API_KEY) {
      try {
        answer = await generateWithOllama(message, kbResources, safeHistory);
        poweredBy = 'ai';
      } catch (error) {
        console.error('Ollama failed, falling back to KB assistant:', error);
        answer = buildKbAnswer(kbResources, message);
      }
    } else {
      // Use knowledge base-powered assistant
      answer = buildKbAnswer(kbResources, message);
    }

    // Format recommended resources
    const recommendedResources = kbResources.slice(0, 4).map((r) => ({
      title: r.title,
      slug: r.slug,
      summary: r.summary,
      category: r.category?.name || null,
    }));

    // Detect feature suggestions
    const featureSuggestions = detectFeatureSuggestions(answer, message);

    // Record usage for rate limiting (fire-and-forget)
    void serviceClient.rpc('record_ai_usage', { p_user_id: user.id, p_endpoint: 'learning_ai' });

    return NextResponse.json({
      answer,
      recommendedResources,
      featureSuggestions,
      sourcesUsed: kbResources.length > 0,
      poweredBy,
    });
  } catch (error) {
    console.error('AI API route error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred. Please try again.' },
      { status: 500 },
    );
  }
}
