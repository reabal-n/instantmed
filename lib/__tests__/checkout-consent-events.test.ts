import { describe, expect, it } from "vitest"

import { createCheckoutConsentTracker } from "@/lib/analytics/checkout-consent-events"
import { sanitizePostHogEvent } from "@/lib/analytics/posthog-privacy"

const flow = "11111111-1111-4111-8111-111111111111"

describe("anonymous checkout consent tracking", () => {
  it("records one visibility event per review visit and real state transitions", () => {
    const events: { event: string; properties: Record<string, unknown> }[] = []
    const tracker = createCheckoutConsentTracker({ capture: (event, properties = {}) => events.push({ event, properties }) }, flow, "med-cert")
    tracker.state(false)
    tracker.state(false)
    tracker.reviewClicked()
    tracker.viewed()
    tracker.viewed()
    tracker.state(true)
    tracker.state(false)
    expect(events.map(({ event }) => event)).toEqual([
      "checkout_consent_state", "checkout_review_confirm_clicked", "checkout_consent_viewed",
      "checkout_consent_state", "checkout_consent_state",
    ])
    expect(events.filter(({ event }) => event === "checkout_consent_state").map(({ properties }) => [properties.consent_checked, properties.state_source])).toEqual([
      [false, "initial"], [true, "change"], [false, "change"],
    ])
    expect(events.every(({ properties }) => properties.flow_instance_id === flow)).toBe(true)
    expect(Object.keys(events[0].properties).sort()).toEqual(["consent_checked", "flow_instance_id", "service_type", "state_source", "telemetry_version"])
    expect(sanitizePostHogEvent(events[0])?.properties).toMatchObject({
      flow_instance_id: flow, consent_checked: false, state_source: "initial",
      telemetry_version: "checkout-consent-v1", $process_person_profile: false,
    })
  })

  it("does not copy arbitrary service text or invalid identifiers into analytics", () => {
    const events: Record<string, unknown>[] = []
    const client = { capture: (_event: string, properties: Record<string, unknown> = {}) => events.push(properties) }
    createCheckoutConsentTracker(client, "patient@example.com", "med-cert").viewed()
    createCheckoutConsentTracker(client, flow, "patient-entered clinical text").viewed()
    expect(events).toEqual([])
  })

  it("captures restored checked state and never blocks checkout when analytics throws", () => {
    const events: Record<string, unknown>[] = []
    const tracker = createCheckoutConsentTracker({ capture: (_event, properties = {}) => events.push(properties) }, flow, "repeat-script")
    tracker.state(true)
    expect(events[0]).toMatchObject({ consent_checked: true, state_source: "initial", service_type: "prescription" })
    const broken = createCheckoutConsentTracker({ capture: () => { throw new Error("SDK unavailable") } }, flow, "med-cert")
    expect(() => { broken.state(false); broken.viewed(); broken.reviewClicked() }).not.toThrow()
    expect(() => createCheckoutConsentTracker(null, flow, "med-cert").viewed()).not.toThrow()
  })
})
