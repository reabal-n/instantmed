/**
 * Admin Email Preview System
 *
 * Renders the ACTUAL React Email templates used in production,
 * so admin preview matches what patients receive exactly.
 */

import "server-only"

import * as React from "react"

import { APP_URL } from "@/lib/constants"
// ── Template imports ──
import { AbandonedCheckoutEmail } from "@/lib/email/components/templates/abandoned-checkout"
import { ConsultApprovedEmail } from "@/lib/email/components/templates/consult-approved"
import { GuestCompleteAccountEmail } from "@/lib/email/components/templates/guest-complete-account"
import { MedCertEmployerEmail } from "@/lib/email/components/templates/med-cert-employer"
import { MedCertPatientEmail } from "@/lib/email/components/templates/med-cert-patient"
import { NeedsMoreInfoEmail } from "@/lib/email/components/templates/needs-more-info"
import { PaymentConfirmedEmail } from "@/lib/email/components/templates/payment-confirmed"
import { PaymentFailedEmail } from "@/lib/email/components/templates/payment-failed"
import { RefundIssuedEmail } from "@/lib/email/components/templates/refund-issued"
import { RequestDeclinedEmail } from "@/lib/email/components/templates/request-declined"
import { RequestReceivedEmail } from "@/lib/email/components/templates/request-received"
import { ScriptSentEmail } from "@/lib/email/components/templates/script-sent"
import { StillReviewingEmail } from "@/lib/email/components/templates/still-reviewing"
import { createLogger } from "@/lib/observability/logger"

const log = createLogger("admin-email-preview")

// ============================================================================
// TEMPLATE REGISTRY
// ============================================================================

interface PreviewTemplate {
  slug: string
  name: string
  subject: string
  availableTags: string[]
  sampleData: Record<string, string>
  render: (data: Record<string, string>) => React.ReactElement
}

const PREVIEW_TEMPLATES: PreviewTemplate[] = [
  // ── Patient Lifecycle ──
  {
    slug: "guest_complete_account",
    name: "Guest Complete Account",
    subject: "Set up your account to track your request",
    availableTags: ["patientName", "requestType", "intakeId"],
    sampleData: { patientName: "Sarah Johnson", requestType: "Medical Certificate", intakeId: "abc-123" },
    render: (d) => React.createElement(GuestCompleteAccountEmail, {
      patientName: d.patientName,
      requestType: d.requestType,
      intakeId: d.intakeId,
      completeAccountUrl: `${APP_URL}/auth/complete-account?intake_id=${d.intakeId}&session_id=cs_preview`,
      appUrl: APP_URL,
    }),
  },

  // ── Request Flow ──
  {
    slug: "request_received",
    name: "Request Received (Payment Confirmed)",
    subject: "Your request is with a doctor now",
    availableTags: ["patientName", "requestType", "amount", "requestId"],
    sampleData: { patientName: "Sarah Johnson", requestType: "medical certificate", amount: "$29.95", requestId: "abc-123" },
    render: (d) => React.createElement(RequestReceivedEmail, {
      patientName: d.patientName,
      requestType: d.requestType,
      amount: d.amount,
      requestId: d.requestId,
      appUrl: APP_URL,
    }),
  },
  {
    slug: "still_reviewing",
    name: "Still Reviewing",
    subject: "Still reviewing your request, thanks for your patience",
    availableTags: ["patientName", "requestType", "requestId"],
    sampleData: { patientName: "Sarah Johnson", requestType: "medical certificate", requestId: "abc-123" },
    render: (d) => React.createElement(StillReviewingEmail, {
      patientName: d.patientName,
      requestType: d.requestType,
      requestId: d.requestId,
      appUrl: APP_URL,
    }),
  },
  {
    slug: "needs_more_info",
    name: "Needs More Info",
    subject: "Quick question about your request",
    availableTags: ["patientName", "requestType", "requestId", "doctorMessage"],
    sampleData: { patientName: "Sarah Johnson", requestType: "medical certificate", requestId: "abc-123", doctorMessage: "Could you please clarify how long you've been experiencing these symptoms?" },
    render: (d) => React.createElement(NeedsMoreInfoEmail, {
      patientName: d.patientName,
      requestType: d.requestType,
      requestId: d.requestId,
      doctorMessage: d.doctorMessage,
      appUrl: APP_URL,
    }),
  },

  // ── Approvals ──
  {
    slug: "med_cert_patient",
    name: "Medical Certificate (Patient)",
    subject: "Your medical certificate is ready",
    availableTags: ["patientName", "verificationCode", "certType"],
    sampleData: { patientName: "Sarah Johnson", verificationCode: "MC-ABC123-XYZ", certType: "work" },
    render: (d) => React.createElement(MedCertPatientEmail, {
      patientName: d.patientName,
      dashboardUrl: `${APP_URL}/patient/intakes/abc-123`,
      verificationCode: d.verificationCode,
      certType: (d.certType as "work" | "study" | "carer") || "work",
      appUrl: APP_URL,
      // Sample token so the "how did you find us?" attribution MCQ renders in preview.
      heardToken: "PREVIEW_SAMPLE_TOKEN",
    }),
  },
  {
    slug: "med_cert_employer",
    name: "Medical Certificate (Employer)",
    subject: "Medical Certificate",
    availableTags: ["employerName", "companyName", "patientName", "verificationCode"],
    sampleData: { employerName: "John Smith", companyName: "Acme Corporation", patientName: "Sarah Johnson", verificationCode: "MC-ABC123-XYZ" },
    render: (d) => React.createElement(MedCertEmployerEmail, {
      employerName: d.employerName,
      companyName: d.companyName,
      patientName: d.patientName,
      downloadUrl: `${APP_URL}/api/download/mock-signed-url`,
      expiresInDays: 7,
      verificationCode: d.verificationCode,
      patientNote: "Please find my medical certificate attached.",
      certStartDate: "26 January 2026",
      certEndDate: "28 January 2026",
      appUrl: APP_URL,
    }),
  },
  {
    slug: "consult_approved",
    name: "Consultation Approved",
    subject: "Your consultation has been reviewed",
    availableTags: ["patientName", "doctorNotes"],
    sampleData: { patientName: "Sarah Johnson", doctorNotes: "Based on your consultation, I've reviewed your symptoms and medical history." },
    render: (d) => React.createElement(ConsultApprovedEmail, {
      patientName: d.patientName,
      requestId: "abc-123",
      doctorNotes: d.doctorNotes,
      appUrl: APP_URL,
      heardToken: "PREVIEW_SAMPLE_TOKEN",
    }),
  },
  {
    slug: "script_sent",
    name: "Script Sent",
    subject: "Your eScript has been sent",
    availableTags: ["patientName", "escriptReference"],
    sampleData: { patientName: "Sarah Johnson", escriptReference: "ES-2024-001234" },
    render: (d) => React.createElement(ScriptSentEmail, {
      patientName: d.patientName,
      requestId: "abc-123",
      escriptReference: d.escriptReference,
      appUrl: APP_URL,
      heardToken: "PREVIEW_SAMPLE_TOKEN",
    }),
  },
  {
    slug: "request_declined",
    name: "Request Declined",
    subject: "Update on your request",
    availableTags: ["patientName", "requestType", "reason"],
    sampleData: { patientName: "Sarah Johnson", requestType: "Medical Certificate", reason: "After reviewing your request, a telehealth consultation alone is not suitable. We recommend seeing your regular GP in person." },
    render: (d) => React.createElement(RequestDeclinedEmail, {
      patientName: d.patientName,
      requestType: d.requestType,
      requestId: "abc-123",
      reason: d.reason,
      appUrl: APP_URL,
    }),
  },

  // ── Payments ──
  {
    slug: "payment_confirmed",
    name: "Payment Confirmed",
    subject: "Payment confirmed",
    availableTags: ["patientName", "requestType", "amount"],
    sampleData: { patientName: "Sarah Johnson", requestType: "medical certificate", amount: "$29.95" },
    render: (d) => React.createElement(PaymentConfirmedEmail, {
      patientName: d.patientName,
      requestType: d.requestType,
      amount: d.amount,
      requestId: "abc-123",
      appUrl: APP_URL,
    }),
  },
  {
    slug: "payment_failed",
    name: "Payment Failed",
    subject: "There was a hiccup with your payment",
    availableTags: ["patientName", "serviceName", "failureReason"],
    sampleData: { patientName: "Sarah Johnson", serviceName: "medical certificate", failureReason: "Your card was declined." },
    render: (d) => React.createElement(PaymentFailedEmail, {
      patientName: d.patientName,
      serviceName: d.serviceName,
      failureReason: d.failureReason,
      retryUrl: `${APP_URL}/patient/intakes/abc-123/retry-payment`,
      appUrl: APP_URL,
    }),
  },
  {
    slug: "refund_issued",
    name: "Refund Issued",
    subject: "Your refund has been processed",
    availableTags: ["patientName", "requestType", "amountFormatted"],
    sampleData: { patientName: "Sarah Johnson", requestType: "medical certificate", amountFormatted: "$29.95" },
    render: (d) => React.createElement(RefundIssuedEmail, {
      patientName: d.patientName,
      requestType: d.requestType,
      requestId: "abc-123",
      amountFormatted: d.amountFormatted,
      appUrl: APP_URL,
    }),
  },

  // ── Engagement ──
  {
    slug: "abandoned_checkout",
    name: "Abandoned Checkout",
    subject: "Your request is ready when you are",
    availableTags: ["patientName", "serviceName"],
    sampleData: { patientName: "Sarah Johnson", serviceName: "medical certificate" },
    render: (d) => React.createElement(AbandonedCheckoutEmail, {
      patientName: d.patientName,
      serviceName: d.serviceName,
      resumeUrl: `${APP_URL}/request?resume=abc-123`,
      startedAgoLabel: "about 35 minutes ago",
      appUrl: APP_URL,
    }),
  },
]

// ============================================================================
// PUBLIC API
// ============================================================================

export function getAllPreviewTemplates() {
  return PREVIEW_TEMPLATES.map(({ slug, name, availableTags }) => ({ slug, name, availableTags }))
}

export function getPreviewTemplate(slug: string): PreviewTemplate | null {
  return PREVIEW_TEMPLATES.find((t) => t.slug === slug) || null
}

export function getPreviewTemplateTags(slug: string): string[] {
  return getPreviewTemplate(slug)?.availableTags || []
}

export function getPreviewTemplateSampleData(slug: string): Record<string, string> {
  return getPreviewTemplate(slug)?.sampleData || {}
}

/**
 * Render a template with custom data. Returns the actual React Email HTML.
 */
export function renderPreviewTemplate(
  slug: string,
  data: Record<string, string> = {},
  options: { isTest?: boolean } = {}
): { subject: string; html: string; error?: string } {
  const template = getPreviewTemplate(slug)
  if (!template) {
    return { subject: "", html: "", error: `Template "${slug}" not found` }
  }

  try {
    const mergedData = { ...template.sampleData, ...data }
    const element = template.render(mergedData)

    // renderEmailToHtml is async - but this function is sync for backward compat.
    // Use renderToStaticMarkup directly (same as renderEmailToHtml but sync).
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const ReactDOMServer = require("react-dom/server")
    let html: string = `<!DOCTYPE html>${ReactDOMServer.renderToStaticMarkup(element)}`

    const subject = options.isTest ? `[TEST] ${template.subject}` : template.subject

    if (options.isTest) {
      const testBanner = `<div style="background-color:#f59e0b;color:white;padding:12px;text-align:center;font-weight:bold;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">THIS IS A TEST EMAIL - Template: ${template.name}</div>`
      html = html.replace(/<body[^>]*>/i, (match) => `${match}${testBanner}`)
    }

    return { subject, html }
  } catch (error) {
    log.error("Failed to render preview template", { slug }, error instanceof Error ? error : undefined)
    return { subject: "", html: "", error: `Failed to render template: ${error instanceof Error ? error.message : String(error)}` }
  }
}
