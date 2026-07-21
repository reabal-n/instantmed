/**
 * Email Template Tests
 *
 * Renders every email template to HTML and validates:
 * 1. No render errors (component renders without throwing)
 * 2. Contains expected content (patient names, links, etc.)
 * 3. Uses BaseEmail wrapper (consistent header/footer/branding)
 * 4. Subject line exports produce non-empty strings
 * 5. Snapshot stability (catches unintentional visual regressions)
 */

import { existsSync, readdirSync,readFileSync } from "node:fs"
import { join } from "node:path"

import * as React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

// All templates
import {
  AbandonedCheckoutEmail,
  AbandonedCheckoutFollowupEmail,
  abandonedCheckoutFollowupSubject,
  abandonedCheckoutSubject,
  ConsultApprovedEmail,
  consultApprovedSubject,
  DisputeAlertEmail,
  disputeAlertSubject,
  GuestCompleteAccountEmail,
  guestCompleteAccountSubject,
  MagicLinkEmail,
  magicLinkEmailSubject,
  MedCertEmployerEmail,
  medCertEmployerEmailSubject,
  MedCertPatientEmail,
  medCertPatientEmailSubject,
  NeedsMoreInfoEmail,
  needsMoreInfoSubject,
  PartialIntakeRecoveryEmail,
  partialIntakeRecoverySubject,
  PaymentConfirmedEmail,
  PaymentFailedEmail,
  paymentFailedSubject,
  RefundIssuedEmail,
  refundIssuedEmailSubject,
  RequestDeclinedEmail,
  requestDeclinedEmailSubject,
  RequestReceivedEmail,
  requestReceivedSubject,
  ReviewRequestEmail,
  reviewRequestSubject,
  ScriptSentEmail,
  scriptSentEmailSubject,
  SessionExpiredEmail,
  sessionExpiredSubject,
  StillReviewingEmail,
  stillReviewingSubject,
} from "@/lib/email/components/templates"
import { CertReactivationEmail } from "@/lib/email/components/templates/cert-reactivation"
import { HeardAboutUsAskEmail } from "@/lib/email/components/templates/heard-about-us-ask"
import { RefillReminderEmail } from "@/lib/email/components/templates/refill-reminder"
import { htmlToPlainText } from "@/lib/email/utils"

// ============================================================================
// HELPERS
// ============================================================================

const APP_URL = "https://instantmed.com.au"

function render(element: React.ReactElement): string {
  return renderToStaticMarkup(element)
}

/** Checks that HTML includes BaseEmail markers: logo, footer, privacy link */
function expectBaseEmailStructure(html: string) {
  expect(html).toContain("logo.png")
  expect(html).toContain("InstantMed Pty Ltd")
  expect(html).toContain("/privacy")
  expect(html).toContain("/terms")
  expect(html).toContain("Made with care in Australia")
}

/** Checks that content contains patient-facing personalization */
function expectContains(html: string, ...substrings: string[]) {
  for (const s of substrings) {
    expect(html).toContain(s)
  }
}

function contrastRatio(foreground: string, background: string): number {
  const luminance = (hex: string) => {
    const channels = hex
      .replace("#", "")
      .match(/.{2}/g)!
      .map((channel) => Number.parseInt(channel, 16) / 255)
      .map((channel) => (
        channel <= 0.04045
          ? channel / 12.92
          : ((channel + 0.055) / 1.055) ** 2.4
      ))

    return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2]
  }

  const foregroundLuminance = luminance(foreground)
  const backgroundLuminance = luminance(background)
  return (
    Math.max(foregroundLuminance, backgroundLuminance) + 0.05
  ) / (
    Math.min(foregroundLuminance, backgroundLuminance) + 0.05
  )
}

// ============================================================================
// TESTS - RENDER + STRUCTURE
// ============================================================================

describe("Email Templates", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-04-11T00:00:00+10:00"))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe("MedCertPatientEmail", () => {
    it("renders with dashboard link", () => {
      const html = render(
        <MedCertPatientEmail
          patientName="Alex Johnson"
          dashboardUrl="https://instantmed.com.au/patient/intakes/123"
          appUrl={APP_URL}
        />
      )
      expectBaseEmailStructure(html)
      expectContains(html, "Alex", "certificate is ready", "/patient/intakes/123")
      expect(html).not.toContain("/dl/abc123")
    })

    it("renders without download link (falls back to dashboard)", () => {
      const html = render(
        <MedCertPatientEmail
          patientName="Alex Johnson"
          dashboardUrl="https://instantmed.com.au/patient/intakes/123"
          appUrl={APP_URL}
        />
      )
      expectContains(html, "/patient/intakes/123")
    })

    it("renders verification code when provided", () => {
      const html = render(
        <MedCertPatientEmail
          patientName="Alex Johnson"
          dashboardUrl="https://instantmed.com.au/patient/intakes/123"
          verificationCode="ABC-1234"
          appUrl={APP_URL}
        />
      )
      expectContains(html, "ABC-1234")
    })

    it("subject is non-empty", () => {
      expect(medCertPatientEmailSubject).toBeTruthy()
    })

    it("matches snapshot", () => {
      const html = render(
        <MedCertPatientEmail
          patientName="Test Patient"
          dashboardUrl="https://instantmed.com.au/patient/intakes/test"
          appUrl={APP_URL}
        />
      )
      expect(html).toMatchSnapshot()
    })
  })

  describe("MedCertEmployerEmail", () => {
    it("renders with employer details", () => {
      const html = render(
        <MedCertEmployerEmail
          employerName="Jane Manager"
          companyName="Acme Corp"
          patientName="Alex Johnson"
          downloadUrl="https://instantmed.com.au/dl/emp-abc123"
          appUrl={APP_URL}
        />
      )
      expectBaseEmailStructure(html)
      expectContains(html, "Alex Johnson", "/dl/emp-abc123")
    })

    it("renders with verification code and dates", () => {
      const html = render(
        <MedCertEmployerEmail
          patientName="Alex Johnson"
          downloadUrl="https://instantmed.com.au/dl/emp-abc123"
          verificationCode="XYZ-9876"
          certStartDate="1 March 2026"
          certEndDate="3 March 2026"
          appUrl={APP_URL}
        />
      )
      expectContains(html, "XYZ-9876", "1 March 2026", "3 March 2026")
    })

    it("subject is non-empty", () => {
      expect(medCertEmployerEmailSubject).toBeTruthy()
    })

    it("matches snapshot", () => {
      const html = render(
        <MedCertEmployerEmail
          patientName="Test Patient"
          downloadUrl="https://instantmed.com.au/dl/test"
          appUrl={APP_URL}
        />
      )
      expect(html).toMatchSnapshot()
    })
  })

  describe("ScriptSentEmail", () => {
    it("renders with eScript reference", () => {
      const html = render(
        <ScriptSentEmail
          patientName="Sam Wilson"
          requestId="REQ-001"
          escriptReference="ESCRIPT-ABC123"
          appUrl={APP_URL}
        />
      )
      expectBaseEmailStructure(html)
      expectContains(html, "Sam", "ESCRIPT-ABC123")
    })

    it("renders without eScript reference", () => {
      const html = render(
        <ScriptSentEmail
          patientName="Sam Wilson"
          requestId="REQ-001"
          appUrl={APP_URL}
        />
      )
      expectBaseEmailStructure(html)
      expectContains(html, "Sam")
    })

    it("subject is non-empty", () => {
      expect(scriptSentEmailSubject).toBeTruthy()
    })

    it("matches snapshot", () => {
      const html = render(
        <ScriptSentEmail patientName="Test Patient" requestId="REQ-TEST" appUrl={APP_URL} />
      )
      expect(html).toMatchSnapshot()
    })
  })

  describe("RequestDeclinedEmail", () => {
    it("renders with decline reason", () => {
      const html = render(
        <RequestDeclinedEmail
          patientName="Taylor Brown"
          requestType="Medical Certificate"
          requestId="REQ-002"
          reason="Insufficient clinical information"
          appUrl={APP_URL}
        />
      )
      expectBaseEmailStructure(html)
      expectContains(html, "Taylor", "Insufficient clinical information")
    })

    it("renders without reason", () => {
      const html = render(
        <RequestDeclinedEmail
          patientName="Taylor Brown"
          requestType="Medical Certificate"
          requestId="REQ-002"
          appUrl={APP_URL}
        />
      )
      expectBaseEmailStructure(html)
      expectContains(html, "Taylor")
    })

    it("subject factory produces string", () => {
      const subject = requestDeclinedEmailSubject("Medical Certificate")
      expect(subject).toBeTruthy()
      expect(subject).toContain("Medical Certificate")
    })

    it("matches snapshot", () => {
      const html = render(
        <RequestDeclinedEmail
          patientName="Test Patient"
          requestType="Medical Certificate"
          requestId="REQ-TEST"
          appUrl={APP_URL}
        />
      )
      expect(html).toMatchSnapshot()
    })
  })

  describe("PaymentConfirmedEmail", () => {
    it("renders payment confirmation", () => {
      const html = render(
        <PaymentConfirmedEmail
          patientName="Casey Hart"
          requestType="Medical Certificate"
          amount="$19.95"
          requestId="REQ-003"
          appUrl={APP_URL}
        />
      )
      expectBaseEmailStructure(html)
      expectContains(html, "Casey", "$19.95")
    })

    it("matches snapshot", () => {
      const html = render(
        <PaymentConfirmedEmail
          patientName="Test Patient"
          requestType="Medical Certificate"
          amount="$19.95"
          requestId="REQ-TEST"
          appUrl={APP_URL}
        />
      )
      expect(html).toMatchSnapshot()
    })
  })

  describe("PaymentFailedEmail", () => {
    it("renders with failure reason and retry link", () => {
      const html = render(
        <PaymentFailedEmail
          patientName="Riley Adams"
          serviceName="Repeat Prescription"
          failureReason="Card declined"
          retryUrl="https://instantmed.com.au/retry/xyz"
          appUrl={APP_URL}
        />
      )
      expectBaseEmailStructure(html)
      expectContains(html, "Riley", "Card declined", "/retry/xyz")
    })

    it("subject is service-free (no condition leak on lock screens)", () => {
      const subject = paymentFailedSubject()
      expect(subject).toContain("hiccup with your payment")
      expect(subject.toLowerCase()).not.toContain("prescription")
      expect(subject.toLowerCase()).not.toContain("consultation")
    })

    it("matches snapshot", () => {
      const html = render(
        <PaymentFailedEmail
          patientName="Test Patient"
          serviceName="Medical Certificate"
          failureReason="Insufficient funds"
          retryUrl="https://instantmed.com.au/retry/test"
          appUrl={APP_URL}
        />
      )
      expect(html).toMatchSnapshot()
    })
  })

  describe("SessionExpiredEmail", () => {
    it("renders an honest fresh-request recovery path", () => {
      const html = render(
        <SessionExpiredEmail
          patientName="Riley Adams"
          serviceName="Repeat Prescription"
          startUrl="https://instantmed.com.au/request?service=repeat-script"
          appUrl={APP_URL}
        />
      )
      expectBaseEmailStructure(html)
      expectContains(
        html,
        "Riley",
        "No payment was taken",
        "Start a new request",
        "service=repeat-script",
      )
      expect(html).not.toContain("Your request is saved")
      expect(html).not.toContain("Return to payment")
    })

    it("uses a service-free subject", () => {
      const subject = sessionExpiredSubject()
      expect(subject).toBe("Your payment window expired")
      expect(subject.toLowerCase()).not.toContain("prescription")
      expect(subject.toLowerCase()).not.toContain("consultation")
    })
  })

  describe("DisputeAlertEmail", () => {
    it("renders the operational dispute details and Stripe link", () => {
      const html = render(
        <DisputeAlertEmail
          disputeId="dp_test_123"
          chargeId="ch_test_123"
          intakeId="intake-test"
          amount="AUD 29.95"
          reason="fraudulent"
          evidenceDueBy="18 July 2026"
          stripeDashboardUrl="https://dashboard.stripe.com/disputes/dp_test_123"
          appUrl={APP_URL}
        />
      )
      expectBaseEmailStructure(html)
      expectContains(
        html,
        "dp_test_123",
        "AUD 29.95",
        "fraudulent",
        "18 July 2026",
        "Open dispute in Stripe",
      )
    })

    it("uses an urgent operational subject", () => {
      expect(disputeAlertSubject()).toBe("Urgent: Stripe dispute requires review")
    })
  })

  describe("NeedsMoreInfoEmail", () => {
    it("renders doctor message", () => {
      const html = render(
        <NeedsMoreInfoEmail
          patientName="Avery Clark"
          requestType="Prescription"
          requestId="REQ-004"
          doctorMessage="Please provide more details about your symptoms."
          appUrl={APP_URL}
        />
      )
      expectBaseEmailStructure(html)
      expectContains(html, "Avery", "provide more details")
    })

    it("subject factory works", () => {
      const subject = needsMoreInfoSubject("Prescription")
      expect(subject).toContain("Prescription")
    })

    it("matches snapshot", () => {
      const html = render(
        <NeedsMoreInfoEmail
          patientName="Test Patient"
          requestType="Medical Certificate"
          requestId="REQ-TEST"
          doctorMessage="Need more info."
          appUrl={APP_URL}
        />
      )
      expect(html).toMatchSnapshot()
    })
  })

  describe("GuestCompleteAccountEmail", () => {
    it("renders account completion link", () => {
      const html = render(
        <GuestCompleteAccountEmail
          patientName="Drew Kim"
          requestType="Medical Certificate"
          intakeId="intake-123"
          completeAccountUrl="https://instantmed.com.au/auth/complete-account?intake_id=intake-123"
          appUrl={APP_URL}
        />
      )
      expectBaseEmailStructure(html)
      expectContains(html, "Drew", "complete-account")
    })

    it("subject factory works", () => {
      const subject = guestCompleteAccountSubject("Medical Certificate")
      expect(subject).toBeTruthy()
    })

    it("matches snapshot", () => {
      const html = render(
        <GuestCompleteAccountEmail
          patientName="Test Patient"
          requestType="Medical Certificate"
          intakeId="test-intake"
          completeAccountUrl="https://instantmed.com.au/auth/complete-account?intake_id=test"
          appUrl={APP_URL}
        />
      )
      expect(html).toMatchSnapshot()
    })
  })

  describe("PartialIntakeRecoveryEmail", () => {
    it("renders with resume link", () => {
      const html = render(
        <PartialIntakeRecoveryEmail
          firstName="Jamie"
          serviceName="Medical Certificate"
          resumeUrl="https://instantmed.com.au/request?service=med-cert&d=abc"
          appUrl={APP_URL}
        />
      )
      expectBaseEmailStructure(html)
      expectContains(html, "Jamie", "Continue your request", "service=med-cert", "A doctor reviews your request")
    })

    it("subject factory works", () => {
      expect(partialIntakeRecoverySubject("Medical Certificate")).toBe("Your request is still saved")
    })

    it("matches snapshot", () => {
      const html = render(
        <PartialIntakeRecoveryEmail
          firstName="Test"
          serviceName="Medical Certificate"
          resumeUrl="https://instantmed.com.au/request?service=med-cert&d=test"
          appUrl={APP_URL}
        />
      )
      expect(html).toMatchSnapshot()
    })
  })

  describe("AbandonedCheckoutEmail", () => {
    it("renders with resume link", () => {
      const html = render(
        <AbandonedCheckoutEmail
          patientName="Jamie Park"
          serviceName="Medical Certificate"
          resumeUrl="https://instantmed.com.au/request?resume=abc"
          startedAgoLabel="about 4 hours ago"
          appUrl={APP_URL}
        />
      )
      expectBaseEmailStructure(html)
      expectContains(html, "Jamie", "resume=abc")
    })

    it("subject factory works", () => {
      const subject = abandonedCheckoutSubject("Medical Certificate")
      expect(subject).toBeTruthy()
    })

    it("matches snapshot", () => {
      const html = render(
        <AbandonedCheckoutEmail
          patientName="Test Patient"
          serviceName="Medical Certificate"
          resumeUrl="https://instantmed.com.au/request?resume=test"
          startedAgoLabel="about 2 hours ago"
          appUrl={APP_URL}
        />
      )
      expect(html).toMatchSnapshot()
    })
  })

  describe("ConsultApprovedEmail", () => {
    it("renders with doctor notes", () => {
      const html = render(
        <ConsultApprovedEmail
          patientName="Quinn Nguyen"
          requestId="REQ-005"
          doctorNotes="Recommend follow-up in 2 weeks."
          appUrl={APP_URL}
        />
      )
      expectBaseEmailStructure(html)
      expectContains(html, "Quinn", "follow-up in 2 weeks")
    })

    it("renders without doctor notes", () => {
      const html = render(
        <ConsultApprovedEmail
          patientName="Quinn Nguyen"
          requestId="REQ-005"
          appUrl={APP_URL}
        />
      )
      expectBaseEmailStructure(html)
    })

    it("subject is non-empty", () => {
      expect(consultApprovedSubject).toBeTruthy()
    })

    it("matches snapshot", () => {
      const html = render(
        <ConsultApprovedEmail patientName="Test Patient" requestId="REQ-TEST" appUrl={APP_URL} />
      )
      expect(html).toMatchSnapshot()
    })
  })

  describe("RequestReceivedEmail", () => {
    it("renders for authenticated user", () => {
      const html = render(
        <RequestReceivedEmail
          patientName="Rowan Ellis"
          requestType="Medical Certificate"
          amount="$19.95"
          requestId="REQ-011"
          appUrl={APP_URL}
        />
      )
      expectBaseEmailStructure(html)
      expectContains(html, "Rowan", "$19.95")
    })

    it("renders for guest user", () => {
      const html = render(
        <RequestReceivedEmail
          patientName="Rowan Ellis"
          requestType="Medical Certificate"
          amount="$19.95"
          requestId="REQ-011"
          isGuest={true}
          completeAccountUrl={`${APP_URL}/auth/complete-account?intake_id=REQ-011&session_id=cs_test`}
          appUrl={APP_URL}
        />
      )
      expectBaseEmailStructure(html)
      expectContains(html, "Rowan")
    })

    it("subject factory works", () => {
      const subject = requestReceivedSubject("Medical Certificate")
      expect(subject).toBeTruthy()
    })

    it("matches snapshot", () => {
      const html = render(
        <RequestReceivedEmail
          patientName="Test Patient"
          requestType="Medical Certificate"
          amount="$19.95"
          requestId="REQ-TEST"
          paidAt="21 April 2026"
          appUrl={APP_URL}
        />
      )
      expect(html).toMatchSnapshot()
    })
  })

  describe("RefundIssuedEmail", () => {
    it("renders with amount", () => {
      const html = render(
        <RefundIssuedEmail
          patientName="Parker Stone"
          requestType="Medical Certificate"
          requestId="REQ-012"
          amountFormatted="$19.95"
          appUrl={APP_URL}
        />
      )
      expectBaseEmailStructure(html)
      expectContains(html, "Parker", "$19.95")
    })

    it("renders without amount", () => {
      const html = render(
        <RefundIssuedEmail
          patientName="Parker Stone"
          requestType="Medical Certificate"
          requestId="REQ-012"
          appUrl={APP_URL}
        />
      )
      expectBaseEmailStructure(html)
    })

    it("subject is non-empty", () => {
      expect(refundIssuedEmailSubject).toBeTruthy()
    })

    it("matches snapshot", () => {
      const html = render(
        <RefundIssuedEmail patientName="Test Patient" requestType="Medical Certificate" requestId="REQ-TEST" appUrl={APP_URL} />
      )
      expect(html).toMatchSnapshot()
    })
  })

  describe("StillReviewingEmail", () => {
    it("renders reassurance message", () => {
      const html = render(
        <StillReviewingEmail
          patientName="Phoenix Ray"
          requestType="Medical Certificate"
          requestId="REQ-013"
          appUrl={APP_URL}
        />
      )
      expectBaseEmailStructure(html)
      expectContains(html, "Phoenix")
    })

    it("subject is non-empty", () => {
      expect(stillReviewingSubject).toBeTruthy()
    })

    it("matches snapshot", () => {
      const html = render(
        <StillReviewingEmail patientName="Test Patient" requestType="Medical Certificate" requestId="REQ-TEST" appUrl={APP_URL} />
      )
      expect(html).toMatchSnapshot()
    })
  })

  describe("ReviewRequestEmail", () => {
    it("renders the approved neutral ask with accessible structure", () => {
      const html = render(
        <ReviewRequestEmail patientName="Sarah Parker" appUrl={APP_URL} />
      )

      expectBaseEmailStructure(html)
      expect(reviewRequestSubject).toBe("How did InstantMed go?")
      expectContains(
        html,
        "Sarah,",
        "How did InstantMed go?",
        "Hope everything went smoothly. If you have a minute, would you mind sharing how InstantMed felt to use? Honest feedback is useful, good or bad.",
        "A sentence or two is plenty. ProductReview has its own sign-in step, so allow about a minute. Please leave out personal or medical details: reviews are public.",
        "Share an honest review",
        "No pressure. This is the only review email we&#x27;ll send for this request.",
      )
      expect(html.match(/<h1\b/g)).toHaveLength(1)
      expect(html).toContain("font-size:16px")
      expect(html).toContain("min-height:48px")
      expect(html.match(/\/api\/review-redirect\?/g)).toHaveLength(1)
      expect(html).not.toContain("Medical Certificate")
      expect(html).not.toContain("★★★★★")
      expect(html.toLowerCase()).not.toContain("quick favour")
      expect(html.toLowerCase()).not.toContain("means the world")
    })

    // 131 sends produced 2 reviews. The ask was never the problem; the
    // destination asks for an account after the review is written and rejects
    // very short ones, so effort already spent is what gets lost. These three
    // expectations are the fix, and dropping any one of them silently restores
    // the surprise that caused the abandonment.
    it("sets expectations for the off-site review wall before the click", () => {
      const html = render(
        <ReviewRequestEmail patientName="Sarah Parker" appUrl={APP_URL} />
      )

      expect(html).toContain("A sentence or two is plenty")
      expect(html).toContain("its own sign-in step")
      expect(html).toContain("allow about a minute")
      // The expectation-setting must arrive before the button, or it is advice
      // the patient reads only after they have already committed.
      expect(html.indexOf("its own sign-in step")).toBeLessThan(
        html.indexOf("Share an honest review"),
      )
    })

    it("keeps the ask neutral rather than steering to positive reviews", () => {
      const html = render(
        <ReviewRequestEmail patientName="Sarah Parker" appUrl={APP_URL} />
      ).toLowerCase()

      // Review-gating (soliciting only happy customers) breaches ACCC guidance
      // and ProductReview's own terms. "good or bad" is the neutrality anchor.
      expect(html).toContain("good or bad")
      for (const steer of [
        "if you were happy",
        "if you had a good",
        "5-star",
        "five star",
        "positive review",
      ]) {
        expect(html).not.toContain(steer)
      }
    })

    it("produces a readable plain-text alternative with the review URL", () => {
      const html = render(
        <ReviewRequestEmail patientName="Sarah Parker" appUrl={APP_URL} />
      )
      const text = htmlToPlainText(html)

      expect(text).toContain("Sarah,")
      expect(text).toContain("Hope everything went smoothly.")
      expect(text).toContain("Please leave out personal or medical details: reviews are public.")
      expect(text).toContain("its own sign-in step")
      expect(text).toContain("Share an honest review (https://instantmed.com.au/api/review-redirect?")
      expect(text).toContain("No pressure. This is the only review email we'll send for this request.")
      expect(text).not.toContain("\u200c")
    })

    it("uses AA contrast tokens in light and dark mode", () => {
      const html = render(
        <ReviewRequestEmail patientName="Sarah Parker" appUrl={APP_URL} />
      )

      expect(contrastRatio("#475569", "#FFFFFF")).toBeGreaterThanOrEqual(4.5)
      expect(contrastRatio("#FFFFFF", "#2563EB")).toBeGreaterThanOrEqual(4.5)
      expect(contrastRatio("#5F6F85", "#F8F7F4")).toBeGreaterThanOrEqual(4.5)
      expect(html).toContain("background-color:#2563EB")
      expect(html).toContain("color:#5F6F85")
    })
  })

  describe("AbandonedCheckoutFollowupEmail", () => {
    it("renders content", () => {
      const html = render(
        <AbandonedCheckoutFollowupEmail patientName="Test Patient" serviceName="Medical Certificate" resumeUrl="https://instantmed.com.au/request?resume=abc" appUrl={APP_URL} />
      )
      expectBaseEmailStructure(html)
      expectContains(html, "Test")
    })

    it("subject is non-empty", () => {
      expect(abandonedCheckoutFollowupSubject("Medical Certificate")).toBeTruthy()
    })
  })

  describe("MagicLinkEmail", () => {
    it("magic-link renders", () => {
      const html = render(
        <MagicLinkEmail
          loginUrl="https://example.com/auth/confirm#token_hash=abc&type=magiclink"
          appUrl={APP_URL}
        />
      )
      expectBaseEmailStructure(html)
      expectContains(html, "Your sign-in link is ready", "No password. No waiting room.", "Open InstantMed", "60 minutes")
      expectContains(html, "If this link has expired", "Button playing up?", "No stress.")
      expect(html).not.toContain("Faster than your GP")
      expectContains(html, "Copy this secure link", "https://example.com/auth/confirm#token_hash=abc&amp;type=magiclink")
      expect(html).not.toContain("{{ .ConfirmationURL }}")
      expect(html).not.toContain("Confirm your signup")
    })

    it("renders signup confirmation copy", () => {
      const html = render(
        <MagicLinkEmail
          loginUrl="https://example.com/auth/confirm#token_hash=abc&type=signup"
          appUrl={APP_URL}
          actionType="signup"
          firstName="Pat"
        />
      )
      expectBaseEmailStructure(html)
      expectContains(html, "Confirm your InstantMed account", "Pat", "Confirm account")
    })

    it("renders email-change copy for the current-address approval", () => {
      const html = render(
        <MagicLinkEmail
          loginUrl="https://instantmed.com.au/auth/confirm#token_hash=abc&type=email_change"
          appUrl={APP_URL}
          actionType="email_change"
          emailChangeAudience="current"
        />
      )

      expectContains(html, "Approve this email change", "Approve change")
      expect(html).not.toContain("current@example.com")
      expect(html).not.toContain("new@example.com")
    })

    it("renders reauthentication as a code without a one-time link", () => {
      const html = render(
        <MagicLinkEmail
          appUrl={APP_URL}
          actionType="reauthentication"
          verificationCode="654321"
        />
      )

      expectContains(html, "Verify your identity", "654321", "verification code")
      expect(html).not.toContain("Copy this secure link")
      expect(html).not.toContain("/auth/v1/verify")
    })

    it("magic-link subject", () => {
      expect(magicLinkEmailSubject).toBe("Your InstantMed sign-in link is ready")
    })

    it("matches snapshot", () => {
      const html = render(
        <MagicLinkEmail
          loginUrl="https://example.com/auth/confirm#token_hash=abc&type=magiclink"
          appUrl={APP_URL}
        />
      )
      expect(html).toMatchSnapshot()
    })
  })
})

// ============================================================================
// CROSS-TEMPLATE VALIDATION
// ============================================================================

describe("Email Template Cross-Checks", () => {
  it("all templates produce valid HTML (no unclosed tags)", () => {
    const templates = [
      <MedCertPatientEmail key="2" patientName="Test" dashboardUrl="https://example.com" appUrl={APP_URL} />,
      <MedCertEmployerEmail key="3" patientName="Test" downloadUrl="https://example.com" appUrl={APP_URL} />,
      <ScriptSentEmail key="4" patientName="Test" requestId="R1" appUrl={APP_URL} />,
      <RequestDeclinedEmail key="5" patientName="Test" requestType="Med Cert" requestId="R2" appUrl={APP_URL} />,
      <PaymentConfirmedEmail key="7" patientName="Test" requestType="Med Cert" amount="$19.95" requestId="R3" appUrl={APP_URL} />,
      <PaymentFailedEmail key="8" patientName="Test" serviceName="Med Cert" failureReason="Declined" retryUrl="https://example.com" appUrl={APP_URL} />,
      <SessionExpiredEmail key="9" patientName="Test" serviceName="Med Cert" startUrl="https://example.com" appUrl={APP_URL} />,
      <DisputeAlertEmail key="9b" disputeId="dp_test" chargeId="ch_test" amount="AUD 29.95" reason="fraudulent" stripeDashboardUrl="https://dashboard.stripe.com/disputes/dp_test" appUrl={APP_URL} />,
      <NeedsMoreInfoEmail key="10" patientName="Test" requestType="Med Cert" requestId="R4" doctorMessage="More info needed" appUrl={APP_URL} />,
      <GuestCompleteAccountEmail key="11" patientName="Test" requestType="Med Cert" intakeId="i1" completeAccountUrl="https://example.com" appUrl={APP_URL} />,
      <PartialIntakeRecoveryEmail key="12" firstName="Test" serviceName="Med Cert" resumeUrl="https://example.com" appUrl={APP_URL} />,
      <AbandonedCheckoutEmail key="12b" patientName="Test" serviceName="Med Cert" resumeUrl="https://example.com" startedAgoLabel="about 2 hours ago" appUrl={APP_URL} />,
      <ConsultApprovedEmail key="13" patientName="Test" requestId="R5" appUrl={APP_URL} />,
      <RequestReceivedEmail key="22" patientName="Test" requestType="Med Cert" amount="$19.95" requestId="R11" appUrl={APP_URL} />,
      <RefundIssuedEmail key="23" patientName="Test" requestType="Med Cert" requestId="R12" appUrl={APP_URL} />,
      <StillReviewingEmail key="25" patientName="Test" requestType="Med Cert" requestId="R13" appUrl={APP_URL} />,
      <ReviewRequestEmail key="31" patientName="Test" appUrl={APP_URL} />,
      <AbandonedCheckoutFollowupEmail key="33" patientName="Test" serviceName="Medical Certificate" resumeUrl="https://instantmed.com.au/request?resume=abc" appUrl={APP_URL} />,
      <MagicLinkEmail key="35" loginUrl="https://example.com/auth/confirm#token_hash=abc&type=magiclink" appUrl={APP_URL} />,
    ]

    for (const template of templates) {
      const html = render(template)
      // Must start with <html (with optional lang attr) and end with </html>
      expect(html).toMatch(/^<html[\s>]/)
      expect(html).toMatch(/<\/html>$/)
      // Must have body
      expect(html).toContain("<body")
      expect(html).toContain("</body>")
    }
  })

  it("all templates include BaseEmail branding elements", () => {
    const templates = [
      <PaymentFailedEmail key="2" patientName="Test" serviceName="Med Cert" failureReason="Declined" retryUrl="https://example.com" appUrl={APP_URL} />,
      <SessionExpiredEmail key="3" patientName="Test" serviceName="Med Cert" startUrl="https://example.com" appUrl={APP_URL} />,
      <DisputeAlertEmail key="3b" disputeId="dp_test" chargeId="ch_test" amount="AUD 29.95" reason="fraudulent" stripeDashboardUrl="https://dashboard.stripe.com/disputes/dp_test" appUrl={APP_URL} />,
      <StillReviewingEmail key="4" patientName="Test" requestType="Med Cert" requestId="R1" appUrl={APP_URL} />,
      <PartialIntakeRecoveryEmail key="5" firstName="Test" serviceName="Med Cert" resumeUrl="https://example.com" appUrl={APP_URL} />,
      <AbandonedCheckoutEmail key="6" patientName="Test" serviceName="Med Cert" resumeUrl="https://example.com" startedAgoLabel="about 2 hours ago" appUrl={APP_URL} />,
    ]

    for (const template of templates) {
      const html = render(template)
      expectBaseEmailStructure(html)
    }
  })

  it("no template contains PHI placeholder leaks", () => {
    const templates = [
      <MedCertPatientEmail key="2" patientName="Test" dashboardUrl="https://example.com" appUrl={APP_URL} />,
    ]

    for (const template of templates) {
      const html = render(template)
      // Should not contain template tag syntax (merge tags from DB templates)
      expect(html).not.toMatch(/\{\{[a-z_]+\}\}/)
      // Should not contain undefined or null as visible text
      expect(html).not.toContain(">undefined<")
      expect(html).not.toContain(">null<")
    }
  })
})

// ============================================================================
// LINK VALIDATION
// ============================================================================

describe("Link validation", () => {
  /**
   * Registry of all templates with mock data. Iterating over this ensures
   * every template is covered automatically - adding a new template here
   * is the only step needed to include it in link checks.
   */
  const templateRegistry: Record<string, React.ReactElement> = {
    MedCertPatientEmail: (
      <MedCertPatientEmail
        patientName="Test Patient"
        dashboardUrl="https://instantmed.com.au/patient/intakes/123"
        verificationCode="ABC-1234"
        appUrl={APP_URL}
      />
    ),
    MedCertEmployerEmail: (
      <MedCertEmployerEmail
        patientName="Test Patient"
        employerName="Jane Manager"
        companyName="Acme Corp"
        downloadUrl="https://instantmed.com.au/dl/emp-abc123"
        verificationCode="XYZ-9876"
        certStartDate="1 March 2026"
        certEndDate="3 March 2026"
        appUrl={APP_URL}
      />
    ),
    ScriptSentEmail: (
      <ScriptSentEmail
        patientName="Test Patient"
        requestId="REQ-001"
        escriptReference="ESCRIPT-ABC123"
        appUrl={APP_URL}
      />
    ),
    RequestDeclinedEmail: (
      <RequestDeclinedEmail
        patientName="Test Patient"
        requestType="Medical Certificate"
        requestId="REQ-002"
        reason="Insufficient clinical information"
        appUrl={APP_URL}
      />
    ),
    PaymentConfirmedEmail: (
      <PaymentConfirmedEmail
        patientName="Test Patient"
        requestType="Medical Certificate"
        amount="$19.95"
        requestId="REQ-003"
        appUrl={APP_URL}
      />
    ),
    PaymentFailedEmail: (
      <PaymentFailedEmail
        patientName="Test Patient"
        serviceName="Repeat Prescription"
        failureReason="Card declined"
        retryUrl="https://instantmed.com.au/retry/xyz"
        appUrl={APP_URL}
      />
    ),
    SessionExpiredEmail: (
      <SessionExpiredEmail
        patientName="Test Patient"
        serviceName="Repeat Prescription"
        startUrl="https://instantmed.com.au/request?service=repeat-script"
        appUrl={APP_URL}
      />
    ),
    DisputeAlertEmail: (
      <DisputeAlertEmail
        disputeId="dp_test"
        chargeId="ch_test"
        amount="AUD 29.95"
        reason="fraudulent"
        stripeDashboardUrl="https://dashboard.stripe.com/disputes/dp_test"
        appUrl={APP_URL}
      />
    ),
    NeedsMoreInfoEmail: (
      <NeedsMoreInfoEmail
        patientName="Test Patient"
        requestType="Prescription"
        requestId="REQ-004"
        doctorMessage="Please provide more details about your symptoms."
        appUrl={APP_URL}
      />
    ),
    GuestCompleteAccountEmail: (
      <GuestCompleteAccountEmail
        patientName="Test Patient"
        requestType="Medical Certificate"
        intakeId="intake-123"
        completeAccountUrl="https://instantmed.com.au/auth/complete-account?intake_id=intake-123"
        appUrl={APP_URL}
      />
    ),
    PartialIntakeRecoveryEmail: (
      <PartialIntakeRecoveryEmail
        firstName="Test"
        serviceName="Medical Certificate"
        resumeUrl="https://instantmed.com.au/request?service=med-cert&d=abc"
        appUrl={APP_URL}
      />
    ),
    AbandonedCheckoutEmail: (
      <AbandonedCheckoutEmail
        patientName="Test Patient"
        serviceName="Medical Certificate"
        resumeUrl="https://instantmed.com.au/request?resume=abc"
        startedAgoLabel="about 4 hours ago"
        appUrl={APP_URL}
      />
    ),
    ConsultApprovedEmail: (
      <ConsultApprovedEmail
        patientName="Test Patient"
        requestId="REQ-005"
        doctorNotes="Recommend follow-up in 2 weeks."
        appUrl={APP_URL}
      />
    ),
    RequestReceivedEmail: (
      <RequestReceivedEmail
        patientName="Test Patient"
        requestType="Medical Certificate"
        amount="$19.95"
        requestId="REQ-011"
        appUrl={APP_URL}
      />
    ),
    RefundIssuedEmail: (
      <RefundIssuedEmail
        patientName="Test Patient"
        requestType="Medical Certificate"
        requestId="REQ-012"
        amountFormatted="$19.95"
        appUrl={APP_URL}
      />
    ),
    StillReviewingEmail: (
      <StillReviewingEmail
        patientName="Test Patient"
        requestType="Medical Certificate"
        requestId="REQ-013"
        appUrl={APP_URL}
      />
    ),
    ReviewRequestEmail: (
      <ReviewRequestEmail patientName="Test Patient" appUrl={APP_URL} />
    ),
    AbandonedCheckoutFollowupEmail: (
      <AbandonedCheckoutFollowupEmail patientName="Test Patient" serviceName="Medical Certificate" resumeUrl="https://instantmed.com.au/request?resume=abc" appUrl={APP_URL} />
    ),
    MagicLinkEmail: (
      <MagicLinkEmail loginUrl="https://example.com/auth/confirm#token_hash=abc&type=magiclink" appUrl={APP_URL} />
    ),
  }

  /** Extract all href values from rendered HTML */
  function extractHrefs(html: string): string[] {
    const hrefRegex = /href="([^"]*)"/g
    const hrefs: string[] = []
    let match: RegExpExecArray | null
    while ((match = hrefRegex.exec(html)) !== null) {
      hrefs.push(match[1])
    }
    return hrefs
  }

  for (const [templateName, element] of Object.entries(templateRegistry)) {
    describe(templateName, () => {
      const html = render(element)
      const hrefs = extractHrefs(html)

      it("contains at least one link", () => {
        expect(hrefs.length).toBeGreaterThan(0)
      })

      it("has no empty href values", () => {
        for (const href of hrefs) {
          expect(href.trim()).not.toBe("")
        }
      })

      it("has no href containing 'undefined'", () => {
        for (const href of hrefs) {
          expect(href).not.toContain("undefined")
        }
      })

      it("has no href containing 'null'", () => {
        for (const href of hrefs) {
          expect(href).not.toContain("null")
        }
      })

      it("all hrefs start with http://, https://, mailto:, or are known placeholders", () => {
        const ALLOWED_PATTERNS = /^(https?:\/\/|mailto:|__UNSUBSCRIBE_URL__|#$)/
        for (const href of hrefs) {
          expect(href).toMatch(ALLOWED_PATTERNS)
        }
      })

      it("has no broken template interpolation in hrefs", () => {
        for (const href of hrefs) {
          expect(href).not.toContain("${")
        }
      })
    })
  }
})

// =============================================
// Review request ownership
// =============================================

describe("Review request ownership", () => {
  it("keeps the review redirect in ReviewRequestEmail only", () => {
    const templates: Record<string, React.ReactElement> = {
      MedCertPatientEmail: (
        <MedCertPatientEmail
          patientName="Test"
          dashboardUrl="https://instantmed.com.au/patient/intakes/123"
          verificationCode="ABC-1234"
          appUrl={APP_URL}
        />
      ),
      ScriptSentEmail: (
        <ScriptSentEmail
          patientName="Test"
          requestId="REQ-001"
          escriptReference="ES-001"
          appUrl={APP_URL}
        />
      ),
      ConsultApprovedEmail: (
        <ConsultApprovedEmail
          patientName="Test"
          requestId="REQ-002"
          appUrl={APP_URL}
        />
      ),
      ReviewRequestEmail: (
        <ReviewRequestEmail
          patientName="Test"
          appUrl={APP_URL}
        />
      ),
    }

    for (const [name, element] of Object.entries(templates)) {
      const html = renderToStaticMarkup(element)
      const reviewUrls = html.match(/\/api\/review-redirect\?/g) ?? []

      expect(reviewUrls, name).toHaveLength(name === "ReviewRequestEmail" ? 1 : 0)
    }

    const reviewHtml = renderToStaticMarkup(templates.ReviewRequestEmail)
    expect(reviewHtml).toContain("utm_source=email")
    expect(reviewHtml).toContain("utm_medium=review_request")
    expect(reviewHtml).toContain("utm_campaign=review")
  })

  it("falls back from a placeholder appUrl before rendering review links", () => {
    const html = renderToStaticMarkup(
      <ReviewRequestEmail patientName="Test" appUrl="https://example.com" />,
    )

    expect(html).toContain("/api/review-redirect")
    expect(html).not.toContain("https://example.com")
  })
})

// =============================================
// Preheader length validation
// =============================================

describe("Preheader length validation", () => {
  // Render all templates and check that previewText (preheader) stays ≤80 chars
  // This prevents email clients from appending body text to the subject line
  const allTemplates: Record<string, React.ReactElement> = {
    MedCertPatientEmail: <MedCertPatientEmail patientName="Test" dashboardUrl="https://example.com" appUrl={APP_URL} />,
    ScriptSentEmail: <ScriptSentEmail patientName="Test" requestId="R1" appUrl={APP_URL} />,
    ConsultApprovedEmail: <ConsultApprovedEmail patientName="Test" requestId="R1" appUrl={APP_URL} />,
    RequestDeclinedEmail: <RequestDeclinedEmail patientName="Test" requestType="Medical Certificate" requestId="R1" appUrl={APP_URL} />,
    StillReviewingEmail: <StillReviewingEmail patientName="Test" requestType="Medical Certificate" requestId="R1" appUrl={APP_URL} />,
    SessionExpiredEmail: <SessionExpiredEmail patientName="Test" serviceName="Medical Certificate" startUrl="https://instantmed.com.au/request?service=med-cert" appUrl={APP_URL} />,
    DisputeAlertEmail: <DisputeAlertEmail disputeId="dp_test" chargeId="ch_test" amount="AUD 29.95" reason="fraudulent" stripeDashboardUrl="https://dashboard.stripe.com/disputes/dp_test" appUrl={APP_URL} />,
  }

  for (const [name, element] of Object.entries(allTemplates)) {
    it(`${name} preheader is ≤80 chars`, () => {
      const html = renderToStaticMarkup(element)
      // Extract preheader: hidden div content before the first visible table
      const preheaderMatch = html.match(/display:none[^>]*>([^<]+)</)
      if (preheaderMatch) {
        // Strip the invisible padding characters
        const preheader = preheaderMatch[1].replace(/[\u00A0\u200C]/g, "").trim()
        expect(preheader.length).toBeLessThanOrEqual(80)
      }
    })
  }
})

// =============================================
// Patient-email content ownership
// =============================================

describe("Patient-email content ownership", () => {
  const patientTemplates: Record<string, React.ReactElement> = {
    MedCertPatientEmail: (
      <MedCertPatientEmail
        patientName="Test Patient"
        dashboardUrl="https://instantmed.com.au/patient/intakes/123"
        appUrl={APP_URL}
      />
    ),
    ScriptSentEmail: (
      <ScriptSentEmail patientName="Test Patient" requestId="REQ-001" appUrl={APP_URL} />
    ),
    RequestDeclinedEmail: (
      <RequestDeclinedEmail
        patientName="Test Patient"
        requestType="Medical Certificate"
        requestId="REQ-002"
        appUrl={APP_URL}
      />
    ),
    PaymentConfirmedEmail: (
      <PaymentConfirmedEmail
        patientName="Test Patient"
        requestType="Medical Certificate"
        amount="$24.95"
        requestId="REQ-003"
        appUrl={APP_URL}
      />
    ),
    PaymentFailedEmail: (
      <PaymentFailedEmail
        patientName="Test Patient"
        serviceName="Medical Certificate"
        failureReason="Card declined"
        retryUrl="https://instantmed.com.au/retry/123"
        appUrl={APP_URL}
      />
    ),
    SessionExpiredEmail: (
      <SessionExpiredEmail
        patientName="Test Patient"
        serviceName="Medical Certificate"
        startUrl="https://instantmed.com.au/request?service=med-cert"
        appUrl={APP_URL}
      />
    ),
    NeedsMoreInfoEmail: (
      <NeedsMoreInfoEmail
        patientName="Test Patient"
        requestType="Medical Certificate"
        requestId="REQ-004"
        doctorMessage="Please add the requested details."
        appUrl={APP_URL}
      />
    ),
    GuestCompleteAccountEmail: (
      <GuestCompleteAccountEmail
        patientName="Test Patient"
        requestType="Medical Certificate"
        intakeId="intake-123"
        completeAccountUrl="https://instantmed.com.au/auth/complete-account?intake_id=intake-123"
        appUrl={APP_URL}
      />
    ),
    PartialIntakeRecoveryEmail: (
      <PartialIntakeRecoveryEmail
        firstName="Test"
        serviceName="Medical Certificate"
        resumeUrl="https://instantmed.com.au/request?service=med-cert&d=opaque"
        appUrl={APP_URL}
      />
    ),
    AbandonedCheckoutEmail: (
      <AbandonedCheckoutEmail
        patientName="Test Patient"
        serviceName="Medical Certificate"
        resumeUrl="https://instantmed.com.au/request?resume=opaque"
        startedAgoLabel="about 20 minutes ago"
        appUrl={APP_URL}
      />
    ),
    ConsultApprovedEmail: (
      <ConsultApprovedEmail patientName="Test Patient" requestId="REQ-005" appUrl={APP_URL} />
    ),
    RequestReceivedEmail: (
      <RequestReceivedEmail
        patientName="Test Patient"
        requestType="Medical Certificate"
        amount="$24.95"
        requestId="REQ-006"
        appUrl={APP_URL}
      />
    ),
    RefundIssuedEmail: (
      <RefundIssuedEmail
        patientName="Test Patient"
        requestType="Medical Certificate"
        requestId="REQ-007"
        appUrl={APP_URL}
      />
    ),
    StillReviewingEmail: (
      <StillReviewingEmail
        patientName="Test Patient"
        requestType="Medical Certificate"
        requestId="REQ-008"
        appUrl={APP_URL}
      />
    ),
    ReviewRequestEmail: (
      <ReviewRequestEmail patientName="Test Patient" appUrl={APP_URL} />
    ),
    AbandonedCheckoutFollowupEmail: (
      <AbandonedCheckoutFollowupEmail
        patientName="Test Patient"
        serviceName="Medical Certificate"
        resumeUrl="https://instantmed.com.au/request?resume=opaque"
        appUrl={APP_URL}
      />
    ),
    MagicLinkEmail: (
      <MagicLinkEmail
        loginUrl="https://instantmed.com.au/auth/confirm#token_hash=opaque&type=magiclink"
        appUrl={APP_URL}
      />
    ),
    CertReactivationEmail: (
      <CertReactivationEmail
        patientName="Test Patient"
        requestUrl="https://instantmed.com.au/request?service=med-cert"
        appUrl={APP_URL}
      />
    ),
    RefillReminderEmail: (
      <RefillReminderEmail
        patientName="Test Patient"
        medicationName="Example medicine"
        reorderUrl="https://instantmed.com.au/request?service=repeat-script"
        appUrl={APP_URL}
      />
    ),
    HeardAboutUsAskEmail: (
      <HeardAboutUsAskEmail
        patientName="Test Patient"
        heardToken="opaque"
        appUrl={APP_URL}
      />
    ),
  }

  it("renders every patient email without referral copy, stars, or banned review phrases", () => {
    const bannedReferralFragments = [
      "tab=referrals",
      "utm_campaign=referral",
      "refer a friend",
      "referral credit",
      "$5 off",
      "give $5",
      "get $5",
    ]

    for (const [name, element] of Object.entries(patientTemplates)) {
      const html = renderToStaticMarkup(element)
      const lowerHtml = html.toLowerCase()

      expectBaseEmailStructure(html)
      for (const fragment of bannedReferralFragments) {
        expect(lowerHtml, `${name} contains ${fragment}`).not.toContain(fragment)
      }
      expect(html, `${name} contains a star row`).not.toMatch(/[★☆]/)
      expect(lowerHtml, `${name} contains quick favour`).not.toContain("quick favour")
      expect(lowerHtml, `${name} contains means the world`).not.toContain("means the world")

      const reviewLinks = html.match(/\/api\/review-redirect\?/g) ?? []
      expect(reviewLinks, `${name} review CTA ownership`).toHaveLength(
        name === "ReviewRequestEmail" ? 1 : 0,
      )
    }
  })

  it("keeps clinical outcome emails purely transactional", () => {
    const outcomeEmails = [
      patientTemplates.MedCertPatientEmail,
      patientTemplates.ScriptSentEmail,
      patientTemplates.ConsultApprovedEmail,
    ]

    for (const email of outcomeEmails) {
      const html = renderToStaticMarkup(email)
      expect(html).not.toContain("/api/review-redirect")
      expect(html).not.toContain("/api/heard-about-us")
      expect(html.toLowerCase()).not.toContain("how did you hear")
      expect(html.toLowerCase()).not.toContain("referral")
    }
  })

  it("uses BaseEmail as the only shell and keeps the retired referral block deleted", () => {
    const templatesDirectory = join(process.cwd(), "lib/email/components/templates")
    const templateFiles = readdirSync(templatesDirectory)
      .filter((file) => file.endsWith(".tsx"))

    for (const file of templateFiles) {
      const source = readFileSync(join(templatesDirectory, file), "utf8")
      expect(source, `${file} must use BaseEmail`).toContain("<BaseEmail")
      expect(source, `${file} must not own an HTML shell`).not.toMatch(/<html[\s>]/i)
    }

    expect(
      existsSync(join(process.cwd(), "lib/email/components/review-cta.tsx")),
    ).toBe(false)
  })
})

// =============================================
// From-domain alignment
// =============================================

describe("From-domain alignment", () => {
  it("RESEND_FROM_EMAIL domain matches NEXT_PUBLIC_APP_URL domain", () => {
    // In prod, emails must be sent from the same domain as the app
    // to pass SPF/DKIM alignment checks. This catches misconfigurations.
    // Use production defaults - test env has localhost which is irrelevant.
    const appUrl = "https://instantmed.com.au"
    const fromEmail = process.env.RESEND_FROM_EMAIL || "InstantMed <support@instantmed.com.au>"

    const appDomain = new URL(appUrl).hostname.replace(/^www\./, "")
    const fromDomain = fromEmail.match(/@([^>]+)/)?.[1] || ""

    expect(fromDomain).toBe(appDomain)
  })
})

// ============================================================================
// FONT-FAMILY REGRESSION - Ensures no heading renders without inline font-family
// ============================================================================

describe("font-family regression", () => {
  const templatesToCheck = [
    { name: "MedCertPatientEmail", html: render(<MedCertPatientEmail patientName="Test User" dashboardUrl="https://example.com" appUrl={APP_URL} />) },
    { name: "RequestReceivedEmail", html: render(<RequestReceivedEmail patientName="Test User" requestType="Medical Certificate" amount="$19.95" requestId="abc12345" appUrl={APP_URL} />) },
    { name: "ReviewRequestEmail", html: render(<ReviewRequestEmail patientName="Test User" appUrl={APP_URL} />) },
    { name: "MagicLinkEmail", html: render(<MagicLinkEmail loginUrl="https://example.com/auth/confirm#token_hash=abc&type=magiclink" appUrl={APP_URL} />) },
  ]

  for (const { name, html } of templatesToCheck) {
    it(`${name} headings have inline font-family`, () => {
      const headingRegex = /<h[1-3][^>]*style="([^"]*)"[^>]*>/g
      let match
      while ((match = headingRegex.exec(html)) !== null) {
        const styleAttr = match[1]
        expect(styleAttr).toContain("font-family")
      }
    })
  }
})
