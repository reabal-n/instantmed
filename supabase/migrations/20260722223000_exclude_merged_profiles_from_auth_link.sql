-- Keep Supabase Auth creation from relinking an archived duplicate patient.
-- Patient merges move clinical references to the canonical profile, then mark
-- the duplicate with merged_into_profile_id. Only canonical open profiles may
-- receive a new auth_user_id.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_guest_profile_id uuid;
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.closed_auth_accounts closed
    WHERE closed.auth_user_id = NEW.id
  ) THEN
    RETURN NEW;
  END IF;

  SELECT p.id
  INTO v_guest_profile_id
  FROM public.profiles p
  WHERE LOWER(p.email) = LOWER(NEW.email)
    AND p.auth_user_id IS NULL
    AND p.account_closed_at IS NULL
    AND p.merged_into_profile_id IS NULL
    AND p.role = 'patient'
  ORDER BY
    EXISTS (
      SELECT 1
      FROM public.intakes i
      WHERE i.patient_id = p.id
        AND i.payment_status = 'paid'
    ) DESC,
    p.created_at DESC
  LIMIT 1;

  IF v_guest_profile_id IS NOT NULL THEN
    UPDATE public.profiles p
    SET
      auth_user_id = NEW.id,
      email_verified = true,
      email_verified_at = NOW()
    WHERE p.id = v_guest_profile_id
      AND p.auth_user_id IS NULL
      AND p.account_closed_at IS NULL
      AND p.merged_into_profile_id IS NULL;
  ELSE
    INSERT INTO public.profiles (auth_user_id, email, full_name, role)
    VALUES (
      NEW.id,
      LOWER(NEW.email),
      COALESCE(
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'name',
        split_part(NEW.email, '@', 1)
      ),
      'patient'
    )
    ON CONFLICT (auth_user_id) DO NOTHING;
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'handle_new_user trigger failed for user %: %',
    NEW.id, SQLERRM;
  RETURN NEW;
END;
$$;

-- Trigger-only policy: client and service RPC callers must not invoke this
-- SECURITY DEFINER function directly.
REVOKE EXECUTE ON FUNCTION public.handle_new_user()
  FROM PUBLIC, anon, authenticated, service_role;
