"use server"

/**
 * Reissue Certificate Action
 *
 * Allows a doctor to correct and reissue an existing medical certificate.
 * Same certificate number and ref are preserved. The corrected PDF is uploaded
 * to a unique path, then the live row switch and audit event commit atomically;
 * the previous PDF remains untouched for rollback and medicolegal traceability.
 *
 * Doctor workflow only (doctor or admin acting clinically). Max 3 reissues per intake.
 * Patient notification defaults on so a corrected PDF does not silently
 * replace a document the patient has already received.
 */

import * as Sentry from "@sentry/nextjs"
import crypto from "crypto"

import { requireRoleOrNull } from "@/lib/auth/helpers"
import { doctorHasCapability } from "@/lib/auth/staff-capabilities"
import { env } from "@/lib/config/env"
import { getEmployerCertificateStorageVersion } from "@/lib/crypto/employer-certificate-token"
import { revalidatePatient, revalidateStaff } from "@/lib/dashboard/revalidate-staff"
import { getDoctorIdentity } from "@/lib/data/doctor-identity"
import {
  commitCertificateCorrection,
  getCertificateCorrectionCount,
  getCertificateForIntake,
} from "@/lib/data/issued-certificates"
import { MedCertPatientEmail, medCertPatientEmailSubject } from "@/lib/email/components/templates"
import { sendEmail } from "@/lib/email/send-email"
import { formatDateLong, formatShortDate, formatShortDateSafe } from "@/lib/format"
import { validateCertificateDateRange } from "@/lib/medical-certificates/date-policy"
import { reconcileCertificateEmailDelivery } from "@/lib/medical-certificates/email-delivery-reconciliation"
import { createLogger } from "@/lib/observability/logger"
import {
  getGuestCertificateAccessHref,
  getPatientIntakeDetailHref,
} from "@/lib/patient/certificate-download"
import { renderTemplatePdf } from "@/lib/pdf/template-renderer"
import { prepareCertificatePatientNameWrite } from "@/lib/security/phi-field-wrappers"
import { getAbsenceDays } from "@/lib/stripe/price-mapping"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

const logger = createLogger("reissue-cert")

async function removeUncommittedCorrection(
  supabase: ReturnType<typeof createServiceRoleClient>,
  storagePath: string,
  context: { intakeId: string; certificateId: string },
) {
  const { error } = await supabase.storage.from("documents").remove([storagePath])
  if (!error) return

  logger.error("[ReissueCert] Failed to clean uncommitted correction PDF", {
    ...context,
    storagePath,
  }, error)
  Sentry.captureException(error, {
    tags: {
      subsystem: "reissue-cert-cleanup",
      intakeId: context.intakeId,
      certId: context.certificateId,
    },
  })
}

export interface ReissueCertInput {
  intakeId: string
  patientName: string
  patientDob: string | null
  certificateType: "work" | "study" | "carer"
  startDate: string    // YYYY-MM-DD
  endDate: string      // YYYY-MM-DD
  medicalReason: string
  notifyPatient?: boolean  // defaults true
  correctionEventId?: string
}

export interface ReissueCertResult {
  success: boolean
  error?: string
  certificateId?: string
}

export async function reissueCertificateAction(
  input: ReissueCertInput
): Promise<ReissueCertResult> {
  const { intakeId } = input
  const notifyPatient = input.notifyPatient ?? true

  // 1. AUTH CHECK - doctor workflow, with admin allowed when acting clinically
  const user = await requireRoleOrNull(["doctor", "admin"])
  if (!user) {
    return { success: false, error: "Unauthorized" }
  }

  if (!doctorHasCapability(user.profile, "review_med_certs")) {
    logger.warn("[ReissueCert] Doctor lacks medical certificate capability", {
      doctorId: user.profile.id,
      intakeId,
    })
    return {
      success: false,
      error: "Your account is not configured to review medical certificates. Contact the medical director.",
    }
  }

  const supabase = createServiceRoleClient()
  let uncommittedStoragePath: string | null = null
  let certificateIdForCleanup: string | null = null

  try {
    const { data: intakeOwner, error: intakeOwnerError } = await supabase
      .from("intakes")
      .select("patient_id")
      .eq("id", intakeId)
      .single()

    if (intakeOwnerError || !intakeOwner) {
      logger.error("[ReissueCert] Failed to verify intake ownership", {
        intakeId,
        doctorId: user.profile.id,
      }, intakeOwnerError ?? undefined)
      return { success: false, error: "Could not verify intake ownership. Please try again." }
    }

    if (intakeOwner.patient_id === user.profile.id) {
      logger.warn("[ReissueCert] Doctor attempted to reissue own certificate", {
        intakeId,
        doctorId: user.profile.id,
      })
      return {
        success: false,
        error: "You cannot reissue your own medical certificate. Please have another doctor review this correction.",
      }
    }

    // 2. VALIDATE FIELDS
    const patientName = input.patientName.trim()
    if (!patientName) {
      return { success: false, error: "Patient name is required" }
    }

    const dateRangeValidation = validateCertificateDateRange(input.startDate, input.endDate, {
      maxBackdateDays: null,
      maxDurationDays: 30,
    })
    if (!dateRangeValidation.valid) {
      return { success: false, error: dateRangeValidation.error }
    }
    const durationDays = dateRangeValidation.durationDays

    // 3. FETCH EXISTING CERT - must be valid
    const cert = await getCertificateForIntake(intakeId)

    if (!cert) {
      return { success: false, error: "No certificate found for this request" }
    }

    if (cert.status !== "valid") {
      return {
        success: false,
        error: `Certificate cannot be reissued - current status is "${cert.status}"`,
      }
    }

    // 4. CORRECTION LIMIT - durable audit events, separate from resend limits
    const correctionCountResult = await getCertificateCorrectionCount(cert.id)
    if (!correctionCountResult.success) {
      logger.error("[ReissueCert] Failed to verify correction history", {
        intakeId,
        certId: cert.id,
      })
      return {
        success: false,
        error: "Could not verify certificate correction history. Please try again.",
      }
    }

    if ((correctionCountResult.count ?? 0) >= 3) {
      return {
        success: false,
        error: "Maximum corrections reached (3). Contact support.",
      }
    }

    // 5. DURATION VS PAID TIER CHECK
    const { data: intakeAnswersRow } = await supabase
      .from("intake_answers")
      .select("answers")
      .eq("intake_id", intakeId)
      .maybeSingle()

    const answers = intakeAnswersRow?.answers as Record<string, unknown> | undefined
    const paidDays = getAbsenceDays(answers)

    if (durationDays > paidDays) {
      return {
        success: false,
        error: `Duration (${durationDays} days) exceeds the paid certificate tier (${paidDays} day${paidDays === 1 ? "" : "s"}). Revoke and issue a new certificate instead.`,
      }
    }

    // 6. GET DOCTOR IDENTITY
    const doctorIdentity = await getDoctorIdentity(user.profile.id)
    if (!doctorIdentity) {
      logger.error("[ReissueCert] Failed to fetch doctor identity", {
        doctorId: user.profile.id,
        intakeId,
      })
      return { success: false, error: "Failed to fetch doctor identity" }
    }

    // 7. RENDER NEW PDF
    const consultationDate = formatDateLong(cert.issue_date)
    const formattedStartDate = formatDateLong(input.startDate)
    const formattedEndDate = formatDateLong(input.endDate)
    const issueDate = formatShortDate(cert.issue_date)
    const formattedDob = formatShortDateSafe(input.patientDob)

    const pdfResult = await renderTemplatePdf({
      certificateType: input.certificateType,
      patientName,
      patientDateOfBirth: formattedDob,
      consultationDate,
      startDate: formattedStartDate,
      endDate: formattedEndDate,
      certificateRef: cert.certificate_ref ?? cert.certificate_number,
      issueDate,
    })

    if (!pdfResult.success || !pdfResult.buffer) {
      logger.error("[ReissueCert] PDF render failed", {
        intakeId,
        certId: cert.id,
        error: pdfResult.error,
      })
      Sentry.captureMessage("[ReissueCert] PDF render failed", {
        level: "error",
        tags: { intakeId, certId: cert.id },
        extra: { error: pdfResult.error },
      })
      return { success: false, error: pdfResult.error ?? "Failed to render certificate PDF" }
    }

    const pdfBuffer = pdfResult.buffer

    // 8. COMPUTE NEW PDF HASH + PHI DUAL-WRITE FIELDS
    const newHash = crypto.createHash("sha256").update(pdfBuffer).digest("hex")
    const patientNameFields = await prepareCertificatePatientNameWrite(patientName)

    // 9. UPLOAD TO A UNIQUE PATH. Never overwrite the currently live PDF.
    const newStoragePath = `certificates/corrections/${cert.id}/${crypto.randomUUID()}.pdf`
    const { error: uploadError } = await supabase.storage
      .from("documents")
      .upload(newStoragePath, pdfBuffer, {
        contentType: "application/pdf",
        upsert: false,
      })

    if (uploadError) {
      logger.error("[ReissueCert] PDF upload failed", {
        intakeId,
        certId: cert.id,
        storagePath: newStoragePath,
      }, uploadError)
      Sentry.captureException(uploadError, {
        tags: { subsystem: "reissue-cert-upload", intakeId, certId: cert.id },
      })
      return { success: false, error: "Failed to upload corrected certificate" }
    }

    uncommittedStoragePath = newStoragePath
    certificateIdForCleanup = cert.id

    // 10. Atomically switch the row and append the required audit event.
    const actorRole = user.profile.role === "admin" ? "admin" : "doctor"
    const commitResult = await commitCertificateCorrection({
      certificateId: cert.id,
      expectedStoragePath: cert.storage_path,
      newStoragePath,
      patientName: patientNameFields.patient_name,
      patientNameEnc: patientNameFields.patient_name_enc,
      patientDob: input.patientDob,
      certificateType: input.certificateType,
      startDate: input.startDate,
      endDate: input.endDate,
      pdfHash: newHash,
      fileSizeBytes: pdfBuffer.length,
      actorId: user.profile.id,
      actorRole,
      pendingCorrectionEventId: input.correctionEventId,
    })

    if (!commitResult.success) {
      logger.error("[ReissueCert] Failed to commit certificate correction", {
        intakeId,
        certId: cert.id,
        error: commitResult.error,
      })
      await removeUncommittedCorrection(supabase, newStoragePath, {
        intakeId,
        certificateId: cert.id,
      })
      uncommittedStoragePath = null
      return { success: false, error: "Failed to update certificate record" }
    }

    uncommittedStoragePath = null

    logger.info("[ReissueCert] Certificate reissued", {
      certId: cert.id,
      intakeId,
      actorId: user.profile.id,
      durationDays,
      certificateType: input.certificateType,
      correctionCount: commitResult.correctionCount,
    })

    // 11. OPTIONAL PATIENT NOTIFICATION
    if (notifyPatient) {
      try {
        const { data: intakeRow } = await supabase
          .from("intakes")
          .select(`
            id,
            patient_id,
            patient:profiles!patient_id(
              id,
              full_name,
              email,
              auth_user_id
            )
          `)
          .eq("id", intakeId)
          .single()

        const rawPatient = intakeRow?.patient
        const patient = Array.isArray(rawPatient) ? rawPatient[0] : rawPatient

        if (patient?.email && patient?.full_name) {
          const isGuest = !patient.auth_user_id
          const dashboardUrl = isGuest
            ? `${env.appUrl}${getGuestCertificateAccessHref(intakeId)}`
            : `${env.appUrl}${getPatientIntakeDetailHref(intakeId)}`

          const emailResult = await sendEmail({
            to: patient.email,
            toName: patient.full_name,
            subject: `${medCertPatientEmailSubject(patient.full_name?.split(" ")[0])} (Updated)`,
            template: MedCertPatientEmail({
              patientName: patient.full_name,
              dashboardUrl,
              verificationCode: cert.verification_code,
              certType:
                input.certificateType === "study"
                  ? "study"
                  : input.certificateType === "carer"
                    ? "carer"
                    : "work",
              appUrl: env.appUrl,
              isGuest,
            }),
            emailType: "med_cert_patient",
            intakeId,
            patientId: patient.id,
            certificateId: cert.id,
            metadata: {
              certificate_storage_version: getEmployerCertificateStorageVersion(newStoragePath),
              cert_type: input.certificateType,
              reissued_by: user.profile.id,
            },
            tags: [
              { name: "category", value: "med_cert_reissue" },
              { name: "intake_id", value: intakeId },
              { name: "cert_type", value: input.certificateType },
            ],
          })

          if (emailResult.success) {
            await reconcileCertificateEmailDelivery({
              intakeId,
              certificateId: cert.id,
              expectedStorageVersion: getEmployerCertificateStorageVersion(newStoragePath),
              outcome: "sent",
              providerMessageId: emailResult.messageId,
              outboxId: emailResult.outboxId,
              actorId: user.profile.id,
              actorRole,
              source: "correction",
              eventData: {
                reissue_notification: true,
              },
            })
            logger.info("[ReissueCert] Patient notified of updated certificate", {
              intakeId,
              certId: cert.id,
              hasPatientEmail: true,
            })
          } else if (emailResult.outboxId && emailResult.retryable !== false) {
            logger.info("[ReissueCert] Updated certificate notification queued for recovery", {
              intakeId,
              certId: cert.id,
              outboxId: emailResult.outboxId,
            })
          } else {
            await reconcileCertificateEmailDelivery({
              intakeId,
              certificateId: cert.id,
              expectedStorageVersion: getEmployerCertificateStorageVersion(newStoragePath),
              outcome: "failed",
              failureReason: emailResult.error,
              outboxId: emailResult.outboxId,
              actorId: user.profile.id,
              actorRole,
              source: "correction",
              eventData: {
                reissue_notification: true,
              },
            })
            logger.warn("[ReissueCert] Patient notification failed (non-fatal)", {
              intakeId,
              certId: cert.id,
              error: emailResult.error,
            })
          }
        }
      } catch (emailError) {
        // Notification failure is non-fatal - cert update already succeeded
        logger.warn("[ReissueCert] Patient notification failed (non-fatal)", {
          intakeId,
          certId: cert.id,
          error: emailError instanceof Error ? emailError.message : String(emailError),
        })
        Sentry.captureException(emailError, {
          tags: { subsystem: "reissue-cert-notify", intakeId },
          level: "warning",
        })
      }
    }

    // 12. REVALIDATE PATHS
    revalidateStaff({ intakeId })
    revalidatePatient({ intakeId })

    // 13. RETURN SUCCESS
    return { success: true, certificateId: cert.id }
  } catch (error) {
    if (uncommittedStoragePath && certificateIdForCleanup) {
      await removeUncommittedCorrection(supabase, uncommittedStoragePath, {
        intakeId,
        certificateId: certificateIdForCleanup,
      })
    }
    logger.error(
      "[ReissueCert] Unexpected error",
      { intakeId },
      error instanceof Error ? error : undefined
    )
    Sentry.captureException(error, {
      tags: { subsystem: "reissue-cert", intakeId },
    })
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to reissue certificate",
    }
  }
}
