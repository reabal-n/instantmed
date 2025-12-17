-- Feature flags / kill switches table
-- Used by admin to disable services or block specific medications

CREATE TABLE IF NOT EXISTS public.feature_flags (
  key text PRIMARY KEY,
  value jsonb NOT NULL DEFAULT 'false'::jsonb,
  updated_at timestamptz DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Enable RLS
ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;

-- Only admins/doctors can read feature flags (for admin UI)
CREATE POLICY "doctors_select_feature_flags"
  ON public.feature_flags FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE auth_user_id = auth.uid() 
      AND role IN ('doctor', 'admin')
    )
  );

-- Only admins/doctors can update feature flags
CREATE POLICY "doctors_update_feature_flags"
  ON public.feature_flags FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE auth_user_id = auth.uid() 
      AND role IN ('doctor', 'admin')
    )
  );

-- Seed default values
INSERT INTO public.feature_flags (key, value) VALUES
  ('disable_med_cert', 'false'::jsonb),
  ('disable_repeat_scripts', 'false'::jsonb),
  ('disable_consults', 'false'::jsonb),
  ('blocked_medication_terms', '[]'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS feature_flags_key_idx ON public.feature_flags(key);

COMMENT ON TABLE public.feature_flags IS 'Admin kill switches and feature flags';
COMMENT ON COLUMN public.feature_flags.key IS 'Flag identifier';
COMMENT ON COLUMN public.feature_flags.value IS 'Flag value (boolean or array)';
COMMENT ON COLUMN public.feature_flags.updated_by IS 'Admin who last updated this flag';
