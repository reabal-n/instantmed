-- AUDIT FIX: Prevent role escalation via profile updates
-- The previous policy compared NEW.role against a subquery on the same row,
-- which under concurrent updates isn't guaranteed-safe.
-- This constraint ensures role can NEVER be changed via UPDATE.

-- Drop the existing policy
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;

-- Recreate with explicit role immutability
-- Users can update their own profile but CANNOT change their role
CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE
  USING (auth.uid()::text = clerk_user_id)
  WITH CHECK (
    auth.uid()::text = clerk_user_id
    AND role IS NOT DISTINCT FROM (
      SELECT p.role FROM public.profiles p WHERE p.id = profiles.id
    )
  );

-- Add a CHECK constraint as defense-in-depth
-- This trigger prevents role changes even from service_role
CREATE OR REPLACE FUNCTION prevent_role_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.role IS DISTINCT FROM NEW.role THEN
    RAISE EXCEPTION 'Role changes are not permitted via UPDATE. Use admin API.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS prevent_role_change_trigger ON public.profiles;
CREATE TRIGGER prevent_role_change_trigger
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION prevent_role_change();

-- Comment for documentation
COMMENT ON TRIGGER prevent_role_change_trigger ON public.profiles IS
  'AUDIT FIX: Prevents role escalation attacks by blocking role changes via UPDATE';
