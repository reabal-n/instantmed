-- Create table to track failed profile merges for admin review and retry
-- This ensures no profile data is silently lost during guest-to-auth migration

CREATE TABLE IF NOT EXISTS failed_profile_merges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  guest_profile_id uuid NOT NULL,
  target_profile_id uuid NOT NULL,
  user_email text,
  error_message text,
  retry_count integer DEFAULT 0,
  resolved_at timestamptz,
  resolved_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Index for admin dashboard queries
CREATE INDEX idx_failed_profile_merges_unresolved 
ON failed_profile_merges(created_at DESC) 
WHERE resolved_at IS NULL;

-- RLS: Only admins can view/manage failed merges
ALTER TABLE failed_profile_merges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view failed merges"
ON failed_profile_merges FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.auth_user_id = (SELECT auth.uid())
    AND profiles.role IN ('admin', 'doctor')
  )
);

CREATE POLICY "Admins can update failed merges"
ON failed_profile_merges FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.auth_user_id = (SELECT auth.uid())
    AND profiles.role = 'admin'
  )
);

-- Service role can insert (for auth callback)
CREATE POLICY "Service role can insert failed merges"
ON failed_profile_merges FOR INSERT
TO service_role
WITH CHECK (true);

COMMENT ON TABLE failed_profile_merges IS 'Tracks failed guest profile merge attempts for admin review and retry';
