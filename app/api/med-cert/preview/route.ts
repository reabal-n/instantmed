import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { generateMedCertPdfFactory } from "@/lib/documents/med-cert-pdf-factory"
import { logger } from "@/lib/logger"
import type { MedCertDraft } from "@/types/db"

/**
 * Endpoint to generate a preview PDF for a medical certificate draft
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

    const body = await request.json() as { draftData?: MedCertDraft; requestId?: string; draftId?: string }
    const { draftData, requestId, draftId } = body

    if (!draftData) {
      return NextResponse.json(
        { success: false, error: "Missing draft data" },
        { status: 400 }
      )
    }

    // Use draftId as requestId if requestId not provided
    const certRequestId = requestId || draftId || "preview"

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

    // Generate PDF
    const result = await generateMedCertPdfFactory({
      data: draftDataForFactory,
      subtype: draftData.certificate_type,
      requestId: certRequestId,
    })

    // Convert buffer to base64 data URL for preview
    const dataUrl = `data:application/pdf;base64,${result.buffer.toString("base64")}`

    return NextResponse.json({
      success: true,
      url: dataUrl,
    })
  } catch (error) {
    logger.error("Error generating preview PDF", { error })
    return NextResponse.json(
      { success: false, error: "Failed to generate preview PDF" },
      { status: 500 }
    )
  }
}
