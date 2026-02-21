"use server"

import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { requireRoleOrNull } from "@/lib/auth"
import type { MedCertDraftData } from "@/types/db"
import { approveAndSendCert } from "@/app/actions/approve-cert"
import type { CertReviewData } from "@/types/db"
import { getCurrentProfile } from "@/lib/data/profiles"
import { getOrCreateMedCertDraftForIntake } from "@/lib/data/documents"
import { logger } from "@/lib/observability/logger"

/**
 * Fetch the draft data for certificate preview before approval.
 * Returns the draft data (dates, medical reason, patient info) so the doctor
 * can review and optionally edit before confirming approval.
 */
export async function fetchCertPreviewDataAction(
  intakeId: string,
  draftId: string
): Promise<{
  success: boolean
  error?: string
  data?: {
    patientName: string
    patientDob: string | null
    certificateType: "work" | "study" | "carer"
    startDate: string
    endDate: string
    medicalReason: string
    doctorName: string
    providerNumber: string
    consultDate: string
  }
}> {
  try {
    const authResult = await requireRoleOrNull(["doctor", "admin"])
    if (!authResult) {
      return { success: false, error: "Unauthorized or session expired" }
    }

    const supabase = createServiceRoleClient()
    const doctorProfile = await getCurrentProfile()

    // Fetch the intake to get patient info and service type
    const { data: intake, error: intakeError } = await supabase
      .from("intakes")
      .select(`
        id, service_id, category, subtype,
        patient:profiles!patient_id(id, full_name, date_of_birth),
        service:services!service_id(id, slug, type)
      `)
      .eq("id", intakeId)
      .single()

    if (intakeError || !intake) {
      return { success: false, error: "Intake not found" }
    }

    // Determine certificate type from service slug
    // Supabase returns joins as arrays — unwrap
    const serviceRaw = intake.service as unknown
    const service = (Array.isArray(serviceRaw) ? serviceRaw[0] : serviceRaw) as { slug: string } | null
    const slug = service?.slug || ""
    const certSubtype = slug.includes("carer") ? "carer" : slug.includes("uni") ? "study" : "work"

    // Fetch draft data
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
      const { data: draftByIntakeId } = await supabase
        .from("document_drafts")
        .select("data")
        .eq("intake_id", intakeId)
        .eq("type", "med_cert")
        .or("is_ai_generated.is.null,is_ai_generated.eq.false")
        .maybeSingle()
      if (draftByIntakeId) draft = draftByIntakeId
    }
    if (!draft) {
      const autoCreated = await getOrCreateMedCertDraftForIntake(intakeId)
      if (autoCreated?.data) {
        draft = { data: autoCreated.data }
      }
    }

    const draftData = draft?.data as MedCertDraftData | null
    const patientRaw = intake.patient as unknown
    const patient = (Array.isArray(patientRaw) ? patientRaw[0] : patientRaw) as { full_name: string; date_of_birth: string | null } | null

    const today = new Date().toLocaleDateString("en-CA", { timeZone: "Australia/Sydney" })

    return {
      success: true,
      data: {
        patientName: patient?.full_name || draftData?.patient_name || "Unknown",
        patientDob: patient?.date_of_birth || draftData?.dob || null,
        certificateType: certSubtype as "work" | "study" | "carer",
        startDate: draftData?.date_from || today,
        endDate: draftData?.date_to || today,
        medicalReason: draftData?.reason || draftData?.reason_summary || "Medical Illness",
        doctorName: doctorProfile?.full_name || "Dr.",
        providerNumber: doctorProfile?.provider_number || "",
        consultDate: today,
      },
    }
  } catch (err) {
    logger.error("Failed to fetch cert preview data", {
      intakeId,
      error: err instanceof Error ? err.message : String(err),
    })
    return { success: false, error: "Failed to load certificate data" }
  }
}

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

    // Fetch draft data - use draftId if provided, otherwise look up by intake_id.
    // Exclude AI-generated drafts (they use `content` column, not `data`).
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
      // Fallback: try intake_id, but exclude AI drafts
      const { data: draftByIntakeId } = await supabase
        .from("document_drafts")
        .select("data")
        .eq("intake_id", intakeId)
        .eq("type", "med_cert")
        .or("is_ai_generated.is.null,is_ai_generated.eq.false")
        .maybeSingle()

      if (draftByIntakeId) {
        draft = draftByIntakeId
      }
    }

    // If no draft exists at all, auto-create one from intake data.
    // This handles cases where the draft was never created (e.g. page load
    // failed due to a prior DB issue like a missing enum value).
    if (!draft) {
      logger.info("No draft found, auto-creating from intake data", { intakeId, draftId })
      try {
        const autoCreatedDraft = await getOrCreateMedCertDraftForIntake(intakeId)
        if (autoCreatedDraft?.data) {
          draft = { data: autoCreatedDraft.data }
          logger.info("Auto-created draft successfully", {
            intakeId,
            newDraftId: autoCreatedDraft.id,
            draftDataKeys: Object.keys(autoCreatedDraft.data as Record<string, unknown>),
          })
        } else {
          logger.warn("Auto-create returned null or empty data", { intakeId, hasResult: !!autoCreatedDraft })
        }
      } catch (autoCreateError) {
        logger.error("Auto-create draft failed with exception", {
          intakeId,
          error: autoCreateError instanceof Error ? autoCreateError.message : String(autoCreateError),
        })
      }
    }

    const draftData = draft?.data as MedCertDraftData | null

    // Require draft data with dates
    if (!draftData?.date_from || !draftData?.date_to) {
      logger.warn("Draft data missing or incomplete - cannot approve without valid dates", {
        intakeId,
        draftId,
        hasDraft: !!draft,
        hasDraftData: !!draftData,
        draftDataKeys: draftData ? Object.keys(draftData) : [],
        dateFrom: draftData?.date_from ?? "MISSING",
        dateTo: draftData?.date_to ?? "MISSING",
      })
      return { success: false, error: "Certificate draft is missing required date information. Please save the draft first, then try approving again." }
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

    // Use emailSent from approveAndSendCert result directly
    const emailStatus: "sent" | "failed" | "pending" = result.emailSent === true
      ? "sent"
      : result.emailSent === false
        ? "failed"
        : "pending"

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

/**
 * Approve a med cert using edited preview data (from CertificatePreviewDialog).
 * This allows the doctor to modify dates / medical reason before sending.
 */
export async function approveWithPreviewDataAction(
  intakeId: string,
  previewData: {
    startDate: string
    endDate: string
    medicalReason: string
    doctorName: string
    consultDate: string
  }
): Promise<ApproveActionResult> {
  logger.info("APPROVE_WITH_PREVIEW_START", { intakeId, startDate: previewData.startDate, endDate: previewData.endDate })

  try {
    const authResult = await requireRoleOrNull(["doctor", "admin"])
    if (!authResult) {
      return { success: false, error: "Unauthorized or session expired" }
    }

    // Validate dates
    const parsedFrom = new Date(previewData.startDate)
    const parsedTo = new Date(previewData.endDate)
    if (isNaN(parsedFrom.getTime()) || isNaN(parsedTo.getTime())) {
      return { success: false, error: "Invalid date values" }
    }
    if (parsedTo < parsedFrom) {
      return { success: false, error: "End date cannot be before start date" }
    }

    const reviewData: CertReviewData = {
      doctorName: previewData.doctorName,
      consultDate: previewData.consultDate,
      startDate: previewData.startDate,
      endDate: previewData.endDate,
      medicalReason: previewData.medicalReason,
    }

    const result = await approveAndSendCert(intakeId, reviewData)

    if (!result.success) {
      return { success: false, error: result.error || "Failed to generate certificate" }
    }

    const emailStatus: "sent" | "failed" | "pending" = result.emailSent === true
      ? "sent"
      : result.emailSent === false
        ? "failed"
        : "pending"

    return {
      success: true,
      certificateId: result.certificateId,
      emailStatus,
    }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err)
    logger.error("APPROVE_WITH_PREVIEW_ERROR", { intakeId, error: errorMessage })
    return { success: false, error: errorMessage || "An unexpected error occurred" }
  }
}
