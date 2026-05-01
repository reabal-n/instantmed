"use server"

/**
 * Email reconstruction logic for the outbox dispatcher.
 * Fetches intake/certificate data and re-renders templates for retry sends.
 */

import * as Sentry from "@sentry/nextjs"

import { env } from "@/lib/config/env"
import { logger } from "@/lib/observability/logger"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

import { renderEmailToHtml } from "../react-renderer-server"
import type { OutboxRow } from "./types"

/**
 * Reconstruct email HTML from intake/certificate data based on email_type.
 * Also handles PDF generation for certificates that need it (needs_pdf_generation in metadata).
 */
export async function reconstructEmailContent(row: OutboxRow): Promise<{
  success: boolean
  html?: string
  text?: string
  error?: string
}> {
  const supabase = createServiceRoleClient()

  // Handle med_cert_patient emails
  if (row.email_type === "med_cert_patient" && row.certificate_id) {
    // Check if PDF needs to be generated first
    const metadata = row.metadata as { needs_pdf_generation?: boolean } | null
    if (metadata?.needs_pdf_generation) {
      const pdfResult = await generateAndUploadPdfForCertificate(row.certificate_id, row.metadata)
      if (!pdfResult.success) {
        return { success: false, error: pdfResult.error || "PDF generation failed" }
      }
    }

    // Fetch certificate and patient data
    const { data: cert, error: certError } = await supabase
      .from("issued_certificates")
      .select("intake_id, patient_name, verification_code, certificate_type, storage_path")
      .eq("id", row.certificate_id)
      .single()

    if (certError || !cert) {
      return { success: false, error: "Certificate not found for retry" }
    }

    // Generate signed download URL for guest-friendly download
    let downloadUrl: string | undefined
    if (cert.storage_path) {
      try {
        const { data: signedUrlData } = await supabase.storage
          .from("documents")
          .createSignedUrl(cert.storage_path, 3 * 24 * 60 * 60) // 72 hours
        downloadUrl = signedUrlData?.signedUrl ?? undefined
      } catch {
        // Non-fatal: email will fall back to dashboard link
      }
    }

    // Render the template
    const { MedCertPatientEmail } = await import("@/lib/email/components/templates")
    const dashboardUrl = `${env.appUrl}/track/${cert.intake_id}`

    const template = MedCertPatientEmail({
      patientName: cert.patient_name,
      downloadUrl,
      dashboardUrl,
      verificationCode: cert.verification_code,
      certType: cert.certificate_type as "work" | "study" | "carer",
      appUrl: env.appUrl,
    })

    const html = await renderEmailToHtml(template)
    return { success: true, html }
  }

  // ----------------------------------------------------------------
  // Helper: fetch intake + patient + service data for reconstruction
  // ----------------------------------------------------------------
  async function fetchIntakeContext(intakeId: string) {
    const { data: intake, error: intakeError } = await supabase
      .from("intakes")
      .select("id, patient_id, service_id, reference_number, amount_cents, paid_at, decline_reason, decline_reason_note, refund_amount_cents, parchment_reference")
      .eq("id", intakeId)
      .single()

    if (intakeError || !intake) {
      return { error: `Intake not found: ${intakeId}` } as const
    }

    const { data: patient, error: patientError } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .eq("id", intake.patient_id)
      .single()

    if (patientError || !patient) {
      return { error: `Patient not found for intake: ${intakeId}` } as const
    }

    const { data: service, error: serviceError } = await supabase
      .from("services")
      .select("id, name, short_name, slug, type")
      .eq("id", intake.service_id)
      .single()

    if (serviceError || !service) {
      return { error: `Service not found for intake: ${intakeId}` } as const
    }

    // Fetch answers from intake_answers table (separate from intakes)
    const { data: intakeAnswersRow } = await supabase
      .from("intake_answers")
      .select("answers")
      .eq("intake_id", intakeId)
      .single()
    const answers = (intakeAnswersRow?.answers || {}) as Record<string, unknown>

    return { intake: { ...intake, answers }, patient, service } as const
  }

  // ----------------------------------------------------------------
  // Helper: fetch a database-stored email template and fill merge tags
  // ----------------------------------------------------------------
  async function renderDatabaseTemplate(
    templateSlug: string,
    mergeData: Record<string, string>,
  ): Promise<{ success: boolean; html?: string; error?: string }> {
    const { data: tpl, error: tplError } = await supabase
      .from("email_templates")
      .select("body_html, available_tags")
      .eq("slug", templateSlug)
      .eq("is_active", true)
      .single()

    if (tplError || !tpl) {
      return { success: false, error: `Email template '${templateSlug}' not found or inactive` }
    }

    let html = tpl.body_html as string
    for (const [key, value] of Object.entries(mergeData)) {
      const tag = new RegExp(`\\{\\{${key}\\}\\}`, "g")
      html = html.replace(tag, value || "")
    }

    return { success: true, html }
  }

  // ----------------------------------------------------------------
  // welcome - React template, needs only patientName
  // ----------------------------------------------------------------
  if (row.email_type === "welcome") {
    const patientName = row.to_name || "there"

    const { WelcomeEmail } = await import("@/lib/email/components/templates")
    const template = WelcomeEmail({
      patientName,
      appUrl: env.appUrl,
    })

    const html = await renderEmailToHtml(template)
    return { success: true, html }
  }

  // ----------------------------------------------------------------
  // script_sent - React template, needs intake data
  // ----------------------------------------------------------------
  if (row.email_type === "script_sent") {
    if (!row.intake_id) {
      return { success: false, error: "script_sent requires intake_id for reconstruction" }
    }

    const ctx = await fetchIntakeContext(row.intake_id)
    if ("error" in ctx) return { success: false, error: ctx.error }

    const { ScriptSentEmail } = await import("@/lib/email/components/templates")
    const template = ScriptSentEmail({
      patientName: ctx.patient.full_name || row.to_name || "there",
      requestId: ctx.intake.id,
      escriptReference: ctx.intake.parchment_reference || undefined,
      appUrl: env.appUrl,
    })

    const html = await renderEmailToHtml(template)
    return { success: true, html }
  }

  // ----------------------------------------------------------------
  // request_declined - React template, needs intake data + reason
  // ----------------------------------------------------------------
  if (row.email_type === "request_declined") {
    if (!row.intake_id) {
      return { success: false, error: "request_declined requires intake_id for reconstruction" }
    }

    const ctx = await fetchIntakeContext(row.intake_id)
    if ("error" in ctx) return { success: false, error: ctx.error }

    const requestType = ctx.service.short_name || ctx.service.name
    const reason = ctx.intake.decline_reason_note || ctx.intake.decline_reason || undefined

    const { RequestDeclinedEmail } = await import("@/lib/email/components/templates")
    const template = RequestDeclinedEmail({
      patientName: ctx.patient.full_name || row.to_name || "there",
      requestType,
      requestId: ctx.intake.id,
      reason,
      appUrl: env.appUrl,
    })

    const html = await renderEmailToHtml(template)
    return { success: true, html }
  }

  // ----------------------------------------------------------------
  // prescription_approved - React template, needs intake + medication
  // ----------------------------------------------------------------
  if (row.email_type === "prescription_approved") {
    if (!row.intake_id) {
      return { success: false, error: "prescription_approved requires intake_id for reconstruction" }
    }

    const ctx = await fetchIntakeContext(row.intake_id)
    if ("error" in ctx) return { success: false, error: ctx.error }

    const metadata = row.metadata as { medicationName?: string } | null
    const answers = (ctx.intake.answers || {}) as Record<string, unknown>
    const medicationName = metadata?.medicationName
      || String(answers.medicationName || "")
      || ctx.service.short_name
      || "medication"

    const { PrescriptionApprovedEmail } = await import("@/lib/email/components/templates/prescription-approved")
    const template = PrescriptionApprovedEmail({
      patientName: ctx.patient.full_name || row.to_name || "there",
      medicationName,
      intakeId: ctx.intake.id,
      appUrl: env.appUrl,
    })

    const html = await renderEmailToHtml(template)
    return { success: true, html }
  }

  // ----------------------------------------------------------------
  // payment_received - database template with merge tags
  // ----------------------------------------------------------------
  if (row.email_type === "payment_received") {
    if (!row.intake_id) {
      return { success: false, error: "payment_received requires intake_id for reconstruction" }
    }

    const ctx = await fetchIntakeContext(row.intake_id)
    if ("error" in ctx) return { success: false, error: ctx.error }

    const amountCents = ctx.intake.amount_cents || 0
    const amount = `$${(amountCents / 100).toFixed(2)}`
    const serviceName = ctx.service.short_name || ctx.service.name

    return renderDatabaseTemplate("payment_received", {
      patient_name: ctx.patient.full_name || row.to_name || "there",
      amount,
      service_name: serviceName,
    })
  }

  // ----------------------------------------------------------------
  // refund_notification - database template (slug: refund_processed)
  // ----------------------------------------------------------------
  if (row.email_type === "refund_notification") {
    if (!row.intake_id) {
      return { success: false, error: "refund_notification requires intake_id for reconstruction" }
    }

    const ctx = await fetchIntakeContext(row.intake_id)
    if ("error" in ctx) return { success: false, error: ctx.error }

    const refundCents = ctx.intake.refund_amount_cents || ctx.intake.amount_cents || 0
    const amount = `$${(refundCents / 100).toFixed(2)}`
    const reason = ctx.intake.decline_reason || "Refund processed"

    return renderDatabaseTemplate("refund_processed", {
      patient_name: ctx.patient.full_name || row.to_name || "there",
      amount,
      refund_reason: reason,
    })
  }

  // ----------------------------------------------------------------
  // payment_failed - database template with merge tags
  // ----------------------------------------------------------------
  if (row.email_type === "payment_failed") {
    if (!row.intake_id) {
      return { success: false, error: "payment_failed requires intake_id for reconstruction" }
    }

    const ctx = await fetchIntakeContext(row.intake_id)
    if ("error" in ctx) return { success: false, error: ctx.error }

    const serviceName = ctx.service.short_name || ctx.service.name
    const retryUrl = `${env.appUrl}/patient/intakes/${ctx.intake.id}`

    return renderDatabaseTemplate("payment_failed", {
      patient_name: ctx.patient.full_name || row.to_name || "there",
      service_name: serviceName,
      failure_reason: "Your payment could not be processed. Please try again.",
      retry_url: retryUrl,
    })
  }

  // ----------------------------------------------------------------
  // payment_retry - React template, usually patient-owned invoice context
  // ----------------------------------------------------------------
  if (row.email_type === "payment_retry") {
    const metadata = row.metadata as {
      invoice_id?: string
      request_type?: string
      amount_cents?: number
      payment_url?: string
    } | null

    let requestType = metadata?.request_type || "your request"
    let amountCents = metadata?.amount_cents ?? 0
    const paymentUrl = metadata?.payment_url
      || (metadata?.invoice_id
        ? `${env.appUrl}/checkout?invoiceId=${metadata.invoice_id}`
        : `${env.appUrl}/patient/payment-history`)

    if (metadata?.invoice_id) {
      const { data: invoice } = await supabase
        .from("invoices")
        .select("description, amount_cents")
        .eq("id", metadata.invoice_id)
        .maybeSingle()

      requestType = invoice?.description || requestType
      amountCents = invoice?.amount_cents ?? amountCents
    }

    let patientName = row.to_name || "there"
    if (row.patient_id) {
      const { data: patient } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", row.patient_id)
        .maybeSingle()
      patientName = patient?.full_name || patientName
    }

    const { PaymentRetryEmail } = await import("@/lib/email/components/templates/payment-retry")
    const template = PaymentRetryEmail({
      patientName,
      requestType,
      amount: `$${(amountCents / 100).toFixed(2)}`,
      paymentUrl,
      appUrl: env.appUrl,
    })

    const html = await renderEmailToHtml(template)
    return { success: true, html }
  }

  // ----------------------------------------------------------------
  // guest_complete_account - database template with merge tags
  // ----------------------------------------------------------------
  if (row.email_type === "guest_complete_account") {
    if (!row.intake_id) {
      return { success: false, error: "guest_complete_account requires intake_id for reconstruction" }
    }

    const ctx = await fetchIntakeContext(row.intake_id)
    if ("error" in ctx) return { success: false, error: ctx.error }

    const serviceName = ctx.service.short_name || ctx.service.name
    const completeAccountUrl = `${env.appUrl}/auth/complete-account?intake_id=${ctx.intake.id}`

    return renderDatabaseTemplate("guest_complete_account", {
      patient_name: ctx.patient.full_name || row.to_name || "there",
      service_name: serviceName,
      intake_id: ctx.intake.id,
      complete_account_url: completeAccountUrl,
    })
  }

  // ----------------------------------------------------------------
  // still_reviewing - React template, needs intake + service context
  // ----------------------------------------------------------------
  if (row.email_type === "still_reviewing") {
    if (!row.intake_id) {
      return { success: false, error: "still_reviewing requires intake_id for reconstruction" }
    }

    const ctx = await fetchIntakeContext(row.intake_id)
    if ("error" in ctx) return { success: false, error: ctx.error }

    const { StillReviewingEmail } = await import("@/lib/email/components/templates/still-reviewing")
    const template = StillReviewingEmail({
      patientName: ctx.patient.full_name || row.to_name || "there",
      requestType: ctx.service.short_name || ctx.service.name || "request",
      requestId: ctx.intake.id,
      appUrl: env.appUrl,
    })

    const html = await renderEmailToHtml(template)
    return { success: true, html }
  }

  // ----------------------------------------------------------------
  // needs_more_info - lib React template, needs intake + doctor message
  // ----------------------------------------------------------------
  if (row.email_type === "needs_more_info") {
    if (!row.intake_id) {
      return { success: false, error: "needs_more_info requires intake_id for reconstruction" }
    }

    const ctx = await fetchIntakeContext(row.intake_id)
    if ("error" in ctx) return { success: false, error: ctx.error }

    const metadata = row.metadata as { doctorMessage?: string } | null
    const doctorMessage = metadata?.doctorMessage || "Please provide additional information."

    const { NeedsMoreInfoEmail } = await import("@/lib/email/components/templates/needs-more-info")
    const template = NeedsMoreInfoEmail({
      patientName: ctx.patient.full_name || row.to_name || "there",
      requestType: ctx.service.short_name || ctx.service.name,
      requestId: ctx.intake.id,
      doctorMessage,
    })

    const html = await renderEmailToHtml(template)
    return { success: true, html }
  }

  // ----------------------------------------------------------------
  // consult_approved - component React template
  // ----------------------------------------------------------------
  if (row.email_type === "consult_approved") {
    if (!row.intake_id) {
      return { success: false, error: "consult_approved requires intake_id for reconstruction" }
    }

    const ctx = await fetchIntakeContext(row.intake_id)
    if ("error" in ctx) return { success: false, error: ctx.error }

    const metadata = row.metadata as { doctorNotes?: string } | null

    const { ConsultApprovedEmail } = await import("@/lib/email/components/templates/consult-approved")
    const template = ConsultApprovedEmail({
      patientName: ctx.patient.full_name || row.to_name || "there",
      requestId: ctx.intake.id,
      doctorNotes: metadata?.doctorNotes || undefined,
      appUrl: env.appUrl,
    })

    const html = await renderEmailToHtml(template)
    return { success: true, html }
  }

  // ----------------------------------------------------------------
  // ed_approved - component React template, needs medication name
  // ----------------------------------------------------------------
  if (row.email_type === "ed_approved") {
    if (!row.intake_id) {
      return { success: false, error: "ed_approved requires intake_id for reconstruction" }
    }

    const ctx = await fetchIntakeContext(row.intake_id)
    if ("error" in ctx) return { success: false, error: ctx.error }

    const metadata = row.metadata as { medicationName?: string } | null
    const answers = (ctx.intake.answers || {}) as Record<string, unknown>
    const medicationName = metadata?.medicationName
      || String(answers.medicationName || answers.medication_name || "")
      || "medication"

    const { EdApprovedEmail } = await import("@/lib/email/components/templates/ed-approved")
    const template = EdApprovedEmail({
      patientName: ctx.patient.full_name || row.to_name || "there",
      medicationName,
      requestId: ctx.intake.id,
      appUrl: env.appUrl,
    })

    const html = await renderEmailToHtml(template)
    return { success: true, html }
  }

  // ----------------------------------------------------------------
  // hair_loss_approved - component React template
  // ----------------------------------------------------------------
  if (row.email_type === "hair_loss_approved") {
    if (!row.intake_id) {
      return { success: false, error: "hair_loss_approved requires intake_id for reconstruction" }
    }

    const ctx = await fetchIntakeContext(row.intake_id)
    if ("error" in ctx) return { success: false, error: ctx.error }

    const metadata = row.metadata as { medicationName?: string } | null
    const answers = (ctx.intake.answers || {}) as Record<string, unknown>
    const medicationName = metadata?.medicationName
      || String(answers.medicationName || answers.medication_name || "")
      || "medication"

    const { HairLossApprovedEmail } = await import("@/lib/email/components/templates/hair-loss-approved")
    const template = HairLossApprovedEmail({
      patientName: ctx.patient.full_name || row.to_name || "there",
      medicationName,
      requestId: ctx.intake.id,
      appUrl: env.appUrl,
    })

    const html = await renderEmailToHtml(template)
    return { success: true, html }
  }

  // ----------------------------------------------------------------
  // weight_loss_approved - component React template
  // ----------------------------------------------------------------
  if (row.email_type === "weight_loss_approved") {
    if (!row.intake_id) {
      return { success: false, error: "weight_loss_approved requires intake_id for reconstruction" }
    }

    const ctx = await fetchIntakeContext(row.intake_id)
    if ("error" in ctx) return { success: false, error: ctx.error }

    const metadata = row.metadata as { medicationName?: string } | null
    const answers = (ctx.intake.answers || {}) as Record<string, unknown>
    const medicationName = metadata?.medicationName
      || String(answers.medicationName || answers.medication_name || "")
      || "medication"

    const { WeightLossApprovedEmail } = await import("@/lib/email/components/templates/weight-loss-approved")
    const template = WeightLossApprovedEmail({
      patientName: ctx.patient.full_name || row.to_name || "there",
      medicationName,
      requestId: ctx.intake.id,
      appUrl: env.appUrl,
    })

    const html = await renderEmailToHtml(template)
    return { success: true, html }
  }

  // ----------------------------------------------------------------
  // womens_health_approved - component React template
  // ----------------------------------------------------------------
  if (row.email_type === "womens_health_approved") {
    if (!row.intake_id) {
      return { success: false, error: "womens_health_approved requires intake_id for reconstruction" }
    }

    const ctx = await fetchIntakeContext(row.intake_id)
    if ("error" in ctx) return { success: false, error: ctx.error }

    const metadata = row.metadata as { medicationName?: string; treatmentType?: string } | null
    const answers = (ctx.intake.answers || {}) as Record<string, unknown>
    const medicationName = metadata?.medicationName
      || String(answers.medicationName || answers.medication_name || "")
      || "medication"

    const { WomensHealthApprovedEmail } = await import("@/lib/email/components/templates/womens-health-approved")
    const template = WomensHealthApprovedEmail({
      patientName: ctx.patient.full_name || row.to_name || "there",
      medicationName,
      treatmentType: metadata?.treatmentType || undefined,
      requestId: ctx.intake.id,
      appUrl: env.appUrl,
    })

    const html = await renderEmailToHtml(template)
    return { success: true, html }
  }

  // ----------------------------------------------------------------
  // med_cert_employer - component React template, needs cert + employer data
  // ----------------------------------------------------------------
  if (row.email_type === "med_cert_employer") {
    if (!row.certificate_id) {
      return { success: false, error: "med_cert_employer requires certificate_id for reconstruction" }
    }

    const { data: cert, error: certError } = await supabase
      .from("issued_certificates")
      .select("intake_id, patient_name, verification_code, start_date, end_date, storage_path")
      .eq("id", row.certificate_id)
      .single()

    if (certError || !cert) {
      return { success: false, error: "Certificate not found for employer email reconstruction" }
    }

    // Generate a signed download URL (7-day expiry)
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from("documents")
      .createSignedUrl(cert.storage_path, 60 * 60 * 24 * 7)

    if (signedUrlError) {
      logger.warn("[Email Dispatcher] Failed to create signed URL for employer email, using fallback", {
        certificateId: row.certificate_id,
        storagePath: cert.storage_path,
        error: signedUrlError.message,
      })
    }

    const downloadUrl = signedUrlData?.signedUrl || `${env.appUrl}/api/certificates/${row.certificate_id}/download`

    // Employer info from metadata or intake answers
    const metadata = row.metadata as { employerName?: string; companyName?: string; patientNote?: string } | null

    const { MedCertEmployerEmail } = await import("@/lib/email/components/templates/med-cert-employer")
    const template = MedCertEmployerEmail({
      patientName: cert.patient_name,
      downloadUrl,
      verificationCode: cert.verification_code,
      certStartDate: cert.start_date,
      certEndDate: cert.end_date,
      employerName: metadata?.employerName || undefined,
      companyName: metadata?.companyName || undefined,
      patientNote: metadata?.patientNote || undefined,
      appUrl: env.appUrl,
    })

    const html = await renderEmailToHtml(template)
    return { success: true, html }
  }

  // ----------------------------------------------------------------
  // payment_confirmed - lib React template, needs intake + amount
  // ----------------------------------------------------------------
  if (row.email_type === "payment_confirmed") {
    if (!row.intake_id) {
      return { success: false, error: "payment_confirmed requires intake_id for reconstruction" }
    }

    const ctx = await fetchIntakeContext(row.intake_id)
    if ("error" in ctx) return { success: false, error: ctx.error }

    const metadata = row.metadata as { amount_cents?: number; service_slug?: string } | null
    const amountCents = metadata?.amount_cents || 0
    const amountFormatted = amountCents > 0 ? `$${(amountCents / 100).toFixed(2)}` : "N/A"
    const serviceName = metadata?.service_slug
      ?.replace(/-/g, " ")
      ?.replace(/\b\w/g, (c: string) => c.toUpperCase())
      || ctx.service.short_name || ctx.service.name || "medical request"

    const { PaymentConfirmedEmail } = await import("@/lib/email/components/templates/payment-confirmed")
    const template = PaymentConfirmedEmail({
      patientName: ctx.patient.full_name || row.to_name || "there",
      requestType: serviceName,
      amount: amountFormatted,
      requestId: ctx.intake.id,
    })

    const html = await renderEmailToHtml(template)
    return { success: true, html }
  }

  // ----------------------------------------------------------------
  // request_received - merged React template (payment + review status)
  // ----------------------------------------------------------------
  if (row.email_type === "request_received") {
    if (!row.intake_id) {
      return { success: false, error: "request_received requires intake_id for reconstruction" }
    }

    const ctx = await fetchIntakeContext(row.intake_id)
    if ("error" in ctx) return { success: false, error: ctx.error }

    const metadata = row.metadata as { amount_cents?: number; service_slug?: string } | null
    const amountCents = metadata?.amount_cents || ctx.intake.amount_cents || 0
    const amountFormatted = amountCents > 0 ? `$${(amountCents / 100).toFixed(2)}` : "N/A"
    const serviceName = metadata?.service_slug
      ?.replace(/-/g, " ")
      ?.replace(/\b\w/g, (c: string) => c.toUpperCase())
      || ctx.service.short_name || ctx.service.name || "medical request"

    const isGuest = !ctx.patient.email ? false : !(await supabase
      .from("profiles")
      .select("auth_user_id")
      .eq("id", ctx.patient.id)
      .single()
      .then(r => r.data?.auth_user_id))

    const { RequestReceivedEmail } = await import("@/lib/email/components/templates/request-received")
    const template = RequestReceivedEmail({
      patientName: ctx.patient.full_name || row.to_name || "there",
      requestType: serviceName,
      amount: amountFormatted,
      requestId: ctx.intake.id,
      isGuest,
    })

    const html = await renderEmailToHtml(template)
    return { success: true, html }
  }

  // Fallback: unrecognized email type
  return {
    success: false,
    error: `Cannot reconstruct email type '${row.email_type}' - unsupported type`
  }
}

/**
 * Generate PDF for a certificate and upload to storage.
 * Called by the email dispatcher when metadata.needs_pdf_generation is true.
 *
 * Uses the template renderer (pdf-lib) - the same pipeline used for initial
 * certificate generation in approve-cert.ts.
 */
async function generateAndUploadPdfForCertificate(
  certificateId: string,
  _metadata: Record<string, unknown> | null // Data now fetched from certificate record
): Promise<{ success: boolean; error?: string }> {
  const supabase = createServiceRoleClient()

  try {
    // Fetch certificate with fields needed for template rendering
    const { data: cert, error: certError } = await supabase
      .from("issued_certificates")
      .select("id, certificate_number, certificate_type, certificate_ref, issue_date, start_date, end_date, patient_id, patient_name, patient_dob, storage_path")
      .eq("id", certificateId)
      .single()

    if (certError || !cert) {
      return { success: false, error: "Certificate not found" }
    }

    // Skip if PDF already generated (storage_path doesn't start with 'pending:')
    if (!cert.storage_path || !cert.storage_path.startsWith("pending:")) {
      logger.info("[Email Dispatcher] PDF already exists, skipping generation", { certificateId })
      return { success: true }
    }

    // Validate required date fields before rendering
    if (!cert.issue_date || !cert.start_date || !cert.end_date) {
      logger.error("[Email Dispatcher] Certificate missing required date fields", { certificateId, hasIssueDate: !!cert.issue_date, hasStartDate: !!cert.start_date, hasEndDate: !!cert.end_date })
      return { success: false, error: "Certificate missing required date fields" }
    }

    const { formatDateLong, formatShortDate, formatShortDateSafe } = await import("@/lib/format")

    const certificateType = cert.certificate_type as "work" | "study" | "carer"

    // Use stored certificate_ref, or generate one as fallback
    let certificateRef = cert.certificate_ref
    if (!certificateRef) {
      logger.warn("[Email Dispatcher] Certificate missing certificate_ref, generating fallback", { certificateId })
      const { generateCertificateRef } = await import("@/lib/pdf/cert-identifiers")
      certificateRef = generateCertificateRef(certificateType)
    }

    // Generate PDF using template renderer (same pipeline as approve-cert.ts)
    const { renderTemplatePdf } = await import("@/lib/pdf/template-renderer")
    const patientDob = formatShortDateSafe(cert.patient_dob)
    const result = await renderTemplatePdf({
      certificateType,
      patientName: cert.patient_name,
      patientDateOfBirth: patientDob,
      consultationDate: formatDateLong(cert.issue_date),
      startDate: formatDateLong(cert.start_date),
      endDate: formatDateLong(cert.end_date),
      certificateRef,
      issueDate: formatShortDate(cert.issue_date),
    })

    if (!result.success || !result.buffer) {
      logger.error("[Email Dispatcher] PDF render failed", { certificateId, error: result.error })
      return { success: false, error: result.error || "PDF render failed" }
    }

    // Upload to storage
    const storagePath = `med-certs/${cert.patient_id}/${cert.certificate_number}.pdf`
    const { error: uploadError } = await supabase.storage
      .from("documents")
      .upload(storagePath, result.buffer, {
        contentType: "application/pdf",
        upsert: true,
      })

    if (uploadError) {
      logger.error("[Email Dispatcher] PDF upload failed", { certificateId, error: uploadError.message })
      return { success: false, error: `PDF upload failed: ${uploadError.message}` }
    }

    // Update certificate with real storage path
    const { error: updateError } = await supabase
      .from("issued_certificates")
      .update({ storage_path: storagePath })
      .eq("id", certificateId)

    if (updateError) {
      logger.error("[Email Dispatcher] Certificate update failed", { certificateId, error: updateError.message })
      // Don't fail - PDF exists, can be fixed later
    }

    logger.info("[Email Dispatcher] PDF generated and uploaded", { certificateId, storagePath })
    return { success: true }

  } catch (err) {
    const error = err instanceof Error ? err.message : String(err)
    logger.error("[Email Dispatcher] PDF generation error", { certificateId, error })
    Sentry.captureException(err, {
      tags: { component: "email_dispatcher", action: "pdf_generation", certificate_id: certificateId },
    })
    return { success: false, error }
  }
}
