-- Phase 1 of the staff dashboard remaster (2026-05-11).
--
-- Adds:
--   1. 'support' to the user_role enum and profiles_role_check constraint
--   2. Per-doctor capability flag columns (defaulted to true for existing doctors)
--
-- The 'support' role is for non-clinical operations staff. RLS policies still
-- enforce clinical isolation; this migration only widens the enum so future
-- application-layer checks can distinguish admin/doctor/support without
-- introducing a fourth role mid-flight.
--
-- Capability flags let future doctors be scoped before they are verified for a
-- given service line. The owner-operator stays unrestricted; existing rows
-- default to all flags ON.

BEGIN;

-- ── 1. user_role enum: add 'support' if missing ─────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum
    WHERE enumlabel = 'support'
      AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'user_role')
  ) THEN
    ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'support' AFTER 'admin';
  END IF;
END
$$;

-- ── 2. profiles_role_check constraint: include 'support' ────────────────────
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('patient', 'doctor', 'admin', 'support'));

-- ── 3. Doctor capability flag columns ───────────────────────────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS can_review_med_certs   boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS can_review_repeat_rx   boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS can_review_consults    boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS can_review_ed          boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS can_review_hair_loss   boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS can_prescribe_s4       boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS can_prescribe_s8       boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.profiles.can_review_med_certs IS
  'Per-doctor capability flag: whether this doctor can review medical certificate intakes. Owner-operator is true; future hires can be scoped.';
COMMENT ON COLUMN public.profiles.can_review_repeat_rx IS
  'Per-doctor capability flag: whether this doctor can review repeat prescription intakes.';
COMMENT ON COLUMN public.profiles.can_review_consults IS
  'Per-doctor capability flag: whether this doctor can review general consult intakes.';
COMMENT ON COLUMN public.profiles.can_review_ed IS
  'Per-doctor capability flag: whether this doctor can review erectile-dysfunction consults.';
COMMENT ON COLUMN public.profiles.can_review_hair_loss IS
  'Per-doctor capability flag: whether this doctor can review hair-loss consults.';
COMMENT ON COLUMN public.profiles.can_prescribe_s4 IS
  'Per-doctor capability flag: whether this doctor can prescribe Schedule 4 medications via Parchment.';
COMMENT ON COLUMN public.profiles.can_prescribe_s8 IS
  'Per-doctor capability flag: whether this doctor can prescribe Schedule 8 (controlled) medications. Defaults to false; explicit grant required.';

COMMIT;
