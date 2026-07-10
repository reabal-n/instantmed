"use server"

import * as Sentry from "@sentry/nextjs"
import crypto from "crypto"
import { z } from "zod"

import { getApiAuth, requireRole } from "@/lib/auth/helpers"
import { env } from "@/lib/config/env"
import { getEmployerCertificateStorageVersion } from "@/lib/crypto/employer-certificate-token"
import { revalidatePatient, revalidateStaff } from "@/lib/dashboard/revalidate-staff"
import {
  finalizeCertificateResend,
  getCertificateForIntake,
  reconcileCertificateResendAttempts,
  reserveCertificateResend,
} from "@/lib/data/issued-certificates"
import { MedCertPatientEmail, medCertPatientEmailSubject } from "@/lib/email/components/templates"
import { sendEmail } from "@/lib/email/send-email"
import { createLogger } from "@/lib/observability/logger"
import { getGuestCertificateAccessHref, getPatientIntakeDetailHref } from "@/lib/patient/certificate-download"
import { checkResendRateLimit } from "@/lib/rate-limit/resend-cert"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

const log = createLogger("resend-certificate")

type ReconciliationWriteResult = { success: boolean; error?: string }

interface ReconciliationStep {
  name: "email_status" | "email_retry_count" | "certificate_audit" | "resend_finalization"
  run: () => Promise<ReconciliationWriteResult>
}

async function runReconciliationStepWithRetry(step: ReconciliationStep): Promise<boolean> {
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      const result = await step.run()
      if (result.success) return true
    } catch {
      // Retry only this bookkeeping write. The provider email is never resent.
    }
  }

  return false
}

async function reserveResendWithRetry(
  input: Parameters<typeof reserveCertificateResend>[0],
) {
  const reconciliation = await reconcileCertificateResendAttempts(input.certificateId)
  if (!reconciliation.success) {
    return {
      success: false as const,
      error: reconciliation.error || "Certificate resend reconciliation failed",
    }
  }

  let lastResult: Awaited<ReturnType<typeof reserveCertificateResend>> = {
    success: false,
    error: "Certificate resend reservation failed",
  }
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      lastResult = await reserveCertificateResend(input)
      if (lastResult.success && lastResult.attemptStatus === "reserved") {
        return lastResult
      }
      if (lastResult.success) {
        return {
          success: false as const,
          error: `Certificate resend attempt is already ${lastResult.attemptStatus || "finalized"}`,
        }
      }
      if (
        lastResult.error?.includes("Maximum resends reached") ||
        lastResult.error?.includes("already queued")
      ) {
        return lastResult
      }
    } catch {
      lastResult = { success: false, error: "Certificate resend reservation failed" }
    }
  }
  return lastResult
}

async function reconcilePatientResendDelivery(input: {
  intakeId: string
  certificateId: string
  deliveryOutcome: "sent" | "failed"
  outboxId?: string
  steps: ReconciliationStep[]
}) {
  const failedSteps: ReconciliationStep["name"][] = []

  for (const step of input.steps) {
    if (!await runReconciliationStepWithRetry(step)) {
      failedSteps.push(step.name)
    }
  }

  if (failedSteps.length === 0) return

  // sendEmail's outbox row remains the delivery source of truth. Alert and
  // expose the ops surfaces for reconciliation without re-sending the email.
  log.error("Patient certificate resend reconciliation failed", {
    intakeId: input.intakeId,
    certificateId: input.certificateId,
    deliveryOutcome: input.deliveryOutcome,
    failedSteps,
    outboxId: input.outboxId,
  })
  Sentry.captureMessage("Patient certificate resend reconciliation failed", {
    level: "error",
    tags: {
      subsystem: "certificate-resend-reconciliation",
      delivery_outcome: input.deliveryOutcome,
    },
    extra: {
      intakeId: input.intakeId,
      certificateId: input.certificateId,
      deliveryOutcome: input.deliveryOutcome,
      failedSteps,
      outboxId: input.outboxId,
    },
  })
  revalidateStaff({
    intakeId: input.intakeId,
    ops: true,
    emails: true,
  })
}

interface ResendCertificateResult {
  success: boolean
  error?: string
  queued?: boolean
}

function isQueuedReservationError(error: string | undefined): boolean {
  return Boolean(error?.includes("already queued"))
}

const patientDataSchema = z.object({
  id: z.string(),
  full_name: z.string(),
  email: z.string().email(),
  auth_user_id: z.string().nullable().optional(),
})

/**
 * Phase 3 of dashboard remaster (2026-05-12). One implementation of resend.
 *
 * Two named exports keep call sites self-documenting:
 *   - `resendCertificate(intakeId)` — patient-initiated. Verifies patient
 *     owns the intake, rate-limited (5 per 24h via Upstash Redis).
 *   - `resendCertificateAsStaff(intakeId)` — staff-initiated. Requires
 *     doctor / admin / support role. Server-side throttle (max 3 staff
 *     resends per certificate via `issued_certificates.resend_count`).
 *
 * Both share the same email template, the same `issued_certificates` lookup,
 * and the same email-status / audit logging. The differences are scoped to
 * (a) auth source and (b) rate limiter.
 */
async function fetchIntakeForResend(supabase: ReturnType<typeof createServiceRoleClient>, intakeId: string) {
  return supabase
    .from("intakes")
    .select(`
      id,
      patient_id,
      status,
      patient:profiles!patient_id(
        id,
        full_name,
        email,
        auth_user_id
      )
    `)
    .eq("id", intakeId)
    .single()
}

function pickPatient(rawPatient: unknown) {
  const candidate = Array.isArray(rawPatient) ? rawPatient[0] : rawPatient
  return patientDataSchema.safeParse(candidate)
}

// Guest patients (no linked auth account) get the account-setup entry point so
// the cert email doesn't dead-end at the portal login wall; account holders get
// the portal as before. Mirrors execute-cert-approval.ts.
function accessLink(intakeId: string, patient: { email: string; auth_user_id?: string | null }) {
  return patient.auth_user_id
    ? `${env.appUrl}${getPatientIntakeDetailHref(intakeId)}`
    : `${env.appUrl}${getGuestCertificateAccessHref(intakeId)}`
}

export async function resendCertificate(intakeId: string): Promise<ResendCertificateResult> {
  try {
    const authResult = await getApiAuth()

    if (!authResult) {
      return { success: false, error: "Please sign in to continue" }
    }

    const rateLimit = await checkResendRateLimit(intakeId, authResult.profile.id)
    if (!rateLimit.allowed) {
      return {
        success: false,
        error: "You've reached the resend limit for this certificate. Please try again later.",
      }
    }

    const supabase = createServiceRoleClient()
    const { data: intake, error: fetchError } = await fetchIntakeForResend(supabase, intakeId)

    if (fetchError || !intake) {
      log.warn("Resend certificate: intake not found", { intakeId })
      return { success: false, error: "Request not found" }
    }

    if (intake.patient_id !== authResult.profile.id) {
      log.warn("Resend certificate: unauthorized", { intakeId, userId: authResult.profile.id })
      return { success: false, error: "You can only access your own requests" }
    }

    if (!["approved", "completed"].includes(intake.status)) {
      return { success: false, error: "Certificate is not yet available" }
    }

    const parsed = pickPatient(intake.patient)
    if (!parsed.success) {
      return { success: false, error: "Patient email not found" }
    }
    const patient = parsed.data

    const certificate = await getCertificateForIntake(intakeId)
    if (!certificate) {
      log.warn("Resend certificate: certificate not found in issued_certificates", { intakeId })
      return { success: false, error: "Certificate not found. Please contact support." }
    }

    const resendAttemptId = crypto.randomUUID()
    const reservation = await reserveResendWithRetry({
      attemptId: resendAttemptId,
      certificateId: certificate.id,
      actorId: authResult.profile.id,
      actorRole: "patient",
      resendReason: "patient_self_serve",
      countTowardStaffLimit: false,
    })
    if (!reservation.success) {
      if (isQueuedReservationError(reservation.error)) {
        log.info("Patient certificate resend already queued", {
          intakeId,
          certificateId: certificate.id,
        })
        return { success: true, queued: true }
      }
      log.error("Patient certificate resend reservation failed", {
        intakeId,
        certificateId: certificate.id,
      })
      return {
        success: false,
        error: "We couldn't start the resend safely. Please try again.",
      }
    }

    const emailResult = await sendEmail({
      to: patient.email,
      toName: patient.full_name,
      subject: `${medCertPatientEmailSubject(patient.full_name?.split(" ")[0])} (Resent)`,
      template: MedCertPatientEmail({
        patientName: patient.full_name,
        dashboardUrl: accessLink(intakeId, patient),
        verificationCode: certificate.verification_code,
        certType: certificate.certificate_type === "study" ? "study" : certificate.certificate_type === "carer" ? "carer" : "work",
        appUrl: env.appUrl,
        isGuest: !patient.auth_user_id,
      }),
      emailType: "med_cert_patient",
      intakeId,
      patientId: patient.id,
      certificateId: certificate.id,
      idempotencyKey: `certificate-resend:${resendAttemptId}`,
      metadata: {
        certificate_storage_version: getEmployerCertificateStorageVersion(
          certificate.storage_path,
        ),
        cert_type: certificate.certificate_type,
        resent_by_patient: true,
        resend_attempt_id: resendAttemptId,
      },
      tags: [
        { name: "category", value: "med_cert_resend" },
        { name: "intake_id", value: intakeId },
      ],
    })

    if (!emailResult.success) {
      const queuedForRetry = Boolean(
        emailResult.outboxId && emailResult.retryable !== false,
      )
      if (queuedForRetry) {
        revalidatePatient({ intakeId })
        log.info("Patient certificate resend queued for dispatcher recovery", {
          intakeId,
          certificateId: certificate.id,
          outboxId: emailResult.outboxId,
        })
        return { success: true, queued: true }
      }

      // An outbox-backed provider failure remains retryable by the dispatcher;
      // keep its reservation open until the durable row reaches sent or the
      // shared terminal retry cap. Validation, suppression, and non-retryable
      // provider failures are finalized immediately.
      await reconcilePatientResendDelivery({
        intakeId,
        certificateId: certificate.id,
        deliveryOutcome: "failed",
        outboxId: emailResult.outboxId,
        steps: [
          {
            name: "resend_finalization",
            run: () => finalizeCertificateResend({
              attemptId: resendAttemptId,
              deliverySucceeded: false,
              emailOutboxId: emailResult.outboxId,
              failureReason: emailResult.error,
            }),
          },
        ],
      })
      revalidatePatient({ intakeId })
      log.error("Resend certificate: email failed", { intakeId, error: emailResult.error })
      return {
        success: false,
        error: emailResult.outboxId
          ? "Failed to send email. Please contact support."
          : "Failed to send email. Please try again.",
      }
    }

    await reconcilePatientResendDelivery({
      intakeId,
      certificateId: certificate.id,
      deliveryOutcome: "sent",
      outboxId: emailResult.outboxId,
      steps: [
        {
          name: "resend_finalization",
          run: () => finalizeCertificateResend({
            attemptId: resendAttemptId,
            deliverySucceeded: true,
            emailOutboxId: emailResult.outboxId,
            providerMessageId: emailResult.messageId,
          }),
        },
      ],
    })
    revalidatePatient({ intakeId })

    log.info("Certificate resent successfully (patient-initiated)", { intakeId })
    return { success: true }
  } catch (error) {
    log.error("Resend certificate: unexpected error", {
      intakeId,
      error: error instanceof Error ? error.message : String(error),
    })
    return { success: false, error: "We couldn't resend your certificate. Please try again." }
  }
}

/**
 * Staff-initiated resend. Throttled at 3 resends per certificate. Updates
 * email status, increments retry count + resend_count, and logs an
 * `email_retry` certificate-audit event with the actor's profile id.
 */
export async function resendCertificateAsStaff(intakeId: string): Promise<ResendCertificateResult> {
  try {
    const { profile } = await requireRole(["doctor", "admin", "support"])
    const supabase = createServiceRoleClient()
    const { data: intake, error: fetchError } = await fetchIntakeForResend(supabase, intakeId)

    if (fetchError || !intake) {
      log.warn("Resend certificate (staff): intake not found", { intakeId })
      return { success: false, error: "Request not found" }
    }

    if (!["approved", "completed"].includes(intake.status)) {
      return { success: false, error: "Certificate is not yet available — intake must be approved first" }
    }

    const parsed = pickPatient(intake.patient)
    if (!parsed.success) {
      log.warn("Resend certificate (staff): invalid patient data", { intakeId, errors: parsed.error.flatten() })
      return { success: false, error: "Patient data is missing or invalid" }
    }
    const patient = parsed.data

    const certificate = await getCertificateForIntake(intakeId)

    if (certificate) {
      if ((certificate.resend_count ?? 0) >= 3) {
        return {
          success: false,
          error: "Maximum resends reached. Contact support if the patient still hasn't received their certificate.",
        }
      }

      const actorRole = profile.role === "support"
        ? "support"
        : profile.role === "admin"
          ? "admin"
          : "doctor"
      const resendAttemptId = crypto.randomUUID()
      const reservation = await reserveResendWithRetry({
        attemptId: resendAttemptId,
        certificateId: certificate.id,
        actorId: profile.id,
        actorRole,
        resendReason: "manual_admin_resend",
        countTowardStaffLimit: true,
      })
      if (!reservation.success) {
        const maximumReached = reservation.error?.includes("Maximum resends reached")
        if (isQueuedReservationError(reservation.error)) {
          log.info("Staff certificate resend already queued", {
            intakeId,
            certificateId: certificate.id,
            actorId: profile.id,
          })
          return { success: true, queued: true }
        }
        return {
          success: false,
          error: maximumReached
            ? "Maximum resends reached. Contact support if the patient still hasn't received their certificate."
            : "Could not reserve this resend safely. Please try again.",
        }
      }

      const emailResult = await sendEmail({
        to: patient.email,
        toName: patient.full_name,
        subject: `${medCertPatientEmailSubject(patient.full_name?.split(" ")[0])} (Resent)`,
        template: MedCertPatientEmail({
          patientName: patient.full_name,
          dashboardUrl: accessLink(intakeId, patient),
          verificationCode: certificate.verification_code,
          certType: certificate.certificate_type === "study" ? "study" : certificate.certificate_type === "carer" ? "carer" : "work",
          appUrl: env.appUrl,
          isGuest: !patient.auth_user_id,
        }),
        emailType: "med_cert_patient",
        intakeId,
        patientId: patient.id,
        certificateId: certificate.id,
        idempotencyKey: `certificate-resend:${resendAttemptId}`,
        metadata: {
          certificate_storage_version: getEmployerCertificateStorageVersion(
            certificate.storage_path,
          ),
          cert_type: certificate.certificate_type,
          resent_by: profile.id,
          retry_count: certificate.email_retry_count + 1,
          resend_attempt_id: resendAttemptId,
        },
        tags: [
          { name: "category", value: "med_cert_resend" },
          { name: "intake_id", value: intakeId },
          { name: "cert_type", value: certificate.certificate_type },
        ],
      })

      const queuedForRetry = Boolean(
        !emailResult.success &&
        emailResult.outboxId &&
        emailResult.retryable !== false,
      )
      const shouldFinalizeImmediately = !queuedForRetry
      const resendFinalized = shouldFinalizeImmediately
        ? await runReconciliationStepWithRetry({
            name: "resend_finalization",
            run: () => finalizeCertificateResend({
              attemptId: resendAttemptId,
              deliverySucceeded: emailResult.success,
              emailOutboxId: emailResult.outboxId,
              providerMessageId: emailResult.messageId,
              failureReason: emailResult.success ? null : emailResult.error,
            }),
          })
        : true

      if (!resendFinalized) {
        log.error("Staff certificate resend reconciliation failed", {
          intakeId,
          certificateId: certificate.id,
          deliverySucceeded: emailResult.success,
          outboxId: emailResult.outboxId,
        })
        Sentry.captureMessage("Staff certificate resend reconciliation failed", {
          level: "error",
          tags: {
            subsystem: "certificate-resend-reconciliation",
            actor_role: actorRole,
          },
          extra: {
            intakeId,
            certificateId: certificate.id,
            deliverySucceeded: emailResult.success,
            outboxId: emailResult.outboxId,
          },
        })
        revalidateStaff({ intakeId, ops: true, emails: true })
      }

      if (emailResult.success) {
        log.info("Certificate resent by staff", {
          intakeId,
          certificateId: certificate.id,
          resentBy: profile.id,
        })
        revalidateStaff({ intakeId })
        return { success: true }
      }

      if (queuedForRetry) {
        log.info("Staff certificate resend queued for dispatcher recovery", {
          intakeId,
          certificateId: certificate.id,
          outboxId: emailResult.outboxId,
          resentBy: profile.id,
        })
        revalidateStaff({ intakeId, emails: true })
        return { success: true, queued: true }
      }

      log.error("Certificate staff resend failed", {
        intakeId,
        certificateId: certificate.id,
        error: emailResult.error,
      })
      return {
        success: false,
        error: emailResult.outboxId
          ? "Failed to send email. Check the address or contact support."
          : emailResult.error || "Failed to send email",
      }
    }

    // No certificate found. Distinguish "legacy unmigrated" from "exists but invalid".
    const { data: anyCert } = await supabase
      .from("issued_certificates")
      .select("id, status")
      .eq("intake_id", intakeId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()

    if (anyCert) {
      log.warn("Resend certificate (staff): certificate exists but not valid", {
        intakeId,
        certificateId: anyCert.id,
        status: anyCert.status,
      })
      const guidance = anyCert.status === "superseded"
        ? "A newer certificate has already replaced this one. Resend the current valid certificate instead."
        : "Re-approve the intake from the doctor queue to issue a new certificate."
      return {
        success: false,
        error: `Certificate exists but has status "${anyCert.status}". ${guidance}`,
      }
    }

    log.warn("Resend certificate (staff): no certificate record found", { intakeId })
    return {
      success: false,
      error: "No certificate exists for this intake. Approve the intake from the doctor queue to issue one.",
    }
  } catch (error) {
    log.error("Resend certificate (staff): unexpected error", {
      intakeId,
      error: error instanceof Error ? error.message : String(error),
    })
    return { success: false, error: "Failed to resend certificate. Please try again." }
  }
}
