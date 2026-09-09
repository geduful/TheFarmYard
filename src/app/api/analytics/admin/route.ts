import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new Date(request.url) ? request.nextUrl : { searchParams: new URLSearchParams() };
    const period = searchParams.get('period') || '30d';
    const supabase = await createServerSupabaseClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles').select('role').eq('id', user.id).single();
    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const dateFrom = getDateRange(period);

    const [
      profilesRes,
      listingsRes,
      transactionsRes,
      shipmentsRes,
      buyRequestsRes,
      storageBookingsRes,
      learningRes,
      newsRes,
      ratingsRes,
      reportsRes,
    ] = await Promise.all([
      supabase.from('profiles').select('id, role, is_verified, verification_tier, created_at'),
      supabase.from('listings').select('id, category, location, is_approved, farmer_id, created_at'),
      supabase.from('escrow_transactions').select('id, buyer_id, farmer_id, total_buyer_paid, total_farmer_yield, platform_revenue, status, created_at'),
      supabase.from('shipments').select('id, status, created_at, actual_delivery_at'),
      supabase.from('buy_requests').select('id, category, delivery_location, status, created_at'),
      supabase.from('storage_bookings').select('id, status, total_fee, created_at'),
      supabase.from('learning_resources').select('id, status, view_count, created_at'),
      supabase.from('news_articles').select('id, status, view_count, published_at, created_at'),
      supabase.from('farmer_ratings').select('id, rating, created_at'),
      supabase.from('reports').select('id, status, created_at'),
    ]);

    const allProfiles = profilesRes.data || [];
    const allListings = listingsRes.data || [];
    const allTransactions = transactionsRes.data || [];
    const allShipments = shipmentsRes.data || [];
    const allBuyRequests = buyRequestsRes.data || [];
    const allStorageBookings = storageBookingsRes.data || [];
    const allLearning = learningRes.data || [];
    const allNews = newsRes.data || [];
    const allRatings = ratingsRes.data || [];
    const allReports = reportsRes.data || [];

    const farmers = allProfiles.filter(p => p.role === 'farmer');
    const buyers = allProfiles.filter(p => p.role === 'buyer');
    const verifiedFarmers = farmers.filter(p => p.is_verified);
    const newUsers = allProfiles.filter(p => p.created_at >= dateFrom);
    const newFarmers = newUsers.filter(p => p.role === 'farmer');
    const newBuyers = newUsers.filter(p => p.role === 'buyer');

    const usersByMonth: Record<string, { farmers: number; buyers: number }> = {};
    allProfiles.forEach(p => {
      const month = p.created_at.substring(0, 7);
      if (!usersByMonth[month]) usersByMonth[month] = { farmers: 0, buyers: 0 };
      if (p.role === 'farmer') usersByMonth[month].farmers++;
      if (p.role === 'buyer') usersByMonth[month].buyers++;
    });

    const releasedTransactions = allTransactions.filter(t => t.status === 'released');
    const totalVolume = releasedTransactions.reduce((sum, t) => sum + (t.total_buyer_paid || 0), 0);
    const platformRevenue = releasedTransactions.reduce((sum, t) => sum + (t.platform_revenue || 0), 0);
    const farmerEarnings = releasedTransactions.reduce((sum, t) => sum + (t.total_farmer_yield || 0), 0);

    const transactionsByMonth: Record<string, number> = {};
    releasedTransactions.forEach(t => {
      const month = t.created_at.substring(0, 7);
      transactionsByMonth[month] = (transactionsByMonth[month] || 0) + (t.total_buyer_paid || 0);
    });

    const activeListings = allListings.filter(l => l.is_approved);
    const listingsByCategory: Record<string, number> = {};
    allListings.forEach(l => {
      listingsByCategory[l.category] = (listingsByCategory[l.category] || 0) + 1;
    });

    const listingsByLocation: Record<string, number> = {};
    allListings.forEach(l => {
      const loc = l.location || 'Unknown';
      listingsByLocation[loc] = (listingsByLocation[loc] || 0) + 1;
    });

    const supplyByCategory: Record<string, number> = {};
    activeListings.forEach(l => {
      supplyByCategory[l.category] = (supplyByCategory[l.category] || 0) + 1;
    });

    const demandByCategory: Record<string, number> = {};
    allBuyRequests.forEach(r => {
      demandByCategory[r.category] = (demandByCategory[r.category] || 0) + 1;
    });

    const supplyDemand = Object.keys({ ...supplyByCategory, ...demandByCategory }).map(category => {
      const supply = supplyByCategory[category] || 0;
      const demand = demandByCategory[category] || 0;
      let signal: string;
      if (demand > supply * 1.5) signal = 'high_demand';
      else if (supply > demand * 1.5) signal = 'high_supply';
      else signal = 'balanced';
      return { category, supply, demand, signal };
    }).sort((a, b) => b.demand - a.demand);

    const demandByLocation: Record<string, number> = {};
    allBuyRequests.forEach(r => {
      const loc = r.delivery_location || 'Unknown';
      demandByLocation[loc] = (demandByLocation[loc] || 0) + 1;
    });

    const deliveredShipments = allShipments.filter(s => ['delivered', 'delivery_confirmed'].includes(s.status));
    const failedShipments = allShipments.filter(s => ['cancelled', 'failed'].includes(s.status));
    const deliverySuccessRate = (deliveredShipments.length + failedShipments.length) > 0
      ? Math.round((deliveredShipments.length / (deliveredShipments.length + failedShipments.length)) * 100)
      : null;

    const activeStorage = allStorageBookings.filter(s => ['pending', 'confirmed', 'checked_in', 'stored'].includes(s.status));
    const storageRevenue = allStorageBookings.reduce((sum, s) => sum + (s.total_fee || 0), 0);

    const publishedLearning = allLearning.filter(l => l.status === 'published');
    const totalLearningViews = allLearning.reduce((sum, l) => sum + (l.view_count || 0), 0);

    const publishedNews = allNews.filter(n => n.status === 'published');
    const totalNewsViews = allNews.reduce((sum, n) => sum + (n.view_count || 0), 0);

    const avgRating = allRatings.length > 0
      ? Math.round((allRatings.reduce((sum, r) => sum + r.rating, 0) / allRatings.length) * 10) / 10
      : 0;

    const openReports = allReports.filter(r => r.status === 'open');

    return NextResponse.json({
      overview: {
        totalUsers: allProfiles.length,
        farmers: farmers.length,
        buyers: buyers.length,
        verifiedFarmers: verifiedFarmers.length,
        newUsersPeriod: newUsers.length,
        newFarmersPeriod: newFarmers.length,
        newBuyersPeriod: newBuyers.length,
        activeListings: activeListings.length,
        totalListings: allListings.length,
        totalTransactions: releasedTransactions.length,
        totalVolume,
        platformRevenue,
        farmerEarnings,
        avgRating,
        totalRatings: allRatings.length,
        openReports: openReports.length,
      },
      users: {
        byMonth: Object.entries(usersByMonth).sort(([a], [b]) => a.localeCompare(b)).map(([month, data]) => ({ month, ...data })),
      },
      transactions: {
        byMonth: Object.entries(transactionsByMonth).sort(([a], [b]) => a.localeCompare(b)).map(([month, amount]) => ({ month, amount })),
      },
      marketplace: {
        byCategory: Object.entries(listingsByCategory).sort(([, a], [, b]) => b - a).map(([category, count]) => ({ category, count })),
        byLocation: Object.entries(listingsByLocation).sort(([, a], [, b]) => b - a).slice(0, 10).map(([location, count]) => ({ location, count })),
      },
      supplyDemand,
      demand: {
        byLocation: Object.entries(demandByLocation).sort(([, a], [, b]) => b - a).slice(0, 10).map(([location, count]) => ({ location, count })),
      },
      logistics: {
        total: allShipments.length,
        delivered: deliveredShipments.length,
        inTransit: allShipments.filter(s => ['in_transit', 'out_for_delivery'].includes(s.status)).length,
        failed: failedShipments.length,
        successRate: deliverySuccessRate,
      },
      storage: {
        activeBookings: activeStorage.length,
        totalBookings: allStorageBookings.length,
        revenue: storageRevenue,
      },
      learning: {
        totalResources: allLearning.length,
        published: publishedLearning.length,
        totalViews: totalLearningViews,
      },
      news: {
        totalArticles: allNews.length,
        published: publishedNews.length,
        totalViews: totalNewsViews,
      },
      period,
    });
  } catch (error) {
    console.error('Admin analytics error:', error);
    return NextResponse.json({ error: 'Failed to load analytics.' }, { status: 500 });
  }
}
