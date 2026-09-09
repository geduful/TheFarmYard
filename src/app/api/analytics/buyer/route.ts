import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  );
}

function getDateRange(period: string): string {
  const now = new Date();
  switch (period) {
    case '7d': return new Date(now.getTime() - 7 * 86400000).toISOString();
    case '30d': return new Date(now.getTime() - 30 * 86400000).toISOString();
    case '90d': return new Date(now.getTime() - 90 * 86400000).toISOString();
    case '12m': return new Date(now.getTime() - 365 * 86400000).toISOString();
    default: return '1970-01-01T00:00:00Z';
  }
}

function getPreviousDateRange(period: string): { start: string; end: string } {
  const now = new Date();
  let currentDays: number;
  switch (period) {
    case '7d': currentDays = 7; break;
    case '30d': currentDays = 30; break;
    case '90d': currentDays = 90; break;
    case '12m': currentDays = 365; break;
    default: currentDays = 30;
  }
  return {
    start: new Date(now.getTime() - currentDays * 2 * 86400000).toISOString(),
    end: new Date(now.getTime() - currentDays * 86400000).toISOString(),
  };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new Date(request.url) ? request.nextUrl : { searchParams: new URLSearchParams() };
    const period = searchParams.get('period') || '30d';
    const supabase = getSupabase();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const dateFrom = getDateRange(period);
    const prevRange = getPreviousDateRange(period);

    const [
      profileRes,
      transactionsRes,
      buyRequestsRes,
      shipmentsRes,
      ratingsGivenRes,
      prevTransactionsRes,
    ] = await Promise.all([
      supabase.from('profiles').select('id, full_name, role, is_verified, verification_tier, created_at').eq('id', user.id).single(),
      supabase.from('escrow_transactions').select('id, listing_id, base_amount, buyer_fee, farmer_fee, total_buyer_paid, total_farmer_yield, status, currency, paid_at, created_at, listing:listings(id, title, category)').eq('buyer_id', user.id),
      supabase.from('buy_requests').select('id, commodity_title, category, quantity_required, delivery_location, status, created_at').eq('buyer_id', user.id),
      supabase.from('shipments').select('id, status, created_at, actual_delivery_at').eq('buyer_id', user.id),
      supabase.from('farmer_ratings').select('id, rating, created_at').eq('buyer_id', user.id),
      supabase.from('escrow_transactions').select('id, total_buyer_paid, status, created_at').eq('buyer_id', user.id).gte('created_at', prevRange.start).lt('created_at', prevRange.end),
    ]);

    const allTransactions = transactionsRes.data || [];
    const allBuyRequests = buyRequestsRes.data || [];
    const allShipments = shipmentsRes.data || [];
    const allRatingsGiven = ratingsGivenRes.data || [];
    const prevTxns = prevTransactionsRes.data || [];

    const completedTransactions = allTransactions.filter(t => t.status === 'released');

    const totalSpending = completedTransactions.reduce((sum, t) => sum + (t.total_buyer_paid || 0), 0);
    const periodSpending = completedTransactions.filter(t => t.created_at >= dateFrom).reduce((sum, t) => sum + (t.total_buyer_paid || 0), 0);
    const prevSpending = prevTxns.filter(t => t.status === 'released').reduce((sum, t) => sum + (t.total_buyer_paid || 0), 0);

    const totalPurchases = completedTransactions.length;
    const periodPurchases = completedTransactions.filter(t => t.created_at >= dateFrom).length;
    const prevPurchases = prevTxns.filter(t => t.status === 'released').length;

    const activeRequests = allBuyRequests.filter(r => r.status === 'open').length;
    const matchedRequests = allBuyRequests.filter(r => r.status === 'matched').length;
    const fulfilledRequests = allBuyRequests.filter(r => r.status === 'fulfilled').length;

    const deliveredShipments = allShipments.filter(s => ['delivered', 'delivery_confirmed'].includes(s.status));
    const inTransitShipments = allShipments.filter(s => ['in_transit', 'out_for_delivery', 'assigned', 'pickup_scheduled'].includes(s.status));

    const spendingByMonth: Record<string, number> = {};
    completedTransactions.forEach(t => {
      const month = t.created_at.substring(0, 7);
      spendingByMonth[month] = (spendingByMonth[month] || 0) + (t.total_buyer_paid || 0);
    });

    const spendingByCategory: Record<string, number> = {};
    completedTransactions.forEach(t => {
      const listing = t.listing as unknown as { category?: string } | null;
      const cat = listing?.category || 'Other';
      spendingByCategory[cat] = (spendingByCategory[cat] || 0) + (t.total_buyer_paid || 0);
    });

    const purchasesByCategory: Record<string, number> = {};
    completedTransactions.forEach(t => {
      const listing = t.listing as unknown as { category?: string } | null;
      const cat = listing?.category || 'Other';
      purchasesByCategory[cat] = (purchasesByCategory[cat] || 0) + 1;
    });

    const topCategories = Object.entries(purchasesByCategory)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([category, count]) => ({ category, count, spending: spendingByCategory[category] || 0 }));

    const requestsByCategory: Record<string, number> = {};
    allBuyRequests.forEach(r => {
      requestsByCategory[r.category] = (requestsByCategory[r.category] || 0) + 1;
    });

    const topRequestedCategories = Object.entries(requestsByCategory)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([category, count]) => ({ category, count }));

    const requestsByLocation: Record<string, number> = {};
    allBuyRequests.forEach(r => {
      const loc = r.delivery_location || 'Unknown';
      requestsByLocation[loc] = (requestsByLocation[loc] || 0) + 1;
    });

    const topLocations = Object.entries(requestsByLocation)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([location, count]) => ({ location, count }));

    const avgPurchaseValue = totalPurchases > 0 ? totalSpending / totalPurchases : 0;

    return NextResponse.json({
      overview: {
        totalSpending,
        periodSpending,
        prevSpending,
        spendingChange: prevSpending > 0 ? Math.round(((periodSpending - prevSpending) / prevSpending) * 100) : null,
        totalPurchases,
        periodPurchases,
        prevPurchases,
        purchasesChange: prevPurchases > 0 ? Math.round(((periodPurchases - prevPurchases) / prevPurchases) * 100) : null,
        avgPurchaseValue: Math.round(avgPurchaseValue * 100) / 100,
        activeRequests,
        matchedRequests,
        fulfilledRequests,
        totalRequests: allBuyRequests.length,
        ratingsGiven: allRatingsGiven.length,
        avgRating: allRatingsGiven.length > 0
          ? Math.round((allRatingsGiven.reduce((sum, r) => sum + r.rating, 0) / allRatingsGiven.length) * 10) / 10
          : 0,
        verificationTier: profileRes.data?.verification_tier || 'none',
      },
      spending: {
        byMonth: Object.entries(spendingByMonth).sort(([a], [b]) => a.localeCompare(b)).map(([month, amount]) => ({ month, amount })),
        byCategory: Object.entries(spendingByCategory).sort(([, a], [, b]) => b - a).map(([category, amount]) => ({ category, amount })),
      },
      purchases: {
        topCategories,
        totalCategories: Object.keys(purchasesByCategory).length,
      },
      requests: {
        total: allBuyRequests.length,
        open: activeRequests,
        matched: matchedRequests,
        fulfilled: fulfilledRequests,
        topCategories: topRequestedCategories,
        topLocations,
      },
      logistics: {
        total: allShipments.length,
        delivered: deliveredShipments.length,
        inTransit: inTransitShipments.length,
      },
      period,
    });
  } catch (error) {
    console.error('Buyer analytics error:', error);
    return NextResponse.json({ error: 'Failed to load analytics.' }, { status: 500 });
  }
}
