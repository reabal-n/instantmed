-- ============================================================================
-- Create missing tables referenced in codebase but not in database
-- Audit finding: notifications (11 refs), prescriptions (3 refs),
-- prescription_refills (2 refs), audit_log view (5 refs)
-- ============================================================================

-- ============================================================================
-- 1. NOTIFICATIONS TABLE (CRITICAL - 11 code references)
-- Used by: patient notifications, certificate approval, payment confirmation,
--          prescription refills, real-time subscriptions
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('request_update', 'payment', 'document_ready', 'refill_reminder', 'system', 'promotion', 'prescription_refill_request')),
  title text NOT NULL,
  message text NOT NULL,
  action_url text,
  read boolean NOT NULL DEFAULT false,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz,
  related_id uuid
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON public.notifications(user_id) WHERE read = false;
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access to notifications"
  ON public.notifications FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "Users can view own notifications"
  ON public.notifications FOR SELECT
  TO authenticated
  USING (user_id IN (
    SELECT id FROM profiles WHERE auth_user_id = auth.uid()
  ));

CREATE POLICY "Users can update own notifications"
  ON public.notifications FOR UPDATE
  TO authenticated
  USING (user_id IN (
    SELECT id FROM profiles WHERE auth_user_id = auth.uid()
  ))
  WITH CHECK (user_id IN (
    SELECT id FROM profiles WHERE auth_user_id = auth.uid()
  ));

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- ============================================================================
-- 2. PRESCRIPTIONS TABLE (3 code references)
-- Used by: patient dashboard, prescriptions page, refill system
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.prescriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  prescriber_id uuid REFERENCES public.profiles(id),
  intake_id uuid REFERENCES public.intakes(id),
  medication_name text NOT NULL,
  medication_strength text,
  dosage_instructions text,
  quantity_prescribed integer,
  repeats_allowed integer DEFAULT 0,
  repeats_used integer DEFAULT 0,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled', 'expired')),
  issued_date date NOT NULL DEFAULT CURRENT_DATE,
  expiry_date date,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_prescriptions_patient_id ON public.prescriptions(patient_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_status ON public.prescriptions(status);
CREATE INDEX IF NOT EXISTS idx_prescriptions_issued_date ON public.prescriptions(issued_date DESC);

ALTER TABLE public.prescriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access to prescriptions"
  ON public.prescriptions FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "Patients can view own prescriptions"
  ON public.prescriptions FOR SELECT
  TO authenticated
  USING (patient_id IN (
    SELECT id FROM profiles WHERE auth_user_id = auth.uid()
  ));

CREATE POLICY "Doctors can view all prescriptions"
  ON public.prescriptions FOR SELECT
  TO public
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.auth_user_id = (SELECT auth.uid())
    AND profiles.role IN ('doctor', 'admin')
  ));

CREATE POLICY "Doctors can manage prescriptions"
  ON public.prescriptions FOR ALL
  TO public
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.auth_user_id = (SELECT auth.uid())
    AND profiles.role IN ('doctor', 'admin')
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.auth_user_id = (SELECT auth.uid())
    AND profiles.role IN ('doctor', 'admin')
  ));

-- ============================================================================
-- 3. PRESCRIPTION_REFILLS TABLE (2 code references)
-- Used by: refill request API route
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.prescription_refills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prescription_id uuid NOT NULL REFERENCES public.prescriptions(id) ON DELETE CASCADE,
  patient_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  quantity_requested integer NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'declined', 'dispensed')),
  requested_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  reviewed_by uuid REFERENCES public.profiles(id),
  notes text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_prescription_refills_patient_id ON public.prescription_refills(patient_id);
CREATE INDEX IF NOT EXISTS idx_prescription_refills_prescription_id ON public.prescription_refills(prescription_id);
CREATE INDEX IF NOT EXISTS idx_prescription_refills_status ON public.prescription_refills(status);

ALTER TABLE public.prescription_refills ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access to prescription_refills"
  ON public.prescription_refills FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "Patients can view own refill requests"
  ON public.prescription_refills FOR SELECT
  TO authenticated
  USING (patient_id IN (
    SELECT id FROM profiles WHERE auth_user_id = auth.uid()
  ));

CREATE POLICY "Doctors can view all refill requests"
  ON public.prescription_refills FOR SELECT
  TO public
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.auth_user_id = (SELECT auth.uid())
    AND profiles.role IN ('doctor', 'admin')
  ));

CREATE POLICY "Doctors can manage refill requests"
  ON public.prescription_refills FOR ALL
  TO public
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.auth_user_id = (SELECT auth.uid())
    AND profiles.role IN ('doctor', 'admin')
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.auth_user_id = (SELECT auth.uid())
    AND profiles.role IN ('doctor', 'admin')
  ));

-- ============================================================================
-- 4. audit_log VIEW (maps to audit_logs table)
-- Compliance dashboard references "audit_log" but table is "audit_logs"
-- ============================================================================

CREATE OR REPLACE VIEW public.audit_log AS
SELECT
  id,
  action,
  actor_id,
  actor_type,
  COALESCE(description, action) as entity_type,
  metadata,
  ip_address,
  user_agent,
  created_at,
  intake_id,
  profile_id,
  request_id,
  from_state,
  to_state
FROM public.audit_logs;

GRANT SELECT ON public.audit_log TO authenticated;
GRANT SELECT ON public.audit_log TO service_role;
