-- Retire intake triggers that exist only after replaying the squashed baseline.
--
-- The baseline first creates a legacy public.audit_log table plus automatic
-- intake audit triggers. A later squashed migration replaces that table with a
-- compatibility view over public.audit_logs. PostgreSQL does not track table
-- references inside PL/pgSQL bodies, so dropping the table leaves the trigger
-- functions behind. On a clean reset, every intake INSERT and status change
-- then calls log_audit_event(), which attempts to insert columns that the view
-- does not expose.
--
-- These three functions and their triggers are absent from production and
-- have no application callers. Drop them without CASCADE so an unexpected
-- dependency fails the migration instead of silently widening the cleanup.
--
-- The same replay also recreates the production-shaped
-- archive_old_audit_logs(integer) after the squashed baseline renamed its
-- source request_id column and omitted the legacy retention columns.
-- Production still has the complete legacy source/target shape and a valid
-- archival RPC. Remove only an existing RPC whose required schema is absent.

DROP TRIGGER IF EXISTS audit_intake_create
  ON public.intakes;
DROP TRIGGER IF EXISTS audit_intake_status
  ON public.intakes;
DROP TRIGGER IF EXISTS trigger_notify_on_intake_status_change
  ON public.intakes;

DROP FUNCTION IF EXISTS public.audit_intake_created();
DROP FUNCTION IF EXISTS public.audit_intake_status_change();
DROP FUNCTION IF EXISTS public.notify_on_intake_status_change();
DROP FUNCTION IF EXISTS public.log_audit_event(
  public.audit_event_type,
  text,
  uuid,
  uuid,
  uuid,
  text,
  jsonb,
  jsonb,
  jsonb,
  text,
  text,
  text
);

DO $cleanup$
BEGIN
  IF to_regprocedure('public.archive_old_audit_logs(integer)') IS NOT NULL
    AND (
      to_regclass('public.audit_logs_archive') IS NULL
      OR NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'audit_logs'
          AND column_name = 'request_id'
      )
      OR NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'audit_logs'
          AND column_name = 'archived_at'
      )
      OR NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'audit_logs'
          AND column_name = 'retention_tier'
      )
    )
  THEN
    DROP FUNCTION IF EXISTS public.archive_old_audit_logs(integer);
  END IF;
END;
$cleanup$;
