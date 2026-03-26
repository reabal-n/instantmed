/**
 * AI Auto-Approval Pipeline Orchestrator
 *
 * Called after AI drafts are generated for a med cert intake.
 * Evaluates eligibility, builds review data, and executes the
 * full approval pipeline (PDF → storage → email) without doctor intervention.
 *
 * Safety: feature-flagged, rate-limited, logged to ai_audit_log, doctor batch review.
 */

import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { createLogger } from "@/lib/observability/logger"
import { getFeatureFlags } from "@/lib/feature-flags"
import { evaluateAutoApprovalEligibility, extractDurationDays } from "./auto-approval"
import { executeCertApproval } from "@/lib/cert/execute-approval"
import { checkRateLimit, recordRateLimitedAction } from "@/lib/rate-limit/doctor"
import { getAbsenceDays } from "@/lib/stripe/price-mapping"
import { SYSTEM_AUTO_APPROVE_ID } from "@/lib/constants"
import * as Sentry from "@sentry/nextjs"
import type { CertReviewData } from "@/types/db"

const log = createLogger("auto-approval-pipeline")

// ============================================================================
// TYPES
// ============================================================================

export interface AutoApprovalResult {
  success: boolean
  autoApproved: boolean
  reason: string
  certificateId?: string
  error?: string
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Build CertReviewData from intake answers and doctor profile.
 * Used by auto-approval to construct the same data a doctor would enter in the review modal.
 */
function buildReviewDataFromAnswers(
  answers: Record<string, unknown> | null,
  doctorName: string
): CertReviewData | null {
  if (!answers) return null

  const today = new Date().toISOString().split("T")[0]!

  // Determine start date
  let startDate = (answers.start_date as string) || today
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate)) {
    startDate = today
  }

  // Determine end date from duration
  const durationDays = extractDurationDays(answers) || getAbsenceDays(answers)
  const start = new Date(startDate)
  const end = new Date(start)
  end.setDate(end.getDate() + durationDays - 1)
  const endDate = end.toISOString().split("T")[0]!

  // Medical reason from symptom details or structured symptoms
  let medicalReason = ""
  if (typeof answers.symptomDetails === "string" && answers.symptomDetails) {
    medicalReason = answers.symptomDetails
  } else if (Array.isArray(answers.symptoms) && answers.symptoms.length > 0) {
    medicalReason = answers.symptoms.filter((s): s is string => typeof s === "string").join(", ")
  }

  if (!medicalReason) {
    // No substantive symptom text — don't auto-approve with a generic placeholder.
    // The eligibility engine should catch this (empty_symptom_text), but defense-in-depth.
    return null
  }

  return {
    doctorName,
    consultDate: today,
    startDate,
    endDate,
    medicalReason,
  }
}

/**
 * Log to the ai_audit_log table for compliance tracking.
 */
async function logAutoApprovalAudit(
  supabase: ReturnType<typeof createServiceRoleClient>,
  intakeId: string,
  eligible: boolean,
  reason: string,
  metadata: Record<string, unknown>
): Promise<void> {
  try {
    await supabase.from("ai_audit_log").insert({
      intake_id: intakeId,
      action: "auto_approve",
      draft_type: "med_cert",
      draft_id: null,
      actor_id: SYSTEM_AUTO_APPROVE_ID,
      actor_type: "system",
      metadata: {
        eligible,
        reason,
        ...metadata,
      },
    })
  } catch (err) {
    log.warn("Failed to log auto-approval audit (non-fatal)", { intakeId, error: err })
  }
}

/**
 * Release the system auto-approval claim on an intake.
 * Called on every failure path after the claim is acquired.
 */
async function releaseSystemClaim(
  supabase: ReturnType<typeof createServiceRoleClient>,
  intakeId: string
): Promise<void> {
  try {
    const { error } = await supabase
      .from("intakes")
      .update({ claimed_by: null, claimed_at: null })
      .eq("id", intakeId)
      .eq("claimed_by", SYSTEM_AUTO_APPROVE_ID)

    if (error) {
      log.warn("Failed to release system claim", { intakeId, error: error.message })
    }
  } catch (err) {
    log.warn("Exception releasing system claim", { intakeId, error: err })
  }
}

// ============================================================================
// MAIN PIPELINE
// ============================================================================

/**
 * Attempt auto-approval for a med cert intake.
 *
 * Call this after AI draft generation succeeds.
 * Returns { autoApproved: true } if the cert was issued, or
 * { autoApproved: false } if the intake stays in the doctor queue.
 */
export async function attemptAutoApproval(intakeId: string): Promise<AutoApprovalResult> {
  const startTime = Date.now()

  // 1. Feature flag check (DB-backed, togglable from admin dashboard)
  const featureFlags = await getFeatureFlags()
  if (!featureFlags.ai_auto_approve_enabled) {
    return { success: true, autoApproved: false, reason: "Feature disabled" }
  }

  // 1b. System-level rate limiting (configurable via admin dashboard)
  const rateLimitResult = await checkRateLimit(SYSTEM_AUTO_APPROVE_ID, {
    windowMs: 5 * 60 * 1000,
    maxRequests: featureFlags.auto_approve_rate_limit_5min,
    action: "auto_approve",
  })
  if (!rateLimitResult.allowed) {
    log.warn("Auto-approval rate limit hit", { intakeId, remaining: rateLimitResult.remaining })
    Sentry.captureMessage("Auto-approval rate limit exceeded", {
      level: "warning",
      tags: { subsystem: "auto-approval", intake_id: intakeId },
    })
    return { success: true, autoApproved: false, reason: "Rate limit exceeded" }
  }

  // 1c. Daily cap check (configurable via admin dashboard)
  const dailyRateLimitResult = await checkRateLimit("system-auto-approve-daily", {
    windowMs: 24 * 60 * 60 * 1000,
    maxRequests: featureFlags.auto_approve_daily_cap,
    action: "auto_approve_daily",
  })
  if (!dailyRateLimitResult.allowed) {
    log.warn("Auto-approval daily cap hit", { intakeId })
    Sentry.captureMessage(`Auto-approval daily cap exceeded (${featureFlags.auto_approve_daily_cap}/day)`, {
      level: "warning",
      tags: { subsystem: "auto-approval", intake_id: intakeId },
    })
    return { success: true, autoApproved: false, reason: "Daily cap exceeded" }
  }

  const supabase = createServiceRoleClient()

  try {
    // 2. Fetch intake with service info, answers, and patient DOB
    const { data: intake, error: intakeError } = await supabase
      .from("intakes")
      .select(`
        id,
        status,
        subtype,
        patient_id,
        service:services!service_id(
          id,
          slug,
          name,
          type
        ),
        patient:profiles!patient_id(
          date_of_birth
        ),
        answers:intake_answers(
          answers
        )
      `)
      .eq("id", intakeId)
      .single()

    if (intakeError || !intake) {
      log.warn("Auto-approval: intake not found", { intakeId, error: intakeError?.message })
      return { success: false, autoApproved: false, reason: "Intake not found", error: intakeError?.message }
    }

    // 3. Verify it's a med cert and still in "paid" status
    const serviceRaw = intake.service as unknown
    const service = (Array.isArray(serviceRaw) ? serviceRaw[0] : serviceRaw) as { id: string; slug: string; name: string; type: string } | null
    if (!service || service.type !== "med_certs") {
      return { success: true, autoApproved: false, reason: "Not a med cert service" }
    }

    if (intake.status !== "paid") {
      return { success: true, autoApproved: false, reason: `Intake status is ${intake.status}, not paid` }
    }

    // 3b. Atomic claim: set claimed_by='system-auto-approve' only if status is still 'paid' and unclaimed
    // This prevents racing with a doctor who may claim the intake concurrently
    const { data: claimRows, error: claimError } = await supabase
      .from("intakes")
      .update({
        claimed_by: SYSTEM_AUTO_APPROVE_ID,
        claimed_at: new Date().toISOString(),
      })
      .eq("id", intakeId)
      .eq("status", "paid")
      .is("claimed_by", null)
      .select("id")

    if (claimError || !claimRows || claimRows.length === 0) {
      log.info("Auto-approval: could not claim intake (likely claimed by doctor)", { intakeId })
      return { success: true, autoApproved: false, reason: "Intake already claimed by doctor" }
    }

    // === FROM HERE: claim is held. Every failure path MUST release it. ===

    // 4. Extract answers
    const answersRaw = intake.answers as unknown as { answers: Record<string, unknown> }[] | { answers: Record<string, unknown> } | null
    const answersObj = Array.isArray(answersRaw) ? answersRaw[0] : answersRaw
    const answersData = answersObj?.answers || null

    // 5. Fetch AI drafts
    const { data: drafts } = await supabase
      .from("document_drafts")
      .select("id, type, status, content")
      .eq("intake_id", intakeId)
      .eq("is_ai_generated", true)

    const clinicalNoteDraft = drafts?.find(d => d.type === "clinical_note") || null

    // 6. Extract patient info for age check
    const patientRaw = intake.patient as unknown
    const patientInfo = (Array.isArray(patientRaw) ? patientRaw[0] : patientRaw) as { date_of_birth: string | null } | null

    // 7. Evaluate eligibility (with configurable max duration from admin settings)
    const eligibility = evaluateAutoApprovalEligibility(
      { service_type: service.type, subtype: intake.subtype },
      answersData,
      {
        clinicalNote: clinicalNoteDraft
          ? { status: clinicalNoteDraft.status, content: clinicalNoteDraft.content as Record<string, unknown> }
          : null,
      },
      patientInfo,
      { maxDurationDays: featureFlags.auto_approve_max_duration_days },
    )

    // Log eligibility decision regardless of outcome
    await logAutoApprovalAudit(supabase, intakeId, eligibility.eligible, eligibility.reason, {
      disqualifyingFlags: eligibility.disqualifyingFlags,
      service_slug: service.slug,
      duration_days: extractDurationDays(answersData),
    })

    if (!eligibility.eligible) {
      log.info("Auto-approval: not eligible", {
        intakeId,
        reason: eligibility.reason,
        flags: eligibility.disqualifyingFlags,
      })
      await releaseSystemClaim(supabase, intakeId)
      return { success: true, autoApproved: false, reason: eligibility.reason }
    }

    // 8. Get platform doctor (earliest-registered with valid credentials)
    const { data: doctor, error: doctorError } = await supabase
      .from("profiles")
      .select("id, full_name, provider_number, ahpra_number")
      .eq("role", "doctor")
      .not("provider_number", "is", null)
      .not("ahpra_number", "is", null)
      .order("created_at", { ascending: true })
      .limit(1)
      .single()

    if (doctorError || !doctor || !doctor.provider_number || !doctor.ahpra_number) {
      log.error("Auto-approval: no available doctor with credentials", { intakeId, error: doctorError?.message })
      Sentry.captureMessage("Auto-approval failed: no doctor with credentials available", {
        level: "error",
        tags: { subsystem: "auto-approval", intake_id: intakeId },
      })
      await releaseSystemClaim(supabase, intakeId)
      return { success: false, autoApproved: false, reason: "No doctor available", error: "No doctor with credentials found" }
    }

    // 9. Build review data from answers
    const reviewData = buildReviewDataFromAnswers(answersData, doctor.full_name)
    if (!reviewData) {
      log.warn("Auto-approval: could not build review data from answers", { intakeId })
      await releaseSystemClaim(supabase, intakeId)
      return { success: false, autoApproved: false, reason: "Could not build review data", error: "Missing answer data" }
    }

    // 10. Execute the approval pipeline
    log.info("Auto-approval: executing approval pipeline", { intakeId, doctorId: doctor.id })

    const approvalResult = await executeCertApproval({
      intakeId,
      reviewData,
      doctorProfile: {
        id: doctor.id,
        full_name: doctor.full_name,
        provider_number: doctor.provider_number,
        ahpra_number: doctor.ahpra_number,
      },
      skipClaim: true,
      aiApproved: true,
      aiApprovalReason: eligibility.reason,
    })

    const durationMs = Date.now() - startTime

    if (approvalResult.success) {
      // Claim is consumed by the successful approval (status transitions to "approved")
      // No need to release — the intake is no longer in a claimable state
      log.info("Auto-approval: certificate issued", {
        intakeId,
        certificateId: approvalResult.certificateId,
        durationMs,
        emailSent: approvalResult.emailSent,
      })

      // Structured Sentry event for monitoring dashboards
      Sentry.captureMessage("AI auto-approval: certificate issued", {
        level: "info",
        tags: {
          subsystem: "auto-approval",
          intake_id: intakeId,
          outcome: "approved",
        },
        extra: {
          certificateId: approvalResult.certificateId,
          doctorId: doctor.id,
          durationMs,
          emailSent: approvalResult.emailSent,
        },
        fingerprint: ["auto-approval", "success"],
      })

      await logAutoApprovalAudit(supabase, intakeId, true, "Certificate issued", {
        certificate_id: approvalResult.certificateId,
        doctor_id: doctor.id,
        duration_ms: durationMs,
        email_sent: approvalResult.emailSent,
      })

      // Record rate-limit actions so the DB-backed counter increments
      await recordRateLimitedAction(SYSTEM_AUTO_APPROVE_ID, "auto_approve", { intakeId })
      await recordRateLimitedAction(SYSTEM_AUTO_APPROVE_ID, "auto_approve_daily", { intakeId })

      return {
        success: true,
        autoApproved: true,
        reason: "Auto-approved and delivered",
        certificateId: approvalResult.certificateId,
      }
    }

    // Approval failed — release claim so doctor can review
    log.warn("Auto-approval: approval pipeline failed", {
      intakeId,
      error: approvalResult.error,
      durationMs,
    })
    await releaseSystemClaim(supabase, intakeId)

    return {
      success: false,
      autoApproved: false,
      reason: "Approval pipeline failed",
      error: approvalResult.error,
    }
  } catch (error) {
    const durationMs = Date.now() - startTime
    const errorMessage = error instanceof Error ? error.message : String(error)

    log.error("Auto-approval: unexpected error", { intakeId, error: errorMessage, durationMs })
    Sentry.captureException(error, {
      tags: { subsystem: "auto-approval", intake_id: intakeId },
    })

    // Release claim on unexpected errors
    await releaseSystemClaim(supabase, intakeId)

    return {
      success: false,
      autoApproved: false,
      reason: "Unexpected error",
      error: errorMessage,
    }
  }
}
