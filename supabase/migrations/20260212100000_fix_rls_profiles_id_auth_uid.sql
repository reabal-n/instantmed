-- =============================================================
-- Migration: Fix all RLS policies using broken profiles.id = auth.uid()
--
-- PROBLEM:
--   profiles.id is a UUID primary key (profile ID), NOT the auth user ID.
--   auth.uid() returns the Supabase Auth user ID.
--   These are DIFFERENT UUIDs — profiles.id ≠ auth.uid() — so the
--   condition `profiles.id = auth.uid()` NEVER matches, effectively
--   making every affected policy deny all access to authenticated users.
--
-- FIX:
--   Replace `profiles.id = auth.uid()` with `profiles.auth_user_id = (SELECT auth.uid())`
--   across all affected tables. Also uses the initplan pattern (SELECT auth.uid())
--   for better query planning performance.
--
-- AFFECTED TABLES:
--   1. patient_notes (SELECT, INSERT, DELETE)
--   2. security_events (SELECT)
--   3. patient_flags (ALL)
--   4. date_change_requests (ALL)
--   5. chat_sessions (admin ALL policy)
--   6. document_drafts — original doctor SELECT (already fixed in 20250115000003, but
--      the original "Doctors can read document drafts" from 20250113000001 used the
--      broken pattern; it was superseded so no change needed here)
--   7. request_latency (SELECT)
--   8. operational_metrics (ALL)
--   9. delivery_tracking (ALL)
--  10. intake_abandonment (ALL)
--  11. ai_metrics (ALL)
-- =============================================================

-- ============================================================================
-- 1. PATIENT_NOTES — doctors/admins cannot read/insert/delete
-- ============================================================================

DROP POLICY IF EXISTS "Doctors and admins can view patient notes" ON public.patient_notes;
CREATE POLICY "Doctors and admins can view patient notes"
  ON public.patient_notes FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.auth_user_id = (SELECT auth.uid())
      AND profiles.role IN ('doctor', 'admin')
    )
  );

DROP POLICY IF EXISTS "Doctors and admins can insert patient notes" ON public.patient_notes;
CREATE POLICY "Doctors and admins can insert patient notes"
  ON public.patient_notes FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.auth_user_id = (SELECT auth.uid())
      AND profiles.role IN ('doctor', 'admin')
    )
  );

DROP POLICY IF EXISTS "Doctors and admins can delete patient notes" ON public.patient_notes;
CREATE POLICY "Doctors and admins can delete patient notes"
  ON public.patient_notes FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.auth_user_id = (SELECT auth.uid())
      AND profiles.role IN ('doctor', 'admin')
    )
  );

-- ============================================================================
-- 2. SECURITY_EVENTS — admins/doctors cannot read
-- ============================================================================

DROP POLICY IF EXISTS "security_events_admin_read" ON public.security_events;
CREATE POLICY "security_events_admin_read"
  ON public.security_events FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.auth_user_id = (SELECT auth.uid())
      AND profiles.role IN ('admin', 'doctor')
    )
  );

-- ============================================================================
-- 3. PATIENT_FLAGS — admins/doctors cannot read/write
-- ============================================================================

DROP POLICY IF EXISTS "patient_flags_admin_all" ON public.patient_flags;
CREATE POLICY "patient_flags_admin_all"
  ON public.patient_flags FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.auth_user_id = (SELECT auth.uid())
      AND profiles.role IN ('admin', 'doctor')
    )
  );

-- ============================================================================
-- 4. DATE_CHANGE_REQUESTS — admins/doctors cannot access
-- ============================================================================

DROP POLICY IF EXISTS "date_change_requests_admin" ON public.date_change_requests;
CREATE POLICY "date_change_requests_admin"
  ON public.date_change_requests FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.auth_user_id = (SELECT auth.uid())
      AND profiles.role IN ('admin', 'doctor')
    )
  );

-- ============================================================================
-- 5. CHAT_SESSIONS — admin ALL policy broken
-- ============================================================================

DROP POLICY IF EXISTS "chat_sessions_admin" ON public.chat_sessions;
CREATE POLICY "chat_sessions_admin"
  ON public.chat_sessions FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.auth_user_id = (SELECT auth.uid())
      AND profiles.role IN ('admin', 'doctor')
    )
  );

-- ============================================================================
-- 6. REQUEST_LATENCY — admins/doctors cannot read
-- ============================================================================

DROP POLICY IF EXISTS "request_latency_admin_read" ON public.request_latency;
CREATE POLICY "request_latency_admin_read"
  ON public.request_latency FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.auth_user_id = (SELECT auth.uid())
      AND profiles.role IN ('admin', 'doctor')
    )
  );

-- ============================================================================
-- 7. OPERATIONAL_METRICS — admins cannot access
-- ============================================================================

DROP POLICY IF EXISTS "operational_metrics_admin" ON public.operational_metrics;
CREATE POLICY "operational_metrics_admin"
  ON public.operational_metrics FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.auth_user_id = (SELECT auth.uid())
      AND profiles.role = 'admin'
    )
  );

-- ============================================================================
-- 8. DELIVERY_TRACKING — admins/doctors cannot access
-- ============================================================================

DROP POLICY IF EXISTS "delivery_tracking_admin" ON public.delivery_tracking;
CREATE POLICY "delivery_tracking_admin"
  ON public.delivery_tracking FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.auth_user_id = (SELECT auth.uid())
      AND profiles.role IN ('admin', 'doctor')
    )
  );

-- ============================================================================
-- 9. INTAKE_ABANDONMENT — admins cannot access
-- ============================================================================

DROP POLICY IF EXISTS "intake_abandonment_admin" ON public.intake_abandonment;
CREATE POLICY "intake_abandonment_admin"
  ON public.intake_abandonment FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.auth_user_id = (SELECT auth.uid())
      AND profiles.role = 'admin'
    )
  );

-- ============================================================================
-- 10. AI_METRICS — admins cannot access
-- ============================================================================

DROP POLICY IF EXISTS "ai_metrics_admin" ON public.ai_metrics;
CREATE POLICY "ai_metrics_admin"
  ON public.ai_metrics FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.auth_user_id = (SELECT auth.uid())
      AND profiles.role = 'admin'
    )
  );
