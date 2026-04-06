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
import { evaluateAutoApprovalEligibility, extractDurationDays, extractStartDate } from "./auto-approval"
import { executeCertApproval } from "@/lib/cert/execute-approval"
import { checkRateLimit, recordRateLimitedAction } from "@/lib/rate-limit/doctor"
import { getAbsenceDays } from "@/lib/stripe/price-mapping"
import { SYSTEM_AUTO_APPROVE_ID } from "@/lib/constants"
import { prepareDoctorNotesWrite } from "@/lib/security/phi-field-wrappers"
import * as Sentry from "@sentry/nextjs"
import { getPostHogClient } from "@/lib/posthog-server"
import { sendTelegramAlert, escapeMarkdownValue } from "@/lib/notifications/telegram"
import {
  claimForProcessing, markApproved,
  markFailedRetrying, markIneligible,
} from "./auto-approval-state"
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

  // Use AEST date — UTC can be a day ahead/behind in Australia
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Australia/Sydney" })

  // Determine start date — check both camelCase (new flow) and snake_case (legacy)
  const rawStartDate = (answers.startDate as string) || (answers.start_date as string) || today
  const startDate = /^\d{4}-\d{2}-\d{2}$/.test(rawStartDate) ? rawStartDate : today

  // Determine end date from duration using pure string arithmetic to avoid
  // timezone pitfalls with new Date() (which parses YYYY-MM-DD as UTC midnight)
  const durationDays = extractDurationDays(answers) || getAbsenceDays(answers)
  const [y, m, d] = startDate.split("-").map(Number)
  const startUtcNoon = new Date(Date.UTC(y, m - 1, d, 12, 0, 0)) // noon UTC avoids DST edge
  startUtcNoon.setUTCDate(startUtcNoon.getUTCDate() + durationDays - 1)
  const endDate = startUtcNoon.toISOString().slice(0, 10) // YYYY-MM-DD

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
    consultDate: today, // AEST date — set above
    startDate,
    endDate,
    medicalReason,
  }
}

/**
 * Format clinical note JSON content into SOAP-format text for intake.doctor_notes.
 * Matches the format used by the manual review flow (components/doctor/review/utils.ts).
 */
function formatClinicalNoteContent(content: Record<string, unknown>): string | null {
  const c = content as Record<string, string>
  const sections: string[] = []
  const subj = c.presentingComplaint?.trim() || ""
  const obj = c.historyOfPresentIllness?.trim() || ""
  const assess = c.relevantInformation?.trim() || ""
  const plan = c.certificateDetails?.trim() || ""
  if (subj) sections.push(`Subjective:\n${subj}`)
  if (obj) sections.push(`Objective:\n${obj}`)
  if (assess) sections.push(`Assessment:\n${assess}`)
  if (plan) sections.push(`Plan:\n${plan}`)
  return sections.length > 0 ? sections.join("\n\n") : null
}

/**
 * Sync AI clinical note to intake.doctor_notes after auto-approval.
 * Uses PHI dual-write (plaintext + encrypted) matching the manual flow.
 * Non-fatal: if sync fails, the cert is already issued — log and continue.
 */
async function syncClinicalNoteAfterAutoApproval(
  supabase: ReturnType<typeof createServiceRoleClient>,
  intakeId: string,
  draftId: string,
  draftContent: Record<string, unknown>,
): Promise<void> {
  try {
    const formattedNotes = formatClinicalNoteContent(draftContent)
    if (!formattedNotes) {
      log.warn("Auto-approval: clinical note content empty, skipping sync", { intakeId, draftId })
      return
    }

    const phiFields = await prepareDoctorNotesWrite(formattedNotes)

    const { error } = await supabase
      .from("intakes")
      .update({
        ...phiFields,
        synced_clinical_note_draft_id: draftId,
      })
      .eq("id", intakeId)

    if (error) {
      log.error("Auto-approval: failed to sync clinical note to intake", { intakeId, draftId, error: error.message })
      Sentry.captureMessage("Auto-approval clinical note sync failed", {
        level: "warning",
        tags: { subsystem: "auto-approval", intake_id: intakeId },
        extra: { draftId, error: error.message },
      })
    } else {
      log.info("Auto-approval: clinical note synced to intake.doctor_notes", { intakeId, draftId })
    }
  } catch (err) {
    log.error("Auto-approval: unexpected error syncing clinical note", { intakeId, draftId, error: err })
    Sentry.captureException(err, {
      level: "warning",
      tags: { subsystem: "auto-approval", intake_id: intakeId, stage: "clinical_note_sync" },
    })
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
  metadata: Record<string, unknown>,
  doctorId?: string
): Promise<void> {
  try {
    await supabase.from("ai_audit_log").insert({
      intake_id: intakeId,
      action: "auto_approve",
      draft_type: "med_cert",
      draft_id: null,
      // Attribute to the real doctor when available (post-selection),
      // fall back to system for pre-selection eligibility checks
      actor_id: doctorId || SYSTEM_AUTO_APPROVE_ID,
      actor_type: doctorId ? "doctor" : "system",
      reason,
      metadata: {
        eligible,
        approval_pathway: "ai_assisted_clinical_decision_support",
        clinical_logic_version: "deterministic_v1",
        ...metadata,
      },
    })
  } catch (err) {
    // Audit log failures are non-fatal for the approval flow but must be visible
    log.warn("Failed to log auto-approval audit", { intakeId, error: err })
    Sentry.captureException(err, {
      level: "warning",
      tags: { subsystem: "auto-approval", intake_id: intakeId, stage: "audit_log" },
    })
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

  // doctorId is set after round-robin selection; trackOutcome uses it when available
  let selectedDoctorId: string | null = null

  const trackOutcome = (outcome: string, reason: string, extra?: Record<string, unknown>) => {
    try {
      const posthog = getPostHogClient()
      posthog.capture({
        // Use real doctor as distinctId when available, system fallback for pre-selection failures
        distinctId: selectedDoctorId || "system-auto-approve",
        event: "cert_approval_pipeline",
        properties: {
          intake_id: intakeId,
          outcome, // "approved", "skipped", "failed", "rate_limited", "not_eligible", "dry_run"
          reason,
          approval_method: "ai_assisted",
          duration_ms: Date.now() - startTime,
          ...extra,
        },
      })
    } catch { /* non-blocking */ }
  }

  // 1. Feature flag check (DB-backed, togglable from admin dashboard)
  const featureFlags = await getFeatureFlags()
  if (!featureFlags.ai_auto_approve_enabled) {
    log.warn(
      "Auto-approval feature flag is OFF — intake will remain in doctor queue. " +
      "Enable via admin dashboard (feature_flags.ai_auto_approve_enabled) or DB.",
      { intakeId },
    )
    trackOutcome("skipped", "feature_disabled")
    return { success: true, autoApproved: false, reason: "Feature disabled" }
  }

  const isDryRun = featureFlags.auto_approve_dry_run
  if (isDryRun) {
    log.info("Auto-approval running in DRY RUN mode — will evaluate but NOT issue certificates", { intakeId })
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
    trackOutcome("rate_limited", "burst_limit")
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
    trackOutcome("rate_limited", "daily_cap")
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
      trackOutcome("skipped", "not_med_cert")
      return { success: true, autoApproved: false, reason: "Not a med cert service" }
    }

    if (intake.status !== "paid") {
      trackOutcome("skipped", "wrong_status", { status: intake.status })
      return { success: true, autoApproved: false, reason: `Intake status is ${intake.status}, not paid` }
    }

    // 3b. Claim via state machine (CAS: pending|failed_retrying → attempting)
    const claimed = await claimForProcessing(supabase, intakeId)
    if (!claimed) {
      log.info("Auto-approval: could not claim intake (CAS miss — already processing or claimed)", { intakeId })
      trackOutcome("skipped", "already_claimed")
      return { success: true, autoApproved: false, reason: "Already claimed or processing" }
    }

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

    // Count previous successful auto-approvals for this patient (trust building)
    const patientId = intake.patient_id

    // Run patient history queries in parallel for performance
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    const [
      { count: previousApprovalCount },
      { count: recentCertCount },
    ] = await Promise.all([
      supabase
        .from("intakes")
        .select("id", { count: "exact", head: true })
        .eq("patient_id", patientId)
        .eq("ai_approved", true)
        .eq("status", "approved"),
      // 6b. Repeat request detection — certs approved for this patient in last 7 days
      supabase
        .from("intakes")
        .select("id", { count: "exact", head: true })
        .eq("patient_id", patientId)
        .eq("status", "approved")
        .eq("category", "medical_certificate")
        .gte("reviewed_at", sevenDaysAgo)
        .neq("id", intakeId),
    ])

    // 6c. Overlapping date detection — check if requested dates overlap an existing approved cert
    let hasOverlappingCert = false
    const requestedStart = extractStartDate(answersData)
    const requestedDuration = extractDurationDays(answersData)
    if (requestedStart && requestedDuration) {
      const [y, m, d] = requestedStart.split("-").map(Number)
      const startUtc = new Date(Date.UTC(y, m - 1, d, 12, 0, 0))
      startUtc.setUTCDate(startUtc.getUTCDate() + requestedDuration - 1)
      const requestedEnd = startUtc.toISOString().slice(0, 10)

      const { data: overlapping } = await supabase
        .from("issued_certificates")
        .select("id")
        .eq("patient_id", patientId)
        .is("revoked_at", null)
        .lte("start_date", requestedEnd)
        .gte("end_date", requestedStart)
        .limit(1)

      hasOverlappingCert = (overlapping?.length ?? 0) > 0
    }

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
      {
        maxDurationDays: featureFlags.auto_approve_max_duration_days,
        previousApprovalCount: previousApprovalCount ?? 0,
        recentCertCount: recentCertCount ?? 0,
        hasOverlappingCert,
      },
    )

    // Log eligibility decision regardless of outcome — includes engine version for compliance
    await logAutoApprovalAudit(supabase, intakeId, eligibility.eligible, eligibility.reason, {
      disqualifyingFlags: eligibility.disqualifyingFlags,
      softFlags: eligibility.softFlags,
      service_slug: service.slug,
      duration_days: extractDurationDays(answersData),
      engine_version: eligibility.engineVersion,
      checks_applied: eligibility.checksApplied,
      recent_cert_count: recentCertCount ?? 0,
      has_overlapping_cert: hasOverlappingCert,
    })

    if (!eligibility.eligible) {
      log.info("Auto-approval: not eligible", {
        intakeId,
        reason: eligibility.reason,
        flags: eligibility.disqualifyingFlags,
      })

      // State machine decides: needs_doctor (deterministic) vs failed_retrying (transient)
      await markIneligible(supabase, intakeId, eligibility.reason,
        eligibility.disqualifyingFlags, (intake as Record<string, unknown>).auto_approval_attempts as number ?? 0)
      trackOutcome("not_eligible", eligibility.reason, { flags: eligibility.disqualifyingFlags })
      return { success: true, autoApproved: false, reason: eligibility.reason }
    }

    // 8. Round-robin doctor selection: pick the doctor with fewest recent approvals
    // Only select doctors whose AHPRA verification has not expired (ahpra_next_review_at
    // is null — no expiry set — or in the future). This prevents issuing certificates
    // under credentials that may have lapsed.
    const nowIso = new Date().toISOString()
    const { data: allDoctors, error: doctorError } = await supabase
      .from("profiles")
      .select("id, full_name, provider_number, ahpra_number, ahpra_next_review_at")
      .in("role", ["doctor", "admin"])
      .eq("ahpra_verified", true)
      .not("provider_number", "is", null)
      .not("ahpra_number", "is", null)

    // Filter out doctors whose ahpra_next_review_at has passed
    const doctors = (allDoctors || []).filter(d => {
      if (!d.ahpra_next_review_at) return true // no expiry set — allow
      return d.ahpra_next_review_at > nowIso
    })

    if (doctorError || doctors.length === 0) {
      const reason = allDoctors && allDoctors.length > 0 && doctors.length === 0
        ? "All doctors have overdue AHPRA verification"
        : "No doctor with credentials found"
      log.error("Auto-approval: no available doctor with valid credentials", { intakeId, error: doctorError?.message, reason })
      Sentry.captureMessage(`Auto-approval failed: ${reason}`, {
        level: "error",
        tags: { subsystem: "cert-pipeline", intake_id: intakeId },
      })
      await markFailedRetrying(supabase, intakeId, "no_doctor_available")
      trackOutcome("failed", "no_doctor", { reason })
      return { success: false, autoApproved: false, reason: "No doctor available", error: reason }
    }

    // If only one doctor, use them directly
    let doctor = doctors[0]
    if (doctors.length > 1) {
      // Pick the doctor with fewest approvals in the last 24 hours
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
      const doctorCounts = await Promise.all(
        doctors.map(async (d) => {
          const { count } = await supabase
            .from("intakes")
            .select("id", { count: "exact", head: true })
            .eq("reviewed_by", d.id)
            .gte("reviewed_at", oneDayAgo)
          return { doctor: d, count: count ?? 0 }
        })
      )
      doctorCounts.sort((a, b) => a.count - b.count)
      doctor = doctorCounts[0].doctor
    }

    // Set selectedDoctorId so PostHog events attribute to the real doctor
    selectedDoctorId = doctor.id

    // 9. Build review data from answers
    const reviewData = buildReviewDataFromAnswers(answersData, doctor.full_name)
    if (!reviewData) {
      log.warn("Auto-approval: could not build review data from answers", { intakeId })
      await markFailedRetrying(supabase, intakeId, "no_review_data")
      trackOutcome("failed", "no_review_data")
      return { success: false, autoApproved: false, reason: "Could not build review data", error: "Missing answer data" }
    }

    // 10. Dry-run check — evaluate but don't issue
    if (isDryRun) {
      log.info("Auto-approval DRY RUN: would have approved", {
        intakeId,
        doctorId: doctor.id,
        reviewData,
      })
      trackOutcome("dry_run", "would_approve", { doctor_id: doctor.id })
      // Transition back: attempting → pending (so it can be picked up again)
      // Uses CAS guard to ensure we only roll back if still in "attempting"
      await supabase.from("intakes")
        .update({ auto_approval_state: "pending", auto_approval_state_updated_at: new Date().toISOString() })
        .eq("id", intakeId)
        .eq("auto_approval_state", "attempting")
      return { success: true, autoApproved: false, reason: "Dry run — would have approved" }
    }

    // 11. Execute the approval pipeline
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
      // Mark approved via state machine (also sets ai_approved for backward compat)
      await markApproved(supabase, intakeId)

      // 12. Sync AI clinical note to intake.doctor_notes (non-fatal)
      if (clinicalNoteDraft) {
        await syncClinicalNoteAfterAutoApproval(
          supabase,
          intakeId,
          clinicalNoteDraft.id,
          clinicalNoteDraft.content as Record<string, unknown>,
        )
      }

      log.info("Auto-approval: certificate issued", {
        intakeId,
        certificateId: approvalResult.certificateId,
        durationMs,
        emailSent: approvalResult.emailSent,
      })

      await logAutoApprovalAudit(supabase, intakeId, true, "Certificate issued via clinical decision support", {
        certificate_id: approvalResult.certificateId,
        doctor_id: doctor.id,
        duration_ms: durationMs,
        email_sent: approvalResult.emailSent,
      }, doctor.id)

      trackOutcome("approved", "auto_approved", { certificate_id: approvalResult.certificateId })

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

    // Pipeline failed — mark for retry
    log.warn("Auto-approval: approval pipeline failed", {
      intakeId,
      error: approvalResult.error,
      durationMs,
    })
    await markFailedRetrying(supabase, intakeId, `pipeline_error: ${approvalResult.error}`)

    const alertMsg = `*Auto\\-Approval Failed*\n\nIntake ${intakeId.slice(0, 8)}\\.\\.\\. fell to queue\\.\nError: ${escapeMarkdownValue(approvalResult.error || "Unknown")}`
    sendTelegramAlert(alertMsg).catch(() => {})

    trackOutcome("failed", "pipeline_error", { error: approvalResult.error })
    return {
      success: false,
      autoApproved: false,
      reason: "Approval pipeline failed",
      error: approvalResult.error,
    }
  } catch (error) {
    // Unexpected error — mark for retry
    const durationMs = Date.now() - startTime
    const errorMessage = error instanceof Error ? error.message : String(error)

    log.error("Auto-approval: unexpected error", { intakeId, error: errorMessage, durationMs })
    Sentry.captureException(error, {
      tags: { subsystem: "auto-approval", intake_id: intakeId },
    })

    await markFailedRetrying(supabase, intakeId, `unexpected: ${errorMessage}`)

    trackOutcome("failed", "unexpected_error", { error: errorMessage })
    return {
      success: false,
      autoApproved: false,
      reason: "Unexpected error",
      error: errorMessage,
    }
  }
}
