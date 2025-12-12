-- ============================================
-- ATTACHMENTS: File uploads (photos, documents)
-- ============================================

CREATE TABLE public.attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Relationships
  intake_id UUID NOT NULL REFERENCES public.intakes(id) ON DELETE CASCADE,
  uploaded_by_id UUID NOT NULL REFERENCES public.profiles(id),
  message_id UUID REFERENCES public.messages(id) ON DELETE SET NULL, -- If attached to a message
  
  -- File info
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL, -- MIME type
  file_size_bytes INTEGER,
  attachment_type public.attachment_type DEFAULT 'other',
  
  -- Storage
  storage_bucket TEXT NOT NULL DEFAULT 'attachments',
  storage_path TEXT NOT NULL, -- Path in Supabase Storage
  
  -- Status
  is_verified BOOLEAN DEFAULT FALSE, -- For ID documents
  verified_at TIMESTAMPTZ,
  verified_by_id UUID REFERENCES public.profiles(id),
  
  -- Metadata
  description TEXT,
  metadata JSONB DEFAULT '{}',
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_attachments_intake ON public.attachments(intake_id);
CREATE INDEX idx_attachments_uploaded_by ON public.attachments(uploaded_by_id);
CREATE INDEX idx_attachments_type ON public.attachments(attachment_type);
CREATE INDEX idx_attachments_message ON public.attachments(message_id) WHERE message_id IS NOT NULL;

-- ============================================
-- RLS POLICIES
-- ============================================

ALTER TABLE public.attachments ENABLE ROW LEVEL SECURITY;

-- Patients can view their own attachments
CREATE POLICY "Patients can view own attachments"
  ON public.attachments FOR SELECT
  USING (
    intake_id IN (
      SELECT i.id FROM public.intakes i
      JOIN public.profiles p ON i.patient_id = p.id
      WHERE p.auth_user_id = auth.uid()
    )
  );

-- Patients can upload attachments to their intakes
CREATE POLICY "Patients can upload attachments"
  ON public.attachments FOR INSERT
  WITH CHECK (
    intake_id IN (
      SELECT i.id FROM public.intakes i
      JOIN public.profiles p ON i.patient_id = p.id
      WHERE p.auth_user_id = auth.uid()
    )
    AND uploaded_by_id IN (
      SELECT id FROM public.profiles WHERE auth_user_id = auth.uid()
    )
  );

-- Admins can view all attachments
CREATE POLICY "Admins can view all attachments"
  ON public.attachments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.auth_user_id = auth.uid()
      AND p.role = 'admin'
    )
  );

-- Admins can upload attachments
CREATE POLICY "Admins can upload attachments"
  ON public.attachments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.auth_user_id = auth.uid()
      AND p.role = 'admin'
    )
  );

-- Admins can update attachments (for verification)
CREATE POLICY "Admins can update attachments"
  ON public.attachments FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.auth_user_id = auth.uid()
      AND p.role = 'admin'
    )
  );

-- ============================================
-- STORAGE BUCKET SETUP
-- ============================================

-- Note: Run these in the Supabase dashboard or via API
-- INSERT INTO storage.buckets (id, name, public) VALUES ('attachments', 'attachments', false);

-- Storage RLS policies (apply via Supabase dashboard):
-- CREATE POLICY "Users can upload to their own folder"
-- ON storage.objects FOR INSERT
-- WITH CHECK (
--   bucket_id = 'attachments'
--   AND (storage.foldername(name))[1] = auth.uid()::TEXT
-- );

-- CREATE POLICY "Users can read their own files"
-- ON storage.objects FOR SELECT
-- USING (
--   bucket_id = 'attachments'
--   AND (storage.foldername(name))[1] = auth.uid()::TEXT
-- );

-- CREATE POLICY "Admins can read all files"
-- ON storage.objects FOR SELECT
-- USING (
--   bucket_id = 'attachments'
--   AND EXISTS (
--     SELECT 1 FROM public.profiles
--     WHERE auth_user_id = auth.uid()
--     AND role = 'admin'
--   )
-- );
