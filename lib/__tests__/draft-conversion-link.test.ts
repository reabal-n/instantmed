import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

const root = process.cwd()
const read = (path: string) => readFileSync(join(root, path), "utf8")

describe("draft conversion link contract", () => {
  it("passes the active server draft session id from checkout surfaces into unified checkout", () => {
    const serverDraftSource = read("lib/request/server-draft.ts")
    const unifiedCheckoutSource = read("app/actions/unified-checkout.ts")
    // review-step is the single unified review+pay surface after the 2026-06-28
    // unification (checkout-step retired).
    const reviewStepSource = read("components/request/steps/review-step.tsx")

    expect(serverDraftSource).toContain("export function getActiveServerDraftSessionId")
    expect(unifiedCheckoutSource).toContain("serverDraftSessionId?: string")
    expect(unifiedCheckoutSource).toContain("serverDraftSessionId")

    expect(reviewStepSource).toContain("getActiveServerDraftSessionId")
    expect(reviewStepSource).toContain("serverDraftSessionId: getActiveServerDraftSessionId")
  })

  it("keeps the draft session id available to authenticated and guest checkout persistence", () => {
    const checkoutTypesSource = read("lib/stripe/checkout/types.ts")
    const guestCheckoutSource = read("lib/stripe/guest-checkout.ts")

    expect(checkoutTypesSource).toContain("serverDraftSessionId?: string")
    expect(guestCheckoutSource).toContain("serverDraftSessionId?: string")
  })

  it("marks partial drafts converted from both authenticated and guest checkout paths", () => {
    const persistenceSource = read("lib/stripe/checkout/persistence.ts")
    const guestCheckoutSource = read("lib/stripe/guest-checkout.ts")

    expect(persistenceSource).toContain("markPartialIntakeConverted")
    expect(persistenceSource).toContain("input.serverDraftSessionId")
    expect(guestCheckoutSource).toContain("markPartialIntakeConverted")
    expect(guestCheckoutSource).toContain("input.serverDraftSessionId")
  })

  it("adopts a validated recovery session before the restored flow can reach checkout", () => {
    const requestPageSource = read("app/request/page.tsx")
    const requestFlowSource = read("components/request/request-flow.tsx")

    expect(requestPageSource).toContain("isValidDraftSessionId(params.d)")
    expect(requestPageSource).toContain("initialDraftId=")
    expect(requestPageSource).toContain("DraftSessionUrlScrubber")
    expect(requestPageSource).toContain("withDraftSessionScrubber")
    expect(requestFlowSource).toContain("getServerDraftById(initialDraftId)")
    expect(requestFlowSource).toContain("getServerDraftRecoveryDecision")
    expect(requestFlowSource).toContain("if (!adoptServerDraftSession(record))")
    expect(requestFlowSource).toContain("restoredState.restoreServerDraft(record, decision.serviceType)")
    expect(requestFlowSource.indexOf("if (!adoptServerDraftSession(record))")).toBeLessThan(
      requestFlowSource.indexOf("restoredState.restoreServerDraft(record, decision.serviceType)"),
    )
  })
})
