/**
 * Medical Certificate PDF Rendering Utilities
 * 
 * Helper functions to build render options from database data,
 * supporting template version locking for previously issued certificates.
 */

import { renderToBuffer } from "@react-pdf/renderer"
import React from "react"
import { MedCertPdfDocumentV2, type MedCertPdfDataV2, type MedCertPdfRenderOptions } from "./med-cert-pdf-v2"
import { getActiveClinicIdentity, getClinicLogoUrl } from "@/lib/data/clinic-identity"
import { getActiveTemplate } from "@/lib/data/certificate-templates"
import { getSignatureUrl, getDoctorIdentity } from "@/lib/data/doctor-identity"
import type { ClinicIdentity, TemplateConfig, TemplateType } from "@/types/certificate-template"
import { DEFAULT_TEMPLATE_CONFIG } from "@/types/certificate-template"
import { createLogger } from "@/lib/observability/logger"

const log = createLogger("med-cert-render")

// ============================================================================
// TYPES
// ============================================================================

export interface CertificateRenderInput {
  // Certificate identifiers
  certificateNumber: string
  verificationCode: string
  certificateType: "work" | "study" | "carer"
  
  // Patient
  patientName: string
  patientDob: string | null
  
  // Dates
  issueDate: string
  startDate: string
  endDate: string
  durationDays: number
  
  // Carer (optional)
  carerPersonName?: string
  carerRelationship?: string
  
  // Doctor profile ID (to fetch identity)
  doctorProfileId: string
  
  // Generation timestamp
  generatedAt: string
  
  // Optional: Use locked config snapshot (for re-rendering existing certificates)
  templateConfigSnapshot?: TemplateConfig
  clinicIdentitySnapshot?: ClinicIdentity
}

export interface CertificateRenderResult {
  success: boolean
  buffer?: Buffer
  error?: string
  // Snapshots for storage
  templateConfig?: TemplateConfig
  clinicIdentity?: ClinicIdentity
}

// ============================================================================
// MAIN RENDER FUNCTION
// ============================================================================

/**
 * Render a medical certificate PDF
 * 
 * For new certificates: fetches current active template and clinic identity
 * For re-rendering: uses provided snapshots (template locking)
 */
export async function renderMedCertPdf(
  input: CertificateRenderInput
): Promise<CertificateRenderResult> {
  try {
    // 1. Resolve clinic identity (use snapshot if provided)
    let clinicIdentity: ClinicIdentity | null = input.clinicIdentitySnapshot || null
    if (!clinicIdentity) {
      clinicIdentity = await getActiveClinicIdentity()
    }
    
    if (!clinicIdentity) {
      return { success: false, error: "Clinic identity not configured" }
    }
    
    // 2. Resolve template config (use snapshot if provided)
    let templateConfig: TemplateConfig = input.templateConfigSnapshot || DEFAULT_TEMPLATE_CONFIG
    if (!input.templateConfigSnapshot) {
      const templateType = mapCertTypeToTemplateType(input.certificateType)
      const activeTemplate = await getActiveTemplate(templateType)
      if (activeTemplate?.config) {
        templateConfig = activeTemplate.config as TemplateConfig
      }
    }
    
    // 3. Fetch doctor identity
    const doctorIdentity = await getDoctorIdentity(input.doctorProfileId)
    if (!doctorIdentity) {
      return { success: false, error: "Doctor identity not found" }
    }
    
    if (!doctorIdentity.provider_number || !doctorIdentity.ahpra_number) {
      return { success: false, error: "Doctor certificate identity is incomplete" }
    }
    
    // 4. Resolve URLs for logo and signature
    let logoUrl: string | null = null
    if (clinicIdentity.logo_storage_path) {
      logoUrl = await getClinicLogoUrl(clinicIdentity.logo_storage_path)
    }
    
    let signatureUrl: string | null = null
    if (doctorIdentity.signature_storage_path) {
      signatureUrl = await getSignatureUrl(doctorIdentity.signature_storage_path)
    }
    
    // 5. Build PDF data
    const pdfData: MedCertPdfDataV2 = {
      certificateNumber: input.certificateNumber,
      verificationCode: input.verificationCode,
      certificateType: input.certificateType,
      patientName: input.patientName,
      patientDob: input.patientDob,
      issueDate: input.issueDate,
      startDate: input.startDate,
      endDate: input.endDate,
      durationDays: input.durationDays,
      carerPersonName: input.carerPersonName,
      carerRelationship: input.carerRelationship,
      doctorName: doctorIdentity.full_name,
      doctorNominals: doctorIdentity.nominals,
      doctorProviderNumber: doctorIdentity.provider_number,
      doctorAhpraNumber: doctorIdentity.ahpra_number,
      doctorSignatureUrl: signatureUrl,
      generatedAt: input.generatedAt,
    }
    
    // 6. Build render options
    const renderOptions: MedCertPdfRenderOptions = {
      data: pdfData,
      clinicIdentity,
      templateConfig,
      logoUrl,
    }
    
    // 7. Render PDF to buffer
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pdfElement = React.createElement(MedCertPdfDocumentV2, renderOptions) as any
    const buffer = await renderToBuffer(pdfElement)
    
    log.info("Certificate PDF rendered", {
      certificateNumber: input.certificateNumber,
      doctorId: input.doctorProfileId,
    })
    
    return {
      success: true,
      buffer: Buffer.from(buffer),
      templateConfig,
      clinicIdentity,
    }
  } catch (error) {
    log.error("Failed to render certificate PDF", {}, error instanceof Error ? error : undefined)
    return {
      success: false,
      error: error instanceof Error ? error.message : "PDF rendering failed",
    }
  }
}

// ============================================================================
// HELPERS
// ============================================================================

function mapCertTypeToTemplateType(certType: "work" | "study" | "carer"): TemplateType {
  switch (certType) {
    case "work":
      return "med_cert_work"
    case "study":
      return "med_cert_uni"
    case "carer":
      return "med_cert_carer"
    default:
      return "med_cert_work"
  }
}

/**
 * Generate a cryptographically random verification code
 * Format: 8-character alphanumeric code (A-Z, 0-9, excluding ambiguous chars)
 *
 * Note: This is independent of certificate number for security.
 * The _certificateNumber parameter is kept for backward compatibility but not used.
 */
export function generateVerificationCode(_certificateNumber?: string): string {
  // Use crypto for secure random generation
  const crypto = require("crypto")

  // Alphanumeric charset excluding ambiguous characters (0/O, 1/I/L)
  const charset = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"
  const bytes = crypto.randomBytes(8)

  let code = ""
  for (let i = 0; i < 8; i++) {
    code += charset[bytes[i] % charset.length]
  }

  return code
}
