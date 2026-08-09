-- Weight-loss launch (Phase 3, docs/plans/2026-08-07-weight-loss-launch-plan.md):
-- per-doctor capability flag for the new service line. Unlike the other
-- review flags this defaults FALSE — docs/DOCTOR_ONBOARDING.md requires
-- capability + Medical Director sign-off before a doctor reviews weight
-- management. The owner-operator admin bypasses per-doctor flags in
-- lib/auth/staff-capabilities.ts, and is backfilled true here for tidiness.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS can_review_weight_loss boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.profiles.can_review_weight_loss IS
  'Doctor may review weight-management consults. Default false: explicit grant + Medical Director sign-off required (2026-08-07 launch).';

UPDATE public.profiles SET can_review_weight_loss = true WHERE role = 'admin';
