/**
 * Exit Intent Nurture Sequence Tests
 *
 * Tests for:
 * 1. Email template rendering (social proof + last chance)
 * 2. Exit-intent token generation and verification
 * 3. Subject line generation
 * 4. Unsubscribe and open tracking URL generation
 */

import { describe, it, expect, vi, beforeEach } from "vitest"
import * as React from "react"
import { renderToStaticMarkup } from "react-dom/server"

import {
  ExitIntentSocialProofEmail,
  exitIntentSocialProofSubject,
} from "@/components/email/templates/exit-intent-social-proof"
import {
  ExitIntentLastChanceEmail,
  exitIntentLastChanceSubject,
} from "@/components/email/templates/exit-intent-last-chance"
import {
  signExitIntentToken,
  verifyExitIntentToken,
} from "@/lib/crypto/exit-intent-token"

// ============================================================================
// HELPERS
// ============================================================================

const APP_URL = "https://instantmed.com.au"

function render(element: React.ReactElement): string {
  return renderToStaticMarkup(element)
}

function expectBaseEmailStructure(html: string) {
  expect(html).toContain("logo.png")
  expect(html).toContain("InstantMed Pty Ltd")
  expect(html).toContain("/privacy")
  expect(html).toContain("/terms")
  expect(html).toContain("Made with care in Australia")
}

// ============================================================================
// EMAIL TEMPLATE TESTS
// ============================================================================

describe("Exit Intent Email Templates", () => {
  describe("ExitIntentSocialProofEmail", () => {
    it("renders with base structure and social proof stats", () => {
      const html = render(
        <ExitIntentSocialProofEmail
          service="Medical Certificate"
          price="$19.95"
          ctaUrl={`${APP_URL}/request?service=med-cert`}
          appUrl={APP_URL}
        />
      )
      expectBaseEmailStructure(html)
      expect(html).toContain("Medical Certificate")
      expect(html).toContain("$19.95")
      expect(html).toContain("97%")
      expect(html).toContain("32 minutes")
      expect(html).toContain("AHPRA-registered")
      expect(html).toContain("/request?service=med-cert")
    })

    it("renders unsubscribe link when provided", () => {
      const html = render(
        <ExitIntentSocialProofEmail
          service="Medical Certificate"
          price="$19.95"
          ctaUrl={`${APP_URL}/request?service=med-cert`}
          appUrl={APP_URL}
          unsubscribeUrl={`${APP_URL}/api/exit-intent/unsubscribe?token=abc123`}
        />
      )
      expect(html).toContain("/api/exit-intent/unsubscribe?token=abc123")
      expect(html).toContain("Unsubscribe from these reminders")
    })

    it("renders open tracking pixel when provided", () => {
      const html = render(
        <ExitIntentSocialProofEmail
          service="Medical Certificate"
          price="$19.95"
          ctaUrl={`${APP_URL}/request?service=med-cert`}
          appUrl={APP_URL}
          openTrackingUrl={`${APP_URL}/api/exit-intent/open?t=xyz&r=2`}
        />
      )
      expect(html).toContain("/api/exit-intent/open?t=xyz&amp;r=2")
      expect(html).toContain('width="1"')
      expect(html).toContain('height="1"')
    })

    it("omits unsubscribe and pixel when not provided", () => {
      const html = render(
        <ExitIntentSocialProofEmail
          service="Medical Certificate"
          price="$19.95"
          ctaUrl={`${APP_URL}/request?service=med-cert`}
          appUrl={APP_URL}
        />
      )
      expect(html).not.toContain("Unsubscribe from these reminders")
      expect(html).not.toContain("/api/exit-intent/open")
    })

    it("subject is a non-empty string", () => {
      const subject = exitIntentSocialProofSubject()
      expect(subject).toBeTruthy()
      expect(typeof subject).toBe("string")
      expect(subject).toContain("97%")
    })
  })

  describe("ExitIntentLastChanceEmail", () => {
    it("renders with base structure and service details", () => {
      const html = render(
        <ExitIntentLastChanceEmail
          service="Repeat Prescription"
          price="$29.95"
          ctaUrl={`${APP_URL}/request?service=prescription`}
          appUrl={APP_URL}
        />
      )
      expectBaseEmailStructure(html)
      expect(html).toContain("Repeat Prescription")
      expect(html).toContain("$29.95")
      expect(html).toContain("Start your request")
      expect(html).toContain("last email in this series")
    })

    it("renders unsubscribe link when provided", () => {
      const html = render(
        <ExitIntentLastChanceEmail
          service="GP Consult"
          price="$49.95"
          ctaUrl={`${APP_URL}/request?service=consult`}
          appUrl={APP_URL}
          unsubscribeUrl={`${APP_URL}/api/exit-intent/unsubscribe?token=def456`}
        />
      )
      expect(html).toContain("/api/exit-intent/unsubscribe?token=def456")
    })

    it("renders open tracking pixel when provided", () => {
      const html = render(
        <ExitIntentLastChanceEmail
          service="GP Consult"
          price="$49.95"
          ctaUrl={`${APP_URL}/request?service=consult`}
          appUrl={APP_URL}
          openTrackingUrl={`${APP_URL}/api/exit-intent/open?t=xyz&r=3`}
        />
      )
      expect(html).toContain("/api/exit-intent/open?t=xyz&amp;r=3")
    })

    it("subject includes service name", () => {
      expect(exitIntentLastChanceSubject("Medical Certificate")).toContain("medical certificate")
      expect(exitIntentLastChanceSubject("Repeat Prescription")).toContain("repeat prescription")
    })
  })
})

// ============================================================================
// TOKEN TESTS
// ============================================================================

describe("Exit Intent Tokens", () => {
  beforeEach(() => {
    vi.stubEnv("INTERNAL_API_SECRET", "test-secret-for-exit-intent-tokens-minimum-length")
  })

  describe("signExitIntentToken + verifyExitIntentToken", () => {
    it("signs and verifies an unsubscribe token", () => {
      const captureId = "550e8400-e29b-41d4-a716-446655440000"
      const token = signExitIntentToken(captureId, "unsubscribe")
      const result = verifyExitIntentToken(token)

      expect(result).not.toBeNull()
      expect(result!.captureId).toBe(captureId)
      expect(result!.action).toBe("unsubscribe")
    })

    it("signs and verifies an open token", () => {
      const captureId = "660e8400-e29b-41d4-a716-446655440000"
      const token = signExitIntentToken(captureId, "open")
      const result = verifyExitIntentToken(token)

      expect(result).not.toBeNull()
      expect(result!.captureId).toBe(captureId)
      expect(result!.action).toBe("open")
    })

    it("rejects tampered tokens", () => {
      const token = signExitIntentToken("valid-id", "unsubscribe")
      const tamperedToken = token.slice(0, -2) + "XX"
      expect(verifyExitIntentToken(tamperedToken)).toBeNull()
    })

    it("rejects invalid base64", () => {
      expect(verifyExitIntentToken("not-a-valid-token")).toBeNull()
    })

    it("rejects empty string", () => {
      expect(verifyExitIntentToken("")).toBeNull()
    })

    it("rejects token with wrong number of parts", () => {
      const malformed = Buffer.from("only.two").toString("base64url")
      expect(verifyExitIntentToken(malformed)).toBeNull()
    })

    it("rejects token with invalid action", () => {
      // Manually craft a token with invalid action
      const malformed = Buffer.from("id.invalid_action.12345.fakehash").toString("base64url")
      expect(verifyExitIntentToken(malformed)).toBeNull()
    })
  })
})
