import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

import {
  classifyCheckoutFailure,
  sanitizePostHogEvent,
  sanitizePostHogProperties,
} from "@/lib/analytics/posthog-privacy"
import {
  getOpaquePostHogEventId,
  getOpaquePostHogRequestId,
  resolvePersonlessPostHogDistinctId,
} from "@/lib/analytics/posthog-server-privacy"

const root = process.cwd()

function readSource(path: string): string {
  return readFileSync(join(root, path), "utf8")
}

describe("personless PostHog analytics", () => {
  it("redacts capability path segments from automatic URL properties", () => {
    const sanitized = sanitizePostHogProperties({
      $current_url: "https://instantmed.com.au/track/request-token?page=1",
      $initial_current_url: "https://instantmed.com.au/resume/checkout-token",
      url: "https://instantmed.com.au/track/another-token#status",
    })

    expect(sanitized).toMatchObject({
      $current_url: "https://instantmed.com.au/track/[REDACTED]",
      $initial_current_url: "https://instantmed.com.au/resume/[REDACTED]",
      url: "https://instantmed.com.au/track/[REDACTED]",
    })

    const pageleave = sanitizePostHogEvent({
      event: "$pageleave",
      properties: {
        distinct_id: "019f-browser-anonymous-id",
        $current_url: "https://instantmed.com.au/track/request-token",
      },
    })
    expect(pageleave?.properties).toMatchObject({
      $current_url: "https://instantmed.com.au/track/[REDACTED]",
    })
  })

  it("redacts dynamic patient and staff path segments as a final external-analytics defense", () => {
    const sanitized = sanitizePostHogProperties({
      $current_url: "https://instantmed.com.au/patient/intakes/11111111-1111-4111-8111-111111111111?tab=messages",
      url: "https://instantmed.com.au/doctor/patients/22222222-2222-4222-8222-222222222222",
    })

    expect(sanitized).toMatchObject({
      $current_url: "https://instantmed.com.au/patient/[REDACTED]",
      url: "https://instantmed.com.au/doctor/[REDACTED]",
    })
  })

  it("keeps decision-grade funnel and campaign dimensions while dropping identity and raw search data", () => {
    const result = sanitizePostHogProperties({
      service_type: "consult",
      flow_instance_id: "11111111-1111-4111-8111-111111111111",
      service_subtype: "ed",
      step_id: "details",
      amount_cents: 4995,
      campaignid: "1234567890",
      adgroupid: "6789012345",
      creative: "2468013579",
      utm_id: "9876543210",
      matchtype: "e",
      device: "m",
      network: "g",
      utm_source: "google",
      utm_medium: "cpc",
      utm_campaign: "Specialist services",
      has_gclid: true,
      email: "patient@example.com",
      full_name: "Example Patient",
      phone: "0412345678",
      intake_id: "41cb2d50-fc43-4ca2-9ef7-ad69756092a3",
      patient_id: "5eb369e2-2c9f-47ba-a659-251f624c3d84",
      doctor_id: "619c8df1-f4c0-4d9d-a112-94e3e044a2da",
      gclid: "raw-click-id",
      keyword: "sensitive search phrase",
      utm_term: "sensitive search phrase",
      reason: "free text that may contain patient context",
      $set: { email: "patient@example.com" },
      $set_once: { first_payment_at: "2026-07-19T10:00:00Z" },
      $current_url:
        "https://instantmed.com.au/request?service=consult&subtype=ed&email=patient%40example.com#token",
      referrer: "https://www.google.com/search?q=sensitive+health+query",
      nested: {
        email: "patient@example.com",
        safe_count: 2,
      },
    })

    expect(result).toMatchObject({
      service_type: "consult",
      flow_instance_id: "11111111-1111-4111-8111-111111111111",
      service_subtype: "ed",
      step_id: "details",
      amount_cents: 4995,
      campaignid: "1234567890",
      adgroupid: "6789012345",
      creative: "2468013579",
      utm_id: "9876543210",
      matchtype: "e",
      device: "m",
      network: "g",
      utm_source: "google",
      utm_medium: "cpc",
      utm_campaign: "Specialist services",
      has_gclid: true,
      $process_person_profile: false,
      $geoip_disable: true,
      $current_url: "https://instantmed.com.au/request",
      referrer: "https://www.google.com/search",
      nested: { safe_count: 2 },
    })
    expect(result).not.toHaveProperty("email")
    expect(result).not.toHaveProperty("full_name")
    expect(result).not.toHaveProperty("phone")
    expect(result).not.toHaveProperty("intake_id")
    expect(result).not.toHaveProperty("patient_id")
    expect(result).not.toHaveProperty("doctor_id")
    expect(result).not.toHaveProperty("gclid")
    expect(result).not.toHaveProperty("keyword")
    expect(result).not.toHaveProperty("utm_term")
    expect(result).not.toHaveProperty("reason")
    expect(result).not.toHaveProperty("$set")
    expect(result).not.toHaveProperty("$set_once")
    expect(result.nested).not.toHaveProperty("email")
  })

  it("keeps only validated opaque flow ids", () => {
    expect(
      sanitizePostHogProperties({
        flow_instance_id: "11111111-1111-4111-8111-111111111111",
      }),
    ).toMatchObject({
      flow_instance_id: "11111111-1111-4111-8111-111111111111",
    })

    expect(
      sanitizePostHogProperties({
        flow_instance_id: "patient@example.com",
      }),
    ).not.toHaveProperty("flow_instance_id")
  })

  it("rejects captures whose distinct id is a direct identifier", () => {
    expect(
      sanitizePostHogEvent({
        event: "intake_started",
        properties: {
          distinct_id: "patient@example.com",
          service_type: "medical_certificate",
        },
      }),
    ).toBeNull()
  })

  it("preserves an anonymous browser id and removes person mutation payloads", () => {
    const event = sanitizePostHogEvent({
      event: "purchase_completed_server",
      $set: { email: "patient@example.com" },
      $set_once: { name: "Example Patient" },
      properties: {
        distinct_id: "019f-browser-anonymous-id",
        service_category: "consult",
        amount_cents: 4995,
        $set: { email: "patient@example.com" },
      },
    })

    expect(event).toEqual({
      event: "purchase_completed_server",
      properties: {
        distinct_id: "019f-browser-anonymous-id",
        service_category: "consult",
        amount_cents: 4995,
        $process_person_profile: false,
        $geoip_disable: true,
      },
    })
  })

  it("uses the browser anonymous id when available and an opaque request id otherwise", () => {
    const requestId = "41cb2d50-fc43-4ca2-9ef7-ad69756092a3"

    expect(
      resolvePersonlessPostHogDistinctId({
        anonymousId: "019f-browser-anonymous-id",
        requestId,
      }),
    ).toBe("019f-browser-anonymous-id")

    const fallback = resolvePersonlessPostHogDistinctId({
      anonymousId: "patient@example.com",
      requestId,
    })
    expect(fallback).toBe(getOpaquePostHogRequestId(requestId))
    expect(fallback).toMatch(/^ph_req_[a-f0-9]{32}$/)
    expect(fallback).not.toContain(requestId)

    const insertId = getOpaquePostHogEventId("purchase_completed_server", requestId)
    expect(insertId).toMatch(/^ph_evt_[a-f0-9]{40}$/)
    expect(insertId).not.toContain(requestId)
  })

  it("keeps controlled checkout-failure categories instead of raw error text", () => {
    expect(classifyCheckoutFailure("Phone number is required for prescription requests."))
      .toBe("validation")
    expect(classifyCheckoutFailure("Too many checkout attempts. Please wait a moment."))
      .toBe("rate_limit")
    expect(classifyCheckoutFailure("Unable to determine pricing. Please contact support."))
      .toBe("pricing_or_configuration")
    expect(classifyCheckoutFailure("Payment system error. Please try again."))
      .toBe("payment_provider")
    expect(classifyCheckoutFailure("Unexpected internal detail"))
      .toBe("unknown")

    const reviewStep = readSource("components/request/steps/review-step.tsx")
    expect(reviewStep).toContain("failure_category: classifyCheckoutFailure(result.error)")
    expect(reviewStep).not.toContain("reason: result.error")
  })

  it("keeps Google enhanced conversions while removing PostHog identify and alias calls", () => {
    const patientDetails = readSource("components/request/steps/patient-details-step.tsx")
    const provider = readSource("components/providers/posthog-provider.tsx")
    const finalizer = readSource("lib/stripe/confirmed-payment-finalization.ts")
    const aiReferral = readSource("lib/analytics/ai-referral.ts")
    const instrumentation = readSource("instrumentation-client.ts")

    expect(patientDetails).toContain("setEnhancedConversionsData({ email, phone, firstName, lastName })")
    expect(patientDetails).not.toContain("posthog?.identify(")
    expect(provider).not.toContain("posthog.identify(")
    expect(finalizer).not.toContain("posthog.alias(")
    expect(aiReferral).not.toContain("setPersonPropertiesForFlags")

    expect(finalizer).toContain("runGoogleAdsPostPaymentAttribution")
    expect(finalizer).toContain("ph_distinct_id")
    expect(instrumentation).toContain("disable_session_recording: true")
    expect(instrumentation).toContain("autocapture: false")
    expect(instrumentation).toContain("capture_heatmaps: false")
    expect(instrumentation).toContain("posthog.reset()")
    expect(instrumentation).not.toContain("startSessionRecording")
  })

  it("keeps the public disclosure specific without promising an unverified retention maximum", () => {
    const privacyPage = readSource("app/privacy/page.tsx")

    expect(privacyPage).toContain("Pseudonymous product analytics processed in the")
    expect(privacyPage).toContain("random browser identifier")
    expect(privacyPage).toContain("generic element autocapture and session recordings")
    expect(privacyPage).toContain("deleted")
    expect(privacyPage).toContain("or aggregated when no longer required")
    expect(privacyPage).not.toContain("anonymised usage data")
    expect(privacyPage).not.toContain("retained indefinitely")
    expect(privacyPage).not.toContain("up to 2 years")
  })
})
