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
    useRequestStore.setState(useRequestStore.getInitialState(), true)
  })

  it("marks hydration complete when there is no persisted draft", async () => {
    await useRequestStore.persist.rehydrate()

    expect(useRequestStore.persist.hasHydrated()).toBe(true)
    expect(useRequestStore.getState().answers).toEqual({})
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

  it("flushes the current step immediately when navigating", async () => {
    await useRequestStore.persist.rehydrate()
    useRequestStore.setState({
      serviceType: "consult",
      currentStepId: "womens-health-type",
      answers: { consultSubtype: "womens_health" },
    })

    useRequestStore.getState().nextStep()

    const legacyDraft = JSON.parse(localStorage.getItem("instantmed-request-draft") || "{}")
    const scopedDraft = JSON.parse(localStorage.getItem("instantmed-draft-consult") || "{}")

    expect(legacyDraft.state.currentStepId).toBe("womens-health-assessment")
    expect(scopedDraft.currentStepId).toBe("womens-health-assessment")
  })

  it("persists the furthest visited step and unresolved revalidation work", async () => {
    await useRequestStore.persist.rehydrate()
    useRequestStore.setState({
      serviceType: "repeat-script",
      currentStepId: "medication",
      furthestVisitedStepId: "review",
      stepsNeedingRevalidation: ["medication", "medical-history"],
      answers: {
        medications: [{ name: "Updated medicine" }],
        consultSubtype: undefined,
      },
    })

    useRequestStore.getState().nextStep()

    const legacyDraft = JSON.parse(localStorage.getItem("instantmed-request-draft") || "{}")
    const scopedDraft = JSON.parse(localStorage.getItem("instantmed-draft-prescription") || "{}")
    expect(legacyDraft.state.furthestVisitedStepId).toBe("review")
    expect(legacyDraft.state.stepsNeedingRevalidation).toEqual(["medical-history"])
    expect(scopedDraft.furthestVisitedStepId).toBe("review")
    expect(scopedDraft.stepsNeedingRevalidation).toEqual(["medical-history"])
  })

  // P2.1 merged `medication-history` into `medication`. A draft written before
  // that deploy names a step the registry no longer has; without the retired-id
  // alias every restore path treats it as unknown, so the patient's place (and
  // their pending revalidation work) is silently thrown away mid-request.
  it("resumes a pre-merge draft saved on the retired medication-history step", async () => {
    localStorage.setItem(
      "instantmed-request-draft",
      JSON.stringify({
        state: {
          serviceType: "repeat-script",
          currentStepId: "medication-history",
          furthestVisitedStepId: "medication-history",
          stepsNeedingRevalidation: ["medication-history"],
          answers: {
            medications: [{ name: "Existing medicine" }],
            medicationName: "Existing medicine",
            prescriptionHistory: "less_than_3_months",
            currentDose: "One tablet daily",
            indication: "Blood pressure",
            doseChanged: false,
            hasSideEffects: false,
          },
          lastSavedAt: new Date().toISOString(),
        },
        version: 0,
      }),
    )

    await useRequestStore.persist.rehydrate()

    const state = useRequestStore.getState()
    expect(state.currentStepId).toBe("medication")
    expect(state.furthestVisitedStepId).toBe("medication")
    expect(state.stepsNeedingRevalidation).toEqual(["medication"])
    // Answers are a flat blob keyed by field, never by step — the merge must
    // not cost the patient a single one.
    expect(state.answers).toMatchObject({
      medicationName: "Existing medicine",
      prescriptionHistory: "less_than_3_months",
      currentDose: "One tablet daily",
      indication: "Blood pressure",
      doseChanged: false,
      hasSideEffects: false,
    })
  })

  it("sanitizes unknown persisted progress step ids", async () => {
    localStorage.setItem(
      "instantmed-request-draft",
      JSON.stringify({
        state: {
          serviceType: "med-cert",
          currentStepId: "symptoms",
          furthestVisitedStepId: "not-a-request-step",
          stepsNeedingRevalidation: ["symptoms", "not-a-request-step"],
          answers: { symptomDetails: "A mild headache since this morning" },
          lastSavedAt: new Date().toISOString(),
        },
        version: 0,
      }),
    )

    await useRequestStore.persist.rehydrate()

    expect(useRequestStore.getState().furthestVisitedStepId).toBe("symptoms")
    expect(useRequestStore.getState().stepsNeedingRevalidation).toEqual(["symptoms"])
  })

  it("does not hydrate a same-step shorter draft over live assessment answers", async () => {
    useRequestStore.setState({
      serviceType: "consult",
      currentStepId: "womens-health-assessment",
      answers: {
        consultSubtype: "womens_health",
        womensHealthOption: "uti",
        utiSymptoms: ["burning"],
        utiRedFlags: "no",
      },
    })
    localStorage.setItem(
      "instantmed-draft-consult",
      JSON.stringify({
        serviceType: "consult",
        currentStepId: "womens-health-assessment",
        answers: {
          consultSubtype: "womens_health",
          womensHealthOption: "uti",
        },
        lastSavedAt: new Date().toISOString(),
      }),
    )

    await useRequestStore.persist.rehydrate()

    expect(useRequestStore.getState().answers).toMatchObject({
      consultSubtype: "womens_health",
      womensHealthOption: "uti",
      utiSymptoms: ["burning"],
      utiRedFlags: "no",
    })
  })
})
