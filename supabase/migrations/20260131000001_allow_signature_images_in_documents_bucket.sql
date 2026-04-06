-- ============================================
-- ALLOW SIGNATURE IMAGES IN DOCUMENTS BUCKET
-- Generated: 2026-01-31
-- Purpose: Add PNG/JPG mime types to allow doctor signature uploads
-- ============================================

UPDATE storage.buckets
SET allowed_mime_types = ARRAY['application/pdf', 'image/png', 'image/jpeg']
WHERE id = 'documents';
