-- Drop the legacy email_logs table after migration to email_outbox
-- This migration should only run after 20260130000002_migrate_email_logs_to_outbox.sql

-- Drop trigger first
DROP TRIGGER IF EXISTS email_logs_updated_at ON public.email_logs;

-- Drop indexes
DROP INDEX IF EXISTS idx_email_logs_request;
DROP INDEX IF EXISTS idx_email_logs_recipient;
DROP INDEX IF EXISTS idx_email_logs_resend_id;
DROP INDEX IF EXISTS idx_email_logs_status;
DROP INDEX IF EXISTS idx_email_logs_created;

-- Drop policies
DROP POLICY IF EXISTS "Service role full access to email_logs" ON public.email_logs;
DROP POLICY IF EXISTS "Admins can view email logs" ON public.email_logs;
DROP POLICY IF EXISTS "Patients can view own email logs" ON public.email_logs;

-- Drop the table
DROP TABLE IF EXISTS public.email_logs;

COMMENT ON TABLE email_outbox IS 'Consolidated email audit log - replaces legacy email_logs table';
