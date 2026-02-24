"use server"

import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { requireRole } from "@/lib/auth"
import { logger } from "@/lib/observability/logger"
import { revalidatePath } from "next/cache"
import { sendEmail } from "@/lib/email/send-email"
import { NeedsMoreInfoEmail } from "@/components/email/templates/needs-more-info"

interface InfoRequestTemplate {
  code: string
  label: string
  description: string | null
  message_template: string | null
}

interface RequestInfoResult {
  success: boolean
  error?: string
}

/**
 * Get info request templates
 */
export async function getInfoRequestTemplatesAction(): Promise<{
  success: boolean
  templates?: InfoRequestTemplate[]
  error?: string
}> {
  try {
    await requireRole(["doctor", "admin"])
    
    const supabase = createServiceRoleClient()
    
    const { data, error } = await supabase
      .from("info_request_templates")
      .select("code, label, description, message_template")
      .eq("is_active", true)
      .order("display_order", { ascending: true })

    if (error) {
      logger.error("Failed to fetch info request templates", {}, error)
      return { success: false, error: "Failed to fetch templates" }
    }

    return { success: true, templates: data }
  } catch {
    return { success: false, error: "Failed to fetch templates" }
  }
}

/**
 * Request more information from a patient
 */
export async function requestMoreInfoAction(
  intakeId: string,
  templateCode: string,
  customMessage?: string
): Promise<RequestInfoResult> {
  try {
    const { profile } = await requireRole(["doctor", "admin"])
    
    const supabase = createServiceRoleClient()
    const now = new Date().toISOString()

    // Fetch intake with patient info
    const { data: intake, error: fetchError } = await supabase
      .from("intakes")
      .select(`
        id,
        status,
        patient_id,
        category,
        patient:profiles!patient_id(
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

    // Check status allows info request
    const allowedStatuses = ["paid", "in_review", "pending_info"]
    if (!allowedStatuses.includes(intake.status)) {
      return { success: false, error: "Cannot request info for this request status" }
    }

    // Get template message if not custom
    let message = customMessage
    if (!message && templateCode !== "other") {
      const { data: template } = await supabase
        .from("info_request_templates")
        .select("message_template")
        .eq("code", templateCode)
        .single()
      
      message = template?.message_template || "Please provide additional information."
    }

    if (!message?.trim()) {
      return { success: false, error: "Message is required" }
    }

    // Update intake status and store info request details
    const { error: updateError } = await supabase
      .from("intakes")
      .update({
        status: "pending_info",
        previous_status: intake.status,
        info_request_code: templateCode,
        info_request_message: message,
        info_requested_at: now,
        info_requested_by: profile.id,
        updated_at: now,
      })
      .eq("id", intakeId)

    if (updateError) {
      logger.error("Failed to update intake for info request", { intakeId }, updateError)
      return { success: false, error: "Failed to update request" }
    }

    // Send email to patient
    const patientData = intake.patient as { id: string; full_name: string; email: string } | { id: string; full_name: string; email: string }[] | null
    const patient = Array.isArray(patientData) ? patientData[0] : patientData

    if (patient?.email) {
      await sendEmail({
        to: patient.email,
        toName: patient.full_name,
        subject: "More Information Needed for Your Request",
        template: NeedsMoreInfoEmail({
          patientName: patient.full_name?.split(" ")[0] || "there",
          requestType: intake.category || "request",
          requestId: intakeId,
          doctorMessage: message,
        }),
        emailType: "needs_more_info",
        intakeId,
        patientId: patient.id,
        metadata: {
          template_code: templateCode,
          requested_by: profile.id,
        },
        tags: [
          { name: "category", value: "info_request" },
          { name: "intake_id", value: intakeId },
        ],
      })

      logger.info("Info request email sent", { intakeId, to: patient.email })
    }

    // Revalidate paths
    revalidatePath("/doctor/dashboard")
    revalidatePath("/doctor/queue")
    revalidatePath(`/doctor/intakes/${intakeId}`)
    revalidatePath(`/patient/intakes/${intakeId}`)

    return { success: true }
  } catch (error) {
    logger.error("Request more info error", {
      intakeId,
      error: error instanceof Error ? error.message : String(error),
    })
    return { success: false, error: "Failed to request more information" }
  }
}
