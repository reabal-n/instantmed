-- Security Fix: Remove SECURITY DEFINER from compliance_audit_summary view
-- Addresses: security_definer_view error from Supabase linter
-- See: https://supabase.com/docs/guides/database/database-linter?lint=0010_security_definer_view
--
-- SECURITY DEFINER views bypass the querying user's RLS policies, which is dangerous.
-- We recreate the view without SECURITY DEFINER (default is SECURITY INVOKER).

DROP VIEW IF EXISTS public.compliance_audit_summary;

CREATE VIEW public.compliance_audit_summary
WITH (security_invoker = true)
AS
SELECT
  cal.request_id,
  cal.request_type,
  
  -- Q1: Who reviewed this request?
  (
    SELECT p.full_name 
    FROM public.compliance_audit_log c
    JOIN public.profiles p ON p.id = c.actor_id
    WHERE c.request_id = cal.request_id
    AND c.event_type IN ('clinician_reviewed_request', 'clinician_selected_outcome')
    ORDER BY c.created_at DESC
    LIMIT 1
  ) AS reviewed_by,
  
  -- Q2: When was the decision made?
  (
    SELECT c.created_at 
    FROM public.compliance_audit_log c
    WHERE c.request_id = cal.request_id
    AND c.event_type = 'outcome_assigned'
    ORDER BY c.created_at DESC
    LIMIT 1
  ) AS decision_at,
  
  -- Q3: What was the outcome?
  (
    SELECT c.outcome 
    FROM public.compliance_audit_log c
    WHERE c.request_id = cal.request_id
    AND c.event_type = 'outcome_assigned'
    ORDER BY c.created_at DESC
    LIMIT 1
  ) AS final_outcome,
  
  -- Q4: Was a call required?
  (
    SELECT c.call_required 
    FROM public.compliance_audit_log c
    WHERE c.request_id = cal.request_id
    AND c.call_required IS NOT NULL
    ORDER BY c.created_at DESC
    LIMIT 1
  ) AS call_required,
  
  -- Q4b: Did a call occur before decision?
  (
    SELECT c.call_completed_before_decision 
    FROM public.compliance_audit_log c
    WHERE c.request_id = cal.request_id
    AND c.call_completed_before_decision IS NOT NULL
    ORDER BY c.created_at DESC
    LIMIT 1
  ) AS call_completed_before_decision,
  
  -- Q5: Where did prescribing occur?
  CASE
    WHEN EXISTS (
      SELECT 1 FROM public.compliance_audit_log c
      WHERE c.request_id = cal.request_id
      AND c.prescribing_occurred_in_platform = true
    ) THEN 'IN_PLATFORM_ERROR'
    WHEN EXISTS (
      SELECT 1 FROM public.compliance_audit_log c
      WHERE c.request_id = cal.request_id
      AND c.external_prescribing_reference IS NOT NULL
    ) THEN (
      SELECT c.external_prescribing_reference 
      FROM public.compliance_audit_log c
      WHERE c.request_id = cal.request_id
      AND c.external_prescribing_reference IS NOT NULL
      ORDER BY c.created_at DESC
      LIMIT 1
    )
    ELSE 'NO_PRESCRIBING'
  END AS prescribing_location,
  
  -- Human-in-the-loop verification
  EXISTS (
    SELECT 1 FROM public.compliance_audit_log c
    WHERE c.request_id = cal.request_id
    AND c.is_human_action = true
    AND c.actor_role = 'clinician'
    AND c.event_type IN ('clinician_reviewed_request', 'clinician_selected_outcome')
  ) AS has_human_review,
  
  -- Timeline completeness check
  (
    SELECT COUNT(DISTINCT c.event_type) 
    FROM public.compliance_audit_log c
    WHERE c.request_id = cal.request_id
    AND c.event_type IN ('request_created', 'request_reviewed', 'outcome_assigned')
  ) AS lifecycle_events_count

FROM public.compliance_audit_log cal
GROUP BY cal.request_id, cal.request_type;

COMMENT ON VIEW public.compliance_audit_summary IS 
  'Answers the 5 audit readiness questions from AUDIT_LOGGING_REQUIREMENTS.md. Uses SECURITY INVOKER for proper RLS enforcement.';
