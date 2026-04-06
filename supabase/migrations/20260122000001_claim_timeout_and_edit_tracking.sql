-- Migration: Add claim timeout and certificate edit tracking
-- Fixes:
-- 1. No claim timeout for abandoned reviews (P1)
-- 2. Certificate edit changes not tracked in audit (P1 medicolegal)

-- ============================================
-- 1. Add claimed_by and claimed_at to intakes table
-- ============================================
ALTER TABLE public.intakes
ADD COLUMN IF NOT EXISTS claimed_by UUID REFERENCES public.profiles(id);

ALTER TABLE public.intakes
ADD COLUMN IF NOT EXISTS claimed_at TIMESTAMPTZ;

COMMENT ON COLUMN public.intakes.claimed_by IS 'Doctor who has claimed this intake for review (prevents concurrent edits)';
COMMENT ON COLUMN public.intakes.claimed_at IS 'When the intake was claimed for review';

-- Index for finding unclaimed intakes and stale claims
CREATE INDEX IF NOT EXISTS idx_intakes_claimed ON public.intakes(claimed_by)
WHERE claimed_by IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_intakes_claimed_at ON public.intakes(claimed_at)
WHERE claimed_at IS NOT NULL;

-- ============================================
-- 2. Function to claim intake with 30-minute timeout
-- ============================================
CREATE OR REPLACE FUNCTION public.claim_intake_for_review(
  p_intake_id UUID,
  p_doctor_id UUID,
  p_force BOOLEAN DEFAULT FALSE
)
RETURNS TABLE (
  success BOOLEAN,
  error_message TEXT,
  current_claimant TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_intake RECORD;
  v_claimant_name TEXT;
  v_timeout_minutes INTEGER := 30; -- Configurable timeout
BEGIN
  -- Get current intake state
  SELECT i.*, p.full_name as claimant_name
  INTO v_intake
  FROM public.intakes i
  LEFT JOIN public.profiles p ON i.claimed_by = p.id
  WHERE i.id = p_intake_id;

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 'Intake not found'::TEXT, NULL::TEXT;
    RETURN;
  END IF;

  -- Check if already claimed by someone else
  IF v_intake.claimed_by IS NOT NULL AND v_intake.claimed_by != p_doctor_id THEN
    -- Check if claim is stale (older than timeout)
    IF v_intake.claimed_at < NOW() - (v_timeout_minutes || ' minutes')::INTERVAL OR p_force THEN
      -- Allow takeover of stale claim
      UPDATE public.intakes
      SET claimed_by = p_doctor_id,
          claimed_at = NOW(),
          updated_at = NOW()
      WHERE id = p_intake_id;

      RETURN QUERY SELECT TRUE, NULL::TEXT, v_intake.claimant_name;
      RETURN;
    ELSE
      RETURN QUERY SELECT FALSE,
        format('Already claimed by %s (%s minutes remaining)',
          v_intake.claimant_name,
          CEIL(EXTRACT(EPOCH FROM (v_intake.claimed_at + (v_timeout_minutes || ' minutes')::INTERVAL - NOW())) / 60)::INTEGER
        )::TEXT,
        v_intake.claimant_name;
      RETURN;
    END IF;
  END IF;

  -- Claim or refresh existing claim
  UPDATE public.intakes
  SET claimed_by = p_doctor_id,
      claimed_at = NOW(),
      updated_at = NOW()
  WHERE id = p_intake_id;

  RETURN QUERY SELECT TRUE, NULL::TEXT, NULL::TEXT;
END;
$$;

-- ============================================
-- 3. Function to release intake claim
-- ============================================
CREATE OR REPLACE FUNCTION public.release_intake_claim(
  p_intake_id UUID,
  p_doctor_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.intakes
  SET claimed_by = NULL,
      claimed_at = NULL,
      updated_at = NOW()
  WHERE id = p_intake_id
  AND (claimed_by = p_doctor_id OR claimed_by IS NULL);

  RETURN FOUND;
END;
$$;

-- ============================================
-- 4. Function to auto-release stale claims (for scheduled job)
-- ============================================
CREATE OR REPLACE FUNCTION public.release_stale_intake_claims(
  p_timeout_minutes INTEGER DEFAULT 30
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_released_count INTEGER;
BEGIN
  UPDATE public.intakes
  SET claimed_by = NULL,
      claimed_at = NULL,
      updated_at = NOW()
  WHERE claimed_at IS NOT NULL
  AND claimed_at < NOW() - (p_timeout_minutes || ' minutes')::INTERVAL
  AND status IN ('paid', 'in_review'); -- Only release non-finalized intakes

  GET DIAGNOSTICS v_released_count = ROW_COUNT;

  RETURN v_released_count;
END;
$$;

-- ============================================
-- 5. Certificate Edit Tracking Table
-- ============================================
CREATE TABLE IF NOT EXISTS public.certificate_edit_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  certificate_id UUID REFERENCES public.issued_certificates(id) ON DELETE CASCADE,
  intake_id UUID NOT NULL REFERENCES public.intakes(id) ON DELETE CASCADE,
  doctor_id UUID NOT NULL REFERENCES public.profiles(id),

  -- What was changed
  field_name TEXT NOT NULL,
  original_value TEXT,
  new_value TEXT,

  -- Diff for longer text fields
  change_summary TEXT,

  -- Context
  edit_reason TEXT,
  edit_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for audit queries
CREATE INDEX IF NOT EXISTS idx_cert_edit_history_certificate ON public.certificate_edit_history(certificate_id);
CREATE INDEX IF NOT EXISTS idx_cert_edit_history_intake ON public.certificate_edit_history(intake_id);
CREATE INDEX IF NOT EXISTS idx_cert_edit_history_doctor ON public.certificate_edit_history(doctor_id);
CREATE INDEX IF NOT EXISTS idx_cert_edit_history_timestamp ON public.certificate_edit_history(edit_timestamp);

COMMENT ON TABLE public.certificate_edit_history IS 'Tracks all edits made by doctors to certificate data during review (medicolegal requirement)';

-- ============================================
-- 6. Function to log certificate edits
-- ============================================
CREATE OR REPLACE FUNCTION public.log_certificate_edit(
  p_certificate_id UUID,
  p_intake_id UUID,
  p_doctor_id UUID,
  p_field_name TEXT,
  p_original_value TEXT,
  p_new_value TEXT,
  p_edit_reason TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_edit_id UUID;
  v_change_summary TEXT;
BEGIN
  -- Generate a human-readable change summary
  IF LENGTH(COALESCE(p_original_value, '')) > 50 OR LENGTH(COALESCE(p_new_value, '')) > 50 THEN
    v_change_summary := format('Changed from "%s..." to "%s..."',
      LEFT(COALESCE(p_original_value, '(empty)'), 50),
      LEFT(COALESCE(p_new_value, '(empty)'), 50)
    );
  ELSE
    v_change_summary := format('Changed from "%s" to "%s"',
      COALESCE(p_original_value, '(empty)'),
      COALESCE(p_new_value, '(empty)')
    );
  END IF;

  INSERT INTO public.certificate_edit_history (
    certificate_id,
    intake_id,
    doctor_id,
    field_name,
    original_value,
    new_value,
    change_summary,
    edit_reason
  ) VALUES (
    p_certificate_id,
    p_intake_id,
    p_doctor_id,
    p_field_name,
    p_original_value,
    p_new_value,
    v_change_summary,
    p_edit_reason
  )
  RETURNING id INTO v_edit_id;

  RETURN v_edit_id;
END;
$$;

-- ============================================
-- 7. RLS Policies for certificate_edit_history
-- ============================================
ALTER TABLE public.certificate_edit_history ENABLE ROW LEVEL SECURITY;

-- Doctors can view edit history for their own edits and intakes they've reviewed
CREATE POLICY "Doctors can view certificate edit history"
ON public.certificate_edit_history
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.auth_user_id = auth.uid()
    AND p.role IN ('doctor', 'admin')
  )
);

-- Only service role can insert (via function)
CREATE POLICY "Service role can insert edit history"
ON public.certificate_edit_history
FOR INSERT
TO service_role
WITH CHECK (true);

-- ============================================
-- 8. Add edit_history_count to issued_certificates for quick access
-- ============================================
ALTER TABLE public.issued_certificates
ADD COLUMN IF NOT EXISTS edit_count INTEGER DEFAULT 0;

COMMENT ON COLUMN public.issued_certificates.edit_count IS 'Number of edits made during review (for audit visibility)';

-- ============================================
-- 9. Trigger to update edit count
-- ============================================
CREATE OR REPLACE FUNCTION public.update_certificate_edit_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.certificate_id IS NOT NULL THEN
    UPDATE public.issued_certificates
    SET edit_count = edit_count + 1
    WHERE id = NEW.certificate_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_update_cert_edit_count ON public.certificate_edit_history;
CREATE TRIGGER trg_update_cert_edit_count
  AFTER INSERT ON public.certificate_edit_history
  FOR EACH ROW
  EXECUTE FUNCTION public.update_certificate_edit_count();

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.claim_intake_for_review TO authenticated;
GRANT EXECUTE ON FUNCTION public.release_intake_claim TO authenticated;
GRANT EXECUTE ON FUNCTION public.release_stale_intake_claims TO service_role;
GRANT EXECUTE ON FUNCTION public.log_certificate_edit TO service_role;
