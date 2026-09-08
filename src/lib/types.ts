export type Role = 'farmer' | 'buyer' | 'admin';

export type Category = 'Crops & Grains' | 'Livestock' | 'Poultry' | 'Aquaculture' | 'Other';

export type SortOption = 'newest' | 'price_asc' | 'price_desc' | 'highest_rated' | 'most_trusted' | 'recommended';

export type PriceUnit = 'kg' | 'tonne' | 'bag' | 'crate' | 'box' | 'litre' | 'unit' | 'dozen' | 'bunch' | 'sack';

export type EscrowStatus = 'pending_deposit' | 'held_in_escrow' | 'dispatched' | 'released' | 'disputed' | 'refunded';

/**
 * Verification Tiers
 * - none:     Unverified user
 * - verified: Standard verification — ID documents reviewed & approved by admin
 * - premium:  Earned tier — must be verified first, then meet activity standards
 * - supreme:  Admin-only, automatically assigned. Cannot be requested or purchased.
 */
export type VerificationTier = 'none' | 'verified' | 'premium' | 'supreme';

export interface Profile {
  id: string;
  full_name: string;
  phone_number: string;
  email?: string;
  role: Role;
  is_verified: boolean;
  is_blocked: boolean;
  blocked_warning: string | null;
  verification_tier: VerificationTier;
  farm_location: string;
  payout_account_bank?: string | null;
  payout_account_number?: string | null;
  payout_account_name?: string | null;
  created_at: string;
}

/**
 * Premium verification eligibility requirements.
 * All must be met before a user can submit a premium request.
 */
export const PREMIUM_REQUIREMENTS = {
  minTransactions: 3,
  minListings: 2,       // applies to farmers
  minOrders: 5,         // applies to buyers
  minAccountAgeDays: 30,
} as const;

export interface PremiumVerificationRequest {
  id: number;
  profile_id: string;
  listing_count: number;
  transaction_count: number;
  account_age_days: number;
  message: string | null;
  status: 'pending' | 'approved' | 'rejected';
  rejection_reason: string | null;
  created_at: string;
  reviewed_at: string | null;
  reviewer_id: string | null;
  profile?: Pick<Profile, 'full_name' | 'phone_number' | 'farm_location' | 'role' | 'verification_tier'>;
}

export interface Listing {
  id: number;
  farmer_id: string;
  title: string;
  category: Category;
  quantity_available: string;
  price_per_unit: number;
  price_unit: PriceUnit;
  image_url: string;
  description: string | null;
  location: string;
  quality_grade: string | null;
  availability: string;
  minimum_order: string | null;
  harvest_date: string | null;
  is_approved: boolean;
  is_promoted: boolean;
  promoted_at: string | null;
  created_at: string;
  farmer?: Pick<Profile, 'full_name' | 'farm_location' | 'is_verified' | 'verification_tier'>;
  average_rating?: number;
  total_ratings?: number;
  trust_score?: number;
}

export interface VerificationRequest {
  id: number;
  profile_id: string;
  document_urls: string[];
  status: 'pending' | 'approved' | 'rejected';
  notes: string | null;
  created_at: string;
  reviewed_at: string | null;
  reviewer_id: string | null;
  profile?: Pick<Profile, 'full_name' | 'phone_number' | 'farm_location' | 'role'>;
}

export interface ReRegistrationRequest {
  id: number;
  email: string;
  full_name: string;
  phone_number: string;
  role: 'farmer' | 'buyer';
  farm_location: string;
  status: 'pending' | 'approved' | 'rejected';
  admin_notes: string | null;
  created_at: string;
  reviewed_at: string | null;
  reviewer_id: string | null;
}

export interface BuyRequest {
  id: number;
  buyer_id: string;
  commodity_title: string;
  category: Category;
  quantity_required: string;
  price_unit: PriceUnit;
  max_price_per_unit: number | null;
  delivery_location: string;
  deadline: string;
  additional_notes: string | null;
  status: 'open' | 'matched' | 'fulfilled' | 'expired' | 'cancelled';
  created_at: string;
  buyer?: Pick<Profile, 'full_name' | 'phone_number' | 'farm_location' | 'is_verified' | 'verification_tier'>;
  match_count?: number;
}

export interface EscrowTransaction {
  id: number;
  listing_id: number | null;
  buyer_id: string;
  farmer_id: string;
  base_amount: number;
  buyer_fee: number;
  farmer_fee: number;
  total_buyer_paid: number;
  total_farmer_yield: number;
  platform_revenue: number;
  currency: string;
  flw_tx_ref: string | null;
  flw_transaction_id: number | null;
  paid_at: string | null;
  payout_reference: string | null;
  auto_release_at: string | null;
  status: EscrowStatus;
  delivery_token: string;
  vehicle_license_plate: string | null;
  driver_phone_number: string | null;
  waybill_receipt_url: string | null;
  dispatched_at: string | null;
  created_at: string;
  listing?: Listing;
  farmer?: Pick<Profile, 'full_name' | 'phone_number'>;
}


export type ReportCategory = 'fraud' | 'account_issue' | 'listing_issue' | 'delivery_issue' | 'other';
export type ReportStatus = 'open' | 'under_review' | 'resolved' | 'dismissed';

export interface Report {
  id: number;
  reporter_id: string;
  transaction_id: number | null;
  reported_user_id: string | null;
  category: ReportCategory;
  subject: string;
  description: string;
  status: ReportStatus;
  admin_notes: string | null;
  created_at: string;
  reviewed_at: string | null;
  reviewer_id: string | null;
  reporter?: Pick<Profile, 'full_name' | 'phone_number' | 'role'>;
  reported_user?: Pick<Profile, 'full_name' | 'role'>;
}

export interface FarmerRating {
  id: number;
  farmer_id: string;
  buyer_id: string;
  transaction_id: number;
  rating: number; // 1–5
  comment: string | null;
  created_at: string;
  buyer?: Pick<Profile, 'full_name'>;
}

export interface TrustScore {
  score: number; // 0-100
  breakdown: {
    verificationTier: number;
    averageRating: number;
    completedTransactions: number;
    accountAge: number;
    listingQuality: number;
  };
}

export interface BuyerRequestMatch {
  listing: Listing;
  score: number;
  reasons: string[];
}

export interface FarmerProfileStats {
  total_listings: number;
  approved_listings: number;
  total_transactions: number;
  completed_transactions: number;
  average_rating: number;
  total_ratings: number;
  trust_score: number;
  verification_tier: VerificationTier;
  account_age_days: number;
}

// ─── Logistics Network ──────────────────────────────────────────────────────

export type ShipmentStatus =
  | 'pending'
  | 'pickup_scheduled'
  | 'assigned'
  | 'in_transit'
  | 'out_for_delivery'
  | 'delivered'
  | 'delivery_confirmed'
  | 'cancelled'
  | 'failed'
  | 'delivery_issue';

export interface Shipment {
  id: number;
  escrow_id: number | null;
  order_id: string | null;
  farmer_id: string;
  buyer_id: string;
  logistics_provider_name: string | null;
  driver_name: string | null;
  driver_phone: string | null;
  vehicle_license_plate: string | null;
  pickup_location: string;
  destination: string;
  delivery_notes: string | null;
  status: ShipmentStatus;
  tracking_number: string | null;
  waybill_receipt_url: string | null;
  estimated_pickup_at: string | null;
  estimated_delivery_at: string | null;
  actual_pickup_at: string | null;
  actual_delivery_at: string | null;
  delivery_fee: number;
  currency: string;
  created_at: string;
  updated_at: string;
  escrow?: EscrowTransaction;
  farmer?: Pick<Profile, 'full_name' | 'phone_number' | 'farm_location'>;
  buyer?: Pick<Profile, 'full_name' | 'phone_number' | 'farm_location'>;
}

export interface ShipmentStatusHistory {
  id: number;
  shipment_id: number;
  from_status: ShipmentStatus | null;
  to_status: ShipmentStatus;
  note: string | null;
  changed_by: string | null;
  created_at: string;
  changed_by_profile?: Pick<Profile, 'full_name' | 'role'>;
}

export const SHIPMENT_STATUS_CONFIG: Record<ShipmentStatus, { label: string; color: string; icon: string }> = {
  pending:            { label: 'Pending',              color: 'bg-gray-100 text-gray-600',      icon: 'clock' },
  pickup_scheduled:   { label: 'Pickup Scheduled',     color: 'bg-blue-100 text-blue-700',      icon: 'calendar' },
  assigned:           { label: 'Driver Assigned',      color: 'bg-indigo-100 text-indigo-700',  icon: 'user' },
  in_transit:         { label: 'In Transit',           color: 'bg-purple-100 text-purple-700',  icon: 'truck' },
  out_for_delivery:   { label: 'Out for Delivery',     color: 'bg-amber-100 text-amber-700',    icon: 'map' },
  delivered:          { label: 'Delivered',             color: 'bg-emerald-100 text-emerald-700', icon: 'check-circle' },
  delivery_confirmed: { label: 'Delivery Confirmed',   color: 'bg-green-100 text-green-700',    icon: 'check-double' },
  cancelled:          { label: 'Cancelled',             color: 'bg-red-100 text-red-600',        icon: 'x-circle' },
  failed:             { label: 'Failed',                color: 'bg-red-100 text-red-600',        icon: 'alert-triangle' },
  delivery_issue:     { label: 'Delivery Issue',        color: 'bg-orange-100 text-orange-700',  icon: 'exclamation' },
};

export const SHIPMENT_STATUS_FLOW: ShipmentStatus[] = [
  'pending',
  'pickup_scheduled',
  'assigned',
  'in_transit',
  'out_for_delivery',
  'delivered',
  'delivery_confirmed',
];
