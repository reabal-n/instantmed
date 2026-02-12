"use server"

import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { requireRoleOrNull } from "@/lib/auth"
import type { MedCertDraftData } from "@/types/db"
import { approveAndSendCert } from "@/app/actions/approve-cert"
import type { CertReviewData } from "@/types/db"
import { getCurrentProfile } from "@/lib/data/profiles"
import { logger } from "@/lib/observability/logger"

export async function saveMedCertDraftAction(
  draftId: string,
  data: MedCertDraftData
): Promise<{ success: boolean; error?: string }> {
  try {
    // Require doctor or admin role (non-redirecting for server actions)
    const authResult = await requireRoleOrNull(["doctor", "admin"])
    if (!authResult) {
      return { success: false, error: "Unauthorized or session expired" }
    }

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

export interface ApproveActionResult {
  success: boolean
  error?: string
  emailStatus?: "sent" | "failed" | "pending"
  certificateId?: string
}

export async function generateMedCertPdfAndApproveAction(
  intakeId: string,
  draftId: string
): Promise<ApproveActionResult> {
  // DEBUG: Log at entry to prove server action is called
  logger.info("APPROVE_ACTION_START", { intakeId, draftId })
  
  try {
    // Require doctor or admin role (non-redirecting for server actions)
    const authResult = await requireRoleOrNull(["doctor", "admin"])
    if (!authResult) {
      logger.warn("APPROVE_ACTION_UNAUTHORIZED", { intakeId, draftId })
      return { success: false, error: "Unauthorized or session expired" }
    }

    const supabase = createServiceRoleClient()
    const doctorProfile = await getCurrentProfile()

    // Fetch draft data - use draftId if provided, otherwise look up by intake_id
    let draft = null
    if (draftId) {
      const { data: draftById } = await supabase
        .from("document_drafts")
        .select("data")
        .eq("id", draftId)
        .eq("type", "med_cert")
        .maybeSingle()
      draft = draftById
    }

    if (!draft) {
      // Fallback: try intake_id
      const { data: draftByIntakeId } = await supabase
        .from("document_drafts")
        .select("data")
        .eq("intake_id", intakeId)
        .eq("type", "med_cert")
        .maybeSingle()

      if (draftByIntakeId) {
        draft = draftByIntakeId
      }
    }

    const draftData = draft?.data as MedCertDraftData | null

    // P1 FIX: Require draft data with dates - don't silently fall back to today's date
    if (!draftData?.date_from || !draftData?.date_to) {
      logger.warn("Draft data missing or incomplete - cannot approve without valid dates", { intakeId, hasDraft: !!draft, hasDraftData: !!draftData })
      return { success: false, error: "Certificate draft is missing required date information. Please review the certificate details before approving." }
    }

    // Validate dates are valid and in correct order
    const parsedFrom = new Date(draftData.date_from)
    const parsedTo = new Date(draftData.date_to)
    if (isNaN(parsedFrom.getTime()) || isNaN(parsedTo.getTime())) {
      logger.warn("Draft has invalid date values", { intakeId, dateFrom: draftData.date_from, dateTo: draftData.date_to })
      return { success: false, error: "Certificate dates are invalid. Please correct the dates before approving." }
    }
    if (parsedTo < parsedFrom) {
      logger.warn("Draft end date before start date", { intakeId, dateFrom: draftData.date_from, dateTo: draftData.date_to })
      return { success: false, error: "End date cannot be before start date. Please correct the dates before approving." }
    }

    // Build review data from draft
    // Handle both 'reason' and 'reason_summary' fields for compatibility
    const medicalReason = draftData.reason || draftData.reason_summary || "Medical Illness"

    // Use Australian Eastern Time for consult date (medicolegal requirement)
    // new Date().toISOString() gives UTC which can be a day behind/ahead in AEST
    const nowAEST = new Date().toLocaleDateString("en-CA", { timeZone: "Australia/Sydney" }) // YYYY-MM-DD format
    const reviewData: CertReviewData = {
      doctorName: doctorProfile?.full_name || "Dr.",
      consultDate: nowAEST,
      startDate: draftData.date_from,
      endDate: draftData.date_to,
      medicalReason,
    }

    // Use the approve-cert action which handles PDF generation and email
    const result = await approveAndSendCert(intakeId, reviewData)

    if (!result.success) {
      return { success: false, error: result.error || "Failed to generate certificate" }
    }

    // Check email status from email_outbox if we have a certificate ID
    let emailStatus: "sent" | "failed" | "pending" = "pending"
    if (result.certificateId) {
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

    return { 
      success: true, 
      certificateId: result.certificateId,
      emailStatus,
    }
  } catch (err) {
    // DEBUG: Log full error details to identify where flow stops
    const errorMessage = err instanceof Error ? err.message : String(err)
    const errorStack = err instanceof Error ? err.stack : undefined
    logger.error("APPROVE_ACTION_ERROR", { 
      intakeId, 
      draftId,
      error: errorMessage, 
      stack: errorStack 
    })
    return { success: false, error: errorMessage || "An unexpected error occurred" }
  }
}
