export type Role = 'farmer' | 'buyer' | 'admin';

export type Category = 'Crops & Grains' | 'Livestock' | 'Poultry' | 'Aquaculture' | 'Other';

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
  verification_tier: VerificationTier;
  farm_location: string;
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
  image_url: string;
  description: string | null;
  is_approved: boolean;
  is_promoted: boolean;
  promoted_at: string | null;
  created_at: string;
  farmer?: Pick<Profile, 'full_name' | 'farm_location' | 'is_verified'>;
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

export interface BuyRequest {
  id: number;
  buyer_id: string;
  commodity_title: string;
  category: Category;
  quantity_required: string;
  delivery_location: string;
  deadline: string;
  additional_notes: string | null;
  created_at: string;
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
