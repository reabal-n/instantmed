-- Ensure archived audit rows keep the same locked-down posture as live audit logs.
-- Service-role retention RPCs bypass RLS; anon/authenticated clients receive no
-- direct table access because there are intentionally no policies.

ALTER TABLE public.audit_logs_archive ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.audit_logs_archive IS
  'Archived audit log rows moved by archive_old_audit_logs(). RLS enabled; access is service-role/RPC only.';
