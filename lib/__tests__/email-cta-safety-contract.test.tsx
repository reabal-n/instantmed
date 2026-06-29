import { readFileSync } from "node:fs"
import { join } from "node:path"

import * as React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import {
  GuestCompleteAccountEmail,
  MedCertPatientEmail,
  NeedsMoreInfoEmail,
  PaymentConfirmedEmail,
  PaymentFailedEmail,
  PaymentReceiptEmail,
  PaymentRetryEmail,
  PrescriptionApprovedEmail,
  RequestDeclinedEmail,
  RequestReceivedEmail,
  ScriptSentEmail,
  StillReviewingEmail,
} from "@/lib/email/components/templates"
import {
  getGuestCertificateAccessHref,
  getPatientIntakeDetailHref,
} from "@/lib/patient/certificate-download"

const APP_URL = "https://instantmed.com.au"
const INTAKE_ID = "intake_123"
const REQUEST_REF = "REQ-123"

function render(element: React.ReactElement): string {
  return renderToStaticMarkup(element)
}

function decodeAttribute(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, "\"")
}

function extractHrefs(html: string): string[] {
  return Array.from(html.matchAll(/href="([^"]+)"/g), (match) => decodeAttribute(match[1]))
}

function expectRenderedEmailSafety(html: string) {
  expect(html).not.toMatch(/supabase\.co\/storage/i)
  expect(html).not.toMatch(/\/storage\/v1\/object/i)
  expect(html).not.toMatch(/signedUrl|signed_url|storage_path|pdf_storage_path/i)
  expect(html).not.toMatch(/certificate will be emailed/i)
  expect(html).not.toMatch(/email (you )?your certificate/i)
  expect(html).not.toMatch(/download your certificate instantly/i)
  expect(html).not.toMatch(/instantly when ready/i)
  expect(html).not.toMatch(/PDF attachment|attached PDF|raw PDF/i)
  expect(html).not.toMatch(/\bExpress Review\b/i)
}

function expectHref(html: string, href: string) {
  expect(extractHrefs(html)).toContain(href)
}

const patientEmailCases: Array<{
  name: string
  html: string
  expectedHref: string
}> = [
  {
    name: "request received",
    html: render(
      <RequestReceivedEmail
        patientName="Test Patient"
        requestType="Medical Certificate"
        amount="$24.95"
        requestId={REQUEST_REF}
        appUrl={APP_URL}
      />,
    ),
    expectedHref: `${APP_URL}/track/${REQUEST_REF}`,
  },
  {
    name: "guest request received account link",
    html: render(
      <RequestReceivedEmail
        patientName="Test Patient"
        requestType="Medical Certificate"
        amount="$24.95"
        requestId={INTAKE_ID}
        isGuest
        appUrl={APP_URL}
      />,
    ),
    expectedHref: `${APP_URL}/auth/complete-account?intake_id=${INTAKE_ID}`,
  },
  {
    name: "payment confirmed",
    html: render(
      <PaymentConfirmedEmail
        patientName="Test Patient"
        requestType="Medical Certificate"
        amount="$24.95"
        requestId={INTAKE_ID}
        appUrl={APP_URL}
      />,
    ),
    expectedHref: `${APP_URL}/track/${INTAKE_ID}`,
  },
  {
    name: "payment receipt",
    html: render(
      <PaymentReceiptEmail
        patientName="Test Patient"
        serviceName="Medical Certificate"
        amount="$24.95"
        intakeRef="IM-TEST"
        paidAt="29 June 2026"
        dashboardUrl={`${APP_URL}/track/${INTAKE_ID}`}
        appUrl={APP_URL}
      />,
    ),
    expectedHref: `${APP_URL}/track/${INTAKE_ID}`,
  },
  {
    name: "payment failed",
    html: render(
      <PaymentFailedEmail
        patientName="Test Patient"
        serviceName="Medical Certificate"
        failureReason="Card declined"
        retryUrl={`${APP_URL}/request/payment/recover?intake_id=${INTAKE_ID}`}
        appUrl={APP_URL}
      />,
    ),
    expectedHref: `${APP_URL}/request/payment/recover?intake_id=${INTAKE_ID}`,
  },
  {
    name: "payment retry",
    html: render(
      <PaymentRetryEmail
        patientName="Test Patient"
        requestType="Medical Certificate"
        amount="$24.95"
        paymentUrl={`${APP_URL}/request/payment/recover?intake_id=${INTAKE_ID}`}
        appUrl={APP_URL}
      />,
    ),
    expectedHref: `${APP_URL}/request/payment/recover?intake_id=${INTAKE_ID}`,
  },
  {
    name: "needs more info",
    html: render(
      <NeedsMoreInfoEmail
        patientName="Test Patient"
        requestType="Medical Certificate"
        requestId={INTAKE_ID}
        doctorMessage="Please add one more detail."
        appUrl={APP_URL}
      />,
    ),
    expectedHref: `${APP_URL}/track/${INTAKE_ID}`,
  },
  {
    name: "still reviewing",
    html: render(
      <StillReviewingEmail
        patientName="Test Patient"
        requestType="Medical Certificate"
        requestId={INTAKE_ID}
        appUrl={APP_URL}
      />,
    ),
    expectedHref: `${APP_URL}/track/${INTAKE_ID}`,
  },
  {
    name: "request declined",
    html: render(
      <RequestDeclinedEmail
        patientName="Test Patient"
        requestType="Medical Certificate"
        requestId={INTAKE_ID}
        appUrl={APP_URL}
      />,
    ),
    expectedHref: `${APP_URL}/track/${INTAKE_ID}`,
  },
  {
    name: "script sent",
    html: render(
      <ScriptSentEmail
        patientName="Test Patient"
        requestId={INTAKE_ID}
        appUrl={APP_URL}
      />,
    ),
    expectedHref: `${APP_URL}/track/${INTAKE_ID}`,
  },
  {
    name: "prescription approved",
    html: render(
      <PrescriptionApprovedEmail
        patientName="Test Patient"
        medicationName="Test medication"
        intakeId={INTAKE_ID}
        appUrl={APP_URL}
      />,
    ),
    expectedHref: `${APP_URL}/track/${INTAKE_ID}`,
  },
  {
    name: "guest complete account",
    html: render(
      <GuestCompleteAccountEmail
        patientName="Test Patient"
        requestType="Medical Certificate"
        intakeId={INTAKE_ID}
        completeAccountUrl={`${APP_URL}/auth/complete-account?intake_id=${INTAKE_ID}`}
        appUrl={APP_URL}
      />,
    ),
    expectedHref: `${APP_URL}/auth/complete-account?intake_id=${INTAKE_ID}`,
  },
]

describe("patient email CTA safety contract", () => {
  it.each(patientEmailCases)("keeps $name CTA app-routed and safe", ({ html, expectedHref }) => {
    expectRenderedEmailSafety(html)
    expectHref(html, expectedHref)
  })

  it("routes signed-in and guest certificate-ready CTAs through audited app access", () => {
    const signedInUrl = `${APP_URL}${getPatientIntakeDetailHref(INTAKE_ID)}`
    const guestUrl = `${APP_URL}${getGuestCertificateAccessHref(INTAKE_ID)}`

    const signedInHtml = render(
      <MedCertPatientEmail
        patientName="Test Patient"
        dashboardUrl={signedInUrl}
        appUrl={APP_URL}
      />,
    )
    const guestHtml = render(
      <MedCertPatientEmail
        patientName="Test Patient"
        dashboardUrl={guestUrl}
        isGuest
        appUrl={APP_URL}
      />,
    )

    expectRenderedEmailSafety(signedInHtml)
    expectRenderedEmailSafety(guestHtml)
    expectHref(signedInHtml, signedInUrl)
    expectHref(guestHtml, `${APP_URL}/auth/complete-account?intake_id=${INTAKE_ID}&access=certificate`)
    expect(guestHtml).toContain("Set up access &amp; view certificate")
  })

  it("keeps reconstructed certificate email CTAs on app routes instead of signed storage URLs", () => {
    const reconstructSource = readFileSync(
      join(process.cwd(), "lib/email/send/reconstruct.ts"),
      "utf8",
    )
    const resendSource = readFileSync(
      join(process.cwd(), "app/actions/resend-certificate.ts"),
      "utf8",
    )

    expect(reconstructSource).toContain("getGuestCertificateAccessHref(cert.intake_id, guestEmail)")
    expect(reconstructSource).toContain("getPatientIntakeDetailHref(cert.intake_id)")
    expect(resendSource).toContain("getGuestCertificateAccessHref(intakeId, patient.email)")
    expect(resendSource).toContain("getPatientIntakeDetailHref(intakeId)")
  })
})
