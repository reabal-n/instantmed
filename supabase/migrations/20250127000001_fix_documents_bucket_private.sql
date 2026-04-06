-- ============================================
-- FIX: MAKE DOCUMENTS BUCKET PRIVATE
-- Generated: 2025-01-27
-- Purpose: Critical security fix - medical certificates should not be publicly accessible
-- ============================================

-- CRITICAL SECURITY FIX: Change documents bucket from PUBLIC to PRIVATE
-- This ensures medical certificates (PHI) can only be accessed via signed URLs
-- Patients will still be able to download their documents through the dashboard
-- which generates time-limited signed URLs

UPDATE storage.buckets 
SET public = FALSE 
WHERE id = 'documents';

-- Drop the old "anyone can view" policy as it's no longer needed
DROP POLICY IF EXISTS "Anyone can view documents" ON storage.objects;

-- Create a new policy that allows authenticated users to read their own documents
-- Documents are stored as: med-certs/{patient_id}/{certificate_number}.pdf
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Patients can view their own documents" ON storage.objects;
  CREATE POLICY "Patients can view their own documents"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'documents'
    AND (
      -- Service role can access all (for admin operations)
      auth.role() = 'service_role'
      OR
      -- Doctors can view all documents (for review purposes)
      EXISTS (
        SELECT 1 FROM public.profiles
        WHERE auth_user_id = auth.uid()
        AND role IN ('doctor', 'admin')
      )
      OR
      -- Patients can only view their own documents
      -- Path format: med-certs/{patient_id}/{filename}.pdf
      (storage.foldername(name))[1] = 'med-certs'
      AND (storage.foldername(name))[2] = (
        SELECT id::text FROM public.profiles
        WHERE auth_user_id = auth.uid()
        LIMIT 1
      )
    )
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ============================================
-- AUDIT LOG
-- ============================================
-- 
-- CRITICAL SECURITY FIX APPLIED:
-- - Changed documents bucket from PUBLIC to PRIVATE
-- - Removed "Anyone can view documents" policy
-- - Added "Patients can view their own documents" policy
-- - Documents now require signed URLs for access
-- - Signed URLs are generated server-side with 24h expiry
--
-- Impact:
-- - Existing direct URLs will stop working
-- - Dashboard download buttons will continue to work (use signed URLs)
-- - Email links should point to dashboard, not direct download
-- ============================================
