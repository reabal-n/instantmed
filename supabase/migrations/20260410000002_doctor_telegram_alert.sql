-- Migration: doctor_telegram_alert
-- Purpose: track per-intake Telegram doctor alerts + seed notification feature flags
-- Column: intakes.doctor_telegram_alert_sent_at (prevents repeated 1h stale-queue alerts)
-- Flags: telegram_notifications_enabled, doctor_alert_threshold_hours, patient_delay_email_hours

-- =============================================================================
-- intakes: add doctor Telegram alert tracking column
-- =============================================================================
ALTER TABLE public.intakes
  ADD COLUMN IF NOT EXISTS doctor_telegram_alert_sent_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_intakes_doctor_telegram_alert
  ON public.intakes (status, doctor_telegram_alert_sent_at)
  WHERE status = 'paid';

-- =============================================================================
-- feature_flags: seed notification control flags
-- =============================================================================
-- telegram_notifications_enabled: master kill switch for all Telegram alerts
-- doctor_alert_threshold_hours: hours before doctor gets Telegram alert (default 1)
-- patient_delay_email_hours: hours before patient gets delay email (default 2)
INSERT INTO public.feature_flags (key, value, updated_at)
VALUES
  ('telegram_notifications_enabled', 'true'::jsonb, NOW()),
  ('doctor_alert_threshold_hours', '1'::jsonb, NOW()),
  ('patient_delay_email_hours', '2'::jsonb, NOW())
ON CONFLICT (key) DO NOTHING;
