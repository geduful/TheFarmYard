import type { VerificationTier, ShipmentStatus, StorageBookingStatus, StorageFacilityStatus, LearningResourceStatus, NewsArticleStatus, OpportunityStatus } from '@/lib/types';
import { SHIPMENT_STATUS_CONFIG, STORAGE_BOOKING_STATUS_CONFIG, LEARNING_STATUS_CONFIG, NEWS_STATUS_CONFIG, OPPORTUNITY_STATUS_CONFIG } from '@/lib/types';

interface StatusBadgeProps {
  type: 'approval' | 'verification' | 'tier' | 'escrow' | 'shipment' | 'storage_booking' | 'storage_facility' | 'learning_resource' | 'news_article' | 'opportunity';
  value: boolean | string | VerificationTier | ShipmentStatus | StorageBookingStatus | StorageFacilityStatus | LearningResourceStatus | NewsArticleStatus | OpportunityStatus;
  pending?: boolean;
}

export default function StatusBadge({ type, value, pending }: StatusBadgeProps) {
  // ─── Approval badge ───────────────────────────────────────────────────────
  if (type === 'approval') {
    if (value === false) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-alert-orange">
          <span className="w-1.5 h-1.5 rounded-full bg-alert-orange" />
          Pending Admin Review
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-emerald-green">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-green" />
        Approved
      </span>
    );
  }

  // ─── Verification tier badge ──────────────────────────────────────────────
  if (type === 'tier') {
    const tier = value as VerificationTier;

    if (tier === 'supreme') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-yellow-400 via-amber-400 to-yellow-500 text-yellow-900 shadow-sm shadow-amber-400/40 border border-yellow-300/60">
          {/* Crown icon */}
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M2 19h20v2H2v-2zm2-3l2.5-9L12 11l5.5-4L20 16H4zm8-5.5a1.5 1.5 0 100-3 1.5 1.5 0 000 3zM5.5 9a1.5 1.5 0 100-3 1.5 1.5 0 000 3zm13 0a1.5 1.5 0 100-3 1.5 1.5 0 000 3z" />
          </svg>
          Supreme
        </span>
      );
    }

    if (tier === 'premium') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-violet-500 via-purple-500 to-indigo-500 text-white shadow-sm shadow-purple-400/40 border border-purple-400/30">
          {/* Star icon */}
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2l2.9 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l7.1-1.01L12 2z" />
          </svg>
          Premium
        </span>
      );
    }

    if (tier === 'verified') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
          {/* Checkmark icon */}
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Verified
        </span>
      );
    }

    // tier === 'none'
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500 border border-gray-200">
        <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
        Unverified
      </span>
    );
  }

  // ─── Legacy boolean verification badge (kept for backwards compat) ────────
  if (type === 'verification') {
    if (pending) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700 border border-amber-200">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
          Pending Review
        </span>
      );
    }
    if (value === true) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-green border border-emerald-200">
          ✓ Verified
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
        Unverified
      </span>
    );
  }

  // ─── Escrow status badge ──────────────────────────────────────────────────
  if (type === 'escrow') {
    const config: Record<string, { label: string; classes: string }> = {
      pending_deposit: { label: 'Pending Deposit',  classes: 'bg-yellow-100 text-yellow-800' },
      held_in_escrow:  { label: 'Held in Escrow',   classes: 'bg-blue-100 text-blue-800' },
      dispatched:      { label: 'Dispatched',        classes: 'bg-purple-100 text-purple-800' },
      released:        { label: 'Funds Released',    classes: 'bg-green-100 text-emerald-green' },
      disputed:        { label: 'Disputed',          classes: 'bg-red-100 text-alert-red' },
      refunded:        { label: 'Refunded',          classes: 'bg-gray-100 text-gray-600' },
    };

    const status = typeof value === 'string' ? value : 'pending_deposit';
    const cfg = config[status] ?? config.pending_deposit;

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${cfg.classes}`}>
        {cfg.label}
      </span>
    );
  }

  // ─── Shipment status badge ────────────────────────────────────────────────
  if (type === 'shipment') {
    const status = (typeof value === 'string' ? value : 'pending') as ShipmentStatus;
    const cfg = SHIPMENT_STATUS_CONFIG[status] ?? SHIPMENT_STATUS_CONFIG.pending;

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${cfg.color}`}>
        {cfg.label}
      </span>
    );
  }

  // ─── Storage booking status badge ────────────────────────────────────────
  if (type === 'storage_booking') {
    const status = (typeof value === 'string' ? value : 'pending') as StorageBookingStatus;
    const cfg = STORAGE_BOOKING_STATUS_CONFIG[status] ?? STORAGE_BOOKING_STATUS_CONFIG.pending;

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${cfg.color}`}>
        {cfg.label}
      </span>
    );
  }

  // ─── Storage facility status badge ───────────────────────────────────────
  if (type === 'storage_facility') {
    const config: Record<string, { label: string; classes: string }> = {
      active:      { label: 'Active',      classes: 'bg-emerald-100 text-emerald-700' },
      inactive:    { label: 'Inactive',    classes: 'bg-gray-100 text-gray-600' },
      maintenance: { label: 'Maintenance', classes: 'bg-amber-100 text-amber-700' },
    };
    const status = typeof value === 'string' ? value : 'active';
    const cfg = config[status] ?? config.active;

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${cfg.classes}`}>
        {cfg.label}
      </span>
    );
  }

  // ─── Learning resource status badge ──────────────────────────────────────
  if (type === 'learning_resource') {
    const status = (typeof value === 'string' ? value : 'draft') as LearningResourceStatus;
    const cfg = LEARNING_STATUS_CONFIG[status] ?? LEARNING_STATUS_CONFIG.draft;

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${cfg.color}`}>
        {cfg.label}
      </span>
    );
  }

  // ─── News article status badge ──────────────────────────────────────────
  if (type === 'news_article') {
    const status = (typeof value === 'string' ? value : 'pending') as NewsArticleStatus;
    const cfg = NEWS_STATUS_CONFIG[status] ?? NEWS_STATUS_CONFIG.pending;

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${cfg.color}`}>
        {cfg.label}
      </span>
    );
  }

  // ─── Opportunity status badge ──────────────────────────────────────────
  if (type === 'opportunity') {
    const status = (typeof value === 'string' ? value : 'open') as OpportunityStatus;
    const cfg = OPPORTUNITY_STATUS_CONFIG[status] ?? OPPORTUNITY_STATUS_CONFIG.open;

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${cfg.color}`}>
        {cfg.label}
      </span>
    );
  }

  return null;
}
