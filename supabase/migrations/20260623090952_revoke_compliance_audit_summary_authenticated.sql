-- Complete the 2026-06-12 anon-readable lockdown
-- (20260612000000_lockdown_anon_readable_surfaces.sql). That migration revoked
-- compliance_audit_summary from anon but deliberately left the `authenticated`
-- grant, banking on the underlying compliance_audit_log RLS (staff-only, so
-- non-staff already get zero rows via the security_invoker view). Revoke
-- `authenticated` too so this surface matches v_stuck_intakes /
-- document_verifications — belt-and-suspenders, non-breaking (RLS still gates rows).
REVOKE ALL ON public.compliance_audit_summary FROM anon, authenticated;
