-- Create the risk-management table used by checkout fraud detection and admin finance.
-- The code has treated fraud flag persistence as non-blocking, so missing storage can
-- otherwise degrade into silent operator blindness.

CREATE TABLE IF NOT EXISTS public.fraud_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  intake_id UUID REFERENCES public.intakes(id) ON DELETE CASCADE,
  patient_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  flag_type TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  details JSONB NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'reviewed', 'dismissed')),
  reviewed_by UUID REFERENCES public.profiles(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fraud_flags_intake_id
  ON public.fraud_flags(intake_id);

CREATE INDEX IF NOT EXISTS idx_fraud_flags_patient_id
  ON public.fraud_flags(patient_id);

CREATE INDEX IF NOT EXISTS idx_fraud_flags_created_at
  ON public.fraud_flags(created_at DESC);

ALTER TABLE public.fraud_flags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_manage_fraud_flags" ON public.fraud_flags;
CREATE POLICY "service_role_manage_fraud_flags"
  ON public.fraud_flags
  FOR ALL
  USING ((select auth.role()) = 'service_role')
  WITH CHECK ((select auth.role()) = 'service_role');

DROP POLICY IF EXISTS "admins_view_fraud_flags" ON public.fraud_flags;
CREATE POLICY "admins_view_fraud_flags"
  ON public.fraud_flags
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.auth_user_id = (select auth.uid())
        AND p.role::text = 'admin'
    )
  );
