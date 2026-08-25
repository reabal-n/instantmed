-- `is_doctor()` intentionally grants EXECUTE only to authenticated and
-- service-role callers. Keep every RLS policy that invokes it on the same role
-- boundary so anonymous Realtime/PostgREST evaluation cannot raise 42501.

DROP POLICY IF EXISTS "profiles_select_own_or_doctor" ON public.profiles;
DROP POLICY IF EXISTS doctors_manage_documents ON public.documents;
DROP POLICY IF EXISTS "Doctors can insert verifications" ON public.document_verifications;

CREATE POLICY "profiles_select_own_or_doctor"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    auth_user_id = (select auth.uid())
    OR (select public.is_doctor())
  );

CREATE POLICY doctors_manage_documents
  ON public.documents
  FOR ALL
  TO authenticated
  USING ((select public.is_doctor()))
  WITH CHECK ((select public.is_doctor()));

CREATE POLICY "Doctors can insert verifications"
  ON public.document_verifications
  FOR INSERT
  TO authenticated
  WITH CHECK ((select public.is_doctor()));

DO $verify_authenticated_is_doctor_policies$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM (
      VALUES
        ('public', 'profiles', 'profiles_select_own_or_doctor'),
        ('public', 'documents', 'doctors_manage_documents'),
        ('public', 'document_verifications', 'Doctors can insert verifications')
    ) AS expected(schema_name, table_name, policy_name)
    LEFT JOIN pg_catalog.pg_policies AS policy
      ON policy.schemaname = expected.schema_name::name
      AND policy.tablename = expected.table_name::name
      AND policy.policyname = expected.policy_name::name
    WHERE policy.policyname IS NULL
      OR policy.roles IS DISTINCT FROM ARRAY['authenticated']::name[]
  ) THEN
    RAISE EXCEPTION 'Authenticated is_doctor RLS policy verification failed';
  END IF;
END;
$verify_authenticated_is_doctor_policies$;
