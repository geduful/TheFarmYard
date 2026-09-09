import { NextRequest, NextResponse } from 'next/server';

const OLLAMA_API_KEY = process.env.OLLAMA_API_KEY;
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'gpt-oss:20b';
const OLLAMA_BASE_URL = 'https://ollama.com/api';

function buildInsightPrompt(role: string, analyticsData: Record<string, unknown>, question?: string): string {
  const dataSummary = JSON.stringify(analyticsData, null, 2).slice(0, 3000);

  const roleContext = role === 'farmer'
    ? `You are analyzing a Ghanaian farmer's performance data. Focus on: revenue trends, product performance, ratings, logistics efficiency, and market demand for their products.`
    : role === 'buyer'
    ? `You are analyzing a Ghanaian buyer's purchasing data. Focus on: spending patterns, category preferences, request fulfillment rates, and market opportunities.`
    : `You are analyzing TheFarmYard platform data as an admin. Focus on: user growth, transaction volume, marketplace health, supply vs demand balance, and platform performance.`;

  const basePrompt = `${roleContext}

ANALYTICS DATA:
${dataSummary}

Provide 3-5 concise, actionable insights based on this data. Each insight should:
1. Be specific (reference actual numbers from the data)
2. Be actionable (suggest something the user can do)
3. Be relevant to Ghanaian agriculture

Format your response as a JSON array of objects with "title", "insight", and "action" fields.
Example: [{"title": "Revenue Growth", "insight": "Your revenue grew 15% this month...", "action": "Consider expanding your top product category"}]

Keep insights practical and concise. No more than 5 insights.`;

  if (question) {
    return `${basePrompt}\n\nADDITIONAL QUESTION: ${question}\nProvide insights related to this question as well.`;
  }

  return basePrompt;
}

async function generateInsights(
  role: string,
  analyticsData: Record<string, unknown>,
  question?: string
): Promise<Array<{ title: string; insight: string; action: string }>> {
  if (!OLLAMA_API_KEY) {
    return generateFallbackInsights(role, analyticsData);
  }

  const prompt = buildInsightPrompt(role, analyticsData, question);

  const response = await fetch(`${OLLAMA_BASE_URL}/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OLLAMA_API_KEY}`,
    },
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      messages: [
        { role: 'system', content: 'You are an agricultural analytics expert for TheFarmYard, a Ghanaian agricultural marketplace. Respond ONLY with valid JSON arrays. No markdown, no code blocks, just raw JSON.' },
        { role: 'user', content: prompt },
      ],
      stream: false,
    }),
  });

  if (!response.ok) {
    console.error('Ollama API error:', response.status);
    return generateFallbackInsights(role, analyticsData);
  }

  const data = await response.json();
  const content = data.message?.content || '';

  try {
    const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(cleaned);
    if (Array.isArray(parsed)) return parsed.slice(0, 5);
    return generateFallbackInsights(role, analyticsData);
  } catch {
    return generateFallbackInsights(role, analyticsData);
  }
}

function generateFallbackInsights(
  role: string,
  data: Record<string, unknown>
): Array<{ title: string; insight: string; action: string }> {
  const insights: Array<{ title: string; insight: string; action: string }> = [];
  const overview = data.overview as Record<string, unknown> | undefined;

  if (role === 'farmer' && overview) {
    const revenue = (overview.periodRevenue as number) || 0;
    const sales = (overview.periodSales as number) || 0;
    const rating = (overview.avgRating as number) || 0;
    const listings = (overview.activeListings as number) || 0;

    if (revenue > 0) {
      insights.push({
        title: 'Revenue Performance',
        insight: `You've generated GH₵${revenue.toLocaleString()} in revenue with ${sales} sales this period.`,
        action: 'View your revenue trends to identify your best-performing products.',
      });
    }
    if (rating >= 4) {
      insights.push({
        title: 'Strong Reputation',
        insight: `Your average rating of ${rating}/5 indicates excellent buyer satisfaction.`,
        action: 'Maintain quality standards to keep attracting repeat buyers.',
      });
    }
    if (listings === 0) {
      insights.push({
        title: 'No Active Listings',
        insight: 'You have no active listings. Buyers can\'t find your products.',
        action: 'Create your first listing to start selling on the marketplace.',
      });
    }
  } else if (role === 'buyer' && overview) {
    const spending = (overview.periodSpending as number) || 0;
    const purchases = (overview.periodPurchases as number) || 0;

    if (spending > 0) {
      insights.push({
        title: 'Spending Overview',
        insight: `You've spent GH₵${spending.toLocaleString()} on ${purchases} purchases this period.`,
        action: 'Check your spending trends to optimize your purchasing strategy.',
      });
    }
    const activeRequests = (overview.activeRequests as number) || 0;
    if (activeRequests > 0) {
      insights.push({
        title: 'Open Requests',
        insight: `You have ${activeRequests} active buyer requests waiting for farmer responses.`,
        action: 'Review your requests and consider expanding your search criteria.',
      });
    }
  } else if (role === 'admin' && overview) {
    const users = (overview.totalUsers as number) || 0;
    const volume = (overview.totalVolume as number) || 0;

    insights.push({
      title: 'Platform Overview',
      insight: `${users} registered users with GH₵${volume.toLocaleString()} in total transaction volume.`,
      action: 'Monitor user growth trends and marketplace activity.',
    });
  }

  if (insights.length === 0) {
    insights.push({
      title: 'Getting Started',
      insight: 'Not enough data to generate insights yet. Keep using the platform!',
      action: 'Complete transactions, create listings, or submit reviews to see analytics.',
    });
  }

  return insights;
}

export async function POST(request: NextRequest) {
  try {
    const { role, analyticsData, question } = await request.json();

    if (!role || !['farmer', 'buyer', 'admin'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role.' }, { status: 400 });
    }

    if (!analyticsData || typeof analyticsData !== 'object') {
      return NextResponse.json({ error: 'Analytics data is required.' }, { status: 400 });
    }

    const insights = await generateInsights(role, analyticsData, question);

    return NextResponse.json({ insights, poweredBy: OLLAMA_API_KEY ? 'ai' : 'fallback' });
  } catch (error) {
    console.error('Insights API error:', error);
    return NextResponse.json({ error: 'Failed to generate insights.' }, { status: 500 });
  }
}
