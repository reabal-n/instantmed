import { NextRequest, NextResponse } from "next/server"
import { getApiAuth } from "@/lib/auth"
import { logger } from "@/lib/observability/logger"
import { requireValidCsrf } from "@/lib/security/csrf"
import { executeCertApproval } from "@/lib/cert/execute-approval"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import type { CertReviewData } from "@/types/db"

export const dynamic = "force-dynamic"

/**
 * POST /api/intakes/[id]/approve
 *
 * Delegates to the canonical executeCertApproval pipeline.
 * Kept for backward compatibility — prefer using the server action
 * (approveAndSendCert) from the Document Builder UI.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id: intakeId } = await params

  try {
    const csrfError = await requireValidCsrf(request)
    if (csrfError) return csrfError

    const authResult = await getApiAuth()
    if (!authResult || !["doctor", "admin"].includes(authResult.profile.role)) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
    }

    const doctor = authResult.profile
    if (!doctor.provider_number || !doctor.ahpra_number) {
      return NextResponse.json({ ok: false, error: "Certificate credentials not configured" }, { status: 400 })
    }

    // Fetch draft dates (if available) for the review data
    const supabase = createServiceRoleClient()
    const { data: draft } = await supabase
      .from("document_drafts")
      .select("data")
      .eq("intake_id", intakeId)
      .eq("type", "med_cert")
      .maybeSingle()

    const draftData = draft?.data as { date_from?: string; date_to?: string; reason?: string } | null
    const today = new Date().toLocaleDateString("en-CA", { timeZone: "Australia/Sydney" })

    const reviewData: CertReviewData = {
      doctorName: doctor.full_name || "Dr.",
      consultDate: today,
      startDate: draftData?.date_from || today,
      endDate: draftData?.date_to || today,
      medicalReason: draftData?.reason || "Medical Illness",
    }

    const result = await executeCertApproval({
      intakeId,
      reviewData,
      doctorProfile: {
        id: doctor.id,
        full_name: doctor.full_name,
        provider_number: doctor.provider_number,
        ahpra_number: doctor.ahpra_number,
      },
      skipClaim: false,
    })

    if (!result.success) {
      return NextResponse.json({ ok: false, error: result.error }, { status: 400 })
    }

    return NextResponse.json({
      ok: true,
      certificateId: result.certificateId,
      alreadyApproved: result.isExisting,
    })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    logger.error("APPROVE_API_ERROR", { intakeId, error: msg })
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 })
  }
}
