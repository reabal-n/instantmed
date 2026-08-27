import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

const root = process.cwd()

function source(path: string): string {
  return readFileSync(join(root, path), "utf8")
}

describe("flow instance attribution contract", () => {
  it("persists one privacy-safe flow id from drafts through both checkout paths", () => {
    const store = source("components/request/store.ts")
    const draftStorage = source("lib/request/draft-storage.ts")
    const serverDraft = source("lib/request/server-draft.ts")
    const draftRoute = source("app/api/draft/route.ts")
    const unifiedCheckout = source("app/actions/unified-checkout.ts")
    const authenticatedCheckout = source("lib/stripe/checkout.ts")
    const authenticatedPersistence = source("lib/stripe/checkout/persistence.ts")
    const guestCheckout = source("lib/stripe/guest-checkout.ts")

    expect(store).toContain("flowInstanceId")
    expect(draftStorage).toContain("flowInstanceId")
    expect(serverDraft).toContain("flowInstanceId")
    expect(draftRoute).toContain("flow_instance_id")
    expect(unifiedCheckout).toContain("flowInstanceId")
    expect(authenticatedCheckout).toContain("flowInstanceId")
    expect(authenticatedPersistence).toContain("flow_instance_id")
    expect(guestCheckout).toContain("flow_instance_id")
  })

  it("keeps the same flow id in Stripe retries and confirmed purchase events", () => {
    const stripeSession = source("lib/stripe/checkout/stripe-session.ts")
    const retryPayment = source("lib/stripe/checkout/retry-payment.ts")
    const finalizer = source("lib/stripe/confirmed-payment-finalization.ts")
    const posthogServer = source("lib/analytics/posthog-server.ts")

    expect(stripeSession).toContain("flow_instance_id")
    expect(retryPayment).toContain("flow_instance_id")
    expect(finalizer).toContain("flow_instance_id")
    expect(finalizer).toContain("flowInstanceId")
    expect(posthogServer).toContain("flowInstanceId")
  })

  it("keeps the non-clinical experience marker on the same payment-owned path", () => {
    const draftConversion = source("lib/request/server-draft-conversion.ts")
    const authenticatedPersistence = source("lib/stripe/checkout/persistence.ts")
    const guestCheckout = source("lib/stripe/guest-checkout.ts")
    const retryPayment = source("lib/stripe/checkout/retry-payment.ts")
    const stripeSession = source("lib/stripe/checkout/stripe-session.ts")
    const finalizer = source("lib/stripe/confirmed-payment-finalization.ts")

    for (const implementation of [
      draftConversion,
      authenticatedPersistence,
      guestCheckout,
      retryPayment,
      stripeSession,
      finalizer,
    ]) {
      expect(implementation).toMatch(/growthExperienceVersion|growth_experience_version/)
    }
    expect(finalizer).toContain("purchase_completed_server")
  })

  it("threads the flow id into every payment_initiated emitter", () => {
    const authenticatedCheckout = source("lib/stripe/checkout.ts")
    const guestCheckout = source("lib/stripe/guest-checkout.ts")
    const retryPayment = source("lib/stripe/checkout/retry-payment.ts")

    for (const checkoutSource of [authenticatedCheckout, guestCheckout, retryPayment]) {
      expect(checkoutSource).toMatch(
        /trackIntakeFunnelStep\(\{[\s\S]*?step:\s*"payment_initiated"[\s\S]*?flowInstanceId:/,
      )
    }
  })

  it("builds the canonical funnel from one flow id without fallback identities", () => {
    const funnel = source("lib/analytics/posthog-canonical-intake-funnel.ts")

    expect(funnel).toContain("properties.flow_instance_id")
    expect(funnel).toContain("minIf(timestamp, event = 'intake_started')")
    expect(funnel).not.toContain("properties.$session_id")
    expect(funnel).not.toContain("distinct_id")
    expect(funnel).not.toMatch(/uniq\s*\(\s*coalesce/)
  })
})
