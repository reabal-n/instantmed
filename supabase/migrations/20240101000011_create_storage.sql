-- ============================================
-- STORAGE BUCKET SETUP + RLS POLICIES
-- ============================================

-- Create private attachments bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'attachments',
  'attachments',
  FALSE,
  10485760, -- 10MB limit
  ARRAY[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/heic',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ============================================
-- STORAGE RLS POLICIES
-- ============================================

-- Policy: Patients can upload to their intake folders
CREATE POLICY "Patients can upload to their intake folders"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'attachments'
  AND (storage.foldername(name))[1] IN (
    SELECT i.id::TEXT
    FROM public.intakes i
    JOIN public.profiles p ON i.patient_id = p.id
    WHERE p.auth_user_id = auth.uid()
  )
);

-- Policy: Patients can view their own uploads
CREATE POLICY "Patients can view own uploads"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'attachments'
  AND (storage.foldername(name))[1] IN (
    SELECT i.id::TEXT
    FROM public.intakes i
    JOIN public.profiles p ON i.patient_id = p.id
    WHERE p.auth_user_id = auth.uid()
  )
);

-- Policy: Patients can delete their own uploads (only drafts)
CREATE POLICY "Patients can delete own draft uploads"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'attachments'
  AND (storage.foldername(name))[1] IN (
    SELECT i.id::TEXT
    FROM public.intakes i
    JOIN public.profiles p ON i.patient_id = p.id
    WHERE p.auth_user_id = auth.uid()
    AND i.status IN ('draft', 'pending_payment')
  )
);

-- Policy: Admins can view all attachments
CREATE POLICY "Admins can view all attachments"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'attachments'
  AND EXISTS (
    SELECT 1 FROM public.profiles
    WHERE auth_user_id = auth.uid()
    AND role = 'admin'
  )
);

-- Policy: Admins can upload attachments
CREATE POLICY "Admins can upload attachments"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'attachments'
  AND EXISTS (
    SELECT 1 FROM public.profiles
    WHERE auth_user_id = auth.uid()
    AND role = 'admin'
  )
);
