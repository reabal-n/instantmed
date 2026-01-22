-- ============================================================================
-- EMAIL PREFERENCES
-- Allows patients to manage their email subscription preferences
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.email_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  -- Preference categories
  marketing_emails BOOLEAN NOT NULL DEFAULT true,
  abandoned_checkout_emails BOOLEAN NOT NULL DEFAULT true,
  
  -- Transactional emails (always sent, shown for transparency)
  -- These cannot be disabled but we track the preference for UI display
  transactional_emails BOOLEAN NOT NULL DEFAULT true,
  
  -- Unsubscribe tracking
  unsubscribed_at TIMESTAMPTZ,
  unsubscribe_reason TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- One preference record per profile
  UNIQUE(profile_id)
);

-- Index for lookups
CREATE INDEX IF NOT EXISTS idx_email_preferences_profile 
  ON public.email_preferences(profile_id);

-- Trigger for updated_at
CREATE OR REPLACE TRIGGER email_preferences_updated_at
  BEFORE UPDATE ON public.email_preferences
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- RLS
ALTER TABLE public.email_preferences ENABLE ROW LEVEL SECURITY;

-- Users can view their own preferences
CREATE POLICY "Users can view own email preferences"
  ON public.email_preferences
  FOR SELECT
  TO authenticated
  USING (
    profile_id = (SELECT id FROM profiles WHERE auth_user_id = auth.uid())
  );

-- Users can update their own preferences
CREATE POLICY "Users can update own email preferences"
  ON public.email_preferences
  FOR UPDATE
  TO authenticated
  USING (
    profile_id = (SELECT id FROM profiles WHERE auth_user_id = auth.uid())
  );

-- Users can insert their own preferences
CREATE POLICY "Users can insert own email preferences"
  ON public.email_preferences
  FOR INSERT
  TO authenticated
  WITH CHECK (
    profile_id = (SELECT id FROM profiles WHERE auth_user_id = auth.uid())
  );

-- Service role has full access
CREATE POLICY "Service role full access to email_preferences"
  ON public.email_preferences
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Function to get or create email preferences for a profile
CREATE OR REPLACE FUNCTION public.get_or_create_email_preferences(p_profile_id UUID)
RETURNS public.email_preferences
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_prefs email_preferences;
BEGIN
  -- Try to get existing preferences
  SELECT * INTO v_prefs
  FROM email_preferences
  WHERE profile_id = p_profile_id;
  
  -- If not found, create with defaults
  IF v_prefs.id IS NULL THEN
    INSERT INTO email_preferences (profile_id)
    VALUES (p_profile_id)
    RETURNING * INTO v_prefs;
  END IF;
  
  RETURN v_prefs;
END;
$$;

COMMENT ON TABLE public.email_preferences IS 'User email subscription preferences';
