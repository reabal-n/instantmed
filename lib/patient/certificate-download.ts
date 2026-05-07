export function getPatientCertificateDownloadHref(certificateId: string): string {
  return `/api/patient/certificates/${encodeURIComponent(certificateId)}/download`
}

export function getPatientIntakeDetailHref(intakeId: string): string {
  return `/patient/intakes/${encodeURIComponent(intakeId)}`
}
