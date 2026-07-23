import "server-only"

import { signPatientRequestAccessToken } from "@/lib/crypto/patient-request-access-token"

export function buildPatientRequestAccessUrl({
  appUrl,
  intakeId,
}: {
  appUrl: string
  intakeId: string
}): string {
  const baseUrl = appUrl.replace(/\/+$/, "")
  const token = signPatientRequestAccessToken(intakeId)
  return `${baseUrl}/track/${encodeURIComponent(token)}`
}
