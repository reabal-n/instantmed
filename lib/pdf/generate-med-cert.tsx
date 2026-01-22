/**
 * @deprecated LEGACY - DO NOT USE FOR NEW CODE
 * 
 * This file is deprecated in favor of the canonical V2 pipeline:
 * - Rendering: lib/pdf/med-cert-render.ts
 * - Template: lib/pdf/med-cert-pdf-v2.tsx
 * 
 * generateCertificateNumber() has been moved to lib/pdf/med-cert-render.ts
 * 
 * This file remains only for backward compatibility with legacy certificates
 * stored in the med_cert_certificates table. New certificates use the
 * issued_certificates table and V2 pipeline.
 * 
 * Original description:
 * Medical Certificate PDF Generation Service - Uses @react-pdf/renderer
 * to generate PDFs server-side, uploads to Supabase Storage, sends via Resend.
 */

import React from "react"
import ReactPDF from "@react-pdf/renderer"
import { createClient } from "@supabase/supabase-js"
import { MedCertPdfDocument, type MedCertPdfData } from "./med-cert-pdf"
import { uploadPdfBuffer } from "../storage/documents"
import { sendMedCertReadyEmail } from "../email/resend"
import { logger } from "@/lib/observability/logger"
import crypto from "crypto"

// ============================================================================
// SERVICE CLIENT
// ============================================================================

function getServiceClient() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error("Missing Supabase credentials")
  return createClient(url, key)
}

// ============================================================================
// TYPES
// ============================================================================

export interface GenerateMedCertPdfParams {
  requestId: string
  patientId: string
  certificateNumber: string
  certificateType: "work" | "study" | "carer"
  patientName: string
  patientDob: string
  patientEmail: string
  startDate: string
  endDate: string
  durationDays: number
  symptomsSummary: string
  carerPersonName?: string
  carerRelationship?: string
  clinicianId: string
  clinicianName: string
  clinicianRegistration: string
}

export interface GenerateMedCertPdfResult {
  success: boolean
  certificateId?: string
  pdfUrl?: string
  pdfHash?: string
  error?: string
}

// ============================================================================
// CERTIFICATE NUMBER GENERATOR
// ============================================================================

export function generateCertificateNumber(): string {
  const year = new Date().getFullYear()
  const random = crypto.randomBytes(4).toString("hex").toUpperCase()
  return `MC-${year}-${random}`
}

// ============================================================================
// WATERMARK GENERATOR
// ============================================================================

function generateWatermark(certificateNumber: string): string {
  const timestamp = new Date().toISOString().replace("T", " ").slice(0, 19)
  return `InstantMed • ${timestamp} UTC • ${certificateNumber}`
}

// ============================================================================
// PDF HASH GENERATOR
// ============================================================================

function generatePdfHash(buffer: Buffer): string {
  return crypto.createHash("sha256").update(buffer).digest("hex")
}

// ============================================================================
// MAIN GENERATION FUNCTION
// ============================================================================

export async function generateMedCertPdf(
  params: GenerateMedCertPdfParams
): Promise<GenerateMedCertPdfResult> {
  const {
    requestId,
    patientId: _patientId,
    certificateNumber,
    certificateType,
    patientName,
    patientDob,
    patientEmail,
    startDate,
    endDate,
    durationDays,
    symptomsSummary,
    carerPersonName,
    carerRelationship,
    clinicianId,
    clinicianName,
    clinicianRegistration,
  } = params

  try {
    // P0 FIX: Idempotency check - return existing certificate if one exists
    const supabase = getServiceClient()
    const { data: existingCert } = await supabase
      .from("med_cert_certificates")
      .select("id, pdf_url, pdf_hash")
      .eq("request_id", requestId)
      .eq("is_valid", true)
      .maybeSingle()

    if (existingCert) {
      logger.info("[MedCertPdf] Certificate already exists, returning existing", {
        requestId,
        certificateId: existingCert.id,
      })
      return {
        success: true,
        certificateId: existingCert.id,
        pdfUrl: existingCert.pdf_url,
        pdfHash: existingCert.pdf_hash,
      }
    }
    const generatedAt = new Date().toISOString()
    const watermark = generateWatermark(certificateNumber)

    // Build PDF data
    const pdfData: MedCertPdfData = {
      certificateNumber,
      certificateType,
      patientName,
      patientDob,
      startDate,
      endDate,
      durationDays,
      symptomsSummary,
      carerPersonName,
      carerRelationship,
      clinicianName,
      clinicianRegistration,
      generatedAt,
      watermark,
    }

    logger.info("[MedCertPdf] Generating PDF", { certificateNumber, requestId })

    // P2 FIX: Add timeout to PDF generation (30 seconds)
    const PDF_TIMEOUT_MS = 30_000
    
    const pdfBuffer = await Promise.race([
      (async () => {
        const pdfStream = await ReactPDF.renderToStream(
          <MedCertPdfDocument data={pdfData} />
        )
        const chunks: Buffer[] = []
        for await (const chunk of pdfStream) {
          chunks.push(Buffer.from(chunk))
        }
        return Buffer.concat(chunks)
      })(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("PDF generation timed out after 30s")), PDF_TIMEOUT_MS)
      ),
    ])

    logger.info("[MedCertPdf] PDF rendered", { 
      certificateNumber, 
      size: pdfBuffer.length 
    })

    // Calculate hash for integrity verification
    const pdfHash = generatePdfHash(pdfBuffer)

    // Upload to Supabase Storage
    const uploadResult = await uploadPdfBuffer(
      pdfBuffer,
      requestId,
      "med_cert",
      certificateType
    )

    if (!uploadResult.success || !uploadResult.permanentUrl) {
      logger.error("[MedCertPdf] Upload failed", { 
        error: uploadResult.error,
        certificateNumber 
      })
      return { success: false, error: uploadResult.error || "Upload failed" }
    }

    logger.info("[MedCertPdf] PDF uploaded", { 
      certificateNumber, 
      url: uploadResult.permanentUrl 
    })

    // Store certificate record in database
    const { data: certificate, error: insertError } = await supabase
      .from("med_cert_certificates")
      .insert({
        request_id: requestId,
        certificate_number: certificateNumber,
        patient_name: patientName,
        patient_dob: patientDob,
        certificate_type: certificateType,
        start_date: startDate,
        end_date: endDate,
        symptoms_summary: symptomsSummary,
        approving_clinician_id: clinicianId,
        approving_clinician_name: clinicianName,
        approving_clinician_registration: clinicianRegistration,
        pdf_storage_path: uploadResult.storagePath,
        pdf_url: uploadResult.permanentUrl,
        pdf_hash: pdfHash,
        pdf_size_bytes: pdfBuffer.length,
        watermark,
        template_version: "2.0.0",
      })
      .select("id")
      .single()

    if (insertError) {
      logger.error("[MedCertPdf] Failed to insert certificate record", { 
        error: insertError,
        certificateNumber 
      })
      return { success: false, error: "Failed to save certificate record" }
    }

    // Update request with certificate reference
    await supabase
      .from("med_cert_requests")
      .update({ certificate_id: certificate.id })
      .eq("id", requestId)

    // Log audit event
    await supabase.from("med_cert_audit_events").insert({
      request_id: requestId,
      event_type: "certificate_generated",
      actor_id: clinicianId,
      actor_role: "clinician",
      event_data: {
        certificate_id: certificate.id,
        certificate_number: certificateNumber,
        pdf_hash: pdfHash,
        pdf_size_bytes: pdfBuffer.length,
        watermark,
      },
    })

    // Send email to patient with PDF attachment for better UX
    const emailResult = await sendMedCertReadyEmail({
      to: patientEmail,
      patientName,
      pdfUrl: uploadResult.permanentUrl,
      requestId,
      certType: certificateType,
      pdfContent: pdfBuffer.toString("base64"), // Attach PDF directly
      attachPdf: true,
    })

    if (!emailResult.success) {
      logger.warn("[MedCertPdf] Email failed but certificate created", { 
        certificateNumber,
        emailError: emailResult.error 
      })
    } else {
      logger.info("[MedCertPdf] Email sent", { certificateNumber, to: patientEmail })
    }

    return {
      success: true,
      certificateId: certificate.id,
      pdfUrl: uploadResult.permanentUrl,
      pdfHash,
    }

  } catch (error) {
    logger.error("[MedCertPdf] Generation failed", { 
      error: error instanceof Error ? error.message : String(error),
      requestId 
    })
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "PDF generation failed" 
    }
  }
}

// ============================================================================
// HELPER: Get certificate by request ID
// ============================================================================

export async function getCertificateByRequestId(requestId: string): Promise<{
  success: boolean
  certificate?: {
    id: string
    certificateNumber: string
    pdfUrl: string
    generatedAt: string
  }
  error?: string
}> {
  try {
    const supabase = getServiceClient()
    
    const { data, error } = await supabase
      .from("med_cert_certificates")
      .select("id, certificate_number, pdf_storage_path, generated_at")
      .eq("request_id", requestId)
      .eq("is_valid", true)
      .order("generated_at", { ascending: false })
      .limit(1)
      .single()

    if (error || !data) {
      return { success: false, error: "Certificate not found" }
    }

    // P0 SECURITY FIX: Use signed URL instead of public URL
    // Signed URLs expire after 7 days for security
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from("documents")
      .createSignedUrl(data.pdf_storage_path, 7 * 24 * 60 * 60) // 7 days

    if (signedUrlError || !signedUrlData?.signedUrl) {
      logger.error("[MedCertPdf] Failed to create signed URL", {
        requestId,
        storagePath: data.pdf_storage_path,
        error: signedUrlError,
      })
      return { success: false, error: "Failed to generate secure download link" }
    }

    return {
      success: true,
      certificate: {
        id: data.id,
        certificateNumber: data.certificate_number,
        pdfUrl: signedUrlData.signedUrl,
        generatedAt: data.generated_at,
      },
    }
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Unknown error" 
    }
  }
}
