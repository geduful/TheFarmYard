import type { ShipmentStatus } from './types';

export function generateDeliveryToken(): string {
  // CSPRNG — Math.random is predictable and must not secure escrow tokens
  if (typeof crypto !== 'undefined' && 'getRandomValues' in crypto) {
    const buf = new Uint32Array(1);
    crypto.getRandomValues(buf);
    return String(100000 + (buf[0] % 900000));
  }
  return String(Math.floor(100000 + Math.random() * 900000));
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-GH', {
    style: 'currency',
    currency: 'GHS',
  }).format(amount);
}

export function calculateEscrowFees(baseAmount: number) {
  const buyerFee = Math.round(baseAmount * 0.01 * 100) / 100;
  const farmerFee = Math.round(baseAmount * 0.01 * 100) / 100;
  const totalBuyerPaid = baseAmount + buyerFee;
  const totalFarmerYield = baseAmount - farmerFee;
  const platformRevenue = buyerFee + farmerFee;

  return { buyerFee, farmerFee, totalBuyerPaid, totalFarmerYield, platformRevenue };
}

export type TrustScoreData = {
  score: number;
  breakdown: {
    verificationTier: number;
    averageRating: number;
    completedTransactions: number;
    accountAge: number;
    listingQuality: number;
  };
};

export function calculateTrustScore(data: {
  verification_tier: string;
  average_rating: number;
  rating_count: number;
  completed_transactions: number;
  total_listings: number;
  account_age_days: number;
}): TrustScoreData {
  const tierScore = data.verification_tier === 'supreme' ? 30
    : data.verification_tier === 'premium' ? 25
    : data.verification_tier === 'verified' ? 18
    : 5;

  const ratingScore = data.rating_count > 0
    ? (data.average_rating / 5) * 20 + Math.min(data.rating_count, 10) * 0.5
    : 0;

  const txScore = Math.min(data.completed_transactions * 2, 20);
  const listingScore = Math.min(data.total_listings * 3, 15);
  const ageScore = Math.min(data.account_age_days / 30, 10);

  const total = Math.min(Math.max(
    tierScore + ratingScore + txScore + listingScore + ageScore,
    0
  ), 100);

  return {
    score: Math.round(total * 10) / 10,
    breakdown: {
      verificationTier: tierScore,
      averageRating: Math.round(ratingScore * 10) / 10,
      completedTransactions: txScore,
      accountAge: Math.round(ageScore * 10) / 10,
      listingQuality: listingScore,
    },
  };
}

export function getTrustLevel(score: number): { label: string; color: string; description: string } {
  if (score >= 80) return { label: 'Highly Trusted', color: 'text-emerald-600 bg-emerald-50 border-emerald-200', description: 'Exceptional track record' };
  if (score >= 60) return { label: 'Trusted', color: 'text-blue-600 bg-blue-50 border-blue-200', description: 'Reliable and verified' };
  if (score >= 40) return { label: 'Building Trust', color: 'text-amber-600 bg-amber-50 border-amber-200', description: 'Getting started' };
  return { label: 'New', color: 'text-gray-500 bg-gray-50 border-gray-200', description: 'Just joined' };
}

export function formatPriceUnit(unit: string): string {
  const units: Record<string, string> = {
    kg: '/kg',
    tonne: '/tonne',
    bag: '/bag',
    crate: '/crate',
    box: '/box',
    litre: '/litre',
    unit: '/unit',
    dozen: '/dozen',
    bunch: '/bunch',
    sack: '/sack',
  };
  return units[unit] || '/unit';
}

export function sortByOption<T extends { created_at: string; price_per_unit?: number; is_promoted?: boolean }>(
  items: T[],
  sort: string,
  getRating?: (item: T) => number | undefined,
  getTrust?: (item: T) => number | undefined,
): T[] {
  const sorted = [...items];
  switch (sort) {
    case 'price_asc':
      return sorted.sort((a, b) => (a.price_per_unit || 0) - (b.price_per_unit || 0));
    case 'price_desc':
      return sorted.sort((a, b) => (b.price_per_unit || 0) - (a.price_per_unit || 0));
    case 'highest_rated':
      return sorted.sort((a, b) => (getRating?.(b) || 0) - (getRating?.(a) || 0));
    case 'most_trusted':
      return sorted.sort((a, b) => (getTrust?.(b) || 0) - (getTrust?.(a) || 0));
    case 'recommended':
      return sorted.sort((a, b) => {
        const aScore = (getTrust?.(a) || 0) * 0.4 + (getRating?.(a) || 0) * 20 * 0.3 + (a.is_promoted ? 30 : 0) * 0.3;
        const bScore = (getTrust?.(b) || 0) * 0.4 + (getRating?.(b) || 0) * 20 * 0.3 + (b.is_promoted ? 30 : 0) * 0.3;
        return bScore - aScore;
      });
    case 'newest':
    default:
      return sorted.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }
}

// ─── Logistics Utilities ─────────────────────────────────────────────────────

export function getShipmentStatusIndex(status: ShipmentStatus): number {
  const flow: ShipmentStatus[] = [
    'pending', 'pickup_scheduled', 'assigned', 'in_transit',
    'out_for_delivery', 'delivered', 'delivery_confirmed',
  ];
  return flow.indexOf(status);
}

export function getShipmentProgress(status: ShipmentStatus): number {
  const idx = getShipmentStatusIndex(status);
  if (idx < 0) return 0;
  return Math.round((idx / 6) * 100);
}

export function isShipmentTerminal(status: ShipmentStatus): boolean {
  return ['delivery_confirmed', 'cancelled', 'failed'].includes(status);
}

export function canUpdateShipmentStatus(current: ShipmentStatus, next: ShipmentStatus): boolean {
  const transitions: Record<ShipmentStatus, ShipmentStatus[]> = {
    pending:            ['pickup_scheduled', 'cancelled', 'failed'],
    pickup_scheduled:   ['assigned', 'cancelled', 'failed'],
    assigned:           ['in_transit', 'cancelled', 'failed'],
    in_transit:         ['out_for_delivery', 'delivered', 'cancelled', 'failed', 'delivery_issue'],
    out_for_delivery:   ['delivered', 'cancelled', 'failed', 'delivery_issue'],
    delivered:          ['delivery_confirmed', 'delivery_issue'],
    delivery_confirmed: [],
    cancelled:          [],
    failed:             [],
    delivery_issue:     ['in_transit', 'out_for_delivery', 'delivered', 'cancelled'],
  };
  return transitions[current]?.includes(next) ?? false;
}

export function formatShipmentTimestamp(ts: string | null): string {
  if (!ts) return '—';
  const d = new Date(ts);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffHrs = diffMs / (1000 * 60 * 60);

  if (diffHrs < 1) return 'Just now';
  if (diffHrs < 24) return `${Math.floor(diffHrs)}h ago`;
  if (diffHrs < 168) return `${Math.floor(diffHrs / 24)}d ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function getEstimatedArrival(estimatedDelivery: string | null): string {
  if (!estimatedDelivery) return 'Not scheduled';
  const d = new Date(estimatedDelivery);
  const now = new Date();
  const diffMs = d.getTime() - now.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);

  if (diffDays < 0) return 'Overdue';
  if (diffDays < 1) return 'Today';
  if (diffDays < 2) return 'Tomorrow';
  if (diffDays < 7) return `In ${Math.ceil(diffDays)} days`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
