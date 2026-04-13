/**
 * Admin Email Preview System
 *
 * Renders the ACTUAL React Email templates used in production,
 * so admin preview matches what patients receive exactly.
 */

import "server-only"

import * as React from "react"

import { AbandonedCheckoutEmail } from "@/lib/email/components/templates/abandoned-checkout"
import { ConsultApprovedEmail } from "@/lib/email/components/templates/consult-approved"
import { EdApprovedEmail } from "@/lib/email/components/templates/ed-approved"
import { GuestCompleteAccountEmail } from "@/lib/email/components/templates/guest-complete-account"
import { HairLossApprovedEmail } from "@/lib/email/components/templates/hair-loss-approved"
import { IntakeSubmittedEmail } from "@/lib/email/components/templates/intake-submitted"
import { MedCertEmployerEmail } from "@/lib/email/components/templates/med-cert-employer"
import { MedCertPatientEmail } from "@/lib/email/components/templates/med-cert-patient"
import { NeedsMoreInfoEmail } from "@/lib/email/components/templates/needs-more-info"
import { PaymentConfirmedEmail } from "@/lib/email/components/templates/payment-confirmed"
import { PaymentFailedEmail } from "@/lib/email/components/templates/payment-failed"
import { PaymentReceiptEmail } from "@/lib/email/components/templates/payment-receipt"
import { PaymentRetryEmail } from "@/lib/email/components/templates/payment-retry"
import { PrescriptionApprovedEmail } from "@/lib/email/components/templates/prescription-approved"
import { ReferralCreditEmail } from "@/lib/email/components/templates/referral-credit"
import { RefundIssuedEmail } from "@/lib/email/components/templates/refund-issued"
import { RepeatRxReminderEmail } from "@/lib/email/components/templates/repeat-rx-reminder"
import { RequestDeclinedEmail } from "@/lib/email/components/templates/request-declined"
import { RequestReceivedEmail } from "@/lib/email/components/templates/request-received"
import { ScriptSentEmail } from "@/lib/email/components/templates/script-sent"
import { StillReviewingEmail } from "@/lib/email/components/templates/still-reviewing"
import { VerificationCodeEmail } from "@/lib/email/components/templates/verification-code"
import { WeightLossApprovedEmail } from "@/lib/email/components/templates/weight-loss-approved"
// ── Template imports ──
import { WelcomeEmail } from "@/lib/email/components/templates/welcome"
import { WomensHealthApprovedEmail } from "@/lib/email/components/templates/womens-health-approved"
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

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://instantmed.com.au"

const PREVIEW_TEMPLATES: PreviewTemplate[] = [
  // ── Patient Lifecycle ──
  {
    slug: "welcome",
    name: "Welcome Email",
    subject: "Welcome to InstantMed",
    availableTags: ["patientName"],
    sampleData: { patientName: "Sarah Johnson" },
    render: (d) => React.createElement(WelcomeEmail, { patientName: d.patientName, appUrl: APP_URL }),
  },
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
      completeAccountUrl: `${APP_URL}/auth/complete-account?intake=${d.intakeId}`,
      appUrl: APP_URL,
    }),
  },
  {
    slug: "verification_code",
    name: "Verification Code",
    subject: "Your InstantMed verification code",
    availableTags: ["code"],
    sampleData: { code: "847291" },
    render: (d) => React.createElement(VerificationCodeEmail, {
      code: d.code,
      requestedFrom: "Chrome on macOS",
      requestedAt: "30 March 2026, 2:15 PM AEST",
      appUrl: APP_URL,
    }),
  },

  // ── Request Flow ──
  {
    slug: "intake_submitted",
    name: "Intake Submitted",
    subject: "Your request is being reviewed",
    availableTags: ["patientName", "requestType", "requestId"],
    sampleData: { patientName: "Sarah Johnson", requestType: "medical certificate", requestId: "abc-123" },
    render: (d) => React.createElement(IntakeSubmittedEmail, {
      patientName: d.patientName,
      requestType: d.requestType,
      requestId: d.requestId,
      appUrl: APP_URL,
    }),
  },
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
      downloadUrl: `${APP_URL}/api/download/mock-signed-url`,
      dashboardUrl: `${APP_URL}/patient/intakes/abc-123`,
      verificationCode: d.verificationCode,
      certType: (d.certType as "work" | "study" | "carer") || "work",
      appUrl: APP_URL,
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
    }),
  },
  {
    slug: "prescription_approved",
    name: "Prescription Approved",
    subject: "Your prescription has been approved",
    availableTags: ["patientName", "medicationName"],
    sampleData: { patientName: "Sarah Johnson", medicationName: "Amoxicillin 500mg" },
    render: (d) => React.createElement(PrescriptionApprovedEmail, {
      patientName: d.patientName,
      medicationName: d.medicationName,
      intakeId: "abc-123",
      appUrl: APP_URL,
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
    }),
  },
  {
    slug: "ed_approved",
    name: "ED Consultation Approved",
    subject: "Your ED consultation has been reviewed",
    availableTags: ["patientName", "medicationName"],
    sampleData: { patientName: "Sarah Johnson", medicationName: "Sildenafil 50mg" },
    render: (d) => React.createElement(EdApprovedEmail, {
      patientName: d.patientName,
      medicationName: d.medicationName,
      requestId: "abc-123",
      appUrl: APP_URL,
    }),
  },
  {
    slug: "hair_loss_approved",
    name: "Hair Loss Approved",
    subject: "Your hair loss treatment has been approved",
    availableTags: ["patientName", "medicationName"],
    sampleData: { patientName: "Sarah Johnson", medicationName: "Finasteride 1mg" },
    render: (d) => React.createElement(HairLossApprovedEmail, {
      patientName: d.patientName,
      medicationName: d.medicationName,
      requestId: "abc-123",
      appUrl: APP_URL,
    }),
  },
  {
    slug: "weight_loss_approved",
    name: "Weight Loss Approved",
    subject: "Your weight loss treatment has been approved",
    availableTags: ["patientName", "medicationName"],
    sampleData: { patientName: "Sarah Johnson", medicationName: "Semaglutide 0.25mg" },
    render: (d) => React.createElement(WeightLossApprovedEmail, {
      patientName: d.patientName,
      medicationName: d.medicationName,
      requestId: "abc-123",
      appUrl: APP_URL,
    }),
  },
  {
    slug: "womens_health_approved",
    name: "Women's Health Approved",
    subject: "Your women's health treatment has been approved",
    availableTags: ["patientName", "medicationName", "treatmentType"],
    sampleData: { patientName: "Sarah Johnson", medicationName: "Levonorgestrel 1.5mg", treatmentType: "contraception" },
    render: (d) => React.createElement(WomensHealthApprovedEmail, {
      patientName: d.patientName,
      medicationName: d.medicationName,
      treatmentType: d.treatmentType,
      requestId: "abc-123",
      appUrl: APP_URL,
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
    slug: "payment_receipt",
    name: "Payment Receipt",
    subject: "Payment receipt",
    availableTags: ["patientName", "serviceName", "amount", "intakeRef", "paidAt"],
    sampleData: { patientName: "Sarah Johnson", serviceName: "Medical Certificate (2 Day)", amount: "$29.95", intakeRef: "IM-20260330-00847", paidAt: "30 Mar 2026, 2:15 PM" },
    render: (d) => React.createElement(PaymentReceiptEmail, {
      patientName: d.patientName,
      serviceName: d.serviceName,
      amount: d.amount,
      intakeRef: d.intakeRef,
      paidAt: d.paidAt,
      dashboardUrl: `${APP_URL}/patient/intakes/abc-123`,
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
    slug: "payment_retry",
    name: "Payment Retry",
    subject: "Your payment needs another go",
    availableTags: ["patientName", "requestType", "amount"],
    sampleData: { patientName: "Sarah Johnson", requestType: "medical certificate", amount: "$29.95" },
    render: (d) => React.createElement(PaymentRetryEmail, {
      patientName: d.patientName,
      requestType: d.requestType,
      amount: d.amount,
      paymentUrl: `${APP_URL}/patient/intakes/abc-123/retry-payment`,
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
      hoursAgo: 2,
      appUrl: APP_URL,
    }),
  },
  {
    slug: "repeat_rx_reminder",
    name: "Repeat Rx Reminder",
    subject: "Time to reorder your medication?",
    availableTags: ["patientName", "medicationName"],
    sampleData: { patientName: "Sarah Johnson", medicationName: "Amoxicillin 500mg" },
    render: (d) => React.createElement(RepeatRxReminderEmail, {
      patientName: d.patientName,
      medicationName: d.medicationName,
      reorderUrl: `${APP_URL}/request?service=repeat-prescription`,
      appUrl: APP_URL,
    }),
  },
  {
    slug: "referral_credit",
    name: "Referral Credit",
    subject: "You've earned a $5.00 credit!",
    availableTags: ["patientName", "creditAmount", "friendName"],
    sampleData: { patientName: "Sarah Johnson", creditAmount: "$5.00", friendName: "Tom Wilson" },
    render: (d) => React.createElement(ReferralCreditEmail, {
      patientName: d.patientName,
      creditAmount: d.creditAmount,
      friendName: d.friendName,
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
