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
      listingsRes,
      transactionsRes,
      ratingsRes,
      shipmentsRes,
      buyRequestsRes,
      storageRes,
      prevTransactionsRes,
    ] = await Promise.all([
      supabase.from('profiles').select('id, full_name, role, is_verified, verification_tier, farm_location, created_at').eq('id', user.id).single(),
      supabase.from('listings').select('id, title, category, price_per_unit, price_unit, is_approved, is_promoted, location, availability, created_at').eq('farmer_id', user.id),
      supabase.from('escrow_transactions').select('id, listing_id, base_amount, buyer_fee, farmer_fee, total_buyer_paid, total_farmer_yield, platform_revenue, status, currency, paid_at, created_at, listing:listings(id, title, category)').eq('farmer_id', user.id),
      supabase.from('farmer_ratings').select('id, rating, comment, created_at, buyer:profiles!farmer_ratings_buyer_id_fkey(full_name)').eq('farmer_id', user.id),
      supabase.from('shipments').select('id, status, pickup_location, destination, delivery_fee, created_at, updated_at, actual_pickup_at, actual_delivery_at').eq('farmer_id', user.id),
      supabase.from('buy_requests').select('id, commodity_title, category, quantity_required, delivery_location, status, created_at').eq('status', 'open').order('created_at', { ascending: false }),
      supabase.from('storage_bookings').select('id, produce_name, quantity, quantity_unit, total_fee, status, storage_start, storage_end, created_at').eq('farmer_id', user.id),
      supabase.from('escrow_transactions').select('id, total_farmer_yield, status, created_at').eq('farmer_id', user.id).gte('created_at', prevRange.start).lt('created_at', prevRange.end),
    ]);

    const allListings = listingsRes.data || [];
    const allTransactions = transactionsRes.data || [];
    const allRatings = ratingsRes.data || [];
    const allShipments = shipmentsRes.data || [];
    const allBuyRequests = buyRequestsRes.data || [];
    const allStorage = storageRes.data || [];
    const prevTxns = prevTransactionsRes.data || [];

    const releasedTransactions = allTransactions.filter(t => t.status === 'released');
    const currentPeriodTransactions = allTransactions.filter(t => t.created_at >= dateFrom);
    const currentReleased = currentPeriodTransactions.filter(t => t.status === 'released');

    const totalRevenue = releasedTransactions.reduce((sum, t) => sum + (t.total_farmer_yield || 0), 0);
    const periodRevenue = currentReleased.reduce((sum, t) => sum + (t.total_farmer_yield || 0), 0);
    const prevRevenue = prevTxns.filter(t => t.status === 'released').reduce((sum, t) => sum + (t.total_farmer_yield || 0), 0);

    const totalSales = releasedTransactions.length;
    const periodSales = currentReleased.length;
    const prevSales = prevTxns.filter(t => t.status === 'released').length;

    const activeListings = allListings.filter(l => l.is_approved);
    const pendingListings = allListings.filter(l => !l.is_approved);

    const avgRating = allRatings.length > 0
      ? allRatings.reduce((sum, r) => sum + r.rating, 0) / allRatings.length
      : 0;

    const ratingDistribution = [5, 4, 3, 2, 1].map(stars => ({
      stars,
      count: allRatings.filter(r => r.rating === stars).length,
      pct: allRatings.length > 0
        ? Math.round((allRatings.filter(r => r.rating === stars).length / allRatings.length) * 100)
        : 0,
    }));

    const deliveredShipments = allShipments.filter(s => ['delivered', 'delivery_confirmed'].includes(s.status));
    const inTransitShipments = allShipments.filter(s => ['in_transit', 'out_for_delivery', 'assigned', 'pickup_scheduled'].includes(s.status));
    const failedShipments = allShipments.filter(s => ['cancelled', 'failed'].includes(s.status));

    const avgDeliveryDays = deliveredShipments.length > 0 && deliveredShipments.some(s => s.actual_delivery_at && s.actual_pickup_at)
      ? deliveredShipments
          .filter(s => s.actual_delivery_at && s.actual_pickup_at)
          .reduce((sum, s) => {
            const days = (new Date(s.actual_delivery_at!).getTime() - new Date(s.actual_pickup_at!).getTime()) / 86400000;
            return sum + days;
          }, 0) / deliveredShipments.filter(s => s.actual_delivery_at && s.actual_pickup_at).length
      : null;

    const deliverySuccessRate = (deliveredShipments.length + failedShipments.length) > 0
      ? Math.round((deliveredShipments.length / (deliveredShipments.length + failedShipments.length)) * 100)
      : null;

    const activeStorage = allStorage.filter(s => ['pending', 'confirmed', 'checked_in', 'stored'].includes(s.status));
    const storageSpending = allStorage.reduce((sum, s) => sum + (s.total_fee || 0), 0);

    const revenueByMonth: Record<string, number> = {};
    releasedTransactions.forEach(t => {
      const month = t.created_at.substring(0, 7);
      revenueByMonth[month] = (revenueByMonth[month] || 0) + (t.total_farmer_yield || 0);
    });

    const revenueByCategory: Record<string, number> = {};
    releasedTransactions.forEach(t => {
      const listing = t.listing as unknown as { category?: string } | null;
      const cat = listing?.category || 'Other';
      revenueByCategory[cat] = (revenueByCategory[cat] || 0) + (t.total_farmer_yield || 0);
    });

    const salesByCategory: Record<string, number> = {};
    releasedTransactions.forEach(t => {
      const listing = t.listing as unknown as { category?: string } | null;
      const cat = listing?.category || 'Other';
      salesByCategory[cat] = (salesByCategory[cat] || 0) + 1;
    });

    const topProducts = Object.entries(salesByCategory)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([category, count]) => ({ category, count, revenue: revenueByCategory[category] || 0 }));

    const recentRatings = allRatings.slice(0, 5).map(r => ({
      rating: r.rating,
      comment: r.comment,
      created_at: r.created_at,
      buyer: (r.buyer as unknown as { full_name?: string })?.full_name || 'Anonymous',
    }));

    const accountAgeDays = Math.floor((Date.now() - new Date(profileRes.data?.created_at || Date.now()).getTime()) / 86400000);

    return NextResponse.json({
      overview: {
        totalRevenue,
        periodRevenue,
        prevRevenue,
        revenueChange: prevRevenue > 0 ? Math.round(((periodRevenue - prevRevenue) / prevRevenue) * 100) : null,
        totalSales,
        periodSales,
        prevSales,
        salesChange: prevSales > 0 ? Math.round(((periodSales - prevSales) / prevSales) * 100) : null,
        activeListings: activeListings.length,
        pendingListings: pendingListings.length,
        avgRating: Math.round(avgRating * 10) / 10,
        totalRatings: allRatings.length,
        trustScore: 0,
        verificationTier: profileRes.data?.verification_tier || 'none',
        accountAgeDays,
      },
      revenue: {
        byMonth: Object.entries(revenueByMonth).sort(([a], [b]) => a.localeCompare(b)).map(([month, amount]) => ({ month, amount })),
        byCategory: Object.entries(revenueByCategory).sort(([, a], [, b]) => b - a).map(([category, amount]) => ({ category, amount })),
      },
      products: {
        top: topProducts,
        totalCategories: Object.keys(salesByCategory).length,
      },
      ratings: {
        average: Math.round(avgRating * 10) / 10,
        total: allRatings.length,
        distribution: ratingDistribution,
        recent: recentRatings,
      },
      logistics: {
        total: allShipments.length,
        delivered: deliveredShipments.length,
        inTransit: inTransitShipments.length,
        failed: failedShipments.length,
        avgDeliveryDays: avgDeliveryDays ? Math.round(avgDeliveryDays * 10) / 10 : null,
        successRate: deliverySuccessRate,
      },
      storage: {
        activeBookings: activeStorage.length,
        totalBookings: allStorage.length,
        totalSpending: storageSpending,
      },
      demand: {
        openRequests: allBuyRequests.length,
        topRequested: allBuyRequests.slice(0, 5).map(r => ({
          commodity: r.commodity_title,
          category: r.category,
          quantity: r.quantity_required,
          location: r.delivery_location,
        })),
      },
      period,
    });
  } catch (error) {
    console.error('Farmer analytics error:', error);
    return NextResponse.json({ error: 'Failed to load analytics.' }, { status: 500 });
  }
}
