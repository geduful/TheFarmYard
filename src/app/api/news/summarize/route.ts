import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createServiceSupabaseClient } from '@/lib/supabase/service';

const OLLAMA_API_URL = 'https://ollama.com/api/chat';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'gpt-oss:20b';

const AI_RATE_LIMIT_MAX = 15; // requests per hour
const AI_RATE_LIMIT_WINDOW = 60; // minutes

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  );
}

export async function POST(request: NextRequest) {
  try {
    // Require authentication
    const authSupabase = await createServerSupabaseClient();
    const { data: { user } } = await authSupabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Please sign in.' }, { status: 401 });
    }

    // Rate limit check
    const serviceClient = createServiceSupabaseClient();
    const { data: rateOk } = await serviceClient
      .rpc('check_ai_rate_limit', {
        p_user_id: user.id,
        p_endpoint: 'news_summarize',
        p_max_requests: AI_RATE_LIMIT_MAX,
        p_window_minutes: AI_RATE_LIMIT_WINDOW,
      });
    if (rateOk === false) {
      return NextResponse.json({ error: 'Rate limit exceeded. Please try again later.' }, { status: 429 });
    }

    const { articleId, articleTitle, articleContent, articleSummary, sourceName, mode } = await request.json();

    if (!articleTitle || typeof articleTitle !== 'string') {
      return NextResponse.json({ error: 'Article title is required.' }, { status: 400 });
    }

    // Validate and sanitize inputs
    const safeTitle = articleTitle.slice(0, 500);
    const safeContent = articleContent && typeof articleContent === 'string' ? articleContent.slice(0, 3000) : '';
    const safeSummary = articleSummary && typeof articleSummary === 'string' ? articleSummary.slice(0, 1000) : '';
    const safeSource = sourceName && typeof sourceName === 'string' ? sourceName.slice(0, 200) : '';
    const safeMode = mode === 'explain' ? 'explain' : 'summarize';

    const supabase = getSupabase();

    // Fetch article data if ID provided and not enough context
    let article = null;
    if (articleId) {
      const { data } = await supabase
        .from('news_articles')
        .select('title, summary, content, source_name, category:news_categories(name)')
        .eq('id', articleId)
        .single();
      article = data;
    }

    const title = article?.title || safeTitle;
    const summary = article?.summary || safeSummary;
    const content = article?.content || safeContent;
    const source = article?.source_name || safeSource || 'Unknown source';
    const categoryArr = article?.category as unknown as { name: string }[] | null;
    const category = Array.isArray(categoryArr) ? categoryArr[0]?.name || '' : '';

    const context = [title, summary, content].filter(Boolean).join('\n\n'); // eslint-disable-line @typescript-eslint/no-unused-vars

    // Build the appropriate prompt based on mode
    let systemPrompt = '';
    let userPrompt = '';

    if (safeMode === 'explain') {
      systemPrompt = `You are TheFarmYard AI, an agricultural intelligence assistant for Ghanaian farmers and agricultural businesses.

When explaining a news article:
1. Provide a clear, simple summary
2. Explain why it matters to Ghanaian farmers
3. Identify who may be affected
4. Suggest what to watch or do next
5. Always cite the original source

Rules:
- Only use information from the provided article
- Do not invent facts, statistics, or predictions
- If the article lacks detail, say so
- Use plain language accessible to farmers
- Consider Ghanaian agricultural context
- Format response in clean markdown`;
      userPrompt = `Explain this agricultural news article for farmers:

Title: ${title}
Source: ${source}
Category: ${category}

${summary ? `Summary: ${summary}` : ''}
${content ? `Content: ${content.substring(0, 2000)}` : ''}

Provide:
### Simple Summary
### Why It Matters
### Who May Be Affected
### What You Should Watch
### Source: ${source}`;
    } else {
      // Default summarize mode
      systemPrompt = `You are TheFarmYard AI, an agricultural intelligence assistant for Ghanaian farmers and agricultural businesses.

Summarize agricultural news concisely and accurately.

Rules:
- Only use information from the provided article
- Do not invent facts, statistics, or predictions
- Keep summary under 200 words
- Highlight key practical implications for farmers
- Use plain language
- Consider Ghanaian agricultural context
- If the article is about market prices, note the specific numbers mentioned
- Format response in clean markdown`;
      userPrompt = `Summarize this agricultural news:

Title: ${title}
Source: ${source}
Category: ${category}

${summary ? `Summary: ${summary}` : ''}
${content ? `Content: ${content.substring(0, 2000)}` : ''}

Provide a concise summary highlighting the key points and their relevance to Ghanaian agriculture.`;
    }

    // Check if API key exists
    if (!process.env.OLLAMA_API_KEY) {
      // Fallback: return basic summary from available data
      const basicSummary = summary || excerptFromContent(content) || `News from ${source}: ${title}`;
      return NextResponse.json({
        summary: basicSummary,
        poweredBy: 'knowledge-base',
        mode: safeMode,
      });
    }

    const response = await fetch(OLLAMA_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OLLAMA_API_KEY}`,
      },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        stream: false,
      }),
    });

    if (!response.ok) {
      const basicSummary = summary || excerptFromContent(content) || `News from ${source}: ${title}`;
      return NextResponse.json({
        summary: basicSummary,
        poweredBy: 'knowledge-base',
        mode: safeMode,
      });
    }

    const data = await response.json();
    const aiSummary = data?.message?.content || summary || `News from ${source}: ${title}`;

    // Store AI summary on the article if we have an ID (admin only)
    if (articleId && safeMode === 'summarize') {
      const { data: profile } = await authSupabase
        .from('profiles').select('role').eq('id', user.id).single();
      if (profile?.role === 'admin') {
        await supabase
          .from('news_articles')
          .update({ ai_summary: aiSummary })
          .eq('id', articleId);
      }
    }

    // Record usage for rate limiting (fire-and-forget)
    void serviceClient.rpc('record_ai_usage', { p_user_id: user.id, p_endpoint: 'news_summarize' });

    return NextResponse.json({
      summary: aiSummary,
      poweredBy: 'ai',
      mode: safeMode,
    });
  } catch (error) {
    console.error('News summarize error:', error);
    return NextResponse.json({ error: 'Failed to summarize article.' }, { status: 500 });
  }
}

function excerptFromContent(content: string | null, maxLength = 160): string {
  if (!content) return '';
  const text = content.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength).replace(/\s+\S*$/, '') + '...';
}
