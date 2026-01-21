import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { auth as _auth } from "@clerk/nextjs/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { generateMedCertPdfFactory } from "@/lib/documents/med-cert-pdf-factory"
import { createLogger } from "@/lib/observability/logger"
const log = createLogger("route")
import type { MedCertDraft } from "@/types/db"

/**
 * Render API endpoint for generating and uploading medical certificate PDFs
 * Called by issueMedCertificate server action
 * Doctor-only access
 */
export async function POST(request: NextRequest) {
  try {
    // Require doctor auth
    const { profile } = await requireAuth("doctor")
    if (!profile) {
      return NextResponse.json(
        { success: false, error: "Unauthorized - doctor access required" },
        { status: 401 }
      )
    }

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

    // Convert MedCertDraft to factory's expected format (MedCertDraftData)
    const draftDataForFactory = {
      patient_name: draftData.patient_full_name || "",
      dob: draftData.patient_dob,
      reason: draftData.reason_summary,
      date_from: draftData.date_from,
      date_to: draftData.date_to,
      work_capacity: null,
      notes: null,
      doctor_name: draftData.doctor_typed_name || "",
      provider_number: draftData.doctor_ahpra || "",
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

    // Upload to Supabase Storage (permanent bucket)
    const supabase = createServiceRoleClient()
    const fileName = `med-cert-${requestId}-${draftId}.pdf`
    const filePath = `certificates/${fileName}`

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("permanent")
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

    // Get public URL
    const { data: urlData } = supabase.storage
      .from("permanent")
      .getPublicUrl(filePath)

    const pdfUrl = urlData.publicUrl

    log.info("PDF uploaded successfully", {
      requestId,
      pdfUrl,
      path: uploadData.path,
    })

    // Create document record in database
    const { error: docError } = await supabase
      .from("documents")
      .insert({
        request_id: requestId,
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
    log.error("Error rendering medical certificate", { error })
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to render certificate",
      },
      { status: 500 }
    )
  }
}
