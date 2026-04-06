-- ============================================================================
-- Drop ambiguous 2-param overload of claim_intake_for_review
-- The 3-param version (p_intake_id, p_doctor_id, p_force) is the canonical one
-- used by approve-cert.ts. It returns TABLE(success, error_message, current_claimant)
-- and handles timeouts/force reclaim. The old 2-param version just returned boolean
-- and could cause PostgREST function resolution ambiguity.
-- ============================================================================

DROP FUNCTION IF EXISTS public.claim_intake_for_review(uuid, uuid);
