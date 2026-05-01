-- Link only one deterministic guest profile when a Supabase Auth user is created.
-- The previous trigger bulk-updated every guest profile with the same email.
-- With duplicate guest profiles, that can violate the unique auth_user_id
-- constraint and leave paid checkout profiles unlinked.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_guest_profile_id uuid;
BEGIN
  SELECT p.id
  INTO v_guest_profile_id
  FROM public.profiles p
  WHERE LOWER(p.email) = LOWER(NEW.email)
    AND p.auth_user_id IS NULL
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
      auth_user_id       = NEW.id,
      email_verified     = true,
      email_verified_at  = NOW()
    WHERE p.id = v_guest_profile_id
      AND p.auth_user_id IS NULL;
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
  RAISE WARNING 'handle_new_user trigger failed for user % (email: %): %',
    NEW.id, NEW.email, SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
