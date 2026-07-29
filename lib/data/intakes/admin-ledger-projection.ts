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

/**
 * Support only needs request/payment recovery metadata. Keep contact details,
 * clinical flags/answers, and acquisition identifiers out of the database
 * projection so they cannot leak into the RSC payload by accident.
 */
export const SUPPORT_LEDGER_SELECT = `
  id,
  category,
  status,
  payment_status,
  refund_status,
  refund_amount_cents,
  amount_cents,
  is_priority,
  reference_number,
  created_at,
  updated_at,
  patient:profiles!patient_id (
    full_name
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

function maskLedgerPatientName(value: unknown): string {
  if (typeof value !== "string") return "Patient"
  const parts = value.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return "Patient"
  return parts.map((part) => `${part[0]?.toUpperCase() ?? ""}.`).join(" ")
}

export function projectSupportLedgerPatient(
  patient: Record<string, unknown> | null | undefined,
) {
  if (!patient) return patient

  return {
    full_name: maskLedgerPatientName(patient.full_name),
  }
}
