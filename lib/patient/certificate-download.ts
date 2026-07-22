import "server-only"

import { signPatientRequestAccessToken } from "@/lib/crypto/patient-request-access-token"
import { buildPatientIntakeHref } from "@/lib/dashboard/routes"

export function getPatientCertificateDownloadHref(certificateId: string): string {
  return `/api/patient/certificates/${encodeURIComponent(certificateId)}/download`
}

export function getPatientIntakeDetailHref(intakeId: string): string {
  return buildPatientIntakeHref(intakeId)
}

/**
 * Login-free entry point for guest patients (profiles with no linked auth
 * account). Exchanges a short-lived signed capability for an HttpOnly cookie,
 * then offers the audited account handoff from a clean URL.
 */
export function getGuestCertificateAccessHref(intakeId: string, _email?: string | null): string {
  const token = signPatientRequestAccessToken(intakeId)
  return `/track/${encodeURIComponent(token)}`
}
