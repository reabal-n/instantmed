-- ============================================================================
-- SECURITY FIX: Revoke atomic_approve_certificate from authenticated role
-- ============================================================================
--
-- The atomic_approve_certificate RPC is SECURITY DEFINER and bypasses RLS.
-- It should ONLY be callable from server-side code via service_role.
-- Granting to 'authenticated' allows any logged-in user (including patients)
-- to potentially call this RPC directly, bypassing application-layer auth.
--
-- This migration revokes access from 'authenticated' and ensures only
-- 'service_role' can execute the function.
--
-- NOTE: claim_intake_for_review, release_intake_claim, log_certificate_edit
-- are NOT revoked here because they may be called from client-side code.
-- Only atomic_approve_certificate is revoked as it performs the critical
-- certificate issuance operation.
-- ============================================================================

-- Revoke from authenticated (patients and any logged-in user)
REVOKE EXECUTE ON FUNCTION public.atomic_approve_certificate(
  UUID, TEXT, TEXT, TEXT, TEXT, DATE, DATE, DATE,
  UUID, TEXT, DATE, UUID, TEXT, TEXT, TEXT, TEXT,
  JSONB, JSONB, TEXT, INTEGER, TEXT, TEXT
) FROM authenticated;

-- Ensure service_role retains access (server-side only)
GRANT EXECUTE ON FUNCTION public.atomic_approve_certificate(
  UUID, TEXT, TEXT, TEXT, TEXT, DATE, DATE, DATE,
  UUID, TEXT, DATE, UUID, TEXT, TEXT, TEXT, TEXT,
  JSONB, JSONB, TEXT, INTEGER, TEXT, TEXT
) TO service_role;

-- Update comment for documentation
COMMENT ON FUNCTION public.atomic_approve_certificate IS
'Atomic certificate approval. SECURITY DEFINER - callable only via service_role (server-side).
Access revoked from authenticated role as of 2026-01-25 for security.
Canonical path: app/actions/approve-cert.ts -> approveAndSendCert()';
