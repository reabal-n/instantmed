-- Fix role comparison casts in admin_change_profile_role.

BEGIN;

CREATE OR REPLACE FUNCTION public.admin_change_profile_role(
  p_profile_id uuid,
  p_target_role text,
  p_reason text DEFAULT NULL
)
RETURNS TABLE (
  profile_id uuid,
  email text,
  from_role text,
  to_role text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile public.profiles%ROWTYPE;
  v_target_role public.user_role;
  v_human_admin_count integer;
BEGIN
  IF p_target_role NOT IN ('patient', 'doctor', 'support') THEN
    RAISE EXCEPTION 'Target role must be patient, doctor, or support.';
  END IF;

  v_target_role := p_target_role::public.user_role;

  SELECT *
  INTO v_profile
  FROM public.profiles
  WHERE id = p_profile_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile not found.';
  END IF;

  IF v_profile.role::text = v_target_role::text THEN
    profile_id := v_profile.id;
    email := v_profile.email;
    from_role := v_profile.role::text;
    to_role := v_target_role::text;
    RETURN NEXT;
    RETURN;
  END IF;

  IF v_profile.role = 'admin' THEN
    SELECT count(*)
    INTO v_human_admin_count
    FROM public.profiles
    WHERE role = 'admin'
      AND auth_user_id IS NOT NULL;

    IF v_human_admin_count <= 1 THEN
      RAISE EXCEPTION 'Refusing to demote the last auth-linked human admin.';
    END IF;
  END IF;

  PERFORM set_config('app.allow_profile_role_change', 'on', true);

  UPDATE public.profiles
  SET
    role = v_target_role,
    doctor_available = CASE WHEN v_target_role = 'doctor' THEN false ELSE doctor_available END,
    can_review_med_certs = false,
    can_review_repeat_rx = false,
    can_review_consults = false,
    can_review_ed = false,
    can_review_hair_loss = false,
    can_prescribe_s4 = false,
    can_prescribe_s8 = false,
    updated_at = now()
  WHERE id = p_profile_id;

  INSERT INTO public.audit_logs (actor_type, action, from_state, to_state, metadata, created_at)
  VALUES (
    'system',
    'staff_role_changed',
    v_profile.role::text,
    v_target_role::text,
    jsonb_build_object(
      'profile_id', v_profile.id,
      'email', v_profile.email,
      'reason', coalesce(nullif(trim(p_reason), ''), 'staff role normalization'),
      'source', 'admin_change_profile_role'
    ),
    now()
  );

  profile_id := v_profile.id;
  email := v_profile.email;
  from_role := v_profile.role::text;
  to_role := v_target_role::text;
  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_change_profile_role(uuid, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_change_profile_role(uuid, text, text) FROM anon;
REVOKE ALL ON FUNCTION public.admin_change_profile_role(uuid, text, text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.admin_change_profile_role(uuid, text, text) TO service_role;

COMMIT;
