-- Add missing columns to profiles table that are referenced throughout the codebase
-- These columns were never created in a migration but are used by:
-- - post-signin profile linking (app/auth/post-signin/page.tsx)
-- - Clerk webhook handler (app/api/webhooks/clerk/route.ts)
-- - auth helpers (lib/auth.ts, lib/clerk/get-profile.ts)
-- - email templates (lib/email/abandoned-checkout.ts)
-- - stripe webhook (app/api/stripe/webhook/route.ts)

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS first_name text,
  ADD COLUMN IF NOT EXISTS last_name text,
  ADD COLUMN IF NOT EXISTS avatar_url text;

-- Backfill first_name and last_name from full_name for existing profiles
UPDATE public.profiles
SET
  first_name = CASE
    WHEN full_name IS NOT NULL AND full_name != ''
    THEN split_part(full_name, ' ', 1)
    ELSE NULL
  END,
  last_name = CASE
    WHEN full_name IS NOT NULL AND full_name != '' AND position(' ' in full_name) > 0
    THEN substring(full_name from position(' ' in full_name) + 1)
    ELSE NULL
  END
WHERE first_name IS NULL AND full_name IS NOT NULL AND full_name != '';
