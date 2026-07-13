-- SECURITY DEFINER functions inherit EXECUTE for PUBLIC unless every function
-- makes an explicit privilege decision. Lock down the migration owner first so
-- future functions do not reopen this exposure by default.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC, anon, authenticated;

-- This manifest is the reviewed policy for all 36 SECURITY DEFINER functions
-- that were executable by anon or authenticated before this migration.
DO $acl_policy$
DECLARE
  function_signature text;
  function_oid regprocedure;
  function_policy text;
BEGIN
  FOR function_signature, function_oid, function_policy IN
    SELECT
      policy.function_signature,
      pg_catalog.to_regprocedure(policy.function_signature),
      policy.access_policy
    FROM (
      VALUES
        ('public.add_to_webhook_dead_letter(text, text, text, uuid, text, text, jsonb)', 'service_role'),
        ('public.approve_draft(uuid, uuid, jsonb)', 'service_role'),
        ('public.archive_old_audit_logs(integer)', 'service_role'),
        ('public.audit_phi_access()', 'trigger'),
        ('public.audit_phi_access(text, uuid, text, uuid, text, text)', 'service_role'),
        ('public.check_employer_email_rate_limit(uuid)', 'service_role'),
        ('public.cleanup_expired_partial_intakes()', 'service_role'),
        ('public.count_intakes_today_sydney()', 'service_role'),
        ('public.e2e_reset_intake_status(uuid, text)', 'service_role'),
        ('public.expire_pending_payment_intakes(integer)', 'service_role'),
        ('public.get_email_outbox_stats()', 'service_role'),
        ('public.get_my_profile_id()', 'authenticated'),
        ('public.get_or_create_email_preferences(uuid)', 'service_role'),
        ('public.get_queue_position(uuid)', 'service_role'),
        ('public.handle_new_user()', 'trigger'),
        ('public.increment_auto_approval_attempts(uuid)', 'service_role'),
        ('public.is_doctor()', 'authenticated'),
        ('public.is_doctor_or_admin()', 'authenticated'),
        ('public.is_patient()', 'authenticated'),
        ('public.log_ai_audit(uuid, ai_audit_action, draft_type, uuid, uuid, ai_actor_type, character varying, character varying, character varying, integer, integer, integer, boolean, boolean, jsonb, jsonb, jsonb, text)', 'service_role'),
        ('public.log_certificate_edit()', 'trigger'),
        ('public.log_certificate_edit(uuid, uuid, uuid, text, text, text, text)', 'service_role'),
        ('public.log_compliance_event(compliance_event_type, uuid, text, uuid, text, boolean, text, text, boolean, boolean, boolean, boolean, text, jsonb, inet, text)', 'service_role'),
        ('public.log_intake_event(uuid, text, text, uuid, intake_status, intake_status, jsonb)', 'service_role'),
        ('public.medications_search_vector_update()', 'trigger'),
        ('public.merge_guest_profile(uuid, uuid)', 'service_role'),
        ('public.payment_exists_for_session(text)', 'service_role'),
        ('public.reject_draft(uuid, uuid, text)', 'service_role'),
        ('public.release_intake_claim(uuid, uuid)', 'service_role'),
        ('public.release_stale_intake_claims(integer)', 'service_role'),
        ('public.search_medications(text, integer)', 'service_role'),
        ('public.try_process_stripe_event(text, text, uuid, text, jsonb)', 'service_role'),
        ('public.update_certificate_edit_count()', 'trigger'),
        ('public.update_email_outbox_updated_at()', 'trigger'),
        ('public.update_repeat_rx_updated_at()', 'trigger'),
        ('public.upsert_exit_intent_capture(text, text)', 'service_role')
    ) AS policy(function_signature, access_policy)
  LOOP
    IF function_oid IS NULL THEN
      RAISE EXCEPTION 'Expected SECURITY DEFINER function is missing from ACL policy: %', function_signature;
    END IF;

    EXECUTE pg_catalog.format(
      'REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon, authenticated, service_role',
      function_oid
    );

    IF function_policy = 'service_role' THEN
      EXECUTE pg_catalog.format(
        'GRANT EXECUTE ON FUNCTION %s TO service_role',
        function_oid
      );
    ELSIF function_policy = 'authenticated' THEN
      EXECUTE pg_catalog.format(
        'GRANT EXECUTE ON FUNCTION %s TO authenticated',
        function_oid
      );
      EXECUTE pg_catalog.format(
        'GRANT EXECUTE ON FUNCTION %s TO service_role',
        function_oid
      );
    ELSIF function_policy <> 'trigger' THEN
      RAISE EXCEPTION 'Unknown SECURITY DEFINER ACL policy: %', function_policy;
    END IF;

    IF pg_catalog.has_function_privilege('anon', function_oid, 'EXECUTE')
      OR pg_catalog.has_function_privilege('authenticated', function_oid, 'EXECUTE')
        <> (function_policy = 'authenticated')
      OR pg_catalog.has_function_privilege('service_role', function_oid, 'EXECUTE')
        <> (function_policy IN ('authenticated', 'service_role'))
    THEN
      RAISE EXCEPTION 'SECURITY DEFINER ACL policy was not applied exactly: %', function_signature;
    END IF;
  END LOOP;
END
$acl_policy$;

-- Service-side verification remains SECURITY INVOKER so it cannot elevate the
-- caller. It checks every current public SECURITY DEFINER function, not only the
-- 36-function incident manifest, and therefore catches future exposure too.
CREATE OR REPLACE FUNCTION public.security_definer_acl_violations()
RETURNS TABLE (
  function_signature text,
  violation text
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $function$
  WITH allowed_authenticated(function_oid) AS (
    VALUES
      ('public.get_my_profile_id()'::pg_catalog.regprocedure::oid),
      ('public.is_doctor()'::pg_catalog.regprocedure::oid),
      ('public.is_doctor_or_admin()'::pg_catalog.regprocedure::oid),
      ('public.is_patient()'::pg_catalog.regprocedure::oid)
  ),
  security_definer_functions AS (
    SELECT
      function_definition.oid,
      pg_catalog.format(
        '%I.%I(%s)',
        function_namespace.nspname,
        function_definition.proname,
        pg_catalog.pg_get_function_identity_arguments(function_definition.oid)
      ) AS signature
    FROM pg_catalog.pg_proc AS function_definition
    INNER JOIN pg_catalog.pg_namespace AS function_namespace
      ON function_namespace.oid = function_definition.pronamespace
    WHERE function_namespace.nspname = 'public'
      AND function_definition.prosecdef
  )
  SELECT
    function_definition.signature,
    'anon_execute'::text
  FROM security_definer_functions AS function_definition
  WHERE pg_catalog.has_function_privilege(
    'anon',
    function_definition.oid,
    'EXECUTE'
  )

  UNION ALL

  SELECT
    function_definition.signature,
    'authenticated_execute'::text
  FROM security_definer_functions AS function_definition
  WHERE pg_catalog.has_function_privilege(
    'authenticated',
    function_definition.oid,
    'EXECUTE'
  )
    AND NOT EXISTS (
      SELECT 1
      FROM allowed_authenticated AS allowed
      WHERE allowed.function_oid = function_definition.oid
    )

  ORDER BY 1, 2;
$function$;

REVOKE EXECUTE ON FUNCTION public.security_definer_acl_violations() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.security_definer_acl_violations() TO service_role;

DO $verify_acl$
DECLARE
  violations text[];
BEGIN
  SELECT pg_catalog.array_agg(
    pg_catalog.format('%s [%s]', result.function_signature, result.violation)
  )
  INTO violations
  FROM public.security_definer_acl_violations() AS result;

  IF pg_catalog.coalesce(pg_catalog.array_length(violations, 1), 0) > 0 THEN
    RAISE EXCEPTION 'SECURITY DEFINER ACL verification failed: %',
      pg_catalog.array_to_string(violations, ', ');
  END IF;
END
$verify_acl$;
