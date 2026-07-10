import {
  getLatestDocumentForIntake,
  getMedCertCertificateForIntake,
} from "@/lib/data/documents"
import {
  getCertificateWithPdfUrl,
  hasIssuedCertificateHistory,
} from "@/lib/data/issued-certificates"

/**
 * Resolve the patient-facing certificate without allowing an invalid canonical
 * certificate to fall through to an unstatused legacy PDF.
 */
export async function getPatientCertificateDocumentForIntake(intakeId: string) {
  const currentCertificate = await getCertificateWithPdfUrl(intakeId)
  if (currentCertificate) return currentCertificate

  if (await hasIssuedCertificateHistory(intakeId)) {
    return null
  }

  return await getMedCertCertificateForIntake(intakeId)
    || await getLatestDocumentForIntake(intakeId)
}
