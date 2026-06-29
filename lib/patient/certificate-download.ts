import { buildPatientIntakeHref } from "@/lib/dashboard/routes"

export function getPatientCertificateDownloadHref(certificateId: string): string {
  return `/api/patient/certificates/${encodeURIComponent(certificateId)}/download`
}

export function getPatientIntakeDetailHref(intakeId: string): string {
  return buildPatientIntakeHref(intakeId)
}

/**
 * Login-free entry point for guest patients (profiles with no linked auth
 * account). Routes to the account-completion flow, which links the guest
 * profile by intake/email and then shows the audited certificate download —
 * instead of the auth-walled portal a guest can never sign into.
 */
export function getGuestCertificateAccessHref(intakeId: string, email?: string | null): string {
  const params = new URLSearchParams({ intake_id: intakeId })
  params.set("access", "certificate")
  if (email) params.set("email", email)
  return `/auth/complete-account?${params.toString()}`
}
