import { buildPatientIntakeHref } from "@/lib/dashboard/routes"

export function getPatientCertificateDownloadHref(certificateId: string): string {
  return `/api/patient/certificates/${encodeURIComponent(certificateId)}/download`
}

export function getPatientIntakeDetailHref(intakeId: string): string {
  return buildPatientIntakeHref(intakeId)
}
