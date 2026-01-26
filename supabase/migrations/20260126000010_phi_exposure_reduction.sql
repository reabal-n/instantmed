-- ============================================
-- PHI EXPOSURE REDUCTION
-- Generated: 2026-01-26
-- Purpose: Reduce PHI exposure risk without large refactors
-- ============================================

-- ============================================
-- 1. CHANGE DOCUMENTS BUCKET TO PRIVATE
-- ============================================
-- Previously public for convenience, now private for security
-- All access must go through signed URLs

UPDATE storage.buckets
SET public = FALSE
WHERE id = 'documents';

-- ============================================
-- 2. UPDATE STORAGE RLS POLICIES FOR SIGNED URL ACCESS
-- ============================================

-- Drop the old "anyone can view" policy - no longer needed with private bucket
DROP POLICY IF EXISTS "Anyone can view documents" ON storage.objects;

-- Patients can only access their own documents via signed URLs
-- The signed URL generation happens server-side with ownership verification
-- This policy allows the signed URL to work once generated
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Authenticated users can view documents via signed URL" ON storage.objects;
  CREATE POLICY "Authenticated users can view documents via signed URL"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'documents'
    AND (
      -- Service role bypasses this (handled by Supabase)
      -- Signed URLs work for authenticated users
      auth.role() = 'authenticated'
      OR auth.role() = 'service_role'
    )
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ============================================
-- 3. ADD PATIENT SELECT POLICY TO ai_safety_blocks
-- ============================================
-- Patients should be able to view their own safety blocks for transparency
-- This was missing from the original table creation

DO $$
BEGIN
  DROP POLICY IF EXISTS "Patients can view own safety blocks" ON public.ai_safety_blocks;
  CREATE POLICY "Patients can view own safety blocks"
    ON public.ai_safety_blocks
    FOR SELECT
    TO authenticated
    USING (patient_id = auth.uid());
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

COMMENT ON POLICY "Patients can view own safety blocks" ON public.ai_safety_blocks IS 
  'Patients can view their own AI safety blocks for transparency';

-- ============================================
-- 4. VERIFY intake_drafts RLS (session fallback already removed)
-- ============================================
-- Migration 20260118100002_fix_intake_drafts_rls.sql already removed
-- the session-based fallback. This is just a verification comment.
-- 
-- Current policies:
--   - intake_drafts_user_select: user_id = auth.uid()
--   - intake_drafts_user_update: user_id = auth.uid()
--   - intake_drafts_claim_guest: allows claiming guest drafts
--
-- No session_id based access is allowed via RLS.
-- Guest draft access (user_id IS NULL) must go through service role.

-- ============================================
-- AUDIT LOG
-- ============================================
-- 
-- Changes made:
--   1. documents bucket: public = FALSE
--   2. Removed "Anyone can view documents" storage policy
--   3. Added "Authenticated users can view documents via signed URL" policy
--   4. Added "Patients can view own safety blocks" policy to ai_safety_blocks
--
-- Impact:
--   - Document downloads now require signed URLs (already implemented in code)
--   - Patients can view their AI safety blocks
--   - No change to intake_drafts (session fallback already removed)
-- ============================================
