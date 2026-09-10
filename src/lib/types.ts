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
  created_at: string;
}

export interface PayoutDetails {
  bank_name: string | null;
  account_number: string | null;
  account_name: string | null;
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

// ─── Storage & Warehousing ──────────────────────────────────────────────────

export type StorageFacilityType = 'cold_storage' | 'dry_storage' | 'refrigerated' | 'open_air' | 'silo';

export type StorageFacilityStatus = 'active' | 'inactive' | 'maintenance';

export type StorageBookingStatus =
  | 'pending'
  | 'confirmed'
  | 'checked_in'
  | 'stored'
  | 'checked_out'
  | 'expired'
  | 'cancelled';

export type StorageItemCondition = 'excellent' | 'good' | 'fair' | 'poor' | 'damaged';

export interface StorageFacility {
  id: number;
  name: string;
  facility_type: StorageFacilityType;
  location: string;
  address: string | null;
  description: string | null;
  capacity_unit: string;
  total_capacity: number;
  available_capacity: number;
  price_per_unit: number;
  currency: string;
  contact_name: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  has_climate_control: boolean;
  has_security: boolean;
  has_loading_dock: boolean;
  image_url: string | null;
  is_approved: boolean;
  status: StorageFacilityStatus;
  created_at: string;
  updated_at: string;
  active_bookings_count?: number;
}

export interface StorageBooking {
  id: number;
  facility_id: number;
  farmer_id: string;
  produce_name: string;
  category: string | null;
  quantity: number;
  quantity_unit: string;
  storage_start: string;
  storage_end: string;
  total_fee: number;
  currency: string;
  status: StorageBookingStatus;
  special_notes: string | null;
  rejection_reason: string | null;
  checked_in_at: string | null;
  checked_out_at: string | null;
  created_at: string;
  updated_at: string;
  facility?: Pick<StorageFacility, 'name' | 'facility_type' | 'location' | 'capacity_unit' | 'price_per_unit'>;
  farmer?: Pick<Profile, 'full_name' | 'phone_number' | 'farm_location'>;
}

export interface StorageInventory {
  id: number;
  booking_id: number;
  facility_id: number;
  farmer_id: string;
  produce_name: string;
  quantity: number;
  quantity_unit: string;
  condition: StorageItemCondition;
  storage_location: string | null;
  notes: string | null;
  checked_in_at: string;
  checked_out_at: string | null;
  created_at: string;
  booking?: Pick<StorageBooking, 'produce_name' | 'quantity' | 'quantity_unit' | 'storage_start' | 'storage_end'>;
  facility?: Pick<StorageFacility, 'name' | 'location'>;
  farmer?: Pick<Profile, 'full_name'>;
}

export const STORAGE_FACILITY_TYPE_CONFIG: Record<StorageFacilityType, { label: string; color: string; icon: string }> = {
  cold_storage:   { label: 'Cold Storage',    color: 'bg-blue-100 text-blue-700',    icon: 'snowflake' },
  dry_storage:    { label: 'Dry Storage',     color: 'bg-amber-100 text-amber-700',  icon: 'warehouse' },
  refrigerated:   { label: 'Refrigerated',    color: 'bg-cyan-100 text-cyan-700',    icon: 'thermometer' },
  open_air:       { label: 'Open Air',        color: 'bg-green-100 text-green-700',  icon: 'sun' },
  silo:           { label: 'Silo',            color: 'bg-purple-100 text-purple-700', icon: 'cylinder' },
};

export const STORAGE_BOOKING_STATUS_CONFIG: Record<StorageBookingStatus, { label: string; color: string }> = {
  pending:      { label: 'Pending',       color: 'bg-gray-100 text-gray-600' },
  confirmed:    { label: 'Confirmed',     color: 'bg-blue-100 text-blue-700' },
  checked_in:   { label: 'Checked In',    color: 'bg-indigo-100 text-indigo-700' },
  stored:       { label: 'Stored',        color: 'bg-emerald-100 text-emerald-700' },
  checked_out:  { label: 'Checked Out',   color: 'bg-green-100 text-green-700' },
  expired:      { label: 'Expired',       color: 'bg-orange-100 text-orange-700' },
  cancelled:    { label: 'Cancelled',     color: 'bg-red-100 text-red-600' },
};

export const STORAGE_BOOKING_STATUS_FLOW: StorageBookingStatus[] = [
  'pending',
  'confirmed',
  'checked_in',
  'stored',
  'checked_out',
];

// ─── Learning Hub ───────────────────────────────────────────────────────────

export type LearningContentType = 'article' | 'guide' | 'tutorial' | 'video' | 'checklist' | 'faq';

export type LearningDifficulty = 'beginner' | 'intermediate' | 'advanced';

export type LearningResourceStatus = 'draft' | 'published' | 'archived';

export type LearningProgressStatus = 'not_started' | 'in_progress' | 'completed';

export interface LearningCategory {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  resource_count?: number;
}

export interface LearningResource {
  id: number;
  title: string;
  slug: string;
  summary: string | null;
  content: string;
  category_id: number | null;
  content_type: LearningContentType;
  difficulty: LearningDifficulty;
  reading_time_min: number;
  author_name: string | null;
  author_id: string | null;
  featured_image: string | null;
  tags: string[];
  status: LearningResourceStatus;
  is_featured: boolean;
  view_count: number;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  category?: Pick<LearningCategory, 'name' | 'slug'>;
}

export interface LearningBookmark {
  id: number;
  user_id: string;
  resource_id: number;
  created_at: string;
  resource?: LearningResource;
}

export interface LearningProgress {
  id: number;
  user_id: string;
  resource_id: number;
  status: LearningProgressStatus;
  progress_pct: number;
  last_read_at: string | null;
  created_at: string;
  updated_at: string;
  resource?: Pick<LearningResource, 'title' | 'slug' | 'featured_image' | 'category_id' | 'reading_time_min'>;
}

export const LEARNING_CONTENT_TYPE_CONFIG: Record<LearningContentType, { label: string; color: string; icon: string }> = {
  article:   { label: 'Article',   color: 'bg-blue-100 text-blue-700',    icon: 'document' },
  guide:     { label: 'Guide',     color: 'bg-emerald-100 text-emerald-700', icon: 'book' },
  tutorial:  { label: 'Tutorial',  color: 'bg-purple-100 text-purple-700', icon: 'academic' },
  video:     { label: 'Video',     color: 'bg-red-100 text-red-700',      icon: 'play' },
  checklist: { label: 'Checklist', color: 'bg-amber-100 text-amber-700',  icon: 'checklist' },
  faq:       { label: 'FAQ',       color: 'bg-gray-100 text-gray-700',    icon: 'question' },
};

export const LEARNING_DIFFICULTY_CONFIG: Record<LearningDifficulty, { label: string; color: string }> = {
  beginner:     { label: 'Beginner',     color: 'bg-green-100 text-green-700' },
  intermediate: { label: 'Intermediate', color: 'bg-amber-100 text-amber-700' },
  advanced:     { label: 'Advanced',     color: 'bg-red-100 text-red-700' },
};

export const LEARNING_STATUS_CONFIG: Record<LearningResourceStatus, { label: string; color: string }> = {
  draft:     { label: 'Draft',     color: 'bg-gray-100 text-gray-600' },
  published: { label: 'Published', color: 'bg-emerald-100 text-emerald-700' },
  archived:  { label: 'Archived',  color: 'bg-orange-100 text-orange-700' },
};

export const LEARNING_PROGRESS_CONFIG: Record<LearningProgressStatus, { label: string; color: string }> = {
  not_started: { label: 'Not Started', color: 'bg-gray-100 text-gray-600' },
  in_progress: { label: 'In Progress', color: 'bg-blue-100 text-blue-700' },
  completed:   { label: 'Completed',   color: 'bg-emerald-100 text-emerald-700' },
};

// ─── News & Market Intelligence Types ──────────────────────────────

export type NewsSourceType = 'government' | 'research' | 'international' | 'publication' | 'market_service' | 'weather' | 'news_org' | 'ngo' | 'other';
export type NewsSourceStatus = 'active' | 'inactive' | 'pending';
export type NewsArticleStatus = 'pending' | 'approved' | 'published' | 'rejected' | 'archived';
export type OpportunityStatus = 'open' | 'closed' | 'expired' | 'upcoming';
export type PriceTrend = 'up' | 'down' | 'stable' | 'unknown';
export type OpportunityType = 'government_program' | 'grant' | 'training' | 'procurement' | 'competition' | 'investment' | 'export' | 'buyer' | 'event' | 'other';

export interface NewsSource {
  id: number;
  name: string;
  website_url: string | null;
  feed_url: string | null;
  api_url: string | null;
  source_type: NewsSourceType;
  country: string;
  region: string | null;
  trust_level: 'verified' | 'unverified' | 'internal';
  status: NewsSourceStatus;
  description: string | null;
  last_fetched_at: string | null;
  fetch_error: string | null;
  created_at: string;
  updated_at: string;
}

export interface NewsCategory {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  display_order: number;
  is_active: boolean;
  created_at: string;
}

export interface NewsArticle {
  id: number;
  title: string;
  slug: string;
  summary: string | null;
  content: string | null;
  source_id: number | null;
  source_name: string | null;
  source_url: string | null;
  image_url: string | null;
  category_id: number | null;
  tags: string[];
  region: string | null;
  country: string;
  author_name: string | null;
  status: NewsArticleStatus;
  is_featured: boolean;
  ai_summary: string | null;
  ai_generated: boolean;
  view_count: number;
  published_at: string | null;
  fetched_at: string | null;
  created_at: string;
  updated_at: string;
  category?: Pick<NewsCategory, 'name' | 'slug'>;
  source?: Pick<NewsSource, 'name' | 'website_url' | 'trust_level'>;
}

export interface Commodity {
  id: number;
  name: string;
  slug: string;
  category: string;
  unit: string;
  image_url: string | null;
  is_active: boolean;
  display_order: number;
  created_at: string;
}

export interface MarketPrice {
  id: number;
  commodity_id: number;
  market_name: string;
  region: string | null;
  price: number;
  currency: string;
  unit: string;
  previous_price: number | null;
  price_change: number | null;
  price_change_pct: number | null;
  trend: PriceTrend;
  source_id: number | null;
  data_date: string;
  fetched_at: string;
  created_at: string;
  commodity?: Pick<Commodity, 'name' | 'slug' | 'unit' | 'category'>;
  source?: Pick<NewsSource, 'name' | 'trust_level'>;
}

export interface MarketPriceHistory {
  id: number;
  commodity_id: number;
  market_name: string;
  avg_price: number;
  min_price: number | null;
  max_price: number | null;
  currency: string;
  unit: string;
  sample_count: number;
  period_start: string;
  period_end: string;
  created_at: string;
}

export interface MarketAlert {
  id: number;
  user_id: string;
  commodity_id: number;
  market_name: string | null;
  alert_type: 'above' | 'below';
  threshold_price: number;
  is_active: boolean;
  last_triggered_at: string | null;
  created_at: string;
  commodity?: Pick<Commodity, 'name' | 'slug' | 'unit'>;
}

export interface Opportunity {
  id: number;
  title: string;
  slug: string;
  description: string;
  organization: string | null;
  opportunity_type: OpportunityType;
  location: string | null;
  eligibility: string | null;
  deadline: string | null;
  source_url: string | null;
  source_id: number | null;
  image_url: string | null;
  status: OpportunityStatus;
  is_featured: boolean;
  tags: string[];
  published_at: string | null;
  created_at: string;
  updated_at: string;
  source?: Pick<NewsSource, 'name' | 'website_url'>;
}

export interface NewsBookmark {
  id: number;
  user_id: string;
  article_id: number;
  created_at: string;
  article?: NewsArticle;
}

// ─── News & Market Config Objects ──────────────────────────────────

export const NEWS_SOURCE_TYPE_CONFIG: Record<NewsSourceType, { label: string; color: string }> = {
  government:    { label: 'Government',    color: 'bg-blue-100 text-blue-700' },
  research:      { label: 'Research',      color: 'bg-purple-100 text-purple-700' },
  international: { label: 'International', color: 'bg-indigo-100 text-indigo-700' },
  publication:   { label: 'Publication',   color: 'bg-amber-100 text-amber-700' },
  market_service:{ label: 'Market Data',   color: 'bg-emerald-100 text-emerald-700' },
  weather:       { label: 'Weather',       color: 'bg-cyan-100 text-cyan-700' },
  news_org:      { label: 'News Org',      color: 'bg-rose-100 text-rose-700' },
  ngo:           { label: 'NGO',           color: 'bg-teal-100 text-teal-700' },
  other:         { label: 'Other',         color: 'bg-gray-100 text-gray-700' },
};

export const NEWS_STATUS_CONFIG: Record<NewsArticleStatus, { label: string; color: string }> = {
  pending:   { label: 'Pending',   color: 'bg-amber-100 text-amber-700' },
  approved:  { label: 'Approved',  color: 'bg-blue-100 text-blue-700' },
  published: { label: 'Published', color: 'bg-emerald-100 text-emerald-700' },
  rejected:  { label: 'Rejected',  color: 'bg-red-100 text-red-700' },
  archived:  { label: 'Archived',  color: 'bg-gray-100 text-gray-600' },
};

export const OPPORTUNITY_STATUS_CONFIG: Record<OpportunityStatus, { label: string; color: string }> = {
  open:     { label: 'Open',     color: 'bg-emerald-100 text-emerald-700' },
  closed:   { label: 'Closed',   color: 'bg-gray-100 text-gray-600' },
  expired:  { label: 'Expired',  color: 'bg-red-100 text-red-700' },
  upcoming: { label: 'Upcoming', color: 'bg-blue-100 text-blue-700' },
};

export const OPPORTUNITY_TYPE_CONFIG: Record<OpportunityType, { label: string; color: string }> = {
  government_program: { label: 'Government Program', color: 'bg-blue-100 text-blue-700' },
  grant:              { label: 'Grant',              color: 'bg-emerald-100 text-emerald-700' },
  training:           { label: 'Training',           color: 'bg-purple-100 text-purple-700' },
  procurement:        { label: 'Procurement',        color: 'bg-amber-100 text-amber-700' },
  competition:        { label: 'Competition',        color: 'bg-rose-100 text-rose-700' },
  investment:         { label: 'Investment',         color: 'bg-indigo-100 text-indigo-700' },
  export:             { label: 'Export',             color: 'bg-cyan-100 text-cyan-700' },
  buyer:              { label: 'Buyer',              color: 'bg-teal-100 text-teal-700' },
  event:              { label: 'Event',              color: 'bg-violet-100 text-violet-700' },
  other:              { label: 'Other',              color: 'bg-gray-100 text-gray-700' },
};

export const PRICE_TREND_CONFIG: Record<PriceTrend, { label: string; color: string; icon: string }> = {
  up:      { label: 'Rising',  color: 'text-red-600',  icon: '↑' },
  down:    { label: 'Falling', color: 'text-emerald-600', icon: '↓' },
  stable:  { label: 'Stable',  color: 'text-gray-600', icon: '→' },
  unknown: { label: 'N/A',     color: 'text-gray-400', icon: '—' },
};

export const NEWS_MARKET_REGIONS = [
  'Greater Accra', 'Ashanti', 'Western', 'Eastern', 'Central',
  'Northern', 'Volta', 'Upper East', 'Upper West', 'Brong Ahafo',
  'Western North', 'Ahafo', 'Bono East', 'Oti', 'Savannah',
] as const;

// ──────────────────────────────────────────────────────────────
// Notifications & Alert Intelligence
// ──────────────────────────────────────────────────────────────

export type NotificationType =
  // Marketplace (includes buyer requests & matching)
  | 'listing_approved' | 'listing_rejected' | 'listing_promoted'
  | 'buyer_request_created' | 'buyer_request_matched' | 'buyer_request_fulfilled' | 'buyer_request_cancelled'
  | 'new_match' | 'improved_match'
  // Orders
  | 'order_created' | 'order_payment_received' | 'order_released' | 'order_disputed' | 'order_refunded'
  // Verification
  | 'verification_submitted' | 'verification_approved' | 'verification_rejected' | 'tier_changed'
  // Reputation
  | 'new_rating' | 'trust_score_changed'
  // Logistics
  | 'shipment_created' | 'shipment_pickup_scheduled' | 'shipment_assigned' | 'shipment_in_transit'
  | 'shipment_out_for_delivery' | 'shipment_delivered' | 'shipment_delivery_confirmed'
  | 'shipment_delivery_issue' | 'shipment_cancelled'
  // Storage
  | 'booking_created' | 'booking_confirmed' | 'booking_rejected' | 'booking_checked_in' | 'booking_checked_out'
  // Platform
  | 'platform_announcement' | 'account_update';

export type NotificationCategory =
  | 'marketplace' | 'orders' | 'verification' | 'reputation'
  | 'logistics' | 'storage' | 'platform';

export type NotificationPriority = 'low' | 'normal' | 'high' | 'critical';

export interface Notification {
  id: number;
  user_id: string;
  type: NotificationType;
  category: NotificationCategory;
  title: string;
  message: string;
  priority: NotificationPriority;
  read_at: string | null;
  created_at: string;
  expires_at: string | null;
  action_url: string | null;
  entity_type: string | null;
  entity_id: string | null;
  metadata: Record<string, unknown> | null;
  deduplication_key: string | null;
}

export interface NotificationPreference {
  id: number;
  user_id: string;
  marketplace_enabled: boolean;
  orders_enabled: boolean;
  verification_enabled: boolean;
  reputation_enabled: boolean;
  logistics_enabled: boolean;
  storage_enabled: boolean;
  platform_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export const NOTIFICATION_CATEGORY_CONFIG: Record<NotificationCategory, { label: string; description: string; color: string; dotColor: string }> = {
  marketplace:  { label: 'Marketplace',  description: 'Listing updates, buyer requests, and matches', color: 'text-farm-green',  dotColor: 'bg-farm-green' },
  orders:       { label: 'Orders',       description: 'Payments, escrow, and purchase updates',     color: 'text-amber-600',   dotColor: 'bg-amber-500' },
  verification: { label: 'Verification', description: 'Account verification and tier changes',       color: 'text-emerald-600', dotColor: 'bg-emerald-500' },
  reputation:   { label: 'Reputation',   description: 'Ratings and trust score changes',             color: 'text-yellow-600',  dotColor: 'bg-yellow-500' },
  logistics:    { label: 'Logistics',    description: 'Shipping and delivery updates',               color: 'text-orange-600',  dotColor: 'bg-orange-500' },
  storage:      { label: 'Storage',      description: 'Warehousing booking updates',                 color: 'text-cyan-600',    dotColor: 'bg-cyan-500' },
  platform:     { label: 'Platform',     description: 'Critical system updates (always enabled)',    color: 'text-gray-600',    dotColor: 'bg-gray-500' },
};

export const NOTIFICATION_PRIORITY_CONFIG: Record<NotificationPriority, { label: string; color: string; bgColor: string }> = {
  low:      { label: 'Low',      color: 'text-gray-500',  bgColor: 'bg-gray-100' },
  normal:   { label: 'Normal',   color: 'text-gray-700',  bgColor: 'bg-gray-50' },
  high:     { label: 'High',     color: 'text-amber-600', bgColor: 'bg-amber-50' },
  critical: { label: 'Critical', color: 'text-red-600',   bgColor: 'bg-red-50' },
};
