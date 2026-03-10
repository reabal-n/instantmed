import { NextRequest, NextResponse } from "next/server"
import { getApiAuth } from "@/lib/auth"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { renderTemplatePdf } from "@/lib/pdf/template-renderer"
import { generateCertificateRef } from "@/lib/pdf/cert-identifiers"
import { createLogger } from "@/lib/observability/logger"
const log = createLogger("med-cert-render-route")
import type { MedCertDraft } from "@/types/db"
import { requireValidCsrf } from "@/lib/security/csrf"

/**
 * Render API endpoint for generating and uploading medical certificate PDFs.
 * Uses the same template renderer as the production approval pipeline
 * (lib/pdf/template-renderer.ts) so output matches exactly.
 *
 * Called by issueMedCertificate server action.
 * Doctor-only access.
 */
export async function POST(request: NextRequest) {
  try {
    // CSRF protection for session-based requests
    const csrfError = await requireValidCsrf(request)
    if (csrfError) {
      return csrfError
    }

    // Require doctor or admin role
    const authResult = await getApiAuth()
    if (!authResult || !["doctor", "admin"].includes(authResult.profile.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const { profile } = authResult

    const body = await request.json() as {
      requestId: string
      draftId: string
      draftData: MedCertDraft
    }

    const { requestId, draftId, draftData } = body

    if (!requestId || !draftId || !draftData) {
      return NextResponse.json(
        { success: false, error: "Missing required parameters" },
        { status: 400 }
      )
    }

    log.info("Generating medical certificate PDF", {
      requestId,
      draftId,
      doctorId: profile.id,
    })

    // Validate required fields before generation
    if (!draftData.patient_full_name) {
      return NextResponse.json(
        { success: false, error: "Patient name is required" },
        { status: 400 }
      )
    }
    if (!draftData.date_from || !draftData.date_to) {
      return NextResponse.json(
        { success: false, error: "Certificate dates are required" },
        { status: 400 }
      )
    }

    // Map certificate_type to template renderer's expected type
    const certTypeMap: Record<string, "work" | "study" | "carer"> = {
      work: "work",
      uni: "study",
      carer: "carer",
    }
    const certificateType = certTypeMap[draftData.certificate_type || "work"] || "work"

    // Format dates for display
    const formatDisplayDate = (dateStr: string) => {
      const d = new Date(dateStr)
      if (isNaN(d.getTime())) return dateStr
      return d.toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" })
    }
    const formatShortDate = (dateStr: string) => {
      const d = new Date(dateStr)
      if (isNaN(d.getTime())) return dateStr
      return d.toLocaleDateString("en-AU", { day: "2-digit", month: "2-digit", year: "numeric" })
    }

    const certificateRef = generateCertificateRef(certificateType)
    const today = new Date().toISOString().split("T")[0]!

    // Generate PDF using template renderer (same pipeline as approve-cert.ts)
    const result = await renderTemplatePdf({
      certificateType,
      patientName: draftData.patient_full_name,
      consultationDate: formatDisplayDate(today),
      startDate: formatDisplayDate(draftData.date_from),
      endDate: formatDisplayDate(draftData.date_to),
      certificateRef,
      issueDate: formatShortDate(today),
    })

    if (!result.success || !result.buffer) {
      log.error("PDF render failed", { requestId, error: result.error })
      return NextResponse.json(
        { success: false, error: result.error || "Failed to render PDF" },
        { status: 500 }
      )
    }

    log.info("PDF generated successfully", {
      requestId,
      certificateRef,
      size: result.buffer.length,
    })

    // Upload to Supabase Storage (documents bucket — matches canonical approve-cert pipeline)
    const supabase = createServiceRoleClient()
    const fileName = `med-cert-${requestId}-${draftId}.pdf`
    const filePath = `certificates/${fileName}`

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("documents")
      .upload(filePath, result.buffer, {
        contentType: "application/pdf",
        cacheControl: "3600",
        upsert: true, // Overwrite if exists
      })

    if (uploadError) {
      log.error("Failed to upload PDF to storage", {
        error: uploadError,
        requestId,
        draftId,
      })
      return NextResponse.json(
        { success: false, error: "Failed to upload PDF to storage" },
        { status: 500 }
      )
    }

    // Store the storage path as reference (bucket is private — downloads use signed URLs)
    const pdfUrl = filePath

    log.info("PDF uploaded successfully", {
      requestId,
      pdfUrl,
      path: uploadData.path,
    })

    // Create document record in database
    const { error: docError } = await supabase
      .from("documents")
      .insert({
        intake_id: requestId,
        type: "med_cert",
        subtype: draftData.certificate_type || "work",
        pdf_url: pdfUrl,
      })

    if (docError) {
      log.error("Failed to create document record", {
        error: docError,
        requestId,
      })
      // Don't fail the request - PDF is uploaded successfully
    }

    return NextResponse.json({
      success: true,
      pdfUrl,
      certId: certificateRef,
      size: result.buffer.length,
    })
  } catch (error) {
    log.error("Error rendering medical certificate", {}, error instanceof Error ? error : undefined)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to render certificate",
      },
      { status: 500 }
    )
  }
}
