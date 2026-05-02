-- Preserve operator visibility for failed delivery emails.
-- A failed approved-delivery email must be classified as delivery_failed before
-- the broader "approved but no sent delivery email" delivery_pending branch.

DROP VIEW IF EXISTS public.v_stuck_intakes;

CREATE VIEW public.v_stuck_intakes AS
WITH intake_with_timing AS (
  SELECT
    i.id,
    i.reference_number,
    i.status,
    i.payment_status,
    i.category,
    i.subtype,
    i.is_priority,
    i.created_at,
    i.paid_at,
    i.reviewed_at,
    i.approved_at,
    i.completed_at,
    p.email AS patient_email,
    p.full_name AS patient_name,
    s.name AS service_name,
    s.type AS service_type,
    EXTRACT(EPOCH FROM (NOW() - COALESCE(i.paid_at, i.created_at))) / 60 AS minutes_since_paid,
    EXTRACT(EPOCH FROM (NOW() - COALESCE(i.reviewed_at, i.paid_at, i.created_at))) / 60 AS minutes_in_review,
    EXTRACT(EPOCH FROM (NOW() - COALESCE(i.approved_at, i.created_at))) / 60 AS minutes_since_approved,
    EXISTS (
      SELECT 1 FROM public.email_outbox eo
      WHERE eo.intake_id = i.id
        AND eo.email_type IN ('request_approved', 'certificate_delivery', 'med_cert_patient', 'script_sent')
        AND eo.status = 'sent'
    ) AS delivery_email_sent,
    EXISTS (
      SELECT 1 FROM public.email_outbox eo
      WHERE eo.intake_id = i.id
        AND eo.email_type IN ('request_approved', 'certificate_delivery', 'med_cert_patient', 'script_sent')
        AND eo.status = 'failed'
    ) AS delivery_email_failed
  FROM public.intakes i
  LEFT JOIN public.profiles p ON p.id = i.patient_id
  LEFT JOIN public.services s ON s.id = i.service_id
  WHERE i.status NOT IN ('draft', 'pending_payment', 'completed', 'declined', 'cancelled', 'expired')
)
SELECT
  id,
  reference_number,
  status,
  payment_status,
  category,
  subtype,
  service_name,
  service_type,
  is_priority,
  patient_email,
  patient_name,
  created_at,
  paid_at,
  reviewed_at,
  approved_at,
  minutes_since_paid,
  minutes_in_review,
  minutes_since_approved,
  delivery_email_sent,
  delivery_email_failed,
  CASE
    WHEN status = 'paid'
      AND payment_status = 'paid'
      AND minutes_since_paid > 5
    THEN 'paid_no_review'

    WHEN status IN ('in_review', 'pending_info')
      AND minutes_in_review > 60
    THEN 'review_timeout'

    WHEN status = 'approved'
      AND delivery_email_failed
      AND NOT delivery_email_sent
    THEN 'delivery_failed'

    WHEN status = 'approved'
      AND minutes_since_approved > 10
      AND NOT delivery_email_sent
    THEN 'delivery_pending'

    ELSE NULL
  END AS stuck_reason,
  CASE
    WHEN status = 'paid' THEN minutes_since_paid
    WHEN status IN ('in_review', 'pending_info') THEN minutes_in_review
    WHEN status = 'approved' THEN minutes_since_approved
    ELSE 0
  END AS stuck_age_minutes
FROM intake_with_timing
WHERE
  (
    (status = 'paid' AND payment_status = 'paid' AND minutes_since_paid > 5)
    OR (status IN ('in_review', 'pending_info') AND minutes_in_review > 60)
    OR (status = 'approved' AND delivery_email_failed AND NOT delivery_email_sent)
    OR (status = 'approved' AND minutes_since_approved > 10 AND NOT delivery_email_sent)
  );

GRANT SELECT ON public.v_stuck_intakes TO authenticated;

COMMENT ON VIEW public.v_stuck_intakes IS 'Real-time view of intakes stuck in SLA-breaching states';
