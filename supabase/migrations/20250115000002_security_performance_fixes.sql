-- ============================================================================
-- SECURITY & PERFORMANCE FIXES
-- Migration: 20250115000001
-- Purpose: Fix function search_path and RLS initplan issues from Supabase advisors
-- ============================================================================

-- ============================================================================
-- SECURITY: Fix function search_path
-- Functions should have immutable search_path to prevent privilege escalation
-- ============================================================================

-- Fix claim_request_for_review
ALTER FUNCTION public.claim_request_for_review(uuid, uuid, boolean) SET search_path = public;

-- Fix release_request_claim
ALTER FUNCTION public.release_request_claim(uuid, uuid) SET search_path = public;

-- Fix add_to_webhook_dead_letter
ALTER FUNCTION public.add_to_webhook_dead_letter(text, text, text, uuid, text, text, jsonb) SET search_path = public;

-- Fix set_updated_at
ALTER FUNCTION public.set_updated_at() SET search_path = public;

-- Fix update_updated_at
ALTER FUNCTION public.update_updated_at() SET search_path = public;

-- Fix log_ai_audit (complex signature with many params)
ALTER FUNCTION public.log_ai_audit(uuid, ai_audit_action, draft_type, uuid, uuid, ai_actor_type, varchar, varchar, varchar, integer, integer, integer, boolean, boolean, jsonb, jsonb, jsonb, text) SET search_path = public;

-- Fix approve_draft
ALTER FUNCTION public.approve_draft(uuid, uuid, jsonb) SET search_path = public;

-- Fix reject_draft
ALTER FUNCTION public.reject_draft(uuid, uuid, text) SET search_path = public;

-- ============================================================================
-- PERFORMANCE: Fix RLS policies using auth.uid() without subselect
-- Replace auth.uid() with (select auth.uid()) for better query planning
-- ============================================================================

-- request_documents: Patients can view own documents
DROP POLICY IF EXISTS "Patients can view own documents" ON public.request_documents;
CREATE POLICY "Patients can view own documents" ON public.request_documents
  FOR SELECT USING (
    request_id IN (
      SELECT id FROM requests WHERE patient_id IN (
        SELECT id FROM profiles WHERE auth_user_id = (select auth.uid())
      )
    )
  );

-- request_documents: Doctors can view all documents
DROP POLICY IF EXISTS "Doctors can view all documents" ON public.request_documents;
CREATE POLICY "Doctors can view all documents" ON public.request_documents
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE auth_user_id = (select auth.uid())
      AND role IN ('doctor', 'admin')
    )
  );

-- request_documents: Doctors can create documents
DROP POLICY IF EXISTS "Doctors can create documents" ON public.request_documents;
CREATE POLICY "Doctors can create documents" ON public.request_documents
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE auth_user_id = (select auth.uid())
      AND role IN ('doctor', 'admin')
    )
  );

-- decline_reason_templates: Admins can manage templates
DROP POLICY IF EXISTS "Admins can manage templates" ON public.decline_reason_templates;
CREATE POLICY "Admins can manage templates" ON public.decline_reason_templates
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE auth_user_id = (select auth.uid())
      AND role = 'admin'
    )
  );

-- stripe_webhook_dead_letter: Admins can view dead letter queue
DROP POLICY IF EXISTS "Admins can view dead letter queue" ON public.stripe_webhook_dead_letter;
CREATE POLICY "Admins can view dead letter queue" ON public.stripe_webhook_dead_letter
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE auth_user_id = (select auth.uid())
      AND role = 'admin'
    )
  );

-- ============================================================================
-- PERFORMANCE: Add indexes for unindexed foreign keys
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_document_drafts_rejected_by 
  ON public.document_drafts(rejected_by);

CREATE INDEX IF NOT EXISTS idx_intake_documents_created_by 
  ON public.intake_documents(created_by);

CREATE INDEX IF NOT EXISTS idx_intakes_reviewed_by 
  ON public.intakes(reviewed_by);

CREATE INDEX IF NOT EXISTS idx_payment_reconciliation_request_id 
  ON public.payment_reconciliation(request_id);

CREATE INDEX IF NOT EXISTS idx_payment_reconciliation_resolved_by 
  ON public.payment_reconciliation(resolved_by);

CREATE INDEX IF NOT EXISTS idx_request_documents_created_by 
  ON public.request_documents(created_by);

CREATE INDEX IF NOT EXISTS idx_stripe_webhook_dead_letter_resolved_by 
  ON public.stripe_webhook_dead_letter(resolved_by);

-- ============================================================================
-- DONE
-- ============================================================================

COMMENT ON SCHEMA public IS 'Security and performance fixes applied - 2025-01-15';
