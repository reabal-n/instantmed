/**
 * Fields required by the admin ledger, its client-side search, attribution,
 * payment recovery controls, and the existing renewal badge.
 */
export const ADMIN_LEDGER_SELECT = `
  id,
  patient_id,
  category,
  status,
  risk_flags,
  payment_status,
  refund_status,
  refund_amount_cents,
  amount_cents,
  is_priority,
  reference_number,
  created_at,
  updated_at,
  reviewed_by,
  utm_source,
  utm_medium,
  utm_campaign,
  utm_term,
  referrer,
  landing_page,
  gclid,
  gbraid,
  wbraid,
  campaignid,
  adgroupid,
  keyword,
  creative,
  matchtype,
  device,
  network,
  heard_about_us,
  answers:intake_answers(answers, answers_encrypted),
  patient:profiles!patient_id (
    id,
    full_name,
    email,
    phone,
    phone_encrypted,
    suburb,
    state
  ),
  service:services!service_id (name, short_name, type)
` as const

export function projectAdminLedgerPatient(
  patient: Record<string, unknown> | null | undefined,
) {
  if (!patient) return patient

  return {
    id: patient.id,
    full_name: patient.full_name,
    email: patient.email,
    phone: patient.phone,
    suburb: patient.suburb,
    state: patient.state,
  }
}
