"use server"

/**
 * Reissue Certificate Action
 *
 * Allows a doctor to correct and reissue an existing medical certificate in-place.
 * Same certificate number and ref are preserved — the issued_certificates row is
 * updated, new PDF is generated, old PDF is replaced in storage, and the change
 * is logged to certificate_audit_log.
 *
 * Doctors only (not admin-only). Max 3 reissues per intake.
 * Optional patient notification (defaults off).
 */

import { requireRoleOrNull } from "@/lib/auth"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { createLogger } from "@/lib/observability/logger"
import { getCertificateForIntake, logCertificateEvent } from "@/lib/data/issued-certificates"
import { getDoctorIdentity } from "@/lib/data/doctor-identity"
import { getAbsenceDays } from "@/lib/stripe/price-mapping"
import { renderTemplatePdf } from "@/lib/pdf/template-renderer"
import { prepareCertificatePatientNameWrite } from "@/lib/security/phi-field-wrappers"
import { sendEmail } from "@/lib/email/send-email"
import { MedCertPatientEmail, medCertPatientEmailSubject } from "@/components/email/templates"
import { env } from "@/lib/env"
import { formatDateLong, formatShortDate, formatShortDateSafe } from "@/lib/format"
import { revalidatePath } from "next/cache"
import crypto from "crypto"
import * as Sentry from "@sentry/nextjs"

const logger = createLogger("reissue-cert")

export interface ReissueCertInput {
  intakeId: string
  patientName: string
  patientDob: string | null
  certificateType: "work" | "study" | "carer"
  startDate: string    // YYYY-MM-DD
  endDate: string      // YYYY-MM-DD
  medicalReason: string
  notifyPatient?: boolean  // defaults false
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

  // 1. AUTH CHECK — doctors only, not admin
  const user = await requireRoleOrNull(["doctor"])
  if (!user) {
    return { success: false, error: "Unauthorized" }
  }

  const supabase = createServiceRoleClient()

  try {
    // 2. VALIDATE FIELDS
    const patientName = input.patientName.trim()
    if (!patientName) {
      return { success: false, error: "Patient name is required" }
    }

    const startMs = new Date(input.startDate).getTime()
    const endMs = new Date(input.endDate).getTime()

    if (isNaN(startMs) || isNaN(endMs)) {
      return { success: false, error: "Invalid date format. Use YYYY-MM-DD." }
    }

    if (endMs < startMs) {
      return { success: false, error: "End date must be on or after start date" }
    }

    // Duration in days (inclusive: +1)
    const durationDays = Math.round((endMs - startMs) / (1000 * 60 * 60 * 24)) + 1
    if (durationDays > 30) {
      return { success: false, error: "Certificate duration cannot exceed 30 days" }
    }

    // 3. FETCH EXISTING CERT — must be valid
    const cert = await getCertificateForIntake(intakeId)

    if (!cert) {
      return { success: false, error: "No certificate found for this request" }
    }

    if (cert.status !== "valid") {
      return {
        success: false,
        error: `Certificate cannot be reissued — current status is "${cert.status}"`,
      }
    }

    // 4. RATE LIMIT — max 3 reissues
    if ((cert.resend_count ?? 0) >= 3) {
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

    // 7. CAPTURE OLD VALUES FOR AUDIT
    const oldValues = {
      patient_name: cert.patient_name,
      start_date: cert.start_date,
      end_date: cert.end_date,
      certificate_type: cert.certificate_type,
      patient_dob: cert.patient_dob,
    }

    // 8. RENDER NEW PDF
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

    // 9. COMPUTE NEW PDF HASH
    const newHash = crypto.createHash("sha256").update(pdfBuffer).digest("hex")

    // 10. UPLOAD NEW PDF — upsert to the same storage path
    const { error: uploadError } = await supabase.storage
      .from("documents")
      .upload(cert.storage_path, pdfBuffer, {
        contentType: "application/pdf",
        upsert: true,
      })

    if (uploadError) {
      logger.error("[ReissueCert] PDF upload failed", {
        intakeId,
        certId: cert.id,
        storagePath: cert.storage_path,
      }, uploadError)
      Sentry.captureException(uploadError, {
        tags: { subsystem: "reissue-cert-upload", intakeId, certId: cert.id },
      })
      return { success: false, error: "Failed to upload corrected certificate" }
    }

    // 11. UPDATE issued_certificates ROW (dual-write encrypted patient name)
    const patientNameFields = await prepareCertificatePatientNameWrite(patientName)

    const { error: updateError } = await supabase
      .from("issued_certificates")
      .update({
        ...patientNameFields,
        patient_dob: input.patientDob,
        certificate_type: input.certificateType,
        start_date: input.startDate,
        end_date: input.endDate,
        storage_path: cert.storage_path,
        pdf_hash: newHash,
        file_size_bytes: pdfBuffer.length,
        resend_count: (cert.resend_count ?? 0) + 1,
        updated_at: new Date().toISOString(),
      })
      .eq("id", cert.id)

    if (updateError) {
      logger.error("[ReissueCert] Failed to update certificate row", {
        intakeId,
        certId: cert.id,
      }, updateError)
      return { success: false, error: "Failed to update certificate record" }
    }

    logger.info("[ReissueCert] Certificate reissued", {
      certId: cert.id,
      intakeId,
      actorId: user.profile.id,
      durationDays,
      certificateType: input.certificateType,
    })

    // 12. LOG TO AUDIT TRAIL — fire-and-forget, non-blocking
    const newValues = {
      patient_name: patientName,
      start_date: input.startDate,
      end_date: input.endDate,
      certificate_type: input.certificateType,
      patient_dob: input.patientDob,
    }

    logCertificateEvent(
      cert.id,
      "superseded",
      user.profile.id,
      "doctor",
      {
        old_values: oldValues,
        new_values: newValues,
        reissue_reason: "doctor_correction",
      }
    ).then(() => {}, () => {})

    // 13. OPTIONAL PATIENT NOTIFICATION
    if (input.notifyPatient) {
      try {
        const { data: intakeRow } = await supabase
          .from("intakes")
          .select(`
            id,
            patient_id,
            patient:profiles!patient_id(
              id,
              full_name,
              email
            )
          `)
          .eq("id", intakeId)
          .single()

        const rawPatient = intakeRow?.patient
        const patient = Array.isArray(rawPatient) ? rawPatient[0] : rawPatient

        if (patient?.email && patient?.full_name) {
          const dashboardUrl = `${env.appUrl}/track/${intakeId}`

          let downloadUrl: string | undefined
          try {
            const { data: signedUrlData } = await supabase.storage
              .from("documents")
              .createSignedUrl(cert.storage_path, 3 * 24 * 60 * 60)
            downloadUrl = signedUrlData?.signedUrl ?? undefined
          } catch {
            logger.warn("[ReissueCert] Failed to generate signed URL for notification", { intakeId })
          }

          await sendEmail({
            to: patient.email,
            toName: patient.full_name,
            subject: `${medCertPatientEmailSubject(patient.full_name?.split(" ")[0])} (Updated)`,
            template: MedCertPatientEmail({
              patientName: patient.full_name,
              downloadUrl,
              dashboardUrl,
              verificationCode: cert.verification_code,
              certType:
                input.certificateType === "study"
                  ? "study"
                  : input.certificateType === "carer"
                    ? "carer"
                    : "work",
              appUrl: env.appUrl,
            }),
            emailType: "med_cert_patient",
            intakeId,
            patientId: patient.id,
            certificateId: cert.id,
            metadata: {
              cert_type: input.certificateType,
              verification_code: cert.verification_code,
              reissued_by: user.profile.id,
            },
            tags: [
              { name: "category", value: "med_cert_reissue" },
              { name: "intake_id", value: intakeId },
              { name: "cert_type", value: input.certificateType },
            ],
          })

          logger.info("[ReissueCert] Patient notified of updated certificate", {
            intakeId,
            certId: cert.id,
            to: patient.email,
          })
        }
      } catch (emailError) {
        // Notification failure is non-fatal — cert update already succeeded
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

    // 14. REVALIDATE PATHS
    revalidatePath("/doctor/dashboard")
    revalidatePath("/doctor/queue")
    revalidatePath(`/patient/intakes/${intakeId}`)
    revalidatePath(`/doctor/intakes/${intakeId}`)

    // 15. RETURN SUCCESS
    return { success: true, certificateId: cert.id }
  } catch (error) {
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
