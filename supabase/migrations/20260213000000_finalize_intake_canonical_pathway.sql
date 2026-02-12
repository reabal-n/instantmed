-- =============================================================
-- Migration: Final canonical intake pathway — drop all legacy artifacts
--
-- This migration completes the requests → intakes migration by:
--   1. Dropping dead DB functions
--   2. Dropping the dead request_answers table
--   3. Renaming request_id → intake_id on observability/audit tables
--   4. Renaming request_id → intake_id on core tables (audit_logs, documents, etc.)
--   5. Updating RLS policies for renamed columns
--   6. Updating indexes for renamed columns
--   7. Dropping the notify_on_request_status_change function
--
-- ALL operations are wrapped in conditional blocks to be fully idempotent
-- and safe even if tables don't exist on the target database.
-- =============================================================

-- ============================================================================
-- 1. DROP DEAD DB FUNCTIONS
-- ============================================================================

-- get_or_create_document_draft: created in 20241215000004, never called by app code
DROP FUNCTION IF EXISTS public.get_or_create_document_draft(uuid, text, jsonb);

-- notify_on_request_status_change: superseded by notify_on_intake_status_change
DROP FUNCTION IF EXISTS public.notify_on_request_status_change();

-- ============================================================================
-- 2. DROP DEAD request_answers TABLE
-- ============================================================================

-- RLS policies already dropped by 20260212200000
-- FK constraint already dropped by 20260212200000
-- Zero app code references this table (confirmed: only intake_answers is used)
DROP TABLE IF EXISTS public.request_answers;

-- ============================================================================
-- 3. RENAME request_id → intake_id ON OBSERVABILITY TABLES
-- ============================================================================

-- 3a. request_latency: request_id is the PK
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'request_latency'
    AND column_name = 'request_id'
  ) THEN
    DROP INDEX IF EXISTS idx_request_latency_decision;
    DROP INDEX IF EXISTS idx_request_latency_pending;
    ALTER TABLE public.request_latency RENAME COLUMN request_id TO intake_id;
    CREATE INDEX IF NOT EXISTS idx_intake_latency_decision
      ON public.request_latency(decision_at DESC)
      WHERE decision_at IS NOT NULL;
    CREATE INDEX IF NOT EXISTS idx_intake_latency_pending
      ON public.request_latency(queued_at)
      WHERE decision_at IS NULL;
  END IF;
END $$;

-- 3b. delivery_tracking: request_id is nullable
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'delivery_tracking'
    AND column_name = 'request_id'
  ) THEN
    DROP INDEX IF EXISTS idx_delivery_request;
    ALTER TABLE public.delivery_tracking RENAME COLUMN request_id TO intake_id;
    CREATE INDEX IF NOT EXISTS idx_delivery_intake
      ON public.delivery_tracking(intake_id)
      WHERE intake_id IS NOT NULL;
  END IF;
END $$;

-- 3c. ai_metrics: request_id is nullable
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'ai_metrics'
    AND column_name = 'request_id'
  ) THEN
    ALTER TABLE public.ai_metrics RENAME COLUMN request_id TO intake_id;
  END IF;
END $$;

-- 3d. compliance_audit_log: request_id NOT NULL — stores intake IDs
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'compliance_audit_log'
    AND column_name = 'request_id'
  ) THEN
    DROP INDEX IF EXISTS idx_compliance_audit_request;
    DROP INDEX IF EXISTS idx_compliance_audit_request_timeline;
    ALTER TABLE public.compliance_audit_log RENAME COLUMN request_id TO intake_id;
    CREATE INDEX IF NOT EXISTS idx_compliance_audit_intake
      ON public.compliance_audit_log(intake_id);
    CREATE INDEX IF NOT EXISTS idx_compliance_audit_intake_timeline
      ON public.compliance_audit_log(intake_id, created_at ASC);
  END IF;
END $$;

-- 3e. document_generation_metrics: request_id column (if table exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'document_generation_metrics'
    AND column_name = 'request_id'
  ) THEN
    ALTER TABLE public.document_generation_metrics RENAME COLUMN request_id TO intake_id;
  END IF;
END $$;

-- ============================================================================
-- 4. RENAME request_id → intake_id ON CORE TABLES
--    (These tables have BOTH request_id and intake_id from 20260210000002.
--     The backfill in 20260212200000 already copied request_id → intake_id.
--     Now we drop the old request_id column entirely.)
-- ============================================================================

-- 4a. audit_logs: rename request_id → intake_id
--     (audit_logs does NOT have an intake_id column yet — rename is needed)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'audit_logs'
    AND column_name = 'request_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'audit_logs'
    AND column_name = 'intake_id'
  ) THEN
    DROP INDEX IF EXISTS idx_audit_logs_request;
    ALTER TABLE public.audit_logs RENAME COLUMN request_id TO intake_id;
    CREATE INDEX IF NOT EXISTS idx_audit_logs_intake
      ON public.audit_logs(intake_id)
      WHERE intake_id IS NOT NULL;
  END IF;
END $$;

-- 4b. date_change_requests: rename request_id → intake_id
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'date_change_requests'
    AND column_name = 'request_id'
  ) THEN
    ALTER TABLE public.date_change_requests RENAME COLUMN request_id TO intake_id;
  END IF;
END $$;

-- 4c. documents: DROP old request_id column (intake_id is now fully populated)
--     Must drop policies that reference request_id BEFORE dropping the column
DROP POLICY IF EXISTS "Patients can view own documents" ON public.documents;
DROP INDEX IF EXISTS idx_documents_request_id;
ALTER TABLE public.documents DROP COLUMN IF EXISTS request_id;

-- 4d. document_verifications: DROP old request_id column
DROP POLICY IF EXISTS "patients_view_own_verifications" ON public.document_verifications;
DROP INDEX IF EXISTS idx_document_verifications_request_id;
ALTER TABLE public.document_verifications DROP COLUMN IF EXISTS request_id;

-- 4e. payments: DROP old request_id column
DROP POLICY IF EXISTS "patients_select_own_payments" ON public.payments;
ALTER TABLE public.payments DROP COLUMN IF EXISTS request_id;

-- 4f. fraud_flags: DROP old request_id column (if both columns exist)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'fraud_flags'
    AND column_name = 'intake_id'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'fraud_flags'
    AND column_name = 'request_id'
  ) THEN
    ALTER TABLE public.fraud_flags DROP COLUMN request_id;
  END IF;
END $$;

-- 4g. priority_upsell_conversions: DROP old request_id column (if both columns exist)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'priority_upsell_conversions'
    AND column_name = 'intake_id'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'priority_upsell_conversions'
    AND column_name = 'request_id'
  ) THEN
    ALTER TABLE public.priority_upsell_conversions DROP COLUMN request_id;
  END IF;
END $$;

-- 4h. email_logs: rename request_id → intake_id (if exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'email_logs'
    AND column_name = 'request_id'
  ) THEN
    ALTER TABLE public.email_logs RENAME COLUMN request_id TO intake_id;
  END IF;
END $$;

-- ============================================================================
-- 5. UPDATE RLS POLICIES for renamed columns
--    (Policies that used dual-mode request_id/intake_id fallback now only
--     need intake_id since the old column is dropped)
-- ============================================================================

-- 5a. payments: simplify to intake_id only
DROP POLICY IF EXISTS "patients_select_own_payments" ON public.payments;
CREATE POLICY "patients_select_own_payments"
  ON public.payments FOR SELECT
  TO authenticated
  USING (
    intake_id IS NOT NULL AND intake_id IN (
      SELECT i.id FROM intakes i
      JOIN profiles p ON i.patient_id = p.id
      WHERE p.auth_user_id = (SELECT auth.uid())
    )
  );

-- 5b. documents: simplify to intake_id only
DROP POLICY IF EXISTS "Patients can view own documents" ON public.documents;
CREATE POLICY "Patients can view own documents"
  ON public.documents FOR SELECT
  TO authenticated
  USING (
    intake_id IS NOT NULL AND intake_id IN (
      SELECT i.id FROM intakes i
      JOIN profiles p ON i.patient_id = p.id
      WHERE p.auth_user_id = (SELECT auth.uid())
    )
  );

-- 5c. document_drafts: simplify to intake_id only
DROP POLICY IF EXISTS "patients_view_own_drafts" ON public.document_drafts;
CREATE POLICY "patients_view_own_drafts"
  ON public.document_drafts FOR SELECT
  TO authenticated
  USING (
    intake_id IS NOT NULL AND intake_id IN (
      SELECT i.id FROM intakes i
      JOIN profiles p ON i.patient_id = p.id
      WHERE p.auth_user_id = (SELECT auth.uid())
    )
  );

-- 5d. document_verifications: simplify to intake_id only
DROP POLICY IF EXISTS "patients_view_own_verifications" ON public.document_verifications;
CREATE POLICY "patients_view_own_verifications"
  ON public.document_verifications FOR SELECT
  TO authenticated
  USING (
    intake_id IS NOT NULL AND intake_id IN (
      SELECT i.id FROM intakes i
      JOIN profiles p ON i.patient_id = p.id
      WHERE p.auth_user_id = (SELECT auth.uid())
    )
  );

-- 5e. Update request_latency RLS policies for renamed column (if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'request_latency') THEN
    DROP POLICY IF EXISTS "request_latency_admin_read" ON public.request_latency;
    DROP POLICY IF EXISTS "intake_latency_admin_read" ON public.request_latency;
    CREATE POLICY "intake_latency_admin_read"
      ON public.request_latency FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.auth_user_id = (SELECT auth.uid())
          AND profiles.role IN ('admin', 'doctor')
        )
      );

    DROP POLICY IF EXISTS "request_latency_service_write" ON public.request_latency;
    DROP POLICY IF EXISTS "intake_latency_service_write" ON public.request_latency;
    CREATE POLICY "intake_latency_service_write"
      ON public.request_latency FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

-- ============================================================================
-- 6. UPDATE audit_log VIEW if it exists (references request_id)
-- ============================================================================

-- The audit_log view was created in 20260209000002 and maps request_id.
-- Recreate it to use intake_id instead.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.views
    WHERE table_schema = 'public' AND table_name = 'audit_log'
  ) THEN
    DROP VIEW IF EXISTS public.audit_log;
    CREATE VIEW public.audit_log AS
    SELECT
      id,
      action AS description,
      actor_id AS profile_id,
      intake_id,
      from_state,
      to_state,
      metadata,
      ip_address,
      user_agent,
      created_at
    FROM public.audit_logs;
  END IF;
END $$;

-- ============================================================================
-- 7. UPDATE compliance_audit_log RPC to use intake_id parameter name
-- ============================================================================

-- Recreate the log_compliance_event function with p_intake_id parameter
-- The old function used p_request_id — PostgreSQL doesn't allow renaming params
-- with CREATE OR REPLACE, so we must DROP first then CREATE
-- Wrapped in conditional to skip if compliance_event_type doesn't exist
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'compliance_event_type') THEN
    -- Drop the existing function with old parameter signature (has defaults)
    DROP FUNCTION IF EXISTS public.log_compliance_event(
      compliance_event_type, UUID, TEXT, UUID, TEXT, BOOLEAN, TEXT, TEXT,
      BOOLEAN, BOOLEAN, BOOLEAN, BOOLEAN, TEXT, JSONB, INET, TEXT
    );

    -- Create the canonical function with p_intake_id parameter
    EXECUTE $fn$
    CREATE FUNCTION public.log_compliance_event(
      p_event_type compliance_event_type,
      p_intake_id UUID,
      p_request_type TEXT,
      p_actor_id UUID DEFAULT NULL,
      p_actor_role TEXT DEFAULT 'system',
      p_is_human_action BOOLEAN DEFAULT true,
      p_outcome TEXT DEFAULT NULL,
      p_previous_outcome TEXT DEFAULT NULL,
      p_call_required BOOLEAN DEFAULT NULL,
      p_call_occurred BOOLEAN DEFAULT NULL,
      p_call_completed_before_decision BOOLEAN DEFAULT NULL,
      p_prescribing_occurred_in_platform BOOLEAN DEFAULT false,
      p_external_prescribing_reference TEXT DEFAULT NULL,
      p_event_data JSONB DEFAULT '{}',
      p_ip_address INET DEFAULT NULL,
      p_user_agent TEXT DEFAULT NULL
    )
    RETURNS UUID
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public
    AS $inner$
    DECLARE
      v_id UUID;
    BEGIN
      INSERT INTO public.compliance_audit_log (
        event_type, intake_id, request_type, actor_id, actor_role,
        is_human_action, outcome, previous_outcome,
        call_required, call_occurred, call_completed_before_decision,
        prescribing_occurred_in_platform, external_prescribing_reference,
        event_data, ip_address, user_agent
      ) VALUES (
        p_event_type, p_intake_id, p_request_type, p_actor_id, p_actor_role,
        p_is_human_action, p_outcome, p_previous_outcome,
        p_call_required, p_call_occurred, p_call_completed_before_decision,
        p_prescribing_occurred_in_platform, p_external_prescribing_reference,
        p_event_data, p_ip_address, p_user_agent
      )
      RETURNING id INTO v_id;
      RETURN v_id;
    END;
    $inner$;
    $fn$;
  END IF;
END $$;

-- ============================================================================
-- 8. RENAME request_id → intake_id ON REMAINING TABLES
-- ============================================================================

-- 8a. stripe_webhook_events: rename request_id → intake_id
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'stripe_webhook_events'
    AND column_name = 'request_id'
  ) THEN
    DROP INDEX IF EXISTS idx_stripe_webhook_events_request_id;
    ALTER TABLE public.stripe_webhook_events RENAME COLUMN request_id TO intake_id;
    CREATE INDEX IF NOT EXISTS idx_stripe_webhook_events_intake_id
      ON public.stripe_webhook_events(intake_id)
      WHERE intake_id IS NOT NULL;
  END IF;
END $$;

-- 8b. Update try_process_stripe_event function to use intake_id column
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'stripe_webhook_events') THEN
    EXECUTE $fn$
    CREATE OR REPLACE FUNCTION public.try_process_stripe_event(
      p_event_id TEXT,
      p_event_type TEXT,
      p_request_id UUID DEFAULT NULL,
      p_session_id TEXT DEFAULT NULL,
      p_metadata JSONB DEFAULT '{}'
    )
    RETURNS BOOLEAN
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = 'public'
    AS $inner$
    DECLARE
      v_inserted BOOLEAN;
    BEGIN
      INSERT INTO stripe_webhook_events (event_id, event_type, intake_id, session_id, metadata, processed_at, created_at)
      VALUES (p_event_id, p_event_type, p_request_id, p_session_id, p_metadata, NOW(), NOW())
      ON CONFLICT (event_id) DO NOTHING;
      SELECT EXISTS (
        SELECT 1 FROM stripe_webhook_events
        WHERE event_id = p_event_id
        AND processed_at >= NOW() - INTERVAL '1 second'
      ) INTO v_inserted;
      RETURN v_inserted;
    END;
    $inner$;
    $fn$;

    GRANT EXECUTE ON FUNCTION public.try_process_stripe_event TO authenticated;
  END IF;
END $$;

-- 8c. stripe_webhook_dead_letter: rename request_id → intake_id (if column exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'stripe_webhook_dead_letter'
    AND column_name = 'request_id'
  ) THEN
    ALTER TABLE public.stripe_webhook_dead_letter RENAME COLUMN request_id TO intake_id;
  END IF;
END $$;

-- 8d. request_documents: rename request_id → intake_id (if table exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'request_documents'
    AND column_name = 'request_id'
  ) THEN
    -- Drop FK to requests table first
    ALTER TABLE public.request_documents DROP CONSTRAINT IF EXISTS request_documents_request_id_fkey;
    ALTER TABLE public.request_documents RENAME COLUMN request_id TO intake_id;
    -- Add new FK to intakes
    ALTER TABLE public.request_documents
      ADD CONSTRAINT request_documents_intake_id_fkey
      FOREIGN KEY (intake_id) REFERENCES public.intakes(id) ON DELETE CASCADE;
  END IF;
END $$;

-- 8e. payment_reconciliation: rename request_id → intake_id (if table exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'payment_reconciliation'
    AND column_name = 'request_id'
  ) THEN
    -- Drop FK to requests table first
    ALTER TABLE public.payment_reconciliation DROP CONSTRAINT IF EXISTS payment_reconciliation_request_id_fkey;
    ALTER TABLE public.payment_reconciliation RENAME COLUMN request_id TO intake_id;
    -- Add new FK to intakes
    ALTER TABLE public.payment_reconciliation
      ADD CONSTRAINT payment_reconciliation_intake_id_fkey
      FOREIGN KEY (intake_id) REFERENCES public.intakes(id);
  END IF;
END $$;
