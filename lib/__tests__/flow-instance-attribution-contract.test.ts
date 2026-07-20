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

  it("queries unique attempts while retaining raw interaction occurrences", () => {
    const funnel = source("lib/analytics/posthog-intake-funnel.ts")

    expect(funnel).toContain("properties.flow_instance_id")
    expect(funnel).toMatch(/uniq\s*\(/)
    expect(funnel).toContain("count() AS occurrences")
  })
})
