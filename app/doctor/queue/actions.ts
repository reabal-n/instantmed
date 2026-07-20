"use server"

import * as Sentry from "@sentry/nextjs"

import { declineIntake as declineIntakeCanonical } from "@/app/actions/decline-intake"
import { trackIntakeFunnelStep } from "@/lib/analytics/posthog-server"
import {
  logExternalPrescribingIndicated,
  type RequestType,
} from "@/lib/audit/compliance-audit"
import { requireRole } from "@/lib/auth/helpers"
import {
  describeServiceCapability,
  doctorCanReviewService,
  hasAdminAccess,
  hasSupportAccess,
} from "@/lib/auth/staff-capabilities"
import { buildClinicalCaseSummary } from "@/lib/clinical/case-summary"
import { isControlledSubstance } from "@/lib/clinical/intake-validation"
import {
  getRepeatRxPrescribingBlocker,
  hasLegacyRepeatRxReconciliationNote,
  isRepeatRxIntake,
} from "@/lib/clinical/repeat-rx-attestation"
import { revalidatePatient, revalidateStaff } from "@/lib/dashboard/revalidate-staff"
import { IntakeLifecycleError } from "@/lib/data/intake-lifecycle"
import { formatClaimWarning } from "@/lib/data/intake-lock-warning"
import {
  approvePrescribedScript,
  flagForFollowup,
  markAsReviewed,
  saveDoctorNotes,
  startParchmentPrescribing,
  updateIntakeStatus,
  updateScriptSent,
} from "@/lib/data/intakes"
import { getDoctorCaseActionError } from "@/lib/doctor/case-action-guard"
import { resolveClinicalDecisionNote } from "@/lib/doctor/clinical-notes"
import {
  getParchmentPatientSyncEligibility,
  getParchmentScriptCompletionEligibility,
  isParchmentClaimSatisfied,
} from "@/lib/doctor/parchment-claim"
import { isPrescribingServiceRequest, isPrescribingServiceType } from "@/lib/doctor/service-types"
import {
  editPaidRequestTelegramMessageToApproved,
  editPaidRequestTelegramMessageToDeclined,
} from "@/lib/notifications/edit-paid-request-telegram"
import { createLogger } from "@/lib/observability/logger"
import { getParchmentPatientIdentityIssues } from "@/lib/parchment/sync-patient"
import { readAnswers } from "@/lib/security/phi-field-wrappers"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import type { IntakeStatus, Profile } from "@/types/db"

const logger = createLogger("doctor-queue-actions")

// UUID validation helper
function isValidUUID(id: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  return uuidRegex.test(id)
}

type ServiceRelation = { type?: string | null } | { type?: string | null }[] | null
type QueueActionProfile = Pick<Profile, "id" | "role">
type RelationValue<T> = T | T[] | null | undefined
type PrescribingIdentityPatient = Parameters<typeof getParchmentPatientIdentityIssues>[0]
type ClinicalDecisionPatient = {
  full_name: string | null
  date_of_birth: string | null
  sex: string | null
}
type IntakeAnswersRow = {
  answers: Record<string, unknown> | null
  answers_encrypted: never | null
}

function getServiceType(service: ServiceRelation | undefined): string | null {
  return Array.isArray(service) ? service[0]?.type ?? null : service?.type ?? null
}

function firstRelation<T>(value: RelationValue<T>): T | null {
  return Array.isArray(value) ? value[0] ?? null : value ?? null
}

function getScriptCompletionRequestType(category: string | null, serviceType?: string | null): RequestType {
  if (category === "medical_certificate") return "med_cert"
  if (
    category === "prescription" ||
    serviceType === "common_scripts" ||
    serviceType === "repeat_rx" ||
    serviceType === "prescription" ||
    serviceType === "repeat-script"
  ) {
    return "repeat_rx"
  }
  return "intake"
}

async function ensureClinicalDecisionNoteForApproval(
  intakeId: string,
  options: { requireExistingNote?: boolean } = {},
): Promise<{ success: true } | { success: false; error: string }> {
  const supabase = createServiceRoleClient()
  const { data: intake } = await supabase
    .from("intakes")
    .select(`
      doctor_notes,
      category,
      subtype,
      risk_tier,
      requires_live_consult,
      patient:profiles!patient_id (
        full_name,
        date_of_birth,
        sex
      ),
      answers:intake_answers (
        answers,
        answers_encrypted
      ),
      service:services!service_id(type)
    `)
    .eq("id", intakeId)
    .single()

  const answerRow = firstRelation(intake?.answers as RelationValue<IntakeAnswersRow>)
  const answers = answerRow
    ? (await readAnswers({
        answers: answerRow.answers,
        answers_enc: answerRow.answers_encrypted,
      })) ?? {}
    : {}
  const patient = firstRelation(intake?.patient as RelationValue<ClinicalDecisionPatient>)
  const serviceType = getServiceType(intake?.service as ServiceRelation)
  const fallbackDraftNote = !options.requireExistingNote && intake
    ? buildClinicalCaseSummary({
        answers,
        category: intake.category,
        subtype: intake.subtype,
        serviceType,
        patientName: patient?.full_name,
        patientDateOfBirth: patient?.date_of_birth ?? null,
        patientSex: patient?.sex ?? null,
        riskTier: intake.risk_tier,
        requiresLiveConsult: intake.requires_live_consult,
      }).draftNote
    : null
  const existingNotes = intake?.doctor_notes?.trim() || ""
  if (options.requireExistingNote && !hasLegacyRepeatRxReconciliationNote(existingNotes)) {
    return {
      success: false,
      error: "Add and save the recorded-script reconciliation acknowledgement before completing this legacy request.",
    }
  }
  if (options.requireExistingNote && /\bdecline\b[\s\S]*\brefund\b/i.test(existingNotes)) {
    return {
      success: false,
      error: "Replace the decline/refund draft with a saved reconciliation note for the already-issued script before completing this legacy request.",
    }
  }
  const decisionNote = resolveClinicalDecisionNote({
    doctorNotes: existingNotes,
    fallbackDraftNote,
  })

  if (!decisionNote) {
    return {
      success: false,
      error: options.requireExistingNote
        ? "Add and save a reconciliation note for the already-issued script before completing this legacy request."
        : "Use the draft note or add a brief clinical note before approving.",
    }
  }

  if (decisionNote !== existingNotes) {
    const saved = await saveDoctorNotes(intakeId, decisionNote)
    if (!saved) {
      return { success: false, error: "Failed to save clinical notes" }
    }
  }

  return { success: true }
}

async function sendScriptSentEmailIfNeeded(
  supabase: ReturnType<typeof createServiceRoleClient>,
  intakeId: string,
): Promise<"sent" | "already_sent" | "skipped_no_patient"> {
  const React = await import("react")
  const { sendEmail } = await import("@/lib/email/send-email")
  const { ScriptSentEmail, scriptSentEmailSubject } = await import("@/lib/email/components/templates/script-sent")
  const { getIntakeWithDetails } = await import("@/lib/data/intakes")

  const { data: existingEmail } = await supabase
    .from("email_outbox")
    .select("id")
    .eq("intake_id", intakeId)
    .eq("email_type", "script_sent")
    .limit(1)
    .maybeSingle()

  if (existingEmail) {
    logger.info("Skipping script_sent email - already sent", { intakeId })
    return "already_sent"
  }

  const intake = await getIntakeWithDetails(intakeId)
  if (!intake?.patient?.email) return "skipped_no_patient"

  const patientName = intake.patient.full_name || "Patient"
  await sendEmail({
    to: intake.patient.email,
    toName: patientName,
    subject: scriptSentEmailSubject(patientName.split(" ")[0]),
    template: React.createElement(ScriptSentEmail, {
      patientName,
      requestId: intakeId,
      escriptReference: intake.parchment_reference ?? undefined,
    }),
    emailType: "script_sent",
    intakeId,
    patientId: intake.patient.id,
    metadata: intake.parchment_reference ? { parchmentReference: intake.parchment_reference } : {},
  })
  return "sent"
}

async function ensureDoctorCaseActionAllowed(
  intakeId: string,
  profile: QueueActionProfile,
): Promise<{ success: true } | { success: false; error: string }> {
  if (hasAdminAccess(profile)) return { success: true }

  const supabase = createServiceRoleClient()
  const { data: intake, error } = await supabase
    .from("intakes")
    .select("claimed_by, reviewing_doctor_id, reviewed_by")
    .eq("id", intakeId)
    .single()

  if (error || !intake) {
    return { success: false, error: "Intake not found" }
  }

  const actionError = getDoctorCaseActionError({
    actorId: profile.id,
    actorRole: profile.role,
    claimed_by: intake.claimed_by,
    reviewing_doctor_id: intake.reviewing_doctor_id,
    reviewed_by: intake.reviewed_by,
  })

  if (actionError) {
    return { success: false, error: actionError }
  }

  return { success: true }
}

export async function updateStatusAction(
  intakeId: string,
  status: IntakeStatus,
): Promise<{ success: boolean; error?: string; code?: string }> {
  if (!isValidUUID(intakeId)) {
    return { success: false, error: "Invalid intake ID" }
  }

  const { profile } = await requireRole(["doctor", "admin"])
  if (!profile) {
    return { success: false, error: "Unauthorized" }
  }

  const ownership = await ensureDoctorCaseActionAllowed(intakeId, profile)
  if (!ownership.success) {
    return { success: false, error: ownership.error, code: "CASE_NOT_CLAIMED" }
  }

  // Validate clinical notes exist for approval/script statuses
  if (status === "approved" || status === "awaiting_script") {
    const supabase = createServiceRoleClient()
    const { data: intake } = await supabase
      .from("intakes")
      .select(`
        doctor_notes,
        category,
        subtype,
        risk_tier,
        requires_live_consult,
        patient:profiles!patient_id (
          full_name,
          date_of_birth,
          sex
        ),
        answers:intake_answers (
          answers,
          answers_encrypted
        ),
        service:services!service_id(type)
      `)
      .eq("id", intakeId)
      .single()

    const answerRow = firstRelation(intake?.answers as RelationValue<IntakeAnswersRow>)
    const answers = answerRow
      ? (await readAnswers({
          answers: answerRow.answers,
          answers_enc: answerRow.answers_encrypted,
        })) ?? {}
      : {}
    const patient = firstRelation(intake?.patient as RelationValue<ClinicalDecisionPatient>)
    const serviceType = getServiceType(intake?.service as ServiceRelation)
    if (status === "awaiting_script" && isRepeatRxIntake({ category: intake?.category, serviceType })) {
      const regimenBlocker = getRepeatRxPrescribingBlocker(answers)
      if (regimenBlocker) {
        return { success: false, error: regimenBlocker.error, code: regimenBlocker.code }
      }
    }
    const fallbackDraftNote = intake
      ? buildClinicalCaseSummary({
          answers,
          category: intake.category,
          subtype: intake.subtype,
          serviceType,
          patientName: patient?.full_name,
          patientDateOfBirth: patient?.date_of_birth ?? null,
          patientSex: patient?.sex ?? null,
          riskTier: intake.risk_tier,
          requiresLiveConsult: intake.requires_live_consult,
        }).draftNote
      : null
    const existingNotes = intake?.doctor_notes?.trim() || ""
    const decisionNote = resolveClinicalDecisionNote({
      doctorNotes: existingNotes,
      fallbackDraftNote,
    })

    if (!decisionNote) {
      return {
        success: false,
        error: "Use the draft note or add a brief clinical note before approving or prescribing.",
        code: "INSUFFICIENT_CLINICAL_NOTES",
      }
    }

    if (decisionNote !== existingNotes) {
      await saveDoctorNotes(intakeId, decisionNote)
    }
  }

  // CRITICAL GUARD: Block direct approval of med certs - they MUST go through document builder
  // Med certs require PDF generation and email sending via approveAndSendCert.
  // Phase 7 of dashboard remaster (2026-05-12): also gate on per-doctor
  // capability flags here so a doctor without `can_review_consults` /
  // `can_review_ed` etc cannot move an intake to approved or awaiting_script.
  if (status === "approved" || status === "awaiting_script") {
    const supabase = createServiceRoleClient()
    const { data: intake } = await supabase
      .from("intakes")
      .select("subtype, service:services(type)")
      .eq("id", intakeId)
      .single()

    const serviceType = (intake?.service as { type?: string } | null)?.type
    const subtype = intake?.subtype ?? null

    if (status === "approved" && serviceType === "med_certs") {
      return {
        success: false,
        error: "Medical certificates must be approved through the document builder to generate PDFs and send emails.",
        code: "MED_CERT_REQUIRES_DOCUMENT_BUILDER",
      }
    }

    if (status === "approved" && isPrescribingServiceRequest(serviceType, subtype)) {
      return {
        success: false,
        error: "Complete or record the prescription in Parchment before approving.",
        code: "PRESCRIPTION_REQUIRES_SCRIPT_EVIDENCE",
      }
    }

    if (!doctorCanReviewService(profile, serviceType, subtype)) {
      logger.warn("Doctor lacks capability for service", {
        doctorId: profile.id,
        intakeId,
        serviceType,
        subtype,
        status,
      })
      return {
        success: false,
        error: `Your account is not configured to review ${describeServiceCapability(serviceType, subtype)}. Contact the medical director.`,
        code: "DOCTOR_CAPABILITY_DENIED",
      }
    }
  }

  if (status === "awaiting_script") {
    const supabase = createServiceRoleClient()
    const { data: intake } = await supabase
      .from("intakes")
      .select(`
        status,
        payment_status,
        category,
        subtype,
        patient:profiles!patient_id (
          id,
          full_name,
          date_of_birth,
          sex,
          medicare_number,
          medicare_irn,
          medicare_expiry,
          ihi_number,
          phone,
          email,
          address_line1,
          suburb,
          state,
          postcode
        ),
        answers:intake_answers (
          answers,
          answers_encrypted
        ),
        service:services!service_id(type)
      `)
      .eq("id", intakeId)
      .single()

    if (!intake) {
      return { success: false, error: "Intake not found" }
    }

    const serviceType = getServiceType(intake.service as ServiceRelation)
    const eligibility = getParchmentPatientSyncEligibility({
      status: intake.status,
      payment_status: intake.payment_status,
      category: intake.category,
      subtype: intake.subtype,
      serviceType,
    })

    if (eligibility.eligible) {
      const patient = firstRelation(intake.patient as RelationValue<PrescribingIdentityPatient>)
      const answerRow = firstRelation(intake.answers as RelationValue<IntakeAnswersRow>)
      const answers = answerRow
        ? (await readAnswers({
            answers: answerRow.answers,
            answers_enc: answerRow.answers_encrypted,
          })) ?? undefined
        : undefined

      if (!patient) {
        return { success: false, error: "Patient profile not found" }
      }

      const missingFields = getParchmentPatientIdentityIssues(patient, answers)
      if (missingFields.length > 0) {
        return {
          success: false,
          error: `Cannot approve for prescribing until patient identity is complete: ${missingFields.join(", ")}`,
          code: "INCOMPLETE_PRESCRIBING_IDENTITY",
        }
      }
    }
  }

  try {
    const result = await updateIntakeStatus(intakeId, status, profile.id)
    if (!result) {
      return { success: false, error: "Failed to update status" }
    }

    // Mark as reviewed if going to in_review
    if (status === "in_review") {
      await markAsReviewed(intakeId, profile.id)
    }

    revalidateStaff({ intakeId, scripts: true })

    // Reconcile the original Telegram notification before this server action
    // completes. The helper remains fail-soft, so chat delivery never changes
    // the clinical outcome.
    if (status === "approved" || status === "awaiting_script") {
      await editPaidRequestTelegramMessageToApproved(intakeId)
    }

    return { success: true }
  } catch (error) {
    if (error instanceof IntakeLifecycleError) {
      switch (error.code) {
        case "PAYMENT_REQUIRED":
          return {
            success: false,
            error: "Cannot update status - payment not completed",
            code: error.code,
          }
        case "TERMINAL_STATE":
          return {
            success: false,
            error: "This intake has already been finalized",
            code: error.code,
          }
        case "INVALID_TRANSITION":
          return {
            success: false,
            error: `Invalid status change. ${error.message}`,
            code: error.code,
          }
        default:
          return {
            success: false,
            error: error.message,
            code: error.code,
          }
      }
    }
    throw error
  }
}

export async function saveDoctorNotesAction(
  intakeId: string,
  notes: string,
): Promise<{ success: boolean; error?: string }> {
  if (!isValidUUID(intakeId)) {
    return { success: false, error: "Invalid intake ID" }
  }

  const { profile } = await requireRole(["doctor", "admin"])
  if (!profile) {
    return { success: false, error: "Unauthorized" }
  }

  const ownership = await ensureDoctorCaseActionAllowed(intakeId, profile)
  if (!ownership.success) {
    return { success: false, error: ownership.error }
  }

  const success = await saveDoctorNotes(intakeId, notes)
  if (!success) {
    return { success: false, error: "Failed to save notes" }
  }

  return { success: true }
}

export async function declineIntakeAction(
  intakeId: string,
  reasonCode: string,
  reasonNote?: string,
): Promise<{ success: boolean; error?: string; refund?: { status: string } }> {
  if (!isValidUUID(intakeId)) {
    return { success: false, error: "Invalid intake ID" }
  }

  const { profile } = await requireRole(["doctor", "admin"])
  if (!profile) {
    return { success: false, error: "Unauthorized" }
  }

  const ownership = await ensureDoctorCaseActionAllowed(intakeId, profile)
  if (!ownership.success) {
    return { success: false, error: ownership.error }
  }

  // Phase 7 of dashboard remaster (2026-05-12): per-doctor capability gate.
  // Declining is a clinical decision; a doctor without the matching service
  // capability shouldn't be the one closing the case. Look up the intake
  // service so the error message can name the gated capability.
  {
    const supabase = createServiceRoleClient()
    const { data: intake } = await supabase
      .from("intakes")
      .select("subtype, service:services(type)")
      .eq("id", intakeId)
      .single()

    const serviceType = (intake?.service as { type?: string } | null)?.type ?? null
    const subtype = intake?.subtype ?? null

    if (!doctorCanReviewService(profile, serviceType, subtype)) {
      logger.warn("Doctor lacks capability to decline service", {
        doctorId: profile.id,
        intakeId,
        serviceType,
        subtype,
      })
      return {
        success: false,
        error: `Your account is not configured to review ${describeServiceCapability(serviceType, subtype)}. Contact the medical director.`,
      }
    }
  }

  // Use canonical decline action - handles refund + email + audit consistently
  const result = await declineIntakeCanonical({
    intakeId,
    reason: reasonNote,
    reasonCode,
  })

  if (!result.success) {
    return { success: false, error: result.error }
  }

  revalidateStaff({ intakeId })
  revalidatePatient({ intakeId })

  // Reconcile the original Telegram notification before this server action
  // completes. The helper remains fail-soft.
  await editPaidRequestTelegramMessageToDeclined(intakeId)

  return {
    success: true,
    refund: result.refund ? { status: result.refund.status } : undefined,
  }
}

export async function flagForFollowupAction(
  intakeId: string,
  reason: string,
): Promise<{ success: boolean; error?: string }> {
  if (!isValidUUID(intakeId)) {
    return { success: false, error: "Invalid intake ID" }
  }

  const { profile } = await requireRole(["doctor", "admin"])
  if (!profile) {
    return { success: false, error: "Unauthorized" }
  }

  const ownership = await ensureDoctorCaseActionAllowed(intakeId, profile)
  if (!ownership.success) {
    return { success: false, error: ownership.error }
  }

  const success = await flagForFollowup(intakeId, reason)
  if (!success) {
    return { success: false, error: "Failed to flag" }
  }

  return { success: true }
}

export async function markScriptSentAction(
  intakeId: string,
  scriptNotes?: string,
  parchmentReference?: string,
): Promise<{
  success: boolean
  error?: string
  code?: string
  emailNotification?: "sent" | "already_sent" | "skipped_no_patient" | "failed"
}> {
  const { profile } = await requireRole(["doctor", "admin"])
  if (!profile) {
    return { success: false, error: "Unauthorized" }
  }

  const supabase = createServiceRoleClient()
  const { data: intake, error: intakeError } = await supabase
    .from("intakes")
    .select(`
      id,
      status,
      payment_status,
      category,
      subtype,
      claimed_by,
      reviewing_doctor_id,
      reviewed_by,
      script_sent,
      patient:profiles!patient_id (
        id,
        full_name,
        date_of_birth,
        sex,
        medicare_number,
        medicare_irn,
        medicare_expiry,
        ihi_number,
        phone,
        email,
        address_line1,
        suburb,
        state,
        postcode
      ),
      answers:intake_answers (
        answers,
        answers_encrypted
      ),
      service:services!service_id(type)
    `)
    .eq("id", intakeId)
    .single()

  if (intakeError || !intake) {
    return { success: false, error: "Intake not found" }
  }

  if (intake.script_sent === true && intake.status === "completed") {
    return { success: true }
  }

  if (!hasAdminAccess(profile) && !isParchmentClaimSatisfied(intake, profile.id)) {
    return { success: false, error: "You must claim this intake before marking the script sent" }
  }

  const serviceType = getServiceType(intake.service as ServiceRelation)
  const subtype = intake.subtype ?? null

  const answerRow = firstRelation(intake.answers as RelationValue<IntakeAnswersRow>)
  const answers = answerRow
    ? (await readAnswers({
        answers: answerRow.answers,
        answers_enc: answerRow.answers_encrypted,
      })) ?? undefined
    : undefined

  const regimenBlocker = isRepeatRxIntake({ category: intake.category, serviceType })
    ? getRepeatRxPrescribingBlocker(answers)
    : null
  if (regimenBlocker && intake.script_sent !== true) {
    return { success: false, error: regimenBlocker.error, code: regimenBlocker.code }
  }

  if (!doctorCanReviewService(profile, serviceType, subtype)) {
    logger.warn("Doctor lacks capability to record prescription completion", {
      doctorId: profile.id,
      intakeId,
      serviceType,
      subtype,
    })
    return {
      success: false,
      error: `Your account is not configured to review ${describeServiceCapability(serviceType, subtype)}. Contact the medical director.`,
    }
  }

  const evidenceNote = scriptNotes?.trim()
  const evidenceReference = parchmentReference?.trim()
  if (!evidenceNote && !evidenceReference) {
    return {
      success: false,
      error: "Add the external script reference or channel used before recording the script as sent.",
      code: "SCRIPT_SENT_EVIDENCE_REQUIRED",
    }
  }

  const identityEligibility = getParchmentPatientSyncEligibility({
    status: intake.status,
    payment_status: intake.payment_status,
    category: intake.category,
    subtype: intake.subtype,
    serviceType,
  })

  if (identityEligibility.eligible) {
    const patient = firstRelation(intake.patient as RelationValue<PrescribingIdentityPatient>)

    if (!patient) {
      return { success: false, error: "Patient profile not found" }
    }

    const missingFields = getParchmentPatientIdentityIssues(patient, answers)
    if (missingFields.length > 0) {
      return {
        success: false,
        error: `Cannot record script completion until patient identity is complete: ${missingFields.join(", ")}`,
        code: "INCOMPLETE_PRESCRIBING_IDENTITY",
      }
    }
  }

  let completionStatus = intake.status
  if (completionStatus !== "awaiting_script") {
    const prescribingStarted = await startParchmentPrescribing(intakeId, profile.id)
    if (!prescribingStarted) {
      return { success: false, error: "Could not start the prescribing step for this request. Refresh and try again." }
    }
    completionStatus = "awaiting_script"
  }

  const eligibility = getParchmentScriptCompletionEligibility({
    status: completionStatus,
    payment_status: intake.payment_status,
    category: intake.category,
    subtype: intake.subtype,
    serviceType,
  })

  if (!eligibility.eligible) {
    return {
      success: false,
      error: eligibility.error || "This request is not ready for script completion",
    }
  }

  const success = await updateScriptSent(intakeId, true, evidenceNote, evidenceReference, profile.id)
  if (!success) {
    return { success: false, error: "Failed to mark script sent" }
  }

  try {
    await logExternalPrescribingIndicated(
      intakeId,
      getScriptCompletionRequestType(intake.category ?? null, serviceType),
      profile.id,
      evidenceReference || "manual_external_prescribing",
    )
  } catch (auditError) {
    logger.warn(
      "Failed to log external_prescribing_indicated event",
      { intakeId },
      auditError instanceof Error ? auditError : undefined,
    )
  }

  // Tell the patient their script is ready.
  //
  // The Parchment webhook deliberately does NOT email here: it fires on a
  // machine event, so the notification waits for the doctor's explicit
  // approval in approvePrescribedScriptAction. This path is the opposite —
  // the doctor has already prescribed externally and is clicking the button
  // themselves, so the click IS the explicit human confirmation and no second
  // automated event is coming to trigger the email.
  //
  // Before this, three patients (26 May, 28 May, 31 May 2026) paid, had a real
  // script written, and were never told by us; one received no email from
  // InstantMed at all. sendScriptSentEmailIfNeeded checks the outbox first, so
  // a later approval cannot double-send.
  let emailNotification: "sent" | "already_sent" | "skipped_no_patient" | "failed" = "failed"
  try {
    emailNotification = await sendScriptSentEmailIfNeeded(supabase, intakeId)
  } catch (emailErr) {
    emailNotification = "failed"
    // Non-fatal: the script evidence is already recorded and must not be lost
    // to an email outage. Sentry carries the miss so it can be resent.
    Sentry.captureException(emailErr, {
      tags: { email_type: "script_sent", intake_id: intakeId },
      level: "warning",
    })
    logger.warn("Failed to send script_sent email after manual mark", { intakeId, error: emailErr })
  }

  revalidateStaff({ intakeId, scripts: true })
  revalidatePatient({ intakeId })

  return { success: true, emailNotification }
}

export async function approvePrescribedScriptAction(
  intakeId: string,
): Promise<{ success: boolean; error?: string; code?: string; emailNotification?: "sent" | "already_sent" | "skipped_no_patient" | "failed" }> {
  const { profile } = await requireRole(["doctor", "admin"])
  if (!profile) {
    return { success: false, error: "Unauthorized" }
  }

  const supabase = createServiceRoleClient()
  const { data: intake, error: intakeError } = await supabase
    .from("intakes")
    .select(`
      id,
      status,
      payment_status,
      category,
      subtype,
      claimed_by,
      reviewing_doctor_id,
      reviewed_by,
      script_sent,
      parchment_reference,
      answers:intake_answers (
        answers,
        answers_encrypted
      ),
      service:services!service_id(type)
    `)
    .eq("id", intakeId)
    .single()

  if (intakeError || !intake) {
    return { success: false, error: "Intake not found" }
  }

  if (!hasAdminAccess(profile) && !isParchmentClaimSatisfied(intake, profile.id)) {
    return { success: false, error: "You must claim this intake before approving the prescription" }
  }

  const serviceType = getServiceType(intake.service as ServiceRelation)
  const subtype = intake.subtype ?? null

  const answerRow = firstRelation(intake.answers as RelationValue<IntakeAnswersRow>)
  const answers = answerRow
    ? (await readAnswers({
        answers: answerRow.answers,
        answers_enc: answerRow.answers_encrypted,
      })) ?? undefined
    : undefined

  const regimenBlocker = isRepeatRxIntake({ category: intake.category, serviceType })
    ? getRepeatRxPrescribingBlocker(answers)
    : null

  if (!doctorCanReviewService(profile, serviceType, subtype)) {
    logger.warn("Doctor lacks capability to approve prescription", {
      doctorId: profile.id,
      intakeId,
      serviceType,
      subtype,
    })
    return {
      success: false,
      error: `Your account is not configured to review ${describeServiceCapability(serviceType, subtype)}. Contact the medical director.`,
    }
  }

  if (intake.script_sent === true && intake.status === "completed") {
    let emailNotification: "sent" | "already_sent" | "skipped_no_patient" | "failed" = "failed"
    try {
      emailNotification = await sendScriptSentEmailIfNeeded(supabase, intakeId)
    } catch (emailErr) {
      emailNotification = "failed"
      Sentry.captureException(emailErr, {
        tags: { email_type: "script_sent", intake_id: intakeId },
        level: "warning",
      })
      logger.warn("Failed to send script_sent email", { intakeId, error: emailErr })
    }
    revalidateStaff({ intakeId, scripts: true })
    revalidatePatient({ intakeId })
    return { success: true, emailNotification }
  }

  const eligibility = getParchmentScriptCompletionEligibility({
    status: intake.status,
    payment_status: intake.payment_status,
    category: intake.category,
    subtype: intake.subtype,
    serviceType,
  })

  if (!eligibility.eligible) {
    return {
      success: false,
      error: eligibility.error || "This request is not ready for prescription approval",
    }
  }

  // Completion never manufactures fulfilment evidence. The Parchment webhook or
  // the explicit manual evidence action must record script_sent first; this is
  // the server-side backstop for the disabled Complete request control.
  if (intake.script_sent !== true) {
    return {
      success: false,
      error: "Complete or record the prescription in Parchment first.",
      code: "PRESCRIPTION_REQUIRES_SCRIPT_EVIDENCE",
    }
  }

  const clinicalNote = await ensureClinicalDecisionNoteForApproval(intakeId, {
    requireExistingNote: Boolean(regimenBlocker),
  })
  if (!clinicalNote.success) {
    return { success: false, error: clinicalNote.error }
  }

  const success = await approvePrescribedScript(intakeId, profile.id)
  if (!success) {
    return { success: false, error: "Failed to approve prescription" }
  }

  // Send email notification to patient via the centralized sendEmail pipeline.
  // This happens only after the doctor explicitly approves the already-sent
  // script, preserving the two-step prescribing workflow.
  let emailNotification: "sent" | "already_sent" | "skipped_no_patient" | "failed" = "failed"
  try {
    emailNotification = await sendScriptSentEmailIfNeeded(supabase, intakeId)
  } catch (emailErr) {
    emailNotification = "failed"
    // Email is non-critical, don't fail the action -- but log to Sentry
    Sentry.captureException(emailErr, {
      tags: { email_type: "script_sent", intake_id: intakeId },
      level: "warning",
    })
    logger.warn("Failed to send script_sent email", { intakeId, error: emailErr })
  }

  revalidateStaff({ intakeId, scripts: true })
  revalidatePatient({ intakeId })
  await editPaidRequestTelegramMessageToApproved(intakeId)

  return { success: true, emailNotification }
}

/**
 * Claim an intake for review (concurrent review lock)
 * Note: This feature requires the claim_intake_for_review migration to be run
 */
export async function claimIntakeAction(
  intakeId: string,
  force: boolean = false
): Promise<{ success: boolean; error?: string; claimedBy?: string }> {
  const { profile } = await requireRole(["doctor", "admin"])
  if (!profile) {
    return { success: false, error: "Unauthorized" }
  }

  // Check doctor availability (paused doctors cannot claim)
  const { createServiceRoleClient } = await import("@/lib/supabase/service-role")
  const supabaseCheck = createServiceRoleClient()
  const { data: profileData } = await supabaseCheck
    .from("profiles")
    .select("doctor_available")
    .eq("id", profile.id)
    .single()
  if (profileData?.doctor_available === false) {
    return { success: false, error: "You have paused new requests. Go to Settings to resume." }
  }

  if (!isValidUUID(intakeId)) {
    return { success: false, error: "Invalid intake ID" }
  }

  Sentry.setTag("action", "claim_intake")
  Sentry.setTag("intake_id", intakeId)

  try {
    const { createServiceRoleClient } = await import("@/lib/supabase/service-role")
    const supabase = createServiceRoleClient()

    logger.info("[ClaimIntake] Attempting claim", { intakeId, doctorId: profile.id, force })

    // Use the database function for atomic claim
    const { data, error } = await supabase.rpc("claim_intake_for_review", {
      p_intake_id: intakeId,
      p_doctor_id: profile.id,
      p_force: force,
    })

    if (error) {
      logger.error("[ClaimIntake] RPC failed", { intakeId, error: error.message })
      Sentry.captureMessage("Intake claim RPC failed", {
        level: "error",
        tags: { action: "claim_intake", intake_id: intakeId, step_id: "rpc_call" },
        extra: { error: error.message, doctorId: profile.id },
      })
      return { success: false, error: "Failed to claim intake" }
    }

    const result = data?.[0]
    if (!result?.success) {
      logger.info("[ClaimIntake] Intake already claimed", {
        intakeId,
        claimedBy: result?.current_claimant
      })
      return {
        success: false,
        // Mask the broken "( minutes remaining)" template when the System
        // (Auto-Approve) actor holds the claim. Doctor-claim error messages
        // and any other genuine RPC error fall through unchanged.
        error: formatClaimWarning(result, "Intake already claimed"),
        claimedBy: result?.current_claimant
      }
    }

    logger.info("[ClaimIntake] Claim successful", { intakeId, doctorId: profile.id })

    trackIntakeFunnelStep({
      step: "review_started",
      intakeId,
      serviceSlug: "unknown",
      serviceType: "unknown",
    })

    return { success: true }
  } catch (error) {
    logger.error("[ClaimIntake] Unexpected error", { intakeId }, error instanceof Error ? error : undefined)
    Sentry.captureException(error, {
      tags: { action: "claim_intake", intake_id: intakeId, step_id: "claim_outer_catch" },
    })
    // Return failure - do NOT silently succeed on unknown errors
    return { success: false, error: "Failed to claim intake for review. Please try again." }
  }
}

/**
 * Release claim on an intake
 * Note: This feature requires the release_intake_claim migration to be run
 */
export async function releaseIntakeClaimAction(
  intakeId: string
): Promise<{ success: boolean; error?: string }> {
  const { profile } = await requireRole(["doctor", "admin"])
  if (!profile) {
    return { success: false, error: "Unauthorized" }
  }

  if (!isValidUUID(intakeId)) {
    return { success: false, error: "Invalid intake ID" }
  }

  try {
    const { createServiceRoleClient } = await import("@/lib/supabase/service-role")
    const supabase = createServiceRoleClient()

    const { error } = await supabase.rpc("release_intake_claim", {
      p_intake_id: intakeId,
      p_doctor_id: profile.id,
    })

    if (error) {
      return { success: false, error: "Failed to release claim" }
    }

    return { success: true }
  } catch {
    return { success: false, error: "Failed to release claim" }
  }
}

/**
 * Get decline reason templates
 */
export async function getDeclineReasonTemplatesAction(): Promise<{
  success: boolean
  templates?: Array<{ code: string; label: string; description: string | null; requires_note: boolean }>
  error?: string
}> {
  const { profile } = await requireRole(["doctor", "admin"])
  if (!profile) {
    return { success: false, error: "Unauthorized" }
  }

  const { createServiceRoleClient } = await import("@/lib/supabase/service-role")
  const supabase = createServiceRoleClient()

  const { data, error } = await supabase
    .from("decline_reason_templates")
    .select("code, label, description, requires_note")
    .eq("is_active", true)
    .order("display_order", { ascending: true })

  if (error) {
    return { success: false, error: "Failed to fetch templates" }
  }

  return { success: true, templates: data }
}

/**
 * Issue a standalone Stripe refund for any paid intake. Separate from the
 * decline flow; works regardless of intake status. Aware of partial refunds
 * so it can top up to full when called on a `partially_refunded` intake
 * (e.g. customer escalates after a historical partial).
 *
 * Role gating:
 * - admin: unrestricted
 * - doctor: unrestricted (existing behaviour)
 * - support: capped at $100/refund and 3 refunds per rolling 24h. Above
 *   either limit, the action returns an error.
 */
const SUPPORT_REFUND_CAP_CENTS = 10_000 // $100
const SUPPORT_REFUND_MAX_PER_24H = 3

async function checkSupportRefundLimits(
  supabase: ReturnType<typeof createServiceRoleClient>,
  profileId: string,
  refundAmountCents: number,
): Promise<{ allowed: true } | { allowed: false; error: string }> {
  if (refundAmountCents > SUPPORT_REFUND_CAP_CENTS) {
    return {
      allowed: false,
      error: `Support refunds are capped at $${(SUPPORT_REFUND_CAP_CENTS / 100).toFixed(2)} per request (this one is $${(refundAmountCents / 100).toFixed(2)}). Ask an admin to process it.`,
    }
  }

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const { count, error } = await supabase
    .from("intakes")
    .select("id", { count: "exact", head: true })
    .eq("refunded_by", profileId)
    .gte("refunded_at", since)

  if (error) {
    logger.warn("[IssueRefund] Failed to count recent refunds", { profileId, error: error.message })
    // Fail closed: if we can't verify the rate limit, deny the action.
    return {
      allowed: false,
      error: "Could not verify your refund quota right now. Try again in a moment or ask an admin.",
    }
  }

  if ((count ?? 0) >= SUPPORT_REFUND_MAX_PER_24H) {
    return {
      allowed: false,
      error: `You've issued ${count} refunds in the last 24h (limit ${SUPPORT_REFUND_MAX_PER_24H}). Ask an admin or wait until the limit resets.`,
    }
  }

  return { allowed: true }
}

export async function issueRefundAction(
  intakeId: string,
): Promise<{ success: boolean; error?: string; refundId?: string; amount?: number; totalRefunded?: number }> {
  if (!isValidUUID(intakeId)) {
    return { success: false, error: "Invalid intake ID" }
  }

  const { profile } = await requireRole(["doctor", "admin", "support"])
  if (!profile) {
    return { success: false, error: "Unauthorized" }
  }

  Sentry.setTag("action", "issue_refund")
  Sentry.setTag("intake_id", intakeId)

  try {
    const supabase = createServiceRoleClient()
    const timestamp = new Date().toISOString()

    // Fetch intake with patient info
    const { data: intake, error: fetchError } = await supabase
      .from("intakes")
      .select(`
        id,
        status,
        category,
        payment_status,
        payment_id,
        stripe_payment_intent_id,
        amount_cents,
        refund_amount_cents,
        patient_id,
        patient:profiles!patient_id (
          id,
          full_name,
          email
        )
      `)
      .eq("id", intakeId)
      .single()

    if (fetchError || !intake) {
      return { success: false, error: "Request not found" }
    }

    // Refundable from `paid` (full original) or `partially_refunded` (top-up to full).
    // Anything else (refunded, unpaid, failed, disputed) is terminal for this flow.
    const refundable = intake.payment_status === "paid" || intake.payment_status === "partially_refunded"
    if (!refundable) {
      return {
        success: false,
        error: intake.payment_status === "refunded"
          ? "This request has already been fully refunded."
          : `Refund is not available for payment status '${intake.payment_status}'.`,
      }
    }

    const paidCents = intake.amount_cents ?? 0
    const alreadyRefundedCents = intake.refund_amount_cents ?? 0
    const remainingCents = Math.max(paidCents - alreadyRefundedCents, 0)

    if (remainingCents <= 0) {
      return { success: false, error: "Nothing left to refund on this request." }
    }

    // Support-role guardrails: cap per refund + rolling 24h count.
    if (hasSupportAccess(profile) && !hasAdminAccess(profile)) {
      const limit = await checkSupportRefundLimits(supabase, profile.id, remainingCents)
      if (!limit.allowed) {
        return { success: false, error: limit.error }
      }
    }

    // Get payment intent ID
    let paymentIntentId = intake.stripe_payment_intent_id

    if (!paymentIntentId && intake.payment_id) {
      try {
        const { stripe } = await import("@/lib/stripe/client")
        const session = await stripe.checkout.sessions.retrieve(intake.payment_id)
        paymentIntentId =
          typeof session.payment_intent === "string"
            ? session.payment_intent
            : session.payment_intent?.id || null
      } catch {
        logger.warn("[IssueRefund] Failed to fetch checkout session", { intakeId })
      }
    }

    if (!paymentIntentId) {
      return { success: false, error: "No payment found for this request" }
    }

    // Idempotency: top-up refunds against a previously-partially-refunded intake
    // need a distinct key so they aren't blocked by the original refund key.
    // The key is deterministic per (intake, current_already_refunded) so a
    // retry of the same top-up doesn't double-fire.
    const isTopUp = alreadyRefundedCents > 0
    const idempotencyKey = isTopUp
      ? `standalone_refund_topup_${intakeId}_${alreadyRefundedCents}`
      : `standalone_refund_${intakeId}`

    // Process Stripe refund. We pass an explicit amount so Stripe refunds
    // exactly the remaining unrefunded balance, not whatever it computes
    // by default.
    const { stripe } = await import("@/lib/stripe/client")
    const refund = await stripe.refunds.create(
      {
        payment_intent: paymentIntentId,
        amount: remainingCents,
        reason: "requested_by_customer",
        metadata: {
          intake_id: intakeId,
          category: intake.category || "unknown",
          refunded_by: profile.id,
          refunded_by_role: profile.role,
          refund_type: isTopUp ? "standalone_topup" : "standalone",
          already_refunded_cents: String(alreadyRefundedCents),
        },
      },
      { idempotencyKey }
    )

    const newTotalRefunded = alreadyRefundedCents + (refund.amount ?? 0)
    const isNowFullyRefunded = newTotalRefunded >= paidCents

    // Update intake. We always record the LATEST Stripe refund ID; the full
    // history is in Stripe + intake_events. `payment_status` flips to
    // `refunded` only when the running total covers the original payment.
    await supabase
      .from("intakes")
      .update({
        payment_status: isNowFullyRefunded ? "refunded" : "partially_refunded",
        refund_status: "succeeded",
        refund_stripe_id: refund.id,
        refund_amount_cents: newTotalRefunded,
        refunded_at: timestamp,
        refunded_by: profile.id,
        updated_at: timestamp,
      })
      .eq("id", intakeId)

    logger.info("[IssueRefund] Refund succeeded", {
      intakeId,
      refundId: refund.id,
      amount: refund.amount,
      totalRefunded: newTotalRefunded,
      isTopUp,
      actorRole: profile.role,
    })

    // Send patient email (non-critical)
    try {
      const patientRaw = intake.patient as unknown
      const patient = (Array.isArray(patientRaw) ? patientRaw[0] : patientRaw) as {
        id: string
        full_name: string | null
        email: string | null
      } | null

      if (patient?.email) {
        const { sendRefundIssuedEmail } = await import("@/lib/email/senders")
        const { emailRequestTypeLabel } = await import("@/lib/email/request-type-label")
        const amountFormatted = refund.amount
          ? `$${(refund.amount / 100).toFixed(2)}`
          : undefined

        await sendRefundIssuedEmail({
          to: patient.email,
          patientName: patient.full_name || "there",
          patientId: patient.id,
          intakeId,
          requestType: emailRequestTypeLabel(intake.category),
          amountFormatted,
        })
      }
    } catch (emailErr) {
      Sentry.captureException(emailErr, {
        tags: { email_type: "refund_issued", intake_id: intakeId },
        level: "warning",
      })
      logger.warn("[IssueRefund] Failed to send refund email", { intakeId })
    }

    revalidateStaff({ intakeId, content: true })
    revalidatePatient({ intakeId })

    return {
      success: true,
      refundId: refund.id,
      amount: refund.amount ?? 0,
      totalRefunded: newTotalRefunded,
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error"
    logger.error("[IssueRefund] Failed", { intakeId }, error instanceof Error ? error : undefined)
    Sentry.captureException(error, { tags: { action: "issue_refund", intake_id: intakeId } })
    return { success: false, error: `Failed to process refund: ${msg}` }
  }
}

/**
 * One-tap renewal prescribing lane (B2).
 *
 * For repeat-script intakes where the patient already holds an active
 * prescription for the same non-controlled medication, this action skips the
 * full review → note → move-to-prescribing manual sequence and does it
 * atomically in one call:
 *   1. Verify renewal eligibility (prior prescription + non-S4/S8)
 *   2. Check prescribing identity completeness
 *   3. Claim the intake (if unclaimed)
 *   4. Auto-write a standard renewal clinical note
 *   5. Mark as reviewed
 *   6. Transition to awaiting_script
 *
 * Doctor still opens Parchment to write the actual eScript — this action
 * only removes the intake-review phase, not the prescribing act itself.
 */
export async function quickPrescribeRenewalAction(
  intakeId: string,
): Promise<{ success: boolean; error?: string; code?: string }> {
  if (!isValidUUID(intakeId)) return { success: false, error: "Invalid intake ID" }

  const { profile } = await requireRole(["doctor", "admin"])
  if (!profile) return { success: false, error: "Unauthorized" }

  const supabase = createServiceRoleClient()

  const { data: intake, error: intakeError } = await supabase
    .from("intakes")
    .select(`
      id, status, category, subtype, patient_id, claimed_by,
      service:services!service_id(type),
      answers:intake_answers(answers, answers_encrypted),
      patient:profiles!patient_id(
        id, full_name, date_of_birth, sex,
        medicare_number, medicare_irn, medicare_expiry,
        ihi_number, phone, email,
        address_line1, suburb, state, postcode
      )
    `)
    .eq("id", intakeId)
    .single()

  if (intakeError || !intake) return { success: false, error: "Intake not found" }

  const serviceType = firstRelation(intake.service as RelationValue<{ type?: string | null }>)?.type ?? null

  if (!isPrescribingServiceType(serviceType)) {
    return {
      success: false,
      error: "Quick prescribe is only available for repeat prescription requests",
      code: "NOT_PRESCRIBING",
    }
  }

  if (intake.status !== "paid") {
    return { success: false, error: `Intake is already ${intake.status}` }
  }

  if (!doctorCanReviewService(profile, serviceType, intake.subtype)) {
    return {
      success: false,
      error: `Your account is not configured to review ${describeServiceCapability(serviceType, intake.subtype)}. Contact the medical director.`,
      code: "DOCTOR_CAPABILITY_DENIED",
    }
  }

  if (!hasAdminAccess(profile) && intake.claimed_by && intake.claimed_by !== profile.id) {
    return { success: false, error: "This intake is claimed by another doctor", code: "CASE_NOT_CLAIMED" }
  }

  const answerRow = firstRelation(intake.answers as RelationValue<IntakeAnswersRow>)
  const answers = answerRow
    ? (await readAnswers({ answers: answerRow.answers, answers_enc: answerRow.answers_encrypted })) ?? {}
    : {}

  const regimenBlocker = getRepeatRxPrescribingBlocker(answers)
  if (regimenBlocker) {
    return { success: false, error: regimenBlocker.error, code: regimenBlocker.code }
  }

  const medicationName: string =
    ((answers.medicationName as string) || (answers.medication_name as string) || "").trim()

  if (medicationName && isControlledSubstance(medicationName)) {
    return {
      success: false,
      error: "Quick prescribe is not available for controlled substances. Use the standard review flow.",
      code: "CONTROLLED_SUBSTANCE",
    }
  }

  const { data: priorScripts } = await supabase
    .from("prescriptions")
    .select("id, medication_name, medication_strength")
    .eq("patient_id", intake.patient_id)
    .in("status", ["active", "completed"])
    .order("created_at", { ascending: false })
    .limit(20)

  const priorScript = priorScripts?.find(
    (p) =>
      typeof p.medication_name === "string" &&
      p.medication_name.trim().toLowerCase() === medicationName.toLowerCase(),
  )

  if (!priorScript) {
    return {
      success: false,
      error: "No prior prescription found for this medication. Use the standard review flow.",
      code: "NOT_A_RENEWAL",
    }
  }

  const patient = firstRelation(intake.patient as RelationValue<PrescribingIdentityPatient>)
  if (!patient) return { success: false, error: "Patient profile not found" }

  const missingFields = getParchmentPatientIdentityIssues(patient, answers)
  if (missingFields.length > 0) {
    return {
      success: false,
      error: `Cannot prescribe until patient identity is complete: ${missingFields.join(", ")}`,
      code: "INCOMPLETE_PRESCRIBING_IDENTITY",
    }
  }

  if (!intake.claimed_by) {
    const { data: claimData, error: claimError } = await supabase.rpc("claim_intake_for_review", {
      p_intake_id: intakeId,
      p_doctor_id: profile.id,
      p_force: false,
    })
    const claim = Array.isArray(claimData) ? claimData[0] : claimData
    if (claimError || !claim?.success) {
      logger.warn("[QuickPrescribe] Claim failed", {
        intakeId,
        error: claimError?.message,
        currentClaimant: claim?.current_claimant,
      })
      return {
        success: false,
        error: formatClaimWarning(claim, "This intake could not be claimed for quick prescribing."),
        code: "CASE_NOT_CLAIMED",
      }
    }

    const { data: claimedIntake, error: claimVerificationError } = await supabase
      .from("intakes")
      .select("claimed_by")
      .eq("id", intakeId)
      .single()
    if (claimVerificationError || claimedIntake?.claimed_by !== profile.id) {
      return {
        success: false,
        error: "This intake is no longer claimed by you. Refresh the queue before prescribing.",
        code: "CASE_NOT_CLAIMED",
      }
    }
  }

  const medDesc =
    priorScript.medication_strength &&
    typeof priorScript.medication_strength === "string" &&
    priorScript.medication_strength.trim()
      ? `${priorScript.medication_name} ${priorScript.medication_strength}`
      : priorScript.medication_name
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Australia/Sydney" })
  const renewalNote = `Renewal reviewed ${today}. Patient has an established prescription for ${medDesc}. Clinically appropriate for repeat supply. Prescribing via Parchment.`

  const notesSaved = await saveDoctorNotes(intakeId, renewalNote, profile.id)
  if (!notesSaved) {
    return { success: false, error: "Failed to save the renewal clinical note" }
  }

  const markedReviewed = await markAsReviewed(intakeId, profile.id, profile.id)
  if (!markedReviewed) {
    return {
      success: false,
      error: "This intake changed before quick prescribing could complete. Refresh and try again.",
      code: "CASE_NOT_CLAIMED",
    }
  }

  try {
    const result = await updateIntakeStatus(intakeId, "awaiting_script", profile.id, profile.id)
    if (!result) return { success: false, error: "Failed to move intake to prescribing" }
  } catch (error) {
    if (error instanceof IntakeLifecycleError) {
      return { success: false, error: error.message, code: error.code }
    }
    throw error
  }

  await editPaidRequestTelegramMessageToApproved(intakeId)
  revalidateStaff({ intakeId, scripts: true })

  logger.info("[QuickPrescribe] Moved to awaiting_script", {
    intakeId,
    doctorId: profile.id,
    medication: medDesc,
  })

  return { success: true }
}
