-- Converge legacy deployments that created fraud_flags with a boolean
-- `reviewed` column before the application adopted the explicit review state.
-- This migration preserves the legacy column for compatibility; `status` is
-- the application-owned state going forward.

-- The squashed baseline granted doctors direct SELECT and UPDATE access. RLS
-- policies are OR-composed, so leaving either policy in place would bypass the
-- app's admin-only ownership and bounded review action.
DROP POLICY IF EXISTS "doctors_view_fraud_flags" ON public.fraud_flags;
DROP POLICY IF EXISTS "doctors_update_fraud_flags" ON public.fraud_flags;

ALTER TABLE public.fraud_flags
  ADD COLUMN IF NOT EXISTS status TEXT;

ALTER TABLE public.fraud_flags
  ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'fraud_flags'
      AND column_name = 'reviewed'
  ) THEN
    EXECUTE $backfill$
      UPDATE public.fraud_flags
      SET status = CASE
        WHEN status IN ('open', 'reviewed', 'dismissed') THEN status
        WHEN reviewed IS TRUE THEN 'reviewed'
        ELSE 'open'
      END
    $backfill$;
  ELSE
    UPDATE public.fraud_flags
    SET status = 'open'
    WHERE status IS NULL
       OR status NOT IN ('open', 'reviewed', 'dismissed');
  END IF;
END
$$;

ALTER TABLE public.fraud_flags
  ALTER COLUMN status SET DEFAULT 'open',
  ALTER COLUMN status SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.fraud_flags'::regclass
      AND conname = 'fraud_flags_status_check'
  ) THEN
    ALTER TABLE public.fraud_flags
      ADD CONSTRAINT fraud_flags_status_check
      CHECK (status IN ('open', 'reviewed', 'dismissed'));
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_fraud_flags_open_created_at
  ON public.fraud_flags(created_at DESC)
  WHERE status = 'open';
