import "server-only"

import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { createLogger } from "@/lib/observability/logger"
import { executeCertApproval } from "@/lib/clinical/execute-cert-approval"
import type { CertReviewData } from "@/types/db"

const log = createLogger("approve-direct")

interface DirectApproveParams {
  intakeId: string
  doctorProfileId: string
  doctorName: string
  providerNumber: string
  consultDate: string
  startDate: string
  endDate: string
  medicalReason: string
}

interface DirectApproveResult {
  success: boolean
  error?: string
  certificateId?: string
}

/**
 * Approve a med cert directly without a browser session.
 * Used by the Telegram webhook for quick approvals.
 *
 * Delegates to the canonical executeCertApproval pipeline - same PDF
 * generation, storage, email, and audit trail as the Document Builder.
 */
export async function approveMedCertDirect({
  intakeId,
  doctorProfileId,
  doctorName,
  providerNumber,
  consultDate,
  startDate,
  endDate,
  medicalReason,
}: DirectApproveParams): Promise<DirectApproveResult> {
  try {
    // Fetch AHPRA number (executeCertApproval needs it)
    const supabase = createServiceRoleClient()
    const { data: doctor } = await supabase
      .from("profiles")
      .select("ahpra_number")
      .eq("id", doctorProfileId)
      .single()

    if (!doctor?.ahpra_number) {
      return { success: false, error: "Doctor AHPRA number not configured" }
    }

    const reviewData: CertReviewData = {
      doctorName,
      consultDate,
      startDate,
      endDate,
      medicalReason,
    }

    const result = await executeCertApproval({
      intakeId,
      reviewData,
      doctorProfile: {
        id: doctorProfileId,
        full_name: doctorName,
        provider_number: providerNumber,
        ahpra_number: doctor.ahpra_number,
      },
      skipClaim: false,
    })

    if (result.success) {
      // Save Telegram approval note
      await supabase
        .from("intakes")
        .update({ doctor_notes: `Approved via Telegram. Reason: ${medicalReason}` })
        .eq("id", intakeId)

      log.info("Med cert approved via Telegram", { intakeId, certificateId: result.certificateId })
    }

    return {
      success: result.success,
      error: result.error,
      certificateId: result.certificateId,
    }
  } catch (error) {
    log.error("Direct approval error", { intakeId }, error instanceof Error ? error : new Error(String(error)))
    return { success: false, error: error instanceof Error ? error.message : "Approval failed" }
  }
}
