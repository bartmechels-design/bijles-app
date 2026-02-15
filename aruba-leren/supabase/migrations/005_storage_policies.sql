-- Run this SQL in Supabase Dashboard > SQL Editor

-- ============================================================================
-- Storage Bucket Policies for Payment Proofs
-- ============================================================================
-- Purpose: Secure file upload for payment verification receipts
-- Dependencies: payment-proofs bucket (created manually via Dashboard)
-- ============================================================================

-- ============================================================================
-- MANUAL SETUP REQUIRED (Supabase Dashboard)
-- ============================================================================
-- 1. Go to Storage > New Bucket
-- 2. Create bucket with these settings:
--    - Name: payment-proofs
--    - Public: OFF (private bucket)
--    - File size limit: 5MB
--    - Allowed MIME types: image/jpeg, image/png, image/webp
-- 3. Then run this SQL to set up RLS policies
-- ============================================================================

-- Enable RLS on storage.objects (if not already enabled)
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Storage RLS Policies
-- ============================================================================

-- Users can upload payment proofs to their own folder
-- Folder structure: payment-proofs/{user_id}/{filename}
CREATE POLICY "Users can upload own payment proofs"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'payment-proofs'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Users can view their own uploaded payment proofs
CREATE POLICY "Users can view own payment proofs"
  ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'payment-proofs'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Admins can view all payment proofs (for verification)
CREATE POLICY "Admins can view all payment proofs"
  ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'payment-proofs'
    AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

-- ============================================================================
-- Comments for Documentation
-- ============================================================================

COMMENT ON POLICY "Users can upload own payment proofs" ON storage.objects IS 'Parents can only upload files to folders matching their user_id';
COMMENT ON POLICY "Users can view own payment proofs" ON storage.objects IS 'Parents can only view files they uploaded';
COMMENT ON POLICY "Admins can view all payment proofs" ON storage.objects IS 'Admins can view all payment proofs for verification';
