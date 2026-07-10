import { readFileSync } from "node:fs"

import { beforeEach, describe, expect, it, vi } from "vitest"

// Mock localStorage before the store module loads (same pattern as
// request-store-hydration.test.ts).
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

import {
  isIntentionalNavigationInProgress,
  markIntentionalNavigation,
  resetIntentionalNavigationForTests,
} from "@/components/request/hooks/use-unsaved-changes"
import { useRequestStore } from "@/components/request/store"
import { clearDraftAfterPayment } from "@/lib/request/draft-storage"

/**
 * Intake state-lifecycle contract (2026-07-10 audit fix package).
 *
 * Pins the four state-boundary behaviours that were broken:
 * 1. Switching services must NOT carry the previous service's answers —
 *    a stale med-cert symptomDetails ("chest pain") submitted inside a
 *    consult's intake_answers could set emergency_symptoms on it and
 *    falsely decline the request at pay.
 * 2. lastSavedAt is a statement of PATIENT WORK: mutations stamp it,
 *    passive sets (auth context, prefill with touch:false) must not —
 *    otherwise empty just-opened flows look like restorable drafts and
 *    the 24h expiry never expires.
 * 3. clearDraftAfterPayment retires the paid service's draft (scoped +
 *    legacy) without touching another service's in-progress draft.
 * 4. The intentional-navigation flag suppresses the abandonment beacon
 *    on Stripe redirects (every payment used to fire
 *    intake_abandoned_passive).
 */
describe("intake draft lifecycle", () => {
  beforeEach(() => {
    mockStore = {}
    useRequestStore.setState(useRequestStore.getInitialState(), true)
    resetIntentionalNavigationForTests()
  })

  describe("service switching scopes answers", () => {
    it("does not carry med-cert answers into a consult", () => {
      const store = useRequestStore.getState()
      store.setServiceType("med-cert")
      store.setAnswer("certType", "work")
      store.setAnswer("symptomDetails", "chest pain since tuesday")

      useRequestStore.getState().setServiceType("consult")

      const after = useRequestStore.getState()
      expect(after.serviceType).toBe("consult")
      expect(after.answers.symptomDetails).toBeUndefined()
      expect(after.answers.certType).toBeUndefined()
    })

    it("keeps identity fields across a service switch", () => {
      const store = useRequestStore.getState()
      store.setServiceType("med-cert")
      store.setIdentity({ firstName: "Ada", lastName: "Lovelace", email: "ada@example.com" })
      store.setAnswer("certType", "work")

      useRequestStore.getState().setServiceType("consult")

      const after = useRequestStore.getState()
      expect(after.firstName).toBe("Ada")
      expect(after.email).toBe("ada@example.com")
    })

    it("restores the target service's own scoped draft on switch-back", () => {
      // Seed a scoped med-cert draft the way the dual-write persists it.
      localStorage.setItem(
        "instantmed-draft-med-cert",
        JSON.stringify({
          serviceType: "med-cert",
          currentStepId: "certificate",
          answers: { certType: "carer", duration: "2" },
          lastSavedAt: new Date().toISOString(),
        }),
      )

      const store = useRequestStore.getState()
      store.setServiceType("consult")
      store.setAnswer("consultSubtype", "ed")

      useRequestStore.getState().setServiceType("med-cert")

      const after = useRequestStore.getState()
      expect(after.serviceType).toBe("med-cert")
      expect(after.answers.certType).toBe("carer")
      expect(after.answers.consultSubtype).toBeUndefined()
    })

    it("same-service set keeps answers (no accidental wipe)", () => {
      const store = useRequestStore.getState()
      store.setServiceType("med-cert")
      store.setAnswer("certType", "work")

      useRequestStore.getState().setServiceType("med-cert")

      expect(useRequestStore.getState().answers.certType).toBe("work")
    })
  })

  describe("lastSavedAt means patient work", () => {
    it("is stamped by setAnswer and setIdentity", () => {
      const store = useRequestStore.getState()
      expect(useRequestStore.getState().lastSavedAt).toBeNull()

      store.setAnswer("certType", "work")
      expect(useRequestStore.getState().lastSavedAt).not.toBeNull()
    })

    it("is NOT stamped by touch:false prefill writes", () => {
      const store = useRequestStore.getState()
      store.setAnswer("medicareNumber", "2953 12345 1", { touch: false })
      store.setIdentity({ firstName: "Ada" }, { touch: false })

      expect(useRequestStore.getState().lastSavedAt).toBeNull()
      // The data itself still lands.
      expect(useRequestStore.getState().answers.medicareNumber).toBe("2953 12345 1")
      expect(useRequestStore.getState().firstName).toBe("Ada")
    })

    it("is NOT stamped by setAuthContext (opening the flow is not a draft)", () => {
      useRequestStore.getState().setAuthContext({
        isAuthenticated: true,
        hasProfile: true,
        hasCompleteIdentity: true,
        hasMedicare: true,
        hasAddress: true,
        hasPhone: true,
        hasSex: true,
      })
      expect(useRequestStore.getState().lastSavedAt).toBeNull()
    })
  })

  describe("clearDraftAfterPayment", () => {
    it("clears the paid service's scoped key and a matching legacy key", () => {
      localStorage.setItem(
        "instantmed-draft-med-cert",
        JSON.stringify({ serviceType: "med-cert", currentStepId: "checkout", answers: {}, lastSavedAt: new Date().toISOString() }),
      )
      localStorage.setItem(
        "instantmed-request-draft",
        JSON.stringify({ state: { serviceType: "med-cert" }, version: 0 }),
      )

      // DB category vocabulary must work — the payment surfaces pass it.
      clearDraftAfterPayment("medical_certificate")

      expect(localStorage.getItem("instantmed-draft-med-cert")).toBeNull()
      expect(localStorage.getItem("instantmed-request-draft")).toBeNull()
    })

    it("leaves another service's legacy draft untouched", () => {
      localStorage.setItem(
        "instantmed-request-draft",
        JSON.stringify({ state: { serviceType: "consult" }, version: 0 }),
      )

      clearDraftAfterPayment("medical_certificate")

      expect(localStorage.getItem("instantmed-request-draft")).not.toBeNull()
    })

    it("no-ops on unknown categories", () => {
      localStorage.setItem(
        "instantmed-request-draft",
        JSON.stringify({ state: { serviceType: "med-cert" }, version: 0 }),
      )
      clearDraftAfterPayment("mystery_service")
      expect(localStorage.getItem("instantmed-request-draft")).not.toBeNull()
    })
  })

  describe("intentional-navigation beacon suppression", () => {
    it("flag flips on markIntentionalNavigation and resets via the test seam", () => {
      expect(isIntentionalNavigationInProgress()).toBe(false)
      markIntentionalNavigation()
      expect(isIntentionalNavigationInProgress()).toBe(true)
      resetIntentionalNavigationForTests()
      expect(isIntentionalNavigationInProgress()).toBe(false)
    })

    it("review-step and exit path actually call the suppressor before navigating", () => {
      // Source-level pin: the two known unload-triggering navigations must
      // suppress the passive beacon.
      const reviewStep = readFileSync("components/request/steps/review-step.tsx", "utf8")
      const flowNav = readFileSync("components/request/hooks/use-flow-navigation.ts", "utf8")
      expect(reviewStep).toContain("markIntentionalNavigation()")
      expect(reviewStep.indexOf("markIntentionalNavigation()")).toBeLessThan(
        reviewStep.indexOf("window.location.href = result.checkoutUrl!"),
      )
      expect(flowNav).toContain("markIntentionalNavigation()")
    })
  })

  describe("empty flows are not drafts", () => {
    it("persistedRequestState carries the store stamp instead of minting one", async () => {
      // Rehydrate an EXPIRED-adjacent draft: lastSavedAt must round-trip
      // unchanged through persistence (the old code re-stamped it on every
      // write, so the 24h expiry never fired for returning visitors).
      vi.useFakeTimers()
      try {
        const store = useRequestStore.getState()
        store.setServiceType("med-cert")
        store.setAnswer("certType", "work")
        const stamped = useRequestStore.getState().lastSavedAt
        expect(stamped).not.toBeNull()

        vi.advanceTimersByTime(60_000)
        // A passive set (auth context) must not refresh the stamp.
        useRequestStore.getState().setAuthContext({
          isAuthenticated: false,
          hasProfile: false,
          hasCompleteIdentity: false,
          hasMedicare: false,
          hasAddress: false,
          hasPhone: false,
          hasSex: false,
        })
        expect(useRequestStore.getState().lastSavedAt).toBe(stamped)
      } finally {
        vi.useRealTimers()
      }
    })
  })
})
