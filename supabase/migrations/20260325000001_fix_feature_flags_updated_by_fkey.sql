-- Fix: feature_flags.updated_by has FK to auth.users but we use Clerk IDs
-- Drop the FK constraint and change column to text to store Clerk user IDs

ALTER TABLE public.feature_flags
  DROP CONSTRAINT IF EXISTS feature_flags_updated_by_fkey;

ALTER TABLE public.feature_flags
  ALTER COLUMN updated_by TYPE text USING updated_by::text;
