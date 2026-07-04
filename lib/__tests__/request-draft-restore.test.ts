import { beforeEach, describe, expect, it } from "vitest"

import {
  getStoredDraftRestoreCandidate,
  shouldOfferDraftRestore,
} from "@/lib/request/draft-restore"

const NOW = new Date("2026-07-04T12:00:00.000Z").getTime()

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

describe("request draft restore decision", () => {
  beforeEach(() => {
    mockStore = {}
  })

  it("offers a restore banner for a recent in-progress draft", () => {
    expect(
      shouldOfferDraftRestore({
        lastSavedAt: new Date(NOW - 60 * 60 * 1000).toISOString(),
        serviceType: "consult",
        currentStepId: "womens-health-type",
        now: NOW,
      }),
    ).toBe(true)
  })

  it("does not offer restore for stale, invalid, or completed drafts", () => {
    expect(
      shouldOfferDraftRestore({
        lastSavedAt: new Date(NOW - 25 * 60 * 60 * 1000).toISOString(),
        serviceType: "consult",
        currentStepId: "womens-health-type",
        now: NOW,
      }),
    ).toBe(false)

    expect(
      shouldOfferDraftRestore({
        lastSavedAt: "not-a-date",
        serviceType: "consult",
        currentStepId: "womens-health-type",
        now: NOW,
      }),
    ).toBe(false)

    expect(
      shouldOfferDraftRestore({
        lastSavedAt: new Date(NOW - 60 * 60 * 1000).toISOString(),
        serviceType: "consult",
        currentStepId: "review",
        now: NOW,
      }),
    ).toBe(false)
  })

  it("does not offer restore for drafts saved during the active page session", () => {
    expect(
      shouldOfferDraftRestore({
        lastSavedAt: new Date(NOW + 1000).toISOString(),
        serviceType: "consult",
        currentStepId: "womens-health-assessment",
        now: NOW + 2000,
        savedBefore: NOW,
      }),
    ).toBe(false)

    expect(
      shouldOfferDraftRestore({
        lastSavedAt: new Date(NOW - 1000).toISOString(),
        serviceType: "consult",
        currentStepId: "womens-health-assessment",
        now: NOW + 2000,
        savedBefore: NOW,
      }),
    ).toBe(true)
  })

  it("does not offer restore without a hydrated service draft", () => {
    expect(
      shouldOfferDraftRestore({
        lastSavedAt: null,
        serviceType: "consult",
        currentStepId: "womens-health-type",
        now: NOW,
      }),
    ).toBe(false)

    expect(
      shouldOfferDraftRestore({
        lastSavedAt: new Date(NOW - 60 * 60 * 1000).toISOString(),
        serviceType: null,
        currentStepId: "womens-health-type",
        now: NOW,
      }),
    ).toBe(false)
  })

  it("reads the pre-hydration legacy draft candidate from storage", () => {
    localStorage.setItem(
      "instantmed-request-draft",
      JSON.stringify({
        state: {
          serviceType: "consult",
          currentStepId: "womens-health-assessment",
          lastSavedAt: new Date(NOW - 60 * 60 * 1000).toISOString(),
        },
      }),
    )

    expect(getStoredDraftRestoreCandidate("consult")).toEqual({
      serviceType: "consult",
      currentStepId: "womens-health-assessment",
      lastSavedAt: new Date(NOW - 60 * 60 * 1000).toISOString(),
    })
  })

  it("prefers a stored draft for the requested service over a newer other-service draft", () => {
    localStorage.setItem(
      "instantmed-draft-med-cert",
      JSON.stringify({
        serviceType: "med-cert",
        currentStepId: "certificate",
        lastSavedAt: new Date(NOW).toISOString(),
      }),
    )
    localStorage.setItem(
      "instantmed-draft-consult",
      JSON.stringify({
        serviceType: "consult",
        currentStepId: "womens-health-type",
        lastSavedAt: new Date(NOW - 60 * 60 * 1000).toISOString(),
      }),
    )

    expect(getStoredDraftRestoreCandidate("consult")?.serviceType).toBe("consult")
  })

  it("ignores malformed stored drafts", () => {
    localStorage.setItem("instantmed-request-draft", "{nope")
    localStorage.setItem(
      "instantmed-draft-consult",
      JSON.stringify({
        serviceType: "consult",
        currentStepId: "womens-health-type",
      }),
    )

    expect(getStoredDraftRestoreCandidate("consult")).toBeNull()
  })
})
