-- Apply RPC privileges as one statement so Supabase Preview does not pack
-- multiple top-level commands into one prepared statement.

DO $$
BEGIN
  EXECUTE 'REVOKE ALL ON FUNCTION public.atomic_approve_certificate(uuid,text,text,text,text,date,date,date,uuid,text,date,uuid,text,text,text,text,jsonb,jsonb,text,integer,text,text,text,jsonb) FROM PUBLIC, anon, authenticated';
  EXECUTE 'GRANT EXECUTE ON FUNCTION public.atomic_approve_certificate(uuid,text,text,text,text,date,date,date,uuid,text,date,uuid,text,text,text,text,jsonb,jsonb,text,integer,text,text,text,jsonb) TO service_role';

  EXECUTE 'REVOKE ALL ON FUNCTION public.request_more_info_atomic(uuid, uuid, text, text, timestamptz) FROM PUBLIC';
  EXECUTE 'REVOKE ALL ON FUNCTION public.request_more_info_atomic(uuid, uuid, text, text, timestamptz) FROM anon';
  EXECUTE 'REVOKE ALL ON FUNCTION public.request_more_info_atomic(uuid, uuid, text, text, timestamptz) FROM authenticated';
  EXECUTE 'GRANT EXECUTE ON FUNCTION public.request_more_info_atomic(uuid, uuid, text, text, timestamptz) TO service_role';

  EXECUTE 'REVOKE ALL ON FUNCTION public.respond_to_info_request_atomic(uuid, uuid, text, timestamptz) FROM PUBLIC';
  EXECUTE 'REVOKE ALL ON FUNCTION public.respond_to_info_request_atomic(uuid, uuid, text, timestamptz) FROM anon';
  EXECUTE 'REVOKE ALL ON FUNCTION public.respond_to_info_request_atomic(uuid, uuid, text, timestamptz) FROM authenticated';
  EXECUTE 'GRANT EXECUTE ON FUNCTION public.respond_to_info_request_atomic(uuid, uuid, text, timestamptz) TO service_role';

  EXECUTE 'CREATE INDEX IF NOT EXISTS idx_patient_messages_intake_created_at ON public.patient_messages(intake_id, created_at)';
END $$;
