/**
 * Individual Email Template Preview
 *
 * Renders a specific email template with mock props.
 * Dev-only route for registered React Email templates.
 */

import Link from "next/link"
import { notFound } from "next/navigation"
import * as React from "react"

import { COMPANY_NAME, CONTACT_EMAIL_NOREPLY, LOCAL_APP_URL } from "@/lib/constants"
import { canAccessDevOnlyRoute } from "@/lib/dev-only-routes"
import { AbandonedCheckoutEmail, abandonedCheckoutSubject } from "@/lib/email/components/templates/abandoned-checkout"
import { AbandonedCheckoutFollowupEmail, abandonedCheckoutFollowupSubject } from "@/lib/email/components/templates/abandoned-checkout-followup"
import { CertReactivationEmail, certReactivationSubject } from "@/lib/email/components/templates/cert-reactivation"
// ── Template imports ──
import { ConsultApprovedEmail } from "@/lib/email/components/templates/consult-approved"
import { GuestCompleteAccountEmail } from "@/lib/email/components/templates/guest-complete-account"
import { HeardAboutUsAskEmail } from "@/lib/email/components/templates/heard-about-us-ask"
import { MagicLinkEmail, magicLinkEmailSubject } from "@/lib/email/components/templates/magic-link"
import { MedCertEmployerEmail } from "@/lib/email/components/templates/med-cert-employer"
import { MedCertPatientEmail } from "@/lib/email/components/templates/med-cert-patient"
import { NeedsMoreInfoEmail } from "@/lib/email/components/templates/needs-more-info"
import { PartialIntakeRecoveryEmail, partialIntakeRecoverySubject } from "@/lib/email/components/templates/partial-intake-recovery"
import { PaymentConfirmedEmail } from "@/lib/email/components/templates/payment-confirmed"
import { PaymentFailedEmail } from "@/lib/email/components/templates/payment-failed"
import { RefillReminderEmail, refillReminderSubject } from "@/lib/email/components/templates/refill-reminder"
import { RefundIssuedEmail } from "@/lib/email/components/templates/refund-issued"
import { RequestDeclinedEmail } from "@/lib/email/components/templates/request-declined"
import { RequestReceivedEmail } from "@/lib/email/components/templates/request-received"
import { ReviewRequestEmail } from "@/lib/email/components/templates/review-request"
import { ScriptSentEmail } from "@/lib/email/components/templates/script-sent"
import { StillReviewingEmail } from "@/lib/email/components/templates/still-reviewing"
import { renderEmailToHtml } from "@/lib/email/react-renderer-server"

export const dynamic = "force-dynamic"

// ── Mock data ──
const mock = {
  appUrl: LOCAL_APP_URL,
  patientName: "Sarah Johnson",
  dashboardUrl: `${LOCAL_APP_URL}/patient/intakes/abc-123`,
  verificationCode: "MC-ABC123-XYZ",
  requestId: "abc-123",
  escriptReference: "ES-2024-001234",
  employerName: "John Smith",
  companyName: "Acme Corporation",
  downloadUrl: `${LOCAL_APP_URL}/api/download/secure-token-xyz`,
  certStartDate: "26 January 2026",
  certEndDate: "28 January 2026",
  patientNote: "Please find my medical certificate attached. Let me know if you need anything else.",
  declineReason: "After reviewing your request, a telehealth consultation alone is not suitable for your situation. We recommend you see your regular GP in person for a proper examination.",
  doctorNotes: "Based on your consultation, I've reviewed your symptoms and medical history. Please follow the treatment plan outlined below.",
  doctorMessage: "Could you please clarify how long you've been experiencing these symptoms? This will help me assess the appropriate certificate duration.",
}

// ── Template registry ──
const templates: Record<string, {
  name: string
  subject: string
  render: () => React.ReactElement
}> = {
  // Patient lifecycle
  "guest-complete-account": {
    name: "Guest Complete Account",
    subject: "Your medical certificate is underway. Set up your account to track it",
    render: () => (
      <GuestCompleteAccountEmail
        patientName={mock.patientName}
        requestType="Medical Certificate"
        intakeId={mock.requestId}
        completeAccountUrl={`${mock.appUrl}/auth/complete-account?intake=${mock.requestId}`}
        appUrl={mock.appUrl}
      />
    ),
  },
  "magic-link": {
    name: "Magic Link",
    subject: magicLinkEmailSubject,
    render: () => (
      <MagicLinkEmail
        loginUrl={`${mock.appUrl}/auth/callback?next=%2Fadmin`}
        appUrl={mock.appUrl}
        firstName="Sarah"
      />
    ),
  },
  "magic-link-recovery": {
    name: "Magic Link Recovery",
    subject: "Reset your InstantMed access",
    render: () => (
      <MagicLinkEmail
        loginUrl={`${mock.appUrl}/auth/confirm#token_hash=preview-only&type=recovery`}
        appUrl={mock.appUrl}
        firstName="Sarah"
        actionType="recovery"
      />
    ),
  },
  "partial-intake-recovery": {
    name: "Partial Intake Recovery",
    subject: partialIntakeRecoverySubject("Medical Certificate"),
    render: () => (
      <PartialIntakeRecoveryEmail
        firstName="Sarah"
        serviceName="Medical Certificate"
        resumeUrl={`${mock.appUrl}/request?service=med-cert&d=00000000-0000-4000-8000-000000000000&utm_source=recovery_email&utm_medium=email&utm_campaign=partial_intake_recovery`}
        appUrl={mock.appUrl}
      />
    ),
  },

  // Request flow
  "request-received": {
    name: "Request Received",
    subject: "All sorted, your medical certificate is with a doctor now",
    render: () => (
      <RequestReceivedEmail
        patientName={mock.patientName}
        requestType="medical certificate"
        amount="$29.95"
        requestId={mock.requestId}
        isGuest={false}
        appUrl={mock.appUrl}
      />
    ),
  },
  "still-reviewing": {
    name: "Still Reviewing",
    subject: "Still reviewing your medical certificate, thanks for your patience",
    render: () => (
      <StillReviewingEmail
        patientName={mock.patientName}
        requestType="medical certificate"
        requestId={mock.requestId}
        appUrl={mock.appUrl}
      />
    ),
  },
  "needs-more-info": {
    name: "Needs More Info",
    subject: "Quick question about your medical certificate request",
    render: () => (
      <NeedsMoreInfoEmail
        patientName={mock.patientName}
        requestType="medical certificate"
        requestId={mock.requestId}
        doctorMessage={mock.doctorMessage}
        appUrl={mock.appUrl}
      />
    ),
  },

  // Approvals
  "med-cert-patient": {
    name: "Medical Certificate (Patient)",
    subject: "Your medical certificate is ready",
    render: () => (
      <MedCertPatientEmail
        patientName={mock.patientName}
        dashboardUrl={mock.dashboardUrl}
        verificationCode={mock.verificationCode}
        certType="work"
        appUrl={mock.appUrl}
      />
    ),
  },
  "med-cert-employer": {
    name: "Medical Certificate (Employer)",
    subject: `Medical Certificate for ${mock.patientName}`,
    render: () => (
      <MedCertEmployerEmail
        employerName={mock.employerName}
        companyName={mock.companyName}
        patientName={mock.patientName}
        downloadUrl={mock.downloadUrl}
        expiresInDays={7}
        verificationCode={mock.verificationCode}
        patientNote={mock.patientNote}
        certStartDate={mock.certStartDate}
        certEndDate={mock.certEndDate}
        appUrl={mock.appUrl}
      />
    ),
  },
  "consult-approved": {
    name: "Consultation Approved",
    subject: "Your consultation has been reviewed",
    render: () => (
      <ConsultApprovedEmail
        patientName={mock.patientName}
        requestId={mock.requestId}
        doctorNotes={mock.doctorNotes}
        appUrl={mock.appUrl}
      />
    ),
  },
  "script-sent": {
    name: "Script Sent",
    subject: "Your eScript has been sent",
    render: () => (
      <ScriptSentEmail
        patientName={mock.patientName}
        requestId={mock.requestId}
        escriptReference={mock.escriptReference}
        appUrl={mock.appUrl}
      />
    ),
  },
  "request-declined": {
    name: "Request Declined",
    subject: "Update on your Medical Certificate request",
    render: () => (
      <RequestDeclinedEmail
        patientName={mock.patientName}
        requestType="Medical Certificate"
        requestId={mock.requestId}
        reason={mock.declineReason}
        appUrl={mock.appUrl}
      />
    ),
  },

  // Payments
  "payment-confirmed": {
    name: "Payment Confirmed",
    subject: "Payment confirmed, $29.95 for your medical certificate",
    render: () => (
      <PaymentConfirmedEmail
        patientName={mock.patientName}
        requestType="medical certificate"
        amount="$29.95"
        requestId={mock.requestId}
        appUrl={mock.appUrl}
      />
    ),
  },
  "payment-failed": {
    name: "Payment Failed",
    subject: "Heads up: there was a hiccup with your medical certificate payment",
    render: () => (
      <PaymentFailedEmail
        patientName={mock.patientName}
        serviceName="medical certificate"
        failureReason="Your card was declined. Please check your details or try a different payment method."
        retryUrl={`${mock.appUrl}/patient/intakes/${mock.requestId}/retry-payment`}
        appUrl={mock.appUrl}
      />
    ),
  },
  "refund-issued": {
    name: "Refund Issued",
    subject: "Your refund has been processed",
    render: () => (
      <RefundIssuedEmail
        patientName={mock.patientName}
        requestType="medical certificate"
        requestId={mock.requestId}
        amountFormatted="$29.95"
        appUrl={mock.appUrl}
      />
    ),
  },

  // Engagement
  "abandoned-checkout": {
    name: "Abandoned Checkout",
    subject: abandonedCheckoutSubject("Medical Certificate"),
    render: () => (
      <AbandonedCheckoutEmail
        patientName={mock.patientName}
        serviceName="Medical Certificate"
        resumeUrl={`${mock.appUrl}/patient/intakes/${mock.requestId}?retry=true&utm_source=recovery_email&utm_medium=email&utm_campaign=abandoned_checkout`}
        startedAgoLabel="about 35 minutes ago"
        appUrl={mock.appUrl}
      />
    ),
  },
  "abandoned-checkout-followup": {
    name: "Abandoned Checkout Followup (24h)",
    subject: abandonedCheckoutFollowupSubject("Medical Certificate"),
    render: () => (
      <AbandonedCheckoutFollowupEmail
        patientName={mock.patientName}
        serviceName="Medical Certificate"
        resumeUrl={`${mock.appUrl}/patient/intakes/${mock.requestId}?retry=true&utm_source=recovery_email&utm_medium=email&utm_campaign=abandoned_checkout_followup`}
        appUrl={mock.appUrl}
      />
    ),
  },
  "review-request": {
    name: "Review Request (Day 2)",
    subject: "Quick favour? ⭐",
    render: () => (
      <ReviewRequestEmail
        patientName={mock.patientName}
        serviceName="Medical Certificate"
        appUrl={mock.appUrl}
        intakeId="preview-intake-id"
        heardToken="preview-token"
      />
    ),
  },
  "refill-reminder": {
    name: "Refill Reminder (Reactivation)",
    subject: refillReminderSubject,
    render: () => (
      <RefillReminderEmail
        patientName={mock.patientName}
        medicationName="Atorvastatin 20mg"
        appUrl={mock.appUrl}
        reorderUrl={`${mock.appUrl}/prescriptions`}
      />
    ),
  },
  "cert-reactivation": {
    name: "Med-cert Reactivation",
    subject: certReactivationSubject,
    render: () => (
      <CertReactivationEmail
        patientName={mock.patientName}
        appUrl={mock.appUrl}
        requestUrl={`${mock.appUrl}/medical-certificate`}
      />
    ),
  },
  "heard-about-us-ask": {
    name: "Attribution backfill (one-time)",
    subject: "Quick question — how did you find us? 👋",
    render: () => (
      <HeardAboutUsAskEmail
        patientName={mock.patientName}
        appUrl={mock.appUrl}
        heardToken="preview-token"
      />
    ),
  },
}

interface PageProps {
  params: Promise<{ template: string }>
}

export default async function EmailPreviewPage({ params }: PageProps) {
  if (!canAccessDevOnlyRoute()) notFound()

  const { template: templateSlug } = await params
  const template = templates[templateSlug]

  if (!template) {
    notFound()
  }

  // Render the template to HTML
  const element = template.render()
  const html = await renderEmailToHtml(element)

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header bar */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/email-preview"
              className="text-gray-500 hover:text-gray-700 text-sm"
            >
              ← Back to templates
            </Link>
            <div className="h-4 w-px bg-gray-300" />
            <h1 className="font-semibold text-gray-900">{template.name}</h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-sm text-gray-500">
              Subject: <span className="font-medium text-gray-700">{template.subject}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Preview area */}
      <div className="p-8">
        <div className="max-w-4xl mx-auto">
          {/* Info bar */}
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700 flex items-center justify-between">
            <span>Preview with mock data - actual emails will use real patient information</span>
            <span className="text-xs bg-blue-100 px-2 py-1 rounded">Dev Only</span>
          </div>

          {/* Email frame */}
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            {/* Fake email header */}
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
              <div className="space-y-2 text-sm">
                <div className="flex">
                  <span className="w-16 text-gray-500">From:</span>
                  <span className="text-gray-900">{COMPANY_NAME} &lt;{CONTACT_EMAIL_NOREPLY}&gt;</span>
                </div>
                <div className="flex">
                  <span className="w-16 text-gray-500">To:</span>
                  <span className="text-gray-900">{mock.patientName} &lt;patient@example.com&gt;</span>
                </div>
                <div className="flex">
                  <span className="w-16 text-gray-500">Subject:</span>
                  <span className="text-gray-900 font-medium">{template.subject}</span>
                </div>
              </div>
            </div>

            {/* Email content iframe */}
            <iframe
              srcDoc={html}
              className="w-full border-0"
              style={{ height: "800px" }}
              title="Email preview"
            />
          </div>

          {/* Raw HTML toggle */}
          <details className="mt-6">
            <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700">
              View raw HTML
            </summary>
            <pre className="mt-2 p-4 bg-gray-900 text-gray-100 rounded-lg overflow-x-auto text-xs">
              {html}
            </pre>
          </details>
        </div>
      </div>
    </div>
  )
}
