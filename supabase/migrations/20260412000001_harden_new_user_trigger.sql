-- Migration: harden_new_user_trigger
-- Purpose: Make the handle_new_user trigger resilient against failures that
--          surface as "Database error saving new user" on the sign-up page.
--
-- Root cause: Any exception inside the trigger rolls back the entire
--             auth.users INSERT, causing Supabase OTP/OAuth signup to fail.
--             The post-signin page already has a 5-retry + manual-create
--             fallback, so a non-fatal trigger is safe.
--
-- Changes:
--   1. Try to link an existing guest profile first (guest checkout → sign-up flow)
--   2. If no guest profile, INSERT with ON CONFLICT DO NOTHING
--   3. Catch all exceptions — log a WARNING, return NEW so auth.users is created
--      (post-signin page handles profile creation if trigger was skipped)

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- ── Step 1: Link existing guest profile (same email, no auth_user_id) ──────
  -- This handles the guest-checkout → sign-up path without needing a lookup
  -- in post-signin, and avoids a duplicate email constraint violation.
  UPDATE public.profiles
  SET
    auth_user_id       = NEW.id,
    email_verified     = true,
    email_verified_at  = NOW()
  WHERE LOWER(email) = LOWER(NEW.email)
    AND auth_user_id IS NULL;

  -- ── Step 2: If no guest profile existed, create a fresh one ─────────────
  IF NOT FOUND THEN
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
    -- Idempotent: if a concurrent trigger or post-signin already created it, skip
    ON CONFLICT (auth_user_id) DO NOTHING;
  END IF;

  RETURN NEW;

EXCEPTION WHEN OTHERS THEN
  -- Non-fatal: log the error but let the auth.users INSERT succeed.
  -- The /auth/post-signin page has a 5-retry + manual-create safety net.
  RAISE WARNING 'handle_new_user trigger failed for user % (email: %): %',
    NEW.id, NEW.email, SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
