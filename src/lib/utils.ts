import type { ShipmentStatus, StorageBookingStatus } from './types';

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

// ─── Storage & Warehousing Utilities ────────────────────────────────────────

export function getStorageBookingStatusIndex(status: StorageBookingStatus): number {
  const flow: StorageBookingStatus[] = [
    'pending', 'confirmed', 'checked_in', 'stored', 'checked_out',
  ];
  return flow.indexOf(status);
}

export function getStorageBookingProgress(status: StorageBookingStatus): number {
  const idx = getStorageBookingStatusIndex(status);
  if (idx < 0) return 0;
  return Math.round((idx / 4) * 100);
}

export function isStorageBookingTerminal(status: StorageBookingStatus): boolean {
  return ['checked_out', 'cancelled', 'expired'].includes(status);
}

export function canUpdateStorageBookingStatus(current: StorageBookingStatus, next: StorageBookingStatus): boolean {
  const transitions: Record<StorageBookingStatus, StorageBookingStatus[]> = {
    pending:      ['confirmed', 'cancelled'],
    confirmed:    ['checked_in', 'cancelled'],
    checked_in:   ['stored', 'checked_out'],
    stored:       ['checked_out'],
    checked_out:  [],
    expired:      [],
    cancelled:    [],
  };
  return transitions[current]?.includes(next) ?? false;
}

export function calculateStorageFee(
  pricePerUnit: number,
  quantity: number,
  startDate: string,
  endDate: string,
): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffMs = end.getTime() - start.getTime();
  const days = Math.max(Math.ceil(diffMs / (1000 * 60 * 60 * 24)), 1);
  return Math.round(pricePerUnit * quantity * days * 100) / 100;
}

export function getStorageDaysRemaining(storageEnd: string): string {
  const end = new Date(storageEnd);
  const now = new Date();
  const diffMs = end.getTime() - now.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);

  if (diffDays < 0) return 'Expired';
  if (diffDays < 1) return 'Expires today';
  if (diffDays < 2) return 'Expires tomorrow';
  if (diffDays < 7) return `${Math.ceil(diffDays)} days left`;
  return `${Math.ceil(diffDays)} days left`;
}

export function formatStorageTimestamp(ts: string | null): string {
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

// ─── Learning Hub Utilities ─────────────────────────────────────────────────

/** Generate a URL-safe slug from text */
export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
}

/** Strip HTML tags for plain-text preview */
export function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
}

/** Format reading time display */
export function formatReadingTime(minutes: number): string {
  if (minutes < 1) return '< 1 min read';
  if (minutes === 1) return '1 min read';
  return `${minutes} min read`;
}

/** Calculate reading time from HTML content (avg 200 words/min) */
export function calculateReadingTime(html: string): number {
  const text = stripHtml(html);
  const words = text.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 200));
}

/** Get progress bar color based on percentage */
export function getProgressColor(pct: number): string {
  if (pct >= 100) return 'bg-emerald-500';
  if (pct >= 50) return 'bg-blue-500';
  if (pct >= 25) return 'bg-amber-500';
  return 'bg-gray-400';
}

/** Simple HTML sanitization — strips dangerous tags/attributes */
export function sanitizeHtml(html: string): string {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
    .replace(/<embed\b[^>]*\/?>/gi, '')
    .replace(/on\w+="[^"]*"/gi, '')
    .replace(/on\w+='[^']*'/gi, '')
    .replace(/javascript:/gi, '');
}

// ─── News & Market Intelligence Utilities ────────────────────────────────────

/** Format news timestamp with relative and absolute options */
export function formatNewsTimestamp(ts: string | null): string {
  if (!ts) return '—';
  const d = new Date(ts);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = diffMs / (1000 * 60);
  const diffHrs = diffMs / (1000 * 60 * 60);

  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${Math.floor(diffMin)}m ago`;
  if (diffHrs < 24) return `${Math.floor(diffHrs)}h ago`;
  if (diffHrs < 168) return `${Math.floor(diffHrs / 24)}d ago`;
  return d.toLocaleDateString('en-GH', { month: 'short', day: 'numeric', year: 'numeric' });
}

/** Format a date for display */
export function formatNewsDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-GH', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
}

/** Format market price with currency */
export function formatMarketPrice(price: number, currency = 'GHS'): string {
  if (currency === 'GHS') return `GH₵ ${price.toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  return `${currency} ${price.toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** Format price change with sign and color class */
export function formatPriceChange(change: number | null, pct: number | null): { text: string; color: string } {
  if (change === null || pct === null) return { text: '—', color: 'text-gray-400' };
  const sign = change >= 0 ? '+' : '';
  return {
    text: `${sign}${change.toFixed(2)} (${sign}${pct.toFixed(1)}%)`,
    color: change > 0 ? 'text-red-600' : change < 0 ? 'text-emerald-600' : 'text-gray-600',
  };
}

/** Check if market data is stale (older than threshold) */
export function isMarketDataStale(dataDate: string, staleDays = 3): boolean {
  const data = new Date(dataDate);
  const now = new Date();
  const diffMs = now.getTime() - data.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  return diffDays > staleDays;
}

/** Calculate 7/30/90 day trends from price history */
export function calculateTrend(prices: { avg_price: number; period_end: string }[]): { direction: 'up' | 'down' | 'stable'; change: number; pct: number } | null {
  if (prices.length < 2) return null;
  const sorted = [...prices].sort((a, b) => new Date(a.period_end).getTime() - new Date(b.period_end).getTime());
  const latest = sorted[sorted.length - 1].avg_price;
  const earliest = sorted[0].avg_price;
  if (earliest === 0) return null;
  const change = latest - earliest;
  const pct = (change / earliest) * 100;
  const direction = Math.abs(pct) < 2 ? 'stable' : pct > 0 ? 'up' : 'down';
  return { direction, change, pct };
}

/** Generate news summary excerpt from content */
export function excerptFromContent(content: string | null, maxLength = 160): string {
  if (!content) return '';
  const text = stripHtml(content);
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength).replace(/\s+\S*$/, '') + '...';
}

/** Detect deduplication via title similarity */
export function titlesAreSimilar(a: string, b: string, threshold = 0.8): boolean {
  const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  const wordsA = new Set(normalize(a).split(' '));
  const wordsB = new Set(normalize(b).split(' '));
  const intersection = [...wordsA].filter((w) => wordsB.has(w)).length;
  const union = new Set([...wordsA, ...wordsB]).size;
  return union > 0 ? intersection / union >= threshold : false;
}
