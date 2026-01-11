/**
 * Document Generation Module
 * 
 * ⛔ PRESCRIBING WORKFLOW BOUNDARY
 * Prescription generation has been removed from Lumen Health.
 * See PRESCRIBING_WORKFLOW_BOUNDARY.md for details.
 */

import { generateMedCertHTML, type MedCertTemplateData } from "./med-cert-template"

export type DocumentType = "med_cert"

/**
 * Generate a unique reference number for documents
 */
export function generateReferenceNumber(type: DocumentType): string {
  const prefix = {
    med_cert: "MC",
  }[type]

  const timestamp = Date.now().toString(36).toUpperCase()
  const random = Math.random().toString(36).substring(2, 6).toUpperCase()

  return `${prefix}-${timestamp}-${random}`
}

/**
 * Generate HTML for a document based on type
 * 
 * Note: Only med_cert is supported. Prescription generation
 * is not permitted within Lumen Health per PRESCRIBING_WORKFLOW_BOUNDARY.md
 */
export function generateDocumentHTML(
  type: DocumentType,
  data: MedCertTemplateData,
): string {
  switch (type) {
    case "med_cert":
      return generateMedCertHTML(data)
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
