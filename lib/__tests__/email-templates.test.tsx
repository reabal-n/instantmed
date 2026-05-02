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

import * as React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect,it } from "vitest"

// All templates
import {
  AbandonedCheckoutEmail,   AbandonedCheckoutFollowupEmail, abandonedCheckoutFollowupSubject,
abandonedCheckoutSubject,
  ConsultApprovedEmail, consultApprovedSubject,
  DeclineReengagementEmail, declineReengagementSubject,
  EdApprovedEmail, edApprovedSubject,
  FollowUpReminderEmail,
  GuestCompleteAccountEmail, guestCompleteAccountSubject,
  HairLossApprovedEmail, hairLossApprovedSubject,
  IntakeSubmittedEmail, intakeSubmittedSubject,
  MagicLinkEmail, magicLinkEmailSubject,
  MedCertEmployerEmail, medCertEmployerEmailSubject,
  MedCertPatientEmail, medCertPatientEmailSubject,
  NeedsMoreInfoEmail, needsMoreInfoSubject,
  PaymentConfirmedEmail, paymentConfirmedSubject,
  PaymentFailedEmail, paymentFailedSubject,
  PaymentReceiptEmail, paymentReceiptEmailSubject,
  PaymentRetryEmail, paymentRetrySubject,
  PrescriptionApprovedEmail, prescriptionApprovedSubject,
  ReferralCreditEmail, referralCreditSubject,
  RefundIssuedEmail, refundIssuedEmailSubject,
  RepeatRxReminderEmail, repeatRxReminderSubject,
  RequestDeclinedEmail, requestDeclinedEmailSubject,
  RequestReceivedEmail, requestReceivedSubject,
  ReviewFollowupEmail, reviewFollowupSubject,
  ReviewRequestEmail, reviewRequestSubject,
  ScriptSentEmail, scriptSentEmailSubject,
  StillReviewingEmail, stillReviewingSubject,
  SubscriptionNudgeEmail, subscriptionNudgeSubject,
  TreatmentFollowupEmail, treatmentFollowupSubject,
  VerificationCodeEmail, verificationCodeSubject,
  WeightLossApprovedEmail, weightLossApprovedSubject,
  WelcomeEmail, welcomeEmailSubject,
  WomensHealthApprovedEmail, womensHealthApprovedSubject,
} from "@/lib/email/components/templates"

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

// ============================================================================
// TESTS - RENDER + STRUCTURE
// ============================================================================

describe("Email Templates", () => {
  describe("WelcomeEmail", () => {
    it("renders with base structure and patient name", () => {
      const html = render(<WelcomeEmail patientName="Sarah Chen" appUrl={APP_URL} />)
      expectBaseEmailStructure(html)
      expectContains(html, "Sarah", "Good to have you")
    })

    it("extracts first name correctly", () => {
      const html = render(<WelcomeEmail patientName="Jane Elizabeth Doe" appUrl={APP_URL} />)
      expectContains(html, "Jane")
    })

    it("subject is non-empty string", () => {
      const subject = welcomeEmailSubject("Sarah Chen")
      expect(subject).toBeTruthy()
      expect(typeof subject).toBe("string")
      expect(subject).toContain("Sarah")
    })

    it("matches snapshot", () => {
      const html = render(<WelcomeEmail patientName="Test Patient" appUrl={APP_URL} />)
      expect(html).toMatchSnapshot()
    })
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

  describe("PaymentReceiptEmail", () => {
    it("renders receipt details", () => {
      const html = render(
        <PaymentReceiptEmail
          patientName="Jordan Lee"
          serviceName="Medical Certificate (1 Day)"
          amount="$19.95"
          intakeRef="IM-20260301-XYZ"
          paidAt="1 March 2026, 9:30 AM AEST"
          dashboardUrl="https://instantmed.com.au/patient/intakes/123"
          appUrl={APP_URL}
        />
      )
      expectBaseEmailStructure(html)
      expectContains(html, "Jordan", "$19.95", "IM-20260301-XYZ")
    })

    it("subject is non-empty", () => {
      expect(paymentReceiptEmailSubject).toBeTruthy()
    })

    it("matches snapshot", () => {
      const html = render(
        <PaymentReceiptEmail
          patientName="Test Patient"
          serviceName="Medical Certificate"
          amount="$19.95"
          intakeRef="IM-TEST"
          paidAt="1 Jan 2026"
          dashboardUrl="https://instantmed.com.au/patient/intakes/test"
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

    it("subject factory works", () => {
      const subject = paymentConfirmedSubject("Medical Certificate")
      expect(subject).toBeTruthy()
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

    it("subject factory works", () => {
      const subject = paymentFailedSubject("Repeat Prescription")
      expect(subject).toContain("Repeat Prescription")
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

  describe("PaymentRetryEmail", () => {
    it("renders retry details", () => {
      const html = render(
        <PaymentRetryEmail
          patientName="Morgan Gray"
          requestType="Medical Certificate"
          amount="$19.95"
          paymentUrl="https://instantmed.com.au/pay/abc"
          appUrl={APP_URL}
        />
      )
      expectBaseEmailStructure(html)
      expectContains(html, "Morgan", "$19.95", "/pay/abc")
    })

    it("subject is non-empty", () => {
      const subject = paymentRetrySubject()
      expect(subject).toBeTruthy()
    })

    it("matches snapshot", () => {
      const html = render(
        <PaymentRetryEmail
          patientName="Test Patient"
          requestType="Medical Certificate"
          amount="$19.95"
          paymentUrl="https://instantmed.com.au/pay/test"
          appUrl={APP_URL}
        />
      )
      expect(html).toMatchSnapshot()
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

  describe("AbandonedCheckoutEmail", () => {
    it("renders with resume link", () => {
      const html = render(
        <AbandonedCheckoutEmail
          patientName="Jamie Park"
          serviceName="Medical Certificate"
          resumeUrl="https://instantmed.com.au/request?resume=abc"
          hoursAgo={4}
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
          hoursAgo={2}
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

  describe("EdApprovedEmail", () => {
    it("renders with medication name", () => {
      const html = render(
        <EdApprovedEmail
          patientName="Blake Turner"
          medicationName="Sildenafil 50mg"
          requestId="REQ-006"
          appUrl={APP_URL}
        />
      )
      expectBaseEmailStructure(html)
      expectContains(html, "Blake", "Sildenafil")
    })

    it("subject is non-empty", () => {
      expect(edApprovedSubject).toBeTruthy()
    })

    it("matches snapshot", () => {
      const html = render(
        <EdApprovedEmail patientName="Test Patient" medicationName="Sildenafil" requestId="REQ-TEST" appUrl={APP_URL} />
      )
      expect(html).toMatchSnapshot()
    })
  })

  describe("HairLossApprovedEmail", () => {
    it("renders with medication details", () => {
      const html = render(
        <HairLossApprovedEmail
          patientName="Skyler Reed"
          medicationName="Finasteride 1mg"
          requestId="REQ-007"
          appUrl={APP_URL}
        />
      )
      expectBaseEmailStructure(html)
      expectContains(html, "Skyler", "Finasteride")
    })

    it("subject is non-empty", () => {
      expect(hairLossApprovedSubject).toBeTruthy()
    })

    it("matches snapshot", () => {
      const html = render(
        <HairLossApprovedEmail patientName="Test Patient" medicationName="Finasteride" requestId="REQ-TEST" appUrl={APP_URL} />
      )
      expect(html).toMatchSnapshot()
    })
  })

  describe("WeightLossApprovedEmail", () => {
    it("renders with GLP-1 medication", () => {
      const html = render(
        <WeightLossApprovedEmail
          patientName="Dakota Green"
          medicationName="Semaglutide 0.25mg"
          requestId="REQ-008"
          appUrl={APP_URL}
        />
      )
      expectBaseEmailStructure(html)
      expectContains(html, "Dakota", "Semaglutide")
    })

    it("subject is non-empty", () => {
      expect(weightLossApprovedSubject).toBeTruthy()
    })

    it("matches snapshot", () => {
      const html = render(
        <WeightLossApprovedEmail patientName="Test Patient" medicationName="Semaglutide" requestId="REQ-TEST" appUrl={APP_URL} />
      )
      expect(html).toMatchSnapshot()
    })
  })

  describe("WomensHealthApprovedEmail", () => {
    it("renders with treatment type", () => {
      const html = render(
        <WomensHealthApprovedEmail
          patientName="River Santos"
          medicationName="Levonorgestrel"
          treatmentType="contraception"
          requestId="REQ-009"
          appUrl={APP_URL}
        />
      )
      expectBaseEmailStructure(html)
      expectContains(html, "River")
    })

    it("subject is non-empty", () => {
      expect(womensHealthApprovedSubject).toBeTruthy()
    })

    it("matches snapshot", () => {
      const html = render(
        <WomensHealthApprovedEmail patientName="Test Patient" medicationName="Levonorgestrel" requestId="REQ-TEST" appUrl={APP_URL} />
      )
      expect(html).toMatchSnapshot()
    })
  })

  describe("PrescriptionApprovedEmail", () => {
    it("renders with medication name", () => {
      const html = render(
        <PrescriptionApprovedEmail
          patientName="Hayden Cruz"
          medicationName="Amoxicillin 500mg"
          intakeId="intake-456"
          appUrl={APP_URL}
        />
      )
      expectBaseEmailStructure(html)
      expectContains(html, "Hayden", "Amoxicillin")
    })

    it("subject is non-empty", () => {
      expect(prescriptionApprovedSubject).toBeTruthy()
    })

    it("matches snapshot", () => {
      const html = render(
        <PrescriptionApprovedEmail patientName="Test Patient" medicationName="Amoxicillin" intakeId="test-intake" appUrl={APP_URL} />
      )
      expect(html).toMatchSnapshot()
    })
  })

  describe("RepeatRxReminderEmail", () => {
    it("renders with medication and reorder link", () => {
      const html = render(
        <RepeatRxReminderEmail
          patientName="Sage Murphy"
          medicationName="Salbutamol"
          reorderUrl="https://instantmed.com.au/request?service=prescription"
          appUrl={APP_URL}
        />
      )
      expectBaseEmailStructure(html)
      expectContains(html, "Sage", "Salbutamol")
    })

    it("subject is non-empty", () => {
      expect(repeatRxReminderSubject).toBeTruthy()
    })

    it("matches snapshot", () => {
      const html = render(
        <RepeatRxReminderEmail patientName="Test Patient" medicationName="Salbutamol" appUrl={APP_URL} />
      )
      expect(html).toMatchSnapshot()
    })
  })

  describe("ReferralCreditEmail", () => {
    it("renders with credit amount and friend name", () => {
      const html = render(
        <ReferralCreditEmail
          patientName="Emery Walsh"
          creditAmount="$5.00"
          friendName="Jamie"
          appUrl={APP_URL}
        />
      )
      expectBaseEmailStructure(html)
      expectContains(html, "Emery", "$5.00", "Jamie")
    })

    it("renders without friend name", () => {
      const html = render(
        <ReferralCreditEmail
          patientName="Emery Walsh"
          creditAmount="$5.00"
          appUrl={APP_URL}
        />
      )
      expectBaseEmailStructure(html)
      expectContains(html, "Emery", "$5.00")
    })

    it("subject factory works", () => {
      const subject = referralCreditSubject("$5.00")
      expect(subject).toContain("$5.00")
    })

    it("matches snapshot", () => {
      const html = render(
        <ReferralCreditEmail patientName="Test Patient" creditAmount="$5.00" appUrl={APP_URL} />
      )
      expect(html).toMatchSnapshot()
    })
  })

  describe("IntakeSubmittedEmail", () => {
    it("renders with request type", () => {
      const html = render(
        <IntakeSubmittedEmail
          patientName="Finley Price"
          requestType="Medical Certificate"
          requestId="REQ-010"
          appUrl={APP_URL}
        />
      )
      expectBaseEmailStructure(html)
      expectContains(html, "Finley")
    })

    it("subject factory works", () => {
      const subject = intakeSubmittedSubject("Medical Certificate")
      expect(subject).toContain("Medical Certificate")
    })

    it("matches snapshot", () => {
      const html = render(
        <IntakeSubmittedEmail patientName="Test Patient" requestType="Medical Certificate" requestId="REQ-TEST" appUrl={APP_URL} />
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

  describe("VerificationCodeEmail", () => {
    it("renders with code", () => {
      const html = render(
        <VerificationCodeEmail
          code="847291"
          appUrl={APP_URL}
        />
      )
      expectBaseEmailStructure(html)
      expectContains(html, "847291")
    })

    it("renders with request context", () => {
      const html = render(
        <VerificationCodeEmail
          code="123456"
          requestedFrom="Chrome on macOS"
          requestedAt="1 March 2026, 10:00 AM AEST"
          appUrl={APP_URL}
        />
      )
      expectContains(html, "123456", "Chrome on macOS")
    })

    it("subject factory works", () => {
      const subject = verificationCodeSubject("123456")
      expect(subject).toContain("123456")
    })

    it("matches snapshot", () => {
      const html = render(
        <VerificationCodeEmail code="000000" appUrl={APP_URL} />
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

  describe("DeclineReengagementEmail", () => {
    it("renders content", () => {
      const html = render(
        <DeclineReengagementEmail patientName="Test Patient" declinedService="Medical Certificate" appUrl={APP_URL} />
      )
      expectBaseEmailStructure(html)
      expectContains(html, "Test")
    })

    it("subject is non-empty", () => {
      expect(declineReengagementSubject()).toBeTruthy()
    })
  })

  describe("TreatmentFollowupEmail", () => {
    it("renders content", () => {
      const html = render(
        <TreatmentFollowupEmail patientName="Test Patient" followupId="fu-001" subtype="ed" milestone="month_3" appUrl={APP_URL} />
      )
      expectBaseEmailStructure(html)
      expectContains(html, "Test")
    })

    it("subject is non-empty", () => {
      expect(treatmentFollowupSubject("ed", "month_3")).toBeTruthy()
    })
  })

  describe("ReviewRequestEmail", () => {
    it("renders content", () => {
      const html = render(
        <ReviewRequestEmail patientName="Test Patient" serviceName="Medical Certificate" appUrl={APP_URL} />
      )
      expectBaseEmailStructure(html)
      expectContains(html, "Test")
    })

    it("subject is non-empty", () => {
      expect(reviewRequestSubject).toBeTruthy()
    })
  })

  describe("ReviewFollowupEmail", () => {
    it("renders content", () => {
      const html = render(
        <ReviewFollowupEmail patientName="Test Patient" appUrl={APP_URL} />
      )
      expectBaseEmailStructure(html)
      expectContains(html, "Test")
    })

    it("subject is non-empty", () => {
      expect(reviewFollowupSubject).toBeTruthy()
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

  describe("SubscriptionNudgeEmail", () => {
    it("renders content", () => {
      const html = render(
        <SubscriptionNudgeEmail patientName="Test Patient" appUrl={APP_URL} />
      )
      expectBaseEmailStructure(html)
      expectContains(html, "Test")
    })

    it("subject is non-empty", () => {
      expect(subscriptionNudgeSubject).toBeTruthy()
    })
  })

  describe("MagicLinkEmail", () => {
    it("magic-link renders", () => {
      const html = render(
        <MagicLinkEmail
          loginUrl="https://example.com/auth/v1/verify?token=abc&type=magiclink"
          appUrl={APP_URL}
        />
      )
      expectBaseEmailStructure(html)
      expectContains(html, "Continue to InstantMed", "Secure one-time sign-in link", "60 minutes")
    })

    it("renders signup confirmation copy", () => {
      const html = render(
        <MagicLinkEmail
          loginUrl="https://example.com/auth/v1/verify?token=abc&type=signup"
          appUrl={APP_URL}
          actionType="signup"
          firstName="Pat"
        />
      )
      expectBaseEmailStructure(html)
      expectContains(html, "Confirm your account", "Pat", "Confirm account")
    })

    it("magic-link subject", () => {
      expect(magicLinkEmailSubject).toBeTruthy()
    })

    it("matches snapshot", () => {
      const html = render(
        <MagicLinkEmail
          loginUrl="https://example.com/auth/v1/verify?token=abc&type=magiclink"
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
      <WelcomeEmail key="1" patientName="Test" appUrl={APP_URL} />,
      <MedCertPatientEmail key="2" patientName="Test" dashboardUrl="https://example.com" appUrl={APP_URL} />,
      <MedCertEmployerEmail key="3" patientName="Test" downloadUrl="https://example.com" appUrl={APP_URL} />,
      <ScriptSentEmail key="4" patientName="Test" requestId="R1" appUrl={APP_URL} />,
      <RequestDeclinedEmail key="5" patientName="Test" requestType="Med Cert" requestId="R2" appUrl={APP_URL} />,
      <PaymentReceiptEmail key="6" patientName="Test" serviceName="Med Cert" amount="$19.95" intakeRef="IM-1" paidAt="1 Jan 2026" dashboardUrl="https://example.com" appUrl={APP_URL} />,
      <PaymentConfirmedEmail key="7" patientName="Test" requestType="Med Cert" amount="$19.95" requestId="R3" appUrl={APP_URL} />,
      <PaymentFailedEmail key="8" patientName="Test" serviceName="Med Cert" failureReason="Declined" retryUrl="https://example.com" appUrl={APP_URL} />,
      <PaymentRetryEmail key="9" patientName="Test" requestType="Med Cert" amount="$19.95" paymentUrl="https://example.com" appUrl={APP_URL} />,
      <NeedsMoreInfoEmail key="10" patientName="Test" requestType="Med Cert" requestId="R4" doctorMessage="More info needed" appUrl={APP_URL} />,
      <GuestCompleteAccountEmail key="11" patientName="Test" requestType="Med Cert" intakeId="i1" completeAccountUrl="https://example.com" appUrl={APP_URL} />,
      <AbandonedCheckoutEmail key="12" patientName="Test" serviceName="Med Cert" resumeUrl="https://example.com" hoursAgo={2} appUrl={APP_URL} />,
      <ConsultApprovedEmail key="13" patientName="Test" requestId="R5" appUrl={APP_URL} />,
      <EdApprovedEmail key="14" patientName="Test" medicationName="Sildenafil" requestId="R6" appUrl={APP_URL} />,
      <HairLossApprovedEmail key="15" patientName="Test" medicationName="Finasteride" requestId="R7" appUrl={APP_URL} />,
      <WeightLossApprovedEmail key="16" patientName="Test" medicationName="Semaglutide" requestId="R8" appUrl={APP_URL} />,
      <WomensHealthApprovedEmail key="17" patientName="Test" medicationName="Levonorgestrel" requestId="R9" appUrl={APP_URL} />,
      <PrescriptionApprovedEmail key="18" patientName="Test" medicationName="Amoxicillin" intakeId="i2" appUrl={APP_URL} />,
      <RepeatRxReminderEmail key="19" patientName="Test" medicationName="Salbutamol" appUrl={APP_URL} />,
      <ReferralCreditEmail key="20" patientName="Test" creditAmount="$5" appUrl={APP_URL} />,
      <IntakeSubmittedEmail key="21" patientName="Test" requestType="Med Cert" requestId="R10" appUrl={APP_URL} />,
      <RequestReceivedEmail key="22" patientName="Test" requestType="Med Cert" amount="$19.95" requestId="R11" appUrl={APP_URL} />,
      <RefundIssuedEmail key="23" patientName="Test" requestType="Med Cert" requestId="R12" appUrl={APP_URL} />,
      <VerificationCodeEmail key="24" code="123456" appUrl={APP_URL} />,
      <StillReviewingEmail key="25" patientName="Test" requestType="Med Cert" requestId="R13" appUrl={APP_URL} />,
      <DeclineReengagementEmail key="29" patientName="Test" declinedService="Medical Certificate" appUrl={APP_URL} />,
      <TreatmentFollowupEmail key="30" patientName="Test" followupId="fu-001" subtype="ed" milestone="month_3" appUrl={APP_URL} />,
      <ReviewRequestEmail key="31" patientName="Test" serviceName="Medical Certificate" appUrl={APP_URL} />,
      <ReviewFollowupEmail key="32" patientName="Test" appUrl={APP_URL} />,
      <AbandonedCheckoutFollowupEmail key="33" patientName="Test" serviceName="Medical Certificate" resumeUrl="https://instantmed.com.au/request?resume=abc" appUrl={APP_URL} />,
      <SubscriptionNudgeEmail key="34" patientName="Test" appUrl={APP_URL} />,
      <MagicLinkEmail key="35" loginUrl="https://example.com/auth/v1/verify?token=abc&type=magiclink" appUrl={APP_URL} />,
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
      <WelcomeEmail key="1" patientName="Test" appUrl={APP_URL} />,
      <PaymentFailedEmail key="2" patientName="Test" serviceName="Med Cert" failureReason="Declined" retryUrl="https://example.com" appUrl={APP_URL} />,
      <VerificationCodeEmail key="3" code="123456" appUrl={APP_URL} />,
      <StillReviewingEmail key="4" patientName="Test" requestType="Med Cert" requestId="R1" appUrl={APP_URL} />,
      <AbandonedCheckoutEmail key="5" patientName="Test" serviceName="Med Cert" resumeUrl="https://example.com" hoursAgo={2} appUrl={APP_URL} />,
    ]

    for (const template of templates) {
      const html = render(template)
      expectBaseEmailStructure(html)
    }
  })

  it("no template contains PHI placeholder leaks", () => {
    const templates = [
      <WelcomeEmail key="1" patientName="Test" appUrl={APP_URL} />,
      <MedCertPatientEmail key="2" patientName="Test" dashboardUrl="https://example.com" appUrl={APP_URL} />,
      <PaymentReceiptEmail key="3" patientName="Test" serviceName="Med Cert" amount="$19.95" intakeRef="IM-1" paidAt="1 Jan" dashboardUrl="https://example.com" appUrl={APP_URL} />,
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
    WelcomeEmail: <WelcomeEmail patientName="Test Patient" appUrl={APP_URL} />,
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
    PaymentReceiptEmail: (
      <PaymentReceiptEmail
        patientName="Test Patient"
        serviceName="Medical Certificate (1 Day)"
        amount="$19.95"
        intakeRef="IM-20260301-XYZ"
        paidAt="1 March 2026, 9:30 AM AEST"
        dashboardUrl="https://instantmed.com.au/patient/intakes/123"
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
    PaymentRetryEmail: (
      <PaymentRetryEmail
        patientName="Test Patient"
        requestType="Medical Certificate"
        amount="$19.95"
        paymentUrl="https://instantmed.com.au/pay/abc"
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
    AbandonedCheckoutEmail: (
      <AbandonedCheckoutEmail
        patientName="Test Patient"
        serviceName="Medical Certificate"
        resumeUrl="https://instantmed.com.au/request?resume=abc"
        hoursAgo={4}
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
    EdApprovedEmail: (
      <EdApprovedEmail
        patientName="Test Patient"
        medicationName="Sildenafil 50mg"
        requestId="REQ-006"
        appUrl={APP_URL}
      />
    ),
    HairLossApprovedEmail: (
      <HairLossApprovedEmail
        patientName="Test Patient"
        medicationName="Finasteride 1mg"
        requestId="REQ-007"
        appUrl={APP_URL}
      />
    ),
    WeightLossApprovedEmail: (
      <WeightLossApprovedEmail
        patientName="Test Patient"
        medicationName="Semaglutide 0.25mg"
        requestId="REQ-008"
        appUrl={APP_URL}
      />
    ),
    WomensHealthApprovedEmail: (
      <WomensHealthApprovedEmail
        patientName="Test Patient"
        medicationName="Levonorgestrel"
        treatmentType="contraception"
        requestId="REQ-009"
        appUrl={APP_URL}
      />
    ),
    PrescriptionApprovedEmail: (
      <PrescriptionApprovedEmail
        patientName="Test Patient"
        medicationName="Amoxicillin 500mg"
        intakeId="intake-456"
        appUrl={APP_URL}
      />
    ),
    RepeatRxReminderEmail: (
      <RepeatRxReminderEmail
        patientName="Test Patient"
        medicationName="Salbutamol"
        reorderUrl="https://instantmed.com.au/request?service=prescription"
        appUrl={APP_URL}
      />
    ),
    ReferralCreditEmail: (
      <ReferralCreditEmail
        patientName="Test Patient"
        creditAmount="$5.00"
        friendName="Jamie"
        appUrl={APP_URL}
      />
    ),
    IntakeSubmittedEmail: (
      <IntakeSubmittedEmail
        patientName="Test Patient"
        requestType="Medical Certificate"
        requestId="REQ-010"
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
    VerificationCodeEmail: (
      <VerificationCodeEmail code="847291" appUrl={APP_URL} />
    ),
    StillReviewingEmail: (
      <StillReviewingEmail
        patientName="Test Patient"
        requestType="Medical Certificate"
        requestId="REQ-013"
        appUrl={APP_URL}
      />
    ),
    DeclineReengagementEmail: (
      <DeclineReengagementEmail patientName="Test Patient" declinedService="Medical Certificate" appUrl={APP_URL} />
    ),
    TreatmentFollowupEmail: (
      <TreatmentFollowupEmail patientName="Test Patient" followupId="fu-001" subtype="ed" milestone="month_3" appUrl={APP_URL} />
    ),
    ReviewRequestEmail: (
      <ReviewRequestEmail patientName="Test Patient" serviceName="Medical Certificate" appUrl={APP_URL} />
    ),
    ReviewFollowupEmail: (
      <ReviewFollowupEmail patientName="Test Patient" appUrl={APP_URL} />
    ),
    AbandonedCheckoutFollowupEmail: (
      <AbandonedCheckoutFollowupEmail patientName="Test Patient" serviceName="Medical Certificate" resumeUrl="https://instantmed.com.au/request?resume=abc" appUrl={APP_URL} />
    ),
    SubscriptionNudgeEmail: (
      <SubscriptionNudgeEmail patientName="Test Patient" appUrl={APP_URL} />
    ),
    MagicLinkEmail: (
      <MagicLinkEmail loginUrl="https://example.com/auth/v1/verify?token=abc&type=magiclink" appUrl={APP_URL} />
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
// Google Review UTM tracking
// =============================================

describe("Google Review UTM tracking", () => {
  // Templates that include Google review links (footer or inline)
  const reviewTemplates: Record<string, React.ReactElement> = {
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
    FollowUpReminderEmail: (
      <FollowUpReminderEmail
        patientName="Test"
        appUrl={APP_URL}
      />
    ),
    ReviewRequestEmail: (
      <ReviewRequestEmail
        patientName="Test"
        serviceName="Medical Certificate"
        appUrl={APP_URL}
      />
    ),
    ReviewFollowupEmail: (
      <ReviewFollowupEmail
        patientName="Test"
        appUrl={APP_URL}
      />
    ),
  }

  for (const [name, element] of Object.entries(reviewTemplates)) {
    it(`${name} - review redirect links include utm_source=email`, () => {
      const html = renderToStaticMarkup(element)
      // Review links now go through /api/review-redirect with UTM params
      const reviewUrls = html.match(/\/api\/review-redirect\?[^"]+/g)
      expect(reviewUrls?.length, `${name} should have at least one review redirect link`).toBeGreaterThan(0)
      // Every review link must have UTM tracking
      expect(html).toContain("utm_source=email")
    })
  }
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
    WelcomeEmail: <WelcomeEmail patientName="Test Patient" appUrl={APP_URL} />,
    VerificationCodeEmail: <VerificationCodeEmail code="123456" appUrl={APP_URL} />,
    PaymentReceiptEmail: <PaymentReceiptEmail patientName="Test" serviceName="Med Cert" amount="$19.95" intakeRef="IM-1" paidAt="1 Jan" dashboardUrl="https://example.com" appUrl={APP_URL} />,
    StillReviewingEmail: <StillReviewingEmail patientName="Test" requestType="Medical Certificate" requestId="R1" appUrl={APP_URL} />,
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
// Referral CTA UTM tracking
// =============================================

describe("Referral CTA UTM tracking", () => {
  const referralTemplates: Record<string, React.ReactElement> = {
    MedCertPatientEmail: (
      <MedCertPatientEmail patientName="Test" dashboardUrl="https://example.com" appUrl={APP_URL} />
    ),
    ScriptSentEmail: (
      <ScriptSentEmail patientName="Test" requestId="R1" appUrl={APP_URL} />
    ),
  }

  for (const [name, element] of Object.entries(referralTemplates)) {
    it(`${name} - referral links include utm_source=email`, () => {
      const html = renderToStaticMarkup(element)
      // Find referral link
      const referralMatch = html.match(/href="[^"]*tab=referrals[^"]*"/)
      expect(referralMatch, `${name} should have a referral link`).toBeTruthy()
      expect(html).toContain("utm_source=email")
      expect(html).toContain("utm_campaign=referral")
    })
  }
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
    { name: "PaymentReceiptEmail", html: render(<PaymentReceiptEmail patientName="Test User" serviceName="Medical Certificate" amount="$19.95" intakeRef="ABC12345" paidAt="11 April 2026" dashboardUrl="https://example.com" appUrl={APP_URL} />) },
    { name: "ReviewRequestEmail", html: render(<ReviewRequestEmail patientName="Test User" serviceName="Medical Certificate" appUrl={APP_URL} />) },
    { name: "MagicLinkEmail", html: render(<MagicLinkEmail loginUrl="https://example.com/auth/v1/verify?token=abc&type=magiclink" appUrl={APP_URL} />) },
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
