-- ─────────────────────────────────────────────────────────────
-- PAYMENTS + STORAGE FOUNDATION
-- 1. Supabase Storage buckets (replaces base64 blobs in DB rows)
--    - listing-images:    public read, farmers upload into their own folder
--    - waybills:          private, farmer owner + admin read
--    - verification-docs: private, owner + admin read
--    File layout convention: <bucket>/<auth.uid()>/<filename>
--    Private buckets are referenced as `storage://<bucket>/<path>` strings
--    and resolved to short-lived signed URLs at view time (see StorageImage).
-- 2. Escrow payout/tracking columns for the Flutterwave lifecycle
-- ─────────────────────────────────────────────────────────────

-- 1. Buckets ----------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES
  ('listing-images', 'listing-images', true),
  ('waybills', 'waybills', false),
  ('verification-docs', 'verification-docs', false)
ON CONFLICT (id) DO NOTHING;

-- Public read for listing images
DROP POLICY IF EXISTS "listing_images_public_read" ON storage.objects;
CREATE POLICY "listing_images_public_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'listing-images');

-- Authenticated users upload into their OWN folder only
DROP POLICY IF EXISTS "listing_images_insert_own" ON storage.objects;
CREATE POLICY "listing_images_insert_own" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'listing-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "listing_images_update_own" ON storage.objects;
CREATE POLICY "listing_images_update_own" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'listing-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "listing_images_delete_own" ON storage.objects;
CREATE POLICY "listing_images_delete_own" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'listing-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Waybills: owner insert, owner + admin read
DROP POLICY IF EXISTS "waybills_insert_own" ON storage.objects;
CREATE POLICY "waybills_insert_own" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'waybills'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "waybills_select_owner_admin" ON storage.objects;
CREATE POLICY "waybills_select_owner_admin" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'waybills'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    )
  );

-- Verification docs: owner insert, owner + admin read
DROP POLICY IF EXISTS "verification_docs_insert_own" ON storage.objects;
CREATE POLICY "verification_docs_insert_own" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'verification-docs'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "verification_docs_select_owner_admin" ON storage.objects;
CREATE POLICY "verification_docs_select_owner_admin" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'verification-docs'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    )
  );

-- 2. Escrow lifecycle columns -----------------------------------
ALTER TABLE public.escrow_transactions
  ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'GHS',
  ADD COLUMN IF NOT EXISTS flw_tx_ref TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS flw_transaction_id BIGINT,
  ADD COLUMN IF NOT EXISTS paid_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS payout_reference TEXT,
  ADD COLUMN IF NOT EXISTS auto_release_at TIMESTAMP WITH TIME ZONE;

CREATE INDEX IF NOT EXISTS idx_escrow_status_dispatched
  ON public.escrow_transactions (status, dispatched_at);

CREATE INDEX IF NOT EXISTS idx_escrow_flw_ref
  ON public.escrow_transactions (flw_tx_ref);

-- 3. Farmer payout details (for MoMo/bank transfers on release) ----
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS payout_account_bank TEXT,
  ADD COLUMN IF NOT EXISTS payout_account_number TEXT,
  ADD COLUMN IF NOT EXISTS payout_account_name TEXT;
