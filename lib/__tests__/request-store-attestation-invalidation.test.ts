import { beforeEach, describe, expect, it, vi } from "vitest"

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

vi.mock("@/lib/analytics/capture", () => ({ capture: vi.fn() }))

import { useRequestStore } from "@/components/request/store"

const CONFIRMED_AT = "2026-07-14T01:02:03.000Z"

function seedConfirmedAttestation(): void {
  useRequestStore.setState({
    safetyConfirmed: true,
    safetyTimestamp: CONFIRMED_AT,
    agreedToTerms: true,
    confirmedAccuracy: true,
    telehealthConsent: true,
  })
}

function expectAttestationCleared(): void {
  expect(useRequestStore.getState()).toMatchObject({
    safetyConfirmed: false,
    safetyTimestamp: null,
    agreedToTerms: false,
    confirmedAccuracy: false,
    telehealthConsent: false,
  })
}

function expectAttestationPreserved(): void {
  expect(useRequestStore.getState()).toMatchObject({
    safetyConfirmed: true,
    safetyTimestamp: CONFIRMED_AT,
    agreedToTerms: true,
    confirmedAccuracy: true,
    telehealthConsent: true,
  })
}

describe("request store attestation invalidation", () => {
  beforeEach(() => {
    mockStore = {}
    useRequestStore.setState(useRequestStore.getInitialState(), true)
  })

  describe("answer writes", () => {
    it("clears the attestation and consent aliases when setAnswer changes a value", () => {
      useRequestStore.setState({ answers: { edNitrates: false } })
      seedConfirmedAttestation()

      useRequestStore.getState().setAnswer("edNitrates", true)

      expect(useRequestStore.getState().answers.edNitrates).toBe(true)
      expectAttestationCleared()
    })

    it("preserves the attestation when setAnswer is a no-op", () => {
      useRequestStore.setState({ answers: { edNitrates: false } })
      seedConfirmedAttestation()

      useRequestStore.getState().setAnswer("edNitrates", false)

      expectAttestationPreserved()
    })

    it("still clears the attestation for a changed touch:false prefill", () => {
      seedConfirmedAttestation()

      useRequestStore.getState().setAnswer("sex", "female", { touch: false })

      expect(useRequestStore.getState().answers.sex).toBe("female")
      expect(useRequestStore.getState().lastSavedAt).toBeNull()
      expectAttestationCleared()
    })

    it("clears only for a materially changed key in setAnswers", () => {
      useRequestStore.setState({ answers: { medication: "Finasteride", dose: "1 mg" } })
      seedConfirmedAttestation()

      useRequestStore.getState().setAnswers({ medication: "Finasteride", dose: "5 mg" })

      expect(useRequestStore.getState().answers).toMatchObject({
        medication: "Finasteride",
        dose: "5 mg",
      })
      expectAttestationCleared()
    })

    it("preserves the attestation when every setAnswers entry is unchanged", () => {
      useRequestStore.setState({ answers: { medication: "Finasteride", dose: "1 mg" } })
      seedConfirmedAttestation()

      useRequestStore.getState().setAnswers({ medication: "Finasteride", dose: "1 mg" })

      expectAttestationPreserved()
    })
  })

  describe("identity writes", () => {
    it("clears the attestation and consent aliases when an identity field changes", () => {
      useRequestStore.setState({
        firstName: "Ada",
        lastName: "Lovelace",
        email: "ada@example.com",
        phone: "0400000000",
        dob: "1990-01-01",
      })
      seedConfirmedAttestation()

      useRequestStore.getState().setIdentity({ email: "ada.new@example.com" })

      expect(useRequestStore.getState().email).toBe("ada.new@example.com")
      expectAttestationCleared()
    })

    it("preserves the attestation when setIdentity is a no-op", () => {
      useRequestStore.setState({ firstName: "Ada", email: "ada@example.com" })
      seedConfirmedAttestation()

      useRequestStore.getState().setIdentity({ firstName: "Ada", email: "ada@example.com" })

      expectAttestationPreserved()
    })

    it("still clears the attestation for a changed touch:false identity prefill", () => {
      seedConfirmedAttestation()

      useRequestStore.getState().setIdentity({ firstName: "Ada" }, { touch: false })

      expect(useRequestStore.getState().firstName).toBe("Ada")
      expect(useRequestStore.getState().lastSavedAt).toBeNull()
      expectAttestationCleared()
    })
  })

  describe("service-scoped draft restoration", () => {
    const savedIdentity = {
      firstName: "Ada",
      lastName: "Lovelace",
      email: "ada@example.com",
      phone: "0400000000",
      dob: "1990-01-01",
    }

    function seedConfirmedMedCertDraft(): void {
      localStorage.setItem(
        "instantmed-draft-med-cert",
        JSON.stringify({
          serviceType: "med-cert",
          currentStepId: "checkout",
          answers: { certType: "work", symptomDetails: "Migraine" },
          ...savedIdentity,
          safetyConfirmed: true,
          safetyTimestamp: CONFIRMED_AT,
          lastSavedAt: new Date().toISOString(),
        }),
      )
    }

    it("does not resurrect a saved confirmation when retained live identity differs", () => {
      seedConfirmedMedCertDraft()
      useRequestStore.setState({
        serviceType: "consult",
        currentStepId: "ed-goals",
        ...savedIdentity,
        email: "current@example.com",
      })
      seedConfirmedAttestation()

      useRequestStore.getState().setServiceType("med-cert")

      expect(useRequestStore.getState()).toMatchObject({
        serviceType: "med-cert",
        email: "current@example.com",
        answers: { certType: "work", symptomDetails: "Migraine" },
      })
      expectAttestationCleared()
    })

    it("continues to restore a saved confirmation when retained identity matches", () => {
      seedConfirmedMedCertDraft()
      useRequestStore.setState({
        serviceType: "consult",
        currentStepId: "ed-goals",
        ...savedIdentity,
        safetyConfirmed: false,
        safetyTimestamp: null,
      })

      useRequestStore.getState().setServiceType("med-cert")

      expect(useRequestStore.getState()).toMatchObject({
        safetyConfirmed: true,
        safetyTimestamp: CONFIRMED_AT,
      })
    })
  })
})
