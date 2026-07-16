import { beforeEach, describe, expect, it, vi } from "vitest"

let mockStore: Record<string, string> = {}

Object.defineProperty(globalThis, "localStorage", {
  value: {
    getItem: (key: string) => mockStore[key] ?? null,
    setItem: (key: string, value: string) => {
      mockStore[key] = value
    },
    removeItem: (key: string) => {
      delete mockStore[key]
    },
  },
})

vi.mock("@/lib/analytics/capture", () => ({ capture: vi.fn() }))

import { useRequestStore } from "@/components/request/store"
import type { ServerDraftRecord } from "@/lib/request/server-draft"

const SESSION_ID = "11111111-1111-4111-8111-111111111111"

function record(overrides: Partial<ServerDraftRecord> = {}): ServerDraftRecord {
  return {
    sessionId: SESSION_ID,
    serviceType: "prescription",
    currentStepId: "medication-history",
    answers: { medications: [{ name: "Recovered medicine" }] },
    identity: {
      email: "patient@example.com",
      firstName: "Pat",
      lastName: "Example",
      phone: "0400000000",
      dob: "1990-05-15",
    },
    updatedAt: "2026-07-16T01:00:00.000Z",
    expiresAt: "2026-07-17T01:00:00.000Z",
    ...overrides,
  }
}

describe("request store server-draft recovery", () => {
  beforeEach(() => {
    mockStore = {}
    useRequestStore.setState(useRequestStore.getInitialState(), true)
    useRequestStore.setState({
      serviceType: "med-cert",
      currentStepId: "checkout",
      furthestVisitedStepId: "checkout",
      stepsNeedingRevalidation: ["symptoms"],
      answers: { staleLocalAnswer: "must not survive" },
      safetyConfirmed: true,
      safetyTimestamp: "2026-07-16T00:00:00.000Z",
      agreedToTerms: true,
      confirmedAccuracy: true,
      telehealthConsent: true,
    })
  })

  it("atomically replaces local clinical state and restores exact identity", () => {
    useRequestStore.getState().restoreServerDraft(record(), "repeat-script")

    expect(useRequestStore.getState()).toMatchObject({
      serviceType: "repeat-script",
      currentStepId: "medication-history",
      furthestVisitedStepId: "medication-history",
      stepsNeedingRevalidation: [],
      answers: { medications: [{ name: "Recovered medicine" }] },
      firstName: "Pat",
      lastName: "Example",
      email: "patient@example.com",
      phone: "0400000000",
      dob: "1990-05-15",
      lastSavedAt: "2026-07-16T01:00:00.000Z",
    })
    expect(useRequestStore.getState().answers).not.toHaveProperty("staleLocalAnswer")
  })

  it("resets every safety attestation and falls back from an invalid step", () => {
    useRequestStore.getState().restoreServerDraft(
      record({ serviceType: "med-cert", currentStepId: "not-a-step" as never }),
      "med-cert",
    )

    expect(useRequestStore.getState()).toMatchObject({
      currentStepId: "certificate",
      furthestVisitedStepId: "certificate",
      safetyConfirmed: false,
      safetyTimestamp: null,
      agreedToTerms: false,
      confirmedAccuracy: false,
      telehealthConsent: false,
    })
  })
})
