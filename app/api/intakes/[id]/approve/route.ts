import { NextRequest, NextResponse } from "next/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { requireRole } from "@/lib/auth"
import { logger } from "@/lib/observability/logger"
import { getDoctorIdentity, isDoctorIdentityComplete } from "@/lib/data/doctor-identity"
import { checkCertificateRateLimit } from "@/lib/security/rate-limit"
import type { CertReviewData } from "@/components/doctor/cert-review-modal"
import type { MedCertDraftData } from "@/types/db"
import { approveAndSendCert } from "@/app/actions/approve-cert"

export const dynamic = "force-dynamic"

interface ApproveRequestBody {
  draftId?: string
  reviewData?: CertReviewData
}

interface ApproveResponse {
  success: boolean
  error?: string
  certificateId?: string
  emailStatus?: "sent" | "failed" | "pending"
  isExisting?: boolean
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApproveResponse>> {
  const { id: intakeId } = await params
  
  logger.info("API_APPROVE_START", { intakeId })

  try {
    const { profile: doctorProfile } = await requireRole(["doctor", "admin"])

    const rateLimitResult = await checkCertificateRateLimit(doctorProfile.id)
    if (!rateLimitResult.allowed) {
      return NextResponse.json({
        success: false,
        error: "Rate limit exceeded. Try again later.",
      }, { status: 429 })
    }

    const doctorIdentity = await getDoctorIdentity(doctorProfile.id)
    if (!isDoctorIdentityComplete(doctorIdentity)) {
      return NextResponse.json({
        success: false,
        error: "Your certificate credentials are not configured.",
      }, { status: 400 })
    }

    let body: ApproveRequestBody = {}
    try {
      body = await request.json()
    } catch {
      // Empty body is OK
    }

    let reviewData: CertReviewData

    if (body.reviewData) {
      reviewData = body.reviewData
    } else {
      const supabase = createServiceRoleClient()
      
      let draft = null
      const { data: draftByRequestId } = await supabase
        .from("document_drafts")
        .select("data")
        .eq("request_id", intakeId)
        .eq("type", "med_cert")
        .maybeSingle()

      if (draftByRequestId) {
        draft = draftByRequestId
      } else {
        const { data: draftByIntakeId } = await supabase
          .from("document_drafts")
          .select("data")
          .eq("intake_id", intakeId)
          .eq("type", "med_cert")
          .maybeSingle()
        draft = draftByIntakeId
      }

      const draftData = draft?.data as MedCertDraftData | null

      reviewData = {
        doctorName: doctorProfile.full_name || "Dr.",
        consultDate: new Date().toISOString().split("T")[0],
        startDate: draftData?.date_from || new Date().toISOString().split("T")[0],
        endDate: draftData?.date_to || new Date().toISOString().split("T")[0],
        medicalReason: draftData?.reason || "Medical Illness",
      }
    }

    logger.info("API_APPROVE_CALLING_CORE", { intakeId, draftId: body.draftId })

    const result = await approveAndSendCert(intakeId, reviewData)

    if (!result.success) {
      logger.warn("API_APPROVE_FAILED", { intakeId, error: result.error })
      return NextResponse.json({
        success: false,
        error: result.error,
      }, { status: 400 })
    }

    let emailStatus: "sent" | "failed" | "pending" = "pending"
    if (result.certificateId) {
      const supabase = createServiceRoleClient()
      const { data: outboxRow } = await supabase
        .from("email_outbox")
        .select("status")
        .eq("certificate_id", result.certificateId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()

      if (outboxRow?.status === "sent" || outboxRow?.status === "skipped_e2e") {
        emailStatus = "sent"
      } else if (outboxRow?.status === "failed") {
        emailStatus = "failed"
      }
    }

    logger.info("API_APPROVE_SUCCESS", { 
      intakeId, 
      certificateId: result.certificateId,
      emailStatus,
      isExisting: result.isExisting,
    })

    return NextResponse.json({
      success: true,
      certificateId: result.certificateId,
      emailStatus,
      isExisting: result.isExisting,
    })

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    logger.error("API_APPROVE_ERROR", { intakeId, error: errorMessage })

    if (errorMessage.includes("Unauthorized") || errorMessage.includes("not authenticated")) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }
    if (errorMessage.includes("not found")) {
      return NextResponse.json({ success: false, error: errorMessage }, { status: 404 })
    }

    return NextResponse.json({
      success: false,
      error: errorMessage || "An unexpected error occurred",
    }, { status: 500 })
  }
}
