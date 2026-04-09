-- Migration: followup_tracker
-- Purpose: retention infrastructure for ED + hair loss patients
-- Tables: intake_followups, followup_email_log
-- Bucket: intake-photos (for deferred intake photo upload + phase-3 follow-up photos)

-- =============================================================================
-- intake_followups
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.intake_followups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  intake_id uuid NOT NULL REFERENCES public.intakes(id) ON DELETE CASCADE,
  patient_id uuid NOT NULL REFERENCES public.profiles(id),
  subtype text NOT NULL CHECK (subtype IN ('ed','hair_loss')),
  milestone text NOT NULL CHECK (milestone IN ('month_3','month_6','month_12')),
  due_at timestamptz NOT NULL,
  completed_at timestamptz,
  skipped boolean NOT NULL DEFAULT false,
  side_effects_reported boolean NOT NULL DEFAULT false,
  side_effects_notes text,
  effectiveness_rating smallint CHECK (effectiveness_rating BETWEEN 1 AND 5),
  adherence_days_per_week smallint CHECK (adherence_days_per_week BETWEEN 0 AND 7),
  patient_notes text,
  doctor_reviewed_at timestamptz,
  doctor_id uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (intake_id, milestone)
);

CREATE INDEX IF NOT EXISTS idx_intake_followups_due
  ON public.intake_followups (due_at)
  WHERE completed_at IS NULL AND skipped = false;

CREATE INDEX IF NOT EXISTS idx_intake_followups_patient
  ON public.intake_followups (patient_id, completed_at);

CREATE INDEX IF NOT EXISTS idx_intake_followups_doctor_review
  ON public.intake_followups (doctor_reviewed_at, completed_at)
  WHERE completed_at IS NOT NULL AND doctor_reviewed_at IS NULL;

-- Keep updated_at fresh
CREATE OR REPLACE FUNCTION public.tg_intake_followups_touch()
  RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END
$$;

DROP TRIGGER IF EXISTS intake_followups_touch ON public.intake_followups;
CREATE TRIGGER intake_followups_touch
  BEFORE UPDATE ON public.intake_followups
  FOR EACH ROW EXECUTE FUNCTION public.tg_intake_followups_touch();

-- =============================================================================
-- followup_email_log
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.followup_email_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  followup_id uuid NOT NULL REFERENCES public.intake_followups(id) ON DELETE CASCADE,
  sent_at timestamptz NOT NULL DEFAULT now(),
  template text NOT NULL,
  resend_message_id text,
  reminder_number smallint NOT NULL CHECK (reminder_number BETWEEN 1 AND 3)
);

CREATE INDEX IF NOT EXISTS idx_followup_email_log_followup
  ON public.followup_email_log (followup_id, sent_at DESC);

-- =============================================================================
-- RLS
-- =============================================================================
ALTER TABLE public.intake_followups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.followup_email_log ENABLE ROW LEVEL SECURITY;

-- Patients can read their own rows
DROP POLICY IF EXISTS followups_patient_select ON public.intake_followups;
CREATE POLICY followups_patient_select ON public.intake_followups
  FOR SELECT USING (patient_id = auth.uid());

-- Patients can update their own rows (RLS as defence-in-depth; server actions do the real work)
DROP POLICY IF EXISTS followups_patient_update ON public.intake_followups;
CREATE POLICY followups_patient_update ON public.intake_followups
  FOR UPDATE USING (patient_id = auth.uid())
  WITH CHECK (patient_id = auth.uid());

-- Doctors and admins can read + write everything
DROP POLICY IF EXISTS followups_doctor_all ON public.intake_followups;
CREATE POLICY followups_doctor_all ON public.intake_followups
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('doctor','admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('doctor','admin')
    )
  );

-- Email log: service-role only (cron writes, no direct user access)
DROP POLICY IF EXISTS followup_email_log_service ON public.followup_email_log;
CREATE POLICY followup_email_log_service ON public.followup_email_log
  FOR ALL USING (auth.role() = 'service_role');

-- =============================================================================
-- Storage bucket: intake-photos
-- Path convention: intake-photos/{patient_id}/{intake_or_followup_id}/{filename}
-- =============================================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('intake-photos', 'intake-photos', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS intake_photos_patient_read ON storage.objects;
CREATE POLICY intake_photos_patient_read ON storage.objects
  FOR SELECT USING (
    bucket_id = 'intake-photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS intake_photos_doctor_read ON storage.objects;
CREATE POLICY intake_photos_doctor_read ON storage.objects
  FOR SELECT USING (
    bucket_id = 'intake-photos'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('doctor','admin')
    )
  );

DROP POLICY IF EXISTS intake_photos_patient_insert ON storage.objects;
CREATE POLICY intake_photos_patient_insert ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'intake-photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Service role has implicit full access; no explicit policy needed.

COMMENT ON TABLE public.intake_followups IS
  'Post-approval follow-up check-ins for ED and hair-loss patients. Three rows (month_3, month_6, month_12) created per intake on approval.';
COMMENT ON TABLE public.followup_email_log IS
  'Immutable log of follow-up reminder emails sent. Max 3 reminders per followup row.';
