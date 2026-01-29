"use server"

import { requireRole } from "@/lib/auth"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { logger } from "@/lib/observability/logger"
import { revalidatePath } from "next/cache"

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
    // Fetch the intake and existing certificate
    const { data: intake, error: intakeError } = await supabase
      .from("intakes")
      .select(`
        id,
        status,
        patient_id,
        category,
        service_id,
        form_data,
        reviewed_by,
        patient:profiles!intakes_patient_id_fkey(
          id,
          full_name,
          email,
          date_of_birth
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

    // Fetch existing certificate
    const { data: existingCert, error: certError } = await supabase
      .from("generated_documents")
      .select("id, document_type, storage_path, metadata")
      .eq("intake_id", intakeId)
      .eq("document_type", "medical_certificate")
      .order("created_at", { ascending: false })
      .limit(1)
      .single()

    if (certError && certError.code !== "PGRST116") {
      logger.error("Failed to fetch existing certificate", { intakeId }, certError)
    }

    // Get patient data
    const patient = Array.isArray(intake.patient) ? intake.patient[0] : intake.patient

    // Prepare certificate data with corrections
    const certData = {
      patientName: corrections?.patientName || patient?.full_name,
      patientDob: patient?.date_of_birth,
      dateRange: corrections?.dateRange,
      conditions: corrections?.conditions,
      intakeId,
      serviceId: intake.service_id,
      formData: intake.form_data,
      regeneratedAt: new Date().toISOString(),
      regeneratedBy: user.user.id,
      regenerationReason: reason,
      previousCertificateId: existingCert?.id,
    }

    // Mark existing certificate as superseded
    if (existingCert) {
      await supabase
        .from("generated_documents")
        .update({
          metadata: {
            ...(existingCert.metadata as Record<string, unknown> || {}),
            superseded: true,
            supersededAt: new Date().toISOString(),
            supersededBy: user.user.id,
            supersededReason: reason,
          },
        })
        .eq("id", existingCert.id)
    }

    // Create new certificate record (PDF generation happens via existing flow)
    const { data: newCert, error: createError } = await supabase
      .from("generated_documents")
      .insert({
        intake_id: intakeId,
        patient_id: intake.patient_id,
        document_type: "medical_certificate",
        status: "pending",
        metadata: {
          ...certData,
          isRegeneration: true,
        },
      })
      .select("id")
      .single()

    if (createError) {
      logger.error("Failed to create regenerated certificate record", { intakeId }, createError)
      return { success: false, error: "Failed to create certificate" }
    }

    // Log the regeneration event
    await supabase.from("certificate_events").insert({
      certificate_id: newCert.id,
      event_type: "regenerated",
      actor_id: user.user.id,
      actor_role: user.profile.role || "doctor",
      metadata: {
        reason,
        corrections,
        previousCertificateId: existingCert?.id,
      },
    })

    // Also log to intake events
    await supabase.from("intake_events").insert({
      intake_id: intakeId,
      event_type: "certificate_regenerated",
      actor_id: user.user.id,
      actor_role: user.profile.role || "doctor",
      metadata: {
        certificateId: newCert.id,
        reason,
        corrections,
      },
    })

    logger.info("Certificate regenerated", {
      intakeId,
      newCertificateId: newCert.id,
      previousCertificateId: existingCert?.id,
      actorId: user.user.id,
    })

    revalidatePath(`/doctor/intakes/${intakeId}`)
    revalidatePath(`/patient/intakes/${intakeId}`)

    return { success: true, certificateId: newCert.id }
  } catch (error) {
    logger.error("Certificate regeneration failed", { intakeId }, error instanceof Error ? error : new Error(String(error)))
    return { success: false, error: "An unexpected error occurred" }
  }
}
