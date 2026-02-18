import { NextRequest, NextResponse } from "next/server"
import { getApiAuth } from "@/lib/auth"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { generateMedCertPdfFactory } from "@/lib/documents/med-cert-pdf-factory"
import { createLogger } from "@/lib/observability/logger"
const log = createLogger("med-cert-render-route")
import type { MedCertDraft } from "@/types/db"
import { requireValidCsrf } from "@/lib/security/csrf"

/**
 * Render API endpoint for generating and uploading medical certificate PDFs
 * Called by issueMedCertificate server action
 * Doctor-only access
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

    // Convert MedCertDraft to factory's expected format (MedCertDraftData)
    // Note: doctor_ahpra is AHPRA registration number, NOT provider number
    // The factory uses provider_number for the Medicare provider number displayed on cert
    const draftDataForFactory = {
      patient_name: draftData.patient_full_name,
      dob: draftData.patient_dob,
      reason: draftData.reason_summary,
      date_from: draftData.date_from,
      date_to: draftData.date_to,
      work_capacity: null,
      notes: null,
      doctor_name: draftData.doctor_typed_name || "",
      provider_number: draftData.doctor_ahpra || "", // Note: MedCertDraft stores provider info in doctor_ahpra field
      created_date: new Date().toISOString().split("T")[0],
    }

    // Generate PDF using factory
    const result = await generateMedCertPdfFactory({
      data: draftDataForFactory,
      subtype: draftData.certificate_type,
      requestId,
    })

    log.info("PDF generated successfully", {
      requestId,
      certId: result.certId,
      size: result.size,
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
      certId: result.certId,
      size: result.size,
    })
  } catch (error) {
    log.error("Error rendering medical certificate", {
      error: error instanceof Error ? error.message : String(error),
    })
    return NextResponse.json(
      {
        success: false,
        error: "Failed to render certificate",
      },
      { status: 500 }
    )
  }
}
