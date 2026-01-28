"use server"

import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { requireRole } from "@/lib/auth"
import type { MedCertDraftData } from "@/types/db"
import { approveAndSendCert } from "@/app/actions/approve-cert"
import type { CertReviewData } from "@/components/doctor/cert-review-modal"
import { getCurrentProfile } from "@/lib/data/profiles"

export async function saveMedCertDraftAction(
  draftId: string,
  data: MedCertDraftData
): Promise<{ success: boolean; error?: string }> {
  try {
    // Require doctor or admin role
    await requireRole(["doctor", "admin"])

    const supabase = createServiceRoleClient()

    const { error } = await supabase
      .from("document_drafts")
      .update({ data, updated_at: new Date().toISOString() })
      .eq("id", draftId)

    if (error) {
      return { success: false, error: "Failed to save draft" }
    }

    return { success: true }
  } catch {
    return { success: false, error: "An unexpected error occurred" }
  }
}

export async function generateMedCertPdfAndApproveAction(
  intakeId: string,
  _draftId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Require doctor or admin role
    await requireRole(["doctor", "admin"])

    const supabase = createServiceRoleClient()
    const doctorProfile = await getCurrentProfile()

    // Fetch draft data - try request_id first (used by getOrCreateMedCertDraftForIntake), fallback to intake_id
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
      // Fallback to intake_id column (used by older getOrCreateMedCertDraftForRequest)
      const { data: draftByIntakeId } = await supabase
        .from("document_drafts")
        .select("data")
        .eq("intake_id", intakeId)
        .eq("type", "med_cert")
        .maybeSingle()
      draft = draftByIntakeId
    }

    const draftData = draft?.data as MedCertDraftData | null

    // Build review data from draft
    const reviewData: CertReviewData = {
      doctorName: doctorProfile?.full_name || "Dr.",
      consultDate: new Date().toISOString().split("T")[0],
      startDate: draftData?.date_from || new Date().toISOString().split("T")[0],
      endDate: draftData?.date_to || new Date().toISOString().split("T")[0],
      medicalReason: draftData?.reason || "Medical Illness",
    }

    // Use the approve-cert action which handles PDF generation and email
    const result = await approveAndSendCert(intakeId, reviewData)

    if (!result.success) {
      return { success: false, error: result.error || "Failed to generate certificate" }
    }

    return { success: true }
  } catch {
    return { success: false, error: "An unexpected error occurred" }
  }
}
