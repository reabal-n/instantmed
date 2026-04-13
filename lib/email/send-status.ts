import "server-only"

import * as React from "react"

import { logger } from "@/lib/observability/logger"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

import { sendEmail } from "./send-email"

export type EmailTemplateType = "request_approved" | "request_declined" | "needs_more_info"

/**
 * Build a React email template element for the given template type + data.
 * Delegates to the canonical React templates in components/email/templates/.
 */
async function buildTemplateElement(
  templateType: EmailTemplateType,
  data: Record<string, unknown>,
): Promise<{ element: React.ReactElement; subject: string }> {
  switch (templateType) {
    case "request_approved": {
      // request_approved is handled by per-category templates elsewhere
      // (consult-approved, prescription-approved, etc.) so this path is
      // only hit for generic approvals via the internal API.
      const { ConsultApprovedEmail, consultApprovedSubject } = await import(
        "@/lib/email/components/templates/consult-approved"
      )
      return {
        element: React.createElement(ConsultApprovedEmail, {
          patientName: String(data.patientName || "there"),
          requestId: String(data.requestId || ""),
          doctorNotes: data.doctorName ? `Reviewed by Dr ${data.doctorName}` : undefined,
        }),
        subject: data.requestType
          ? `Good news! Your ${data.requestType} has been approved`
          : consultApprovedSubject(),
      }
    }

    case "request_declined": {
      const { RequestDeclinedEmail, requestDeclinedEmailSubject } = await import(
        "@/lib/email/components/templates/request-declined"
      )
      const requestType = String(data.requestType || "request")
      return {
        element: React.createElement(RequestDeclinedEmail, {
          patientName: String(data.patientName || "there"),
          requestType,
          requestId: String(data.requestId || ""),
          reason: data.reason ? String(data.reason) : undefined,
        }),
        subject: requestDeclinedEmailSubject(requestType),
      }
    }

    case "needs_more_info": {
      const { NeedsMoreInfoEmail, needsMoreInfoSubject } = await import(
        "@/lib/email/components/templates/needs-more-info"
      )
      const requestType = String(data.requestType || "request")
      return {
        element: React.createElement(NeedsMoreInfoEmail, {
          patientName: String(data.patientName || "there"),
          requestType,
          requestId: String(data.requestId || ""),
          doctorMessage: String(
            data.message || "Please provide additional details about your request.",
          ),
        }),
        subject: needsMoreInfoSubject(requestType),
      }
    }
  }
}

/**
 * Send email triggered by state transition - fetches intake details and sends
 * via the centralized React email pipeline.
 */
export async function sendStatusTransitionEmail(
  intakeId: string,
  templateType: EmailTemplateType,
  additionalData?: Record<string, unknown>,
): Promise<void> {
  const supabase = createServiceRoleClient()

  // Fetch intake and patient details
  const { data: intake } = await supabase
    .from("intakes")
    .select(`
      id, patient_id, category, subtype, status,
      patient:profiles!patient_id (id, full_name, email)
    `)
    .eq("id", intakeId)
    .single()

  if (!intake || !intake.patient) {
    logger.error("Could not fetch intake details for email")
    return
  }

  // Unwrap patient FK join (Supabase returns array for !inner joins, object for 1:1)
  type PatientJoin = { id: string; full_name: string; email: string }
  const patientRaw = intake.patient as PatientJoin[] | PatientJoin | null
  const patient = Array.isArray(patientRaw) ? patientRaw[0] : patientRaw

  const email = patient?.email
  if (!email) {
    logger.error("Could not find patient email")
    return
  }

  const baseData = {
    patientName: patient.full_name || "there",
    requestType: formatRequestType(intake.category, intake.subtype),
    requestId: intake.id,
    ...additionalData,
  }

  const { element, subject } = await buildTemplateElement(templateType, baseData)

  const emailType =
    templateType === "request_approved"
      ? "request_approved"
      : templateType === "request_declined"
        ? "request_declined"
        : "needs_more_info"

  await sendEmail({
    to: email,
    toName: patient.full_name || undefined,
    subject,
    template: element,
    emailType,
    intakeId,
    patientId: intake.patient_id,
  })
}

function formatRequestType(category: string | null, subtype: string | null): string {
  if (category === "medical_certificate") return "medical certificate"
  if (category === "prescription") return "prescription"
  if (category === "consult") return "general consultation"
  if (category === "referral") {
    if (subtype === "imaging") return "imaging referral"
    if (subtype === "pathology") return "pathology referral"
    return "referral"
  }
  return "request"
}
