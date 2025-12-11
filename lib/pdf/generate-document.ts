import { generateMedCertHTML, type MedCertTemplateData } from "./med-cert-template"
import { generateReferralHTML, type ReferralTemplateData } from "./referral-template"
import { generatePrescriptionHTML, type PrescriptionTemplateData } from "./prescription-template"

export type DocumentType = "med_cert" | "referral" | "prescription"

/**
 * Generate a unique reference number for documents
 */
export function generateReferenceNumber(type: DocumentType): string {
  const prefix = {
    med_cert: "MC",
    referral: "RF",
    prescription: "RX",
  }[type]

  const timestamp = Date.now().toString(36).toUpperCase()
  const random = Math.random().toString(36).substring(2, 6).toUpperCase()

  return `${prefix}-${timestamp}-${random}`
}

/**
 * Generate HTML for a document based on type
 */
export function generateDocumentHTML(
  type: DocumentType,
  data: MedCertTemplateData | ReferralTemplateData | PrescriptionTemplateData,
): string {
  switch (type) {
    case "med_cert":
      return generateMedCertHTML(data as MedCertTemplateData)
    case "referral":
      return generateReferralHTML(data as ReferralTemplateData)
    case "prescription":
      return generatePrescriptionHTML(data as PrescriptionTemplateData)
    default:
      throw new Error(`Unknown document type: ${type}`)
  }
}

/**
 * Convert HTML to a data URL for preview purposes
 * In production, this would use a PDF generation service
 */
export function htmlToDataUrl(html: string): string {
  const base64 = Buffer.from(html).toString("base64")
  return `data:text/html;base64,${base64}`
}
