-- ============================================
-- DOCUMENTS STORAGE BUCKET
-- Generated: 2024-12-15
-- Purpose: Create permanent storage for generated PDFs (med certs, referrals, etc.)
-- ============================================

-- ============================================
-- 1. CREATE DOCUMENTS BUCKET
-- ============================================
-- This bucket stores generated documents (PDFs) that patients need permanent access to
-- Public read is enabled so patients can download without signed URLs
-- Write is restricted to service role and doctors

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documents',
  'documents',
  TRUE, -- Public read - documents need to be downloadable by patients
  5242880, -- 5MB limit (PDFs are typically small)
  ARRAY['application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
  public = TRUE,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ============================================
-- 2. STORAGE RLS POLICIES FOR DOCUMENTS
-- ============================================

-- Enable RLS on storage.objects if not already enabled
-- (This is typically enabled by default in Supabase)

-- Policy: Public can read documents (the bucket is public, but we still need this)
-- Documents are organized as: documents/{request_id}/{filename}.pdf
-- Patients need to access their documents via direct URL
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Anyone can view documents" ON storage.objects;
  CREATE POLICY "Anyone can view documents"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'documents');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Policy: Only service role can upload documents
-- This is enforced by NOT having an INSERT policy for authenticated users
-- The server-side code uses service role client for uploads

-- Policy: Doctors can upload documents (via service role, but adding for completeness)
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Doctors can upload documents" ON storage.objects;
  CREATE POLICY "Doctors can upload documents"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'documents'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE auth_user_id = auth.uid()
      AND role = 'doctor'
    )
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Policy: Service role can do everything (implicit, but documenting)
-- Service role bypasses RLS, so no explicit policy needed

-- Policy: No one can delete documents (immutable once created)
-- We want an audit trail - documents should never be deleted
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "No one can delete documents" ON storage.objects;
  CREATE POLICY "No one can delete documents"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'documents'
    AND FALSE -- No one can delete
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ============================================
-- 3. CREATE INDEX FOR DOCUMENT LOOKUPS
-- ============================================
-- Documents are organized by request_id in the path
-- Path format: documents/{request_id}/{document_type}_{timestamp}.pdf

-- No additional indexes needed - storage.objects uses path-based lookups

-- ============================================
-- AUDIT LOG
-- ============================================
-- 
-- Bucket created: documents
--   - Public read: YES (patients need to download)
--   - Write access: Doctors only (via RLS) + Service role
--   - Delete access: NO ONE (audit trail)
--   - File size limit: 5MB
--   - Allowed types: PDF only
--
-- Storage path convention:
--   documents/{request_id}/{type}_{subtype}_{timestamp}.pdf
--   Example: documents/abc123-def456/med_cert_work_1702656000000.pdf
-- ============================================
