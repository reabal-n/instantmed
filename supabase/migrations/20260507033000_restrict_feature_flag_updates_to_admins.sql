-- Restrict feature flag and kill-switch mutations to admins only.
-- The application admin page already enforces this, but the RLS policy also
-- has to be authoritative because authenticated clients can call Supabase
-- directly with the public anon key.

DROP POLICY IF EXISTS "doctors_update_feature_flags" ON public.feature_flags;
DROP POLICY IF EXISTS "admins_update_feature_flags" ON public.feature_flags;

CREATE POLICY "admins_update_feature_flags" ON public.feature_flags
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE profiles.auth_user_id = (select auth.uid())
        AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE profiles.auth_user_id = (select auth.uid())
        AND profiles.role = 'admin'
    )
  );
