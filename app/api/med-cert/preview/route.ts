import { NextRequest, NextResponse } from "next/server"
import { getApiAuth } from "@/lib/auth"
import { renderTemplatePdf } from "@/lib/pdf/template-renderer"
import { generateCertificateRef } from "@/lib/pdf/cert-identifiers"
import { createLogger } from "@/lib/observability/logger"
import { requireValidCsrf } from "@/lib/security/csrf"
const log = createLogger("med-cert-preview-route")
import type { MedCertDraft } from "@/types/db"

/**
 * Endpoint to generate a preview PDF for a medical certificate draft.
 * Uses the same template renderer as the production approval pipeline
 * so the preview matches the final certificate exactly.
 *
 * Doctor-only access.
 */
export async function POST(request: NextRequest) {
  try {
    // Require doctor or admin role
    const authResult = await getApiAuth()
    if (!authResult || !["doctor", "admin"].includes(authResult.profile.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const csrfError = await requireValidCsrf(request)
    if (csrfError) return csrfError

    const body = await request.json() as { draftData?: MedCertDraft; requestId?: string; draftId?: string }
    const { draftData } = body

    if (!draftData) {
      return NextResponse.json(
        { success: false, error: "Missing draft data" },
        { status: 400 }
      )
    }

    // Validate required fields
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

    // Generate a preview certificate ref
    const certificateRef = generateCertificateRef(certificateType)
    const today = new Date().toISOString().split("T")[0]!

    // Render using template renderer (same pipeline as approve-cert.ts)
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
      log.error("Preview PDF render failed", { error: result.error })
      return NextResponse.json(
        { success: false, error: result.error || "Failed to render preview PDF" },
        { status: 500 }
      )
    }

    // Convert buffer to base64 data URL for preview
    const dataUrl = `data:application/pdf;base64,${result.buffer.toString("base64")}`

    return NextResponse.json({
      success: true,
      url: dataUrl,
    })
  } catch (error) {
    log.error("Error generating preview PDF", {}, error instanceof Error ? error : undefined)
    return NextResponse.json(
      { success: false, error: "Failed to generate preview PDF" },
      { status: 500 }
    )
  }
}
