"use server"

import { requireRole } from "@/lib/auth"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { logger } from "@/lib/observability/logger"
import { revalidatePath } from "next/cache"
import { approveAndSendCert } from "@/app/actions/approve-cert"
import type { CertReviewData } from "@/types/db"

interface RegenerateCertificateInput {
  intakeId: string
  reason?: string
  corrections?: {
    patientName?: string
    dateRange?: { startDate: string; endDate: string }
    conditions?: string[]
  }
}

interface RegenerateCertificateResult {
  success: boolean
  error?: string
  certificateId?: string
}

export async function regenerateCertificateAction(
  input: RegenerateCertificateInput
): Promise<RegenerateCertificateResult> {
  const { intakeId, reason, corrections } = input

  // Require doctor or admin role
  const user = await requireRole(["doctor", "admin"])
  if (!user) {
    return { success: false, error: "Unauthorized" }
  }

  const supabase = createServiceRoleClient()

  try {
    // Fetch the intake with answers
    const { data: intake, error: intakeError } = await supabase
      .from("intakes")
      .select(`
        id,
        status,
        patient_id,
        service,
        reviewed_by,
        patient:profiles!patient_id(
          id,
          full_name,
          email,
          date_of_birth
        ),
        answers:intake_answers(
          answers
        )
      `)
      .eq("id", intakeId)
      .single()

    if (intakeError || !intake) {
      logger.error("Failed to fetch intake for certificate regeneration", { intakeId }, intakeError)
      return { success: false, error: "Intake not found" }
    }

    // Only allow regeneration for approved intakes
    if (intake.status !== "approved" && intake.status !== "completed") {
      return { success: false, error: "Can only regenerate certificates for approved intakes" }
    }

    // Check for existing certificate in issued_certificates
    const { data: existingCert } = await supabase
      .from("issued_certificates")
      .select("id, status, start_date, end_date, certificate_type")
      .eq("intake_id", intakeId)
      .eq("status", "valid")
      .maybeSingle()

    // Mark existing certificate as superseded if it exists
    if (existingCert) {
      await supabase
        .from("issued_certificates")
        .update({
          status: "superseded",
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingCert.id)
      
      // Log supersession event (non-blocking)
      supabase.from("certificate_audit_log").insert({
        certificate_id: existingCert.id,
        event_type: "superseded",
        actor_id: user.profile.id,
        actor_role: user.profile.role || "doctor",
        event_data: { reason, superseded_for_regeneration: true },
      }).then(() => {}, () => {})
    }

    // Get answers data
    const _patient = Array.isArray(intake.patient) ? intake.patient[0] : intake.patient
    const answers = intake.answers as { answers: Record<string, unknown> }[] | null
    const answersData = answers?.[0]?.answers || {}

    // Build review data for regeneration
    // Use corrections if provided, otherwise use existing cert data or intake answers
    const today = new Date()
    const startDate = corrections?.dateRange?.startDate || 
                      existingCert?.start_date ||
                      (answersData.startDate as string) ||
                      today.toISOString().split('T')[0]
    
    const endDate = corrections?.dateRange?.endDate ||
                    existingCert?.end_date ||
                    (answersData.endDate as string) ||
                    today.toISOString().split('T')[0]

    const reviewData: CertReviewData = {
      doctorName: user.profile.full_name || '',
      consultDate: today.toISOString().split('T')[0],
      startDate,
      endDate,
      medicalReason: (answersData.medicalReason as string) || (answersData.symptomDetails as string) || '',
    }

    logger.info("Regenerating certificate via approveAndSendCert", {
      intakeId,
      previousCertificateId: existingCert?.id,
      reason,
      actorId: user.profile.id,
    })

    // Use the canonical approval flow to regenerate
    // This ensures PDF is generated, stored, and email is sent
    const result = await approveAndSendCert(intakeId, reviewData)

    if (!result.success) {
      logger.error("Certificate regeneration failed", { intakeId, error: result.error })
      return { success: false, error: result.error || "Failed to regenerate certificate" }
    }

    // Log to intake events (non-blocking)
    supabase.from("intake_events").insert({
      intake_id: intakeId,
      event_type: "certificate_regenerated",
      actor_id: user.profile.id,
      actor_role: user.profile.role || "doctor",
      metadata: {
        certificateId: result.certificateId,
        reason,
        corrections,
        previousCertificateId: existingCert?.id,
      },
    }).then(() => {}, () => {})

    logger.info("Certificate regenerated successfully", {
      intakeId,
      newCertificateId: result.certificateId,
      previousCertificateId: existingCert?.id,
      actorId: user.profile.id,
    })

    revalidatePath(`/doctor/intakes/${intakeId}`)
    revalidatePath(`/patient/intakes/${intakeId}`)

    return { success: true, certificateId: result.certificateId }
  } catch (error) {
    logger.error("Certificate regeneration failed", { intakeId }, error instanceof Error ? error : new Error(String(error)))
    return { success: false, error: "An unexpected error occurred" }
  }
}
