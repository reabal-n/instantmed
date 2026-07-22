import { readFileSync } from "node:fs"
import { join } from "node:path"

import * as React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import {
  ConsultApprovedEmail,
  GuestCompleteAccountEmail,
  MedCertPatientEmail,
  NeedsMoreInfoEmail,
  PaymentConfirmedEmail,
  PaymentFailedEmail,
  RefundIssuedEmail,
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
const INTAKE_ID = "11111111-1111-4111-8111-111111111111"
const REQUEST_REF = "REQ-123"
const REQUEST_ACCESS_URL = `${APP_URL}/track/signed-request-access`
const SESSION_ID = "cs_test_current"

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
        requestAccessUrl={REQUEST_ACCESS_URL}
        appUrl={APP_URL}
      />,
    ),
    expectedHref: REQUEST_ACCESS_URL,
  },
  {
    name: "guest request received account link",
    html: render(
      <RequestReceivedEmail
        patientName="Test Patient"
        requestType="Medical Certificate"
        amount="$24.95"
        requestId={INTAKE_ID}
        requestAccessUrl={REQUEST_ACCESS_URL}
        isGuest
        completeAccountUrl={`${APP_URL}/auth/complete-account?intake_id=${INTAKE_ID}&session_id=${SESSION_ID}`}
        appUrl={APP_URL}
      />,
    ),
    expectedHref: `${APP_URL}/auth/complete-account?intake_id=${INTAKE_ID}&session_id=${SESSION_ID}`,
  },
  {
    name: "payment confirmed",
    html: render(
      <PaymentConfirmedEmail
        patientName="Test Patient"
        requestType="Medical Certificate"
        amount="$24.95"
        requestId={INTAKE_ID}
        requestAccessUrl={REQUEST_ACCESS_URL}
        appUrl={APP_URL}
      />,
    ),
    expectedHref: REQUEST_ACCESS_URL,
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
    name: "needs more info",
    html: render(
      <NeedsMoreInfoEmail
        patientName="Test Patient"
        requestType="Medical Certificate"
        requestId={INTAKE_ID}
        requestAccessUrl={REQUEST_ACCESS_URL}
        doctorMessage="Please add one more detail."
        appUrl={APP_URL}
      />,
    ),
    expectedHref: REQUEST_ACCESS_URL,
  },
  {
    name: "still reviewing",
    html: render(
      <StillReviewingEmail
        patientName="Test Patient"
        requestType="Medical Certificate"
        requestId={INTAKE_ID}
        requestAccessUrl={REQUEST_ACCESS_URL}
        appUrl={APP_URL}
      />,
    ),
    expectedHref: REQUEST_ACCESS_URL,
  },
  {
    name: "request declined",
    html: render(
      <RequestDeclinedEmail
        patientName="Test Patient"
        requestType="Medical Certificate"
        requestId={INTAKE_ID}
        requestAccessUrl={REQUEST_ACCESS_URL}
        appUrl={APP_URL}
      />,
    ),
    expectedHref: REQUEST_ACCESS_URL,
  },
  {
    name: "script sent",
    html: render(
      <ScriptSentEmail
        patientName="Test Patient"
        requestId={INTAKE_ID}
        requestAccessUrl={REQUEST_ACCESS_URL}
        appUrl={APP_URL}
      />,
    ),
    expectedHref: REQUEST_ACCESS_URL,
  },
  {
    name: "consult approved",
    html: render(
      <ConsultApprovedEmail
        patientName="Test Patient"
        requestId={INTAKE_ID}
        requestAccessUrl={REQUEST_ACCESS_URL}
        appUrl={APP_URL}
      />,
    ),
    expectedHref: REQUEST_ACCESS_URL,
  },
  {
    name: "refund issued",
    html: render(
      <RefundIssuedEmail
        patientName="Test Patient"
        requestType="Medical Certificate"
        requestId={INTAKE_ID}
        requestAccessUrl={REQUEST_ACCESS_URL}
        appUrl={APP_URL}
      />,
    ),
    expectedHref: REQUEST_ACCESS_URL,
  },
  {
    name: "guest complete account",
    html: render(
      <GuestCompleteAccountEmail
        patientName="Test Patient"
        requestType="Medical Certificate"
        intakeId={INTAKE_ID}
        completeAccountUrl={`${APP_URL}/auth/complete-account?intake_id=${INTAKE_ID}&session_id=${SESSION_ID}`}
        appUrl={APP_URL}
      />,
    ),
    expectedHref: `${APP_URL}/auth/complete-account?intake_id=${INTAKE_ID}&session_id=${SESSION_ID}`,
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
    expectHref(guestHtml, guestUrl)
    expect(guestUrl).toMatch(new RegExp(`^${APP_URL}/track/[A-Za-z0-9_-]+$`))
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

    expect(reconstructSource).toContain("getGuestCertificateAccessHref(cert.intake_id)")
    expect(reconstructSource).not.toContain("getGuestCertificateAccessHref(cert.intake_id, guestEmail)")
    expect(reconstructSource).toContain("getPatientIntakeDetailHref(cert.intake_id)")
    expect(resendSource).toContain("getGuestCertificateAccessHref(intakeId)")
    expect(resendSource).not.toContain("getGuestCertificateAccessHref(intakeId, patient.email)")
    expect(resendSource).toContain("getPatientIntakeDetailHref(intakeId)")
  })

  it("carries exact current Session proof through guest account email sends and retries", () => {
    const completedSource = readFileSync(
      join(process.cwd(), "app/api/stripe/webhook/handlers/checkout-session-completed.ts"),
      "utf8",
    )
    const asyncSucceededSource = readFileSync(
      join(process.cwd(), "app/api/stripe/webhook/handlers/checkout-session-async-payment-succeeded.ts"),
      "utf8",
    )
    const finalizerSource = readFileSync(
      join(process.cwd(), "lib/stripe/confirmed-payment-finalization.ts"),
      "utf8",
    )
    const reconstructSource = readFileSync(
      join(process.cwd(), "lib/email/send/reconstruct.ts"),
      "utf8",
    )

    expect(completedSource).toContain("completeConfirmedPaymentWork")
    expect(asyncSucceededSource).toContain("completeConfirmedPaymentWork")
    expect(finalizerSource).toContain("buildVerifiedCompleteAccountHref")
    expect(finalizerSource).toContain("sessionId: session.id")
    expect(reconstructSource).toContain("payment_id")
    expect(reconstructSource).toContain("sessionId: ctx.intake.payment_id")
  })
})
