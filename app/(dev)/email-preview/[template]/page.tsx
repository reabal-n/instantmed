/**
 * Individual Email Template Preview
 *
 * Renders a specific email template with mock props.
 * Dev-only route — all 27 React Email templates registered.
 */

import { redirect, notFound } from "next/navigation"
import Link from "next/link"
import * as React from "react"
import { renderEmailToHtml } from "@/lib/email/react-renderer-server"
import { CONTACT_EMAIL_NOREPLY, COMPANY_NAME } from "@/lib/constants"

// ── Template imports ──
import { WelcomeEmail } from "@/components/email/templates/welcome"
import { MedCertPatientEmail } from "@/components/email/templates/med-cert-patient"
import { MedCertEmployerEmail } from "@/components/email/templates/med-cert-employer"
import { ScriptSentEmail } from "@/components/email/templates/script-sent"
import { RequestDeclinedEmail } from "@/components/email/templates/request-declined"
import { StillReviewingEmail } from "@/components/email/templates/still-reviewing"
import { IntakeSubmittedEmail } from "@/components/email/templates/intake-submitted"
import { ConsultApprovedEmail } from "@/components/email/templates/consult-approved"
import { RequestReceivedEmail } from "@/components/email/templates/request-received"
import { NeedsMoreInfoEmail } from "@/components/email/templates/needs-more-info"
import { EdApprovedEmail } from "@/components/email/templates/ed-approved"
import { HairLossApprovedEmail } from "@/components/email/templates/hair-loss-approved"
import { WeightLossApprovedEmail } from "@/components/email/templates/weight-loss-approved"
import { WomensHealthApprovedEmail } from "@/components/email/templates/womens-health-approved"
import { PrescriptionApprovedEmail } from "@/components/email/templates/prescription-approved"
import { PaymentConfirmedEmail } from "@/components/email/templates/payment-confirmed"
import { PaymentReceiptEmail } from "@/components/email/templates/payment-receipt"
import { PaymentFailedEmail } from "@/components/email/templates/payment-failed"
import { PaymentRetryEmail } from "@/components/email/templates/payment-retry"
import { RefundIssuedEmail } from "@/components/email/templates/refund-issued"
import { AbandonedCheckoutEmail } from "@/components/email/templates/abandoned-checkout"
import { RepeatRxReminderEmail } from "@/components/email/templates/repeat-rx-reminder"
import { ReferralCreditEmail } from "@/components/email/templates/referral-credit"
import { GuestCompleteAccountEmail } from "@/components/email/templates/guest-complete-account"
import { VerificationCodeEmail } from "@/components/email/templates/verification-code"

export const dynamic = "force-dynamic"

// ── Mock data ──
const mock = {
  appUrl: "http://localhost:3000",
  patientName: "Sarah Johnson",
  dashboardUrl: "http://localhost:3000/patient/intakes/abc-123",
  verificationCode: "MC-ABC123-XYZ",
  requestId: "abc-123",
  escriptReference: "ES-2024-001234",
  employerName: "John Smith",
  companyName: "Acme Corporation",
  downloadUrl: "http://localhost:3000/api/download/secure-token-xyz",
  certStartDate: "26 January 2026",
  certEndDate: "28 January 2026",
  patientNote: "Please find my medical certificate attached. Let me know if you need anything else.",
  declineReason: "After reviewing your request, a telehealth consultation alone is not suitable for your situation. We recommend you see your regular GP in person for a proper examination.",
  medicationName: "Sildenafil 50mg",
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
  "welcome": {
    name: "Welcome Email",
    subject: "Welcome to InstantMed",
    render: () => <WelcomeEmail patientName={mock.patientName} appUrl={mock.appUrl} />,
  },
  "guest-complete-account": {
    name: "Guest Complete Account",
    subject: "Your medical certificate is underway — set up your account to track it",
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
  "verification-code": {
    name: "Verification Code",
    subject: "Your InstantMed verification code — 847291",
    render: () => (
      <VerificationCodeEmail
        code="847291"
        requestedFrom="Chrome on macOS"
        requestedAt="30 March 2026, 2:15 PM AEST"
        appUrl={mock.appUrl}
      />
    ),
  },

  // Request flow
  "intake-submitted": {
    name: "Intake Submitted",
    subject: "Got it — your medical certificate is being reviewed",
    render: () => (
      <IntakeSubmittedEmail
        patientName={mock.patientName}
        requestType="medical certificate"
        requestId={mock.requestId}
        appUrl={mock.appUrl}
      />
    ),
  },
  "request-received": {
    name: "Request Received",
    subject: "All sorted — your medical certificate is with a doctor now",
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
    subject: "Still reviewing your medical certificate — thanks for your patience",
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
        downloadUrl={mock.downloadUrl}
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
  "prescription-approved": {
    name: "Prescription Approved",
    subject: "Your prescription has been approved",
    render: () => (
      <PrescriptionApprovedEmail
        patientName={mock.patientName}
        medicationName="Amoxicillin 500mg"
        intakeId={mock.requestId}
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
  "ed-approved": {
    name: "ED Consultation Approved",
    subject: "Your ED consultation has been reviewed",
    render: () => (
      <EdApprovedEmail
        patientName={mock.patientName}
        medicationName={mock.medicationName}
        requestId={mock.requestId}
        appUrl={mock.appUrl}
      />
    ),
  },
  "hair-loss-approved": {
    name: "Hair Loss Approved",
    subject: "Your hair loss treatment has been approved",
    render: () => (
      <HairLossApprovedEmail
        patientName={mock.patientName}
        medicationName="Finasteride 1mg"
        requestId={mock.requestId}
        appUrl={mock.appUrl}
      />
    ),
  },
  "weight-loss-approved": {
    name: "Weight Loss Approved",
    subject: "Your weight loss treatment has been approved",
    render: () => (
      <WeightLossApprovedEmail
        patientName={mock.patientName}
        medicationName="Semaglutide 0.25mg"
        requestId={mock.requestId}
        appUrl={mock.appUrl}
      />
    ),
  },
  "womens-health-approved": {
    name: "Women's Health Approved",
    subject: "Your women's health treatment has been approved",
    render: () => (
      <WomensHealthApprovedEmail
        patientName={mock.patientName}
        medicationName="Levonorgestrel 1.5mg"
        treatmentType="contraception"
        requestId={mock.requestId}
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
    subject: "Payment confirmed — $29.95 for your medical certificate",
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
  "payment-receipt": {
    name: "Payment Receipt",
    subject: "Payment receipt — Medical Certificate",
    render: () => (
      <PaymentReceiptEmail
        patientName={mock.patientName}
        serviceName="Medical Certificate (2 Day)"
        amount="$29.95"
        intakeRef="IM-20260330-00847"
        paidAt="30 Mar 2026, 2:15 PM"
        dashboardUrl={mock.dashboardUrl}
        appUrl={mock.appUrl}
      />
    ),
  },
  "payment-failed": {
    name: "Payment Failed",
    subject: "Heads up — there was a hiccup with your medical certificate payment",
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
  "payment-retry": {
    name: "Payment Retry",
    subject: "Just a heads up — your payment needs another go",
    render: () => (
      <PaymentRetryEmail
        patientName={mock.patientName}
        requestType="medical certificate"
        amount="$29.95"
        paymentUrl={`${mock.appUrl}/patient/intakes/${mock.requestId}/retry-payment`}
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
    subject: "Still thinking? Your medical certificate is ready when you are",
    render: () => (
      <AbandonedCheckoutEmail
        patientName={mock.patientName}
        serviceName="medical certificate"
        resumeUrl={`${mock.appUrl}/request?resume=${mock.requestId}`}
        hoursAgo={2}
        appUrl={mock.appUrl}
      />
    ),
  },
  "repeat-rx-reminder": {
    name: "Repeat Rx Reminder",
    subject: "Time to reorder your Amoxicillin?",
    render: () => (
      <RepeatRxReminderEmail
        patientName={mock.patientName}
        medicationName="Amoxicillin 500mg"
        reorderUrl={`${mock.appUrl}/request?service=repeat-prescription`}
        appUrl={mock.appUrl}
      />
    ),
  },
  "referral-credit": {
    name: "Referral Credit",
    subject: "You've earned a $5.00 credit!",
    render: () => (
      <ReferralCreditEmail
        patientName={mock.patientName}
        creditAmount="$5.00"
        friendName="Tom Wilson"
        appUrl={mock.appUrl}
      />
    ),
  },
}

interface PageProps {
  params: Promise<{ template: string }>
}

export default async function EmailPreviewPage({ params }: PageProps) {
  // Block in production
  if (process.env.NODE_ENV === "production") {
    redirect("/")
  }

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
            <span>Preview with mock data — actual emails will use real patient information</span>
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
