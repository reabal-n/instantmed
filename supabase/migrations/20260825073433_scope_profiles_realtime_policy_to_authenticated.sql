-- Realtime evaluates SELECT policies for each subscriber before delivering a
-- Postgres change. This policy calls `is_doctor()`, whose EXECUTE privilege is
-- intentionally limited to authenticated users. Restricting the policy to the
-- same role prevents anonymous/stale connections from raising 42501 while
-- preserving the existing own-profile and staff access predicates.

DROP POLICY IF EXISTS "profiles_select_own_or_doctor" ON public.profiles;

CREATE POLICY "profiles_select_own_or_doctor"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    auth_user_id = (select auth.uid())
    OR (select public.is_doctor())
  );
