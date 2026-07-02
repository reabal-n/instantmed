import { readFileSync } from "node:fs"
import { resolve } from "node:path"

import { describe, expect, it } from "vitest"

/**
 * Certificate-step hydration contract.
 *
 * The request store uses skipHydration (request-flow calls
 * persist.rehydrate() in a post-mount effect), so a step's mount effects run
 * BEFORE a saved draft arrives. The cert step's selection→store sync must
 * therefore stay gated until hydration has finished: when it opened on bare
 * mount, the sync effect wrote the 1-day default into the still-empty store,
 * the one-shot restore latch burned itself on that self-written "1", and the
 * draft's real 2–3 day duration was stomped back to "1" (and its price) on
 * reload. These pins block that shape from coming back.
 */

const source = readFileSync(
  resolve(process.cwd(), "components/request/steps/certificate-step.tsx"),
  "utf8",
)

describe("certificate step duration hydration contract", () => {
  it("gates selection sync on persist hydration, not bare mount", () => {
    expect(source).toContain("useRequestStore.persist.hasHydrated()")
    expect(source).toContain("useRequestStore.persist.onFinishHydration(")
  })

  it("restores the stored duration synchronously from the hydrated store", () => {
    // Reading via getState() inside the hydration callback applies the draft
    // duration in the same commit that opens the sync gate, so the first sync
    // run already sees the restored selection (no transient stomp-and-recover
    // flap through the store).
    expect(source).toContain("parseDuration(useRequestStore.getState().answers.duration)")
  })

  it("does not reintroduce the reactive one-shot restore effect", () => {
    // The old effect latched storedDurationAppliedRef from a reactive read of
    // answers.duration — the sync effect's own pre-hydration write could burn
    // the latch before the draft landed.
    expect(source).not.toContain("Restore persisted duration after store hydration")
  })

  it("keeps the sync effect gated behind canSyncSelection", () => {
    expect(source).toContain("if (!canSyncSelection) return")
  })
})
