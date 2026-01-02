/**
 * Medical Certificate PDF Renderer
 * 
 * Server-side function to render medical certificate drafts to PDF buffers.
 * Uses the MedicalCertificateTemplate component with React-PDF.
 */

import { renderToBuffer } from "@react-pdf/renderer"
import { MedicalCertificateTemplate } from "@/lib/pdf/med-certificate-template"
import type { MedCertDraft } from "@/types/db"

/**
 * Render a medical certificate draft to a PDF buffer
 * 
 * @param draft - The medical certificate draft data
 * @param logoUrl - Absolute URL to the InstantMed logo (e.g., https://instantmed.com/logo.png)
 * @returns Promise<Buffer> - The PDF as a binary buffer
 * @throws Error if rendering fails or logoUrl is invalid
 */
export async function renderMedicalCertificateToPdf(
  draft: MedCertDraft,
  logoUrl: string
): Promise<Buffer> {
  if (!logoUrl) {
    throw new Error("logoUrl is required for rendering medical certificates")
  }

  if (!draft.patient_full_name) {
    throw new Error("Patient full name is required")
  }

  if (!draft.certificate_type) {
    throw new Error("Certificate type is required")
  }

  try {
    const pdf = <MedicalCertificateTemplate draft={draft} logoUrl={logoUrl} />
    const buffer = await renderToBuffer(pdf)
    return buffer
  } catch (error) {
    throw new Error(
      `Failed to render medical certificate PDF: ${error instanceof Error ? error.message : String(error)}`
    )
  }
}

/**
 * Render multiple medical certificate drafts (batch rendering)
 * 
 * @param drafts - Array of medical certificate drafts
 * @param logoUrl - Absolute URL to the logo
 * @returns Promise<Buffer[]> - Array of PDF buffers in the same order as input
 */
export async function renderMedicalCertificatesToPdf(
  drafts: MedCertDraft[],
  logoUrl: string
): Promise<Buffer[]> {
  return Promise.all(drafts.map((draft) => renderMedicalCertificateToPdf(draft, logoUrl)))
}
