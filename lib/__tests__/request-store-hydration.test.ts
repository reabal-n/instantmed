import { beforeEach, describe, expect, it } from "vitest"

// Mock localStorage before the store module's functions run (module import is
// safe — the store only touches localStorage inside storage callbacks).
let mockStore: Record<string, string> = {}

const localStorageMock = {
  getItem: (key: string) => mockStore[key] ?? null,
  setItem: (key: string, value: string) => {
    mockStore[key] = value
  },
  removeItem: (key: string) => {
    delete mockStore[key]
  },
  clear: () => {
    mockStore = {}
  },
}

Object.defineProperty(globalThis, "localStorage", { value: localStorageMock })

import { useRequestStore } from "@/components/request/store"

/**
 * Regression guard for the reload draft-loss bug (2026-07-02): the persist
 * storage's getItem ran migrateLegacyDraft() fire-and-forget, and a SUCCESSFUL
 * migration deletes `instantmed-request-draft` — the very key getItem reads
 * next. Every rehydrate that triggered a migration therefore returned null:
 * the in-progress draft silently vanished, the debounced default write
 * recreated the key with empty answers, and restored selections (cert type,
 * 2–3 day duration and its price) were stomped back to defaults on reload.
 * getItem must hydrate FROM the migrated draft instead.
 */
describe("request store draft hydration", () => {
  beforeEach(() => {
    mockStore = {}
  })

  it("hydrates the draft that the legacy-key migration just moved", async () => {
    localStorage.setItem(
      "instantmed-request-draft",
      JSON.stringify({
        state: {
          serviceType: "med-cert",
          currentStepId: "certificate",
          answers: { certType: "work", duration: "3" },
          lastSavedAt: new Date().toISOString(),
        },
        version: 0,
      }),
    )

    await useRequestStore.persist.rehydrate()

    const state = useRequestStore.getState()
    expect(state.serviceType).toBe("med-cert")
    expect(state.answers.certType).toBe("work")
    expect(state.answers.duration).toBe("3")
    // The migration still ran: the service-scoped copy exists for Phase 2.3.
    expect(localStorage.getItem("instantmed-draft-med-cert")).toBeTruthy()
  })

  it("falls back to the service-scoped key when the legacy key is missing", async () => {
    // The pre-#248 fire-and-forget migration deleted the legacy key after
    // copying the draft to the scoped key — for patients who hit that bug,
    // the scoped copy is the ONLY surviving copy of their in-progress intake.
    localStorage.setItem(
      "instantmed-draft-med-cert",
      JSON.stringify({
        serviceType: "med-cert",
        currentStepId: "certificate",
        answers: { certType: "study", duration: "2" },
        lastSavedAt: new Date().toISOString(),
      }),
    )

    await useRequestStore.persist.rehydrate()

    const state = useRequestStore.getState()
    expect(state.serviceType).toBe("med-cert")
    expect(state.answers.certType).toBe("study")
    expect(state.answers.duration).toBe("2")
  })

  it("prefers the most recently saved scoped draft when several services have one", async () => {
    localStorage.setItem(
      "instantmed-draft-med-cert",
      JSON.stringify({
        serviceType: "med-cert",
        currentStepId: "certificate",
        answers: { certType: "carer" },
        lastSavedAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
      }),
    )
    localStorage.setItem(
      "instantmed-draft-consult",
      JSON.stringify({
        serviceType: "consult",
        currentStepId: "ed-goals",
        answers: { consultSubtype: "ed", edGoal: "confidence" },
        lastSavedAt: new Date().toISOString(),
      }),
    )

    await useRequestStore.persist.rehydrate()

    const state = useRequestStore.getState()
    expect(state.serviceType).toBe("consult")
    expect(state.answers.edGoal).toBe("confidence")
  })

  it("hydrates an expired draft as empty without stomping other services", async () => {
    localStorage.setItem(
      "instantmed-request-draft",
      JSON.stringify({
        state: {
          serviceType: "med-cert",
          currentStepId: "certificate",
          answers: { certType: "work", duration: "3" },
          lastSavedAt: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString(),
        },
        version: 0,
      }),
    )

    await useRequestStore.persist.rehydrate()

    // Expired drafts are discarded by the migration, and hydration must not
    // resurrect them.
    expect(localStorage.getItem("instantmed-request-draft")).toBeNull()
  })
})
