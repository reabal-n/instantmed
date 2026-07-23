import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

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
import { retireDraftFlow } from "@/lib/request/draft-retirement"
import { validateAnswersServerSide } from "@/lib/request/unified-checkout"

const RETIRED_FLOW_INSTANCE_ID = "55555555-5555-4555-8555-555555555555"

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

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("marks hydration complete when there is no persisted draft", async () => {
    await useRequestStore.persist.rehydrate()

    expect(useRequestStore.persist.hasHydrated()).toBe(true)
    expect(useRequestStore.getState().answers).toEqual({})
  })

  it("does not mint a scoped draft when the patient only opens a service", async () => {
    await useRequestStore.persist.rehydrate()

    useRequestStore.getState().setServiceType("med-cert")
    await new Promise((resolve) => setTimeout(resolve, 450))

    expect(localStorage.getItem("instantmed-request-draft")).toBeNull()
    expect(localStorage.getItem("instantmed-draft-med-cert")).toBeNull()
  })

  it("starts a consult over without minting a new draft from passive route and profile seeds", async () => {
    const savedAt = new Date().toISOString()
    vi.stubGlobal("window", {})
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true })))
    useRequestStore.setState({
      serviceType: "consult",
      currentStepId: "ed-health",
      answers: { consultSubtype: "ed", edGoal: "improve_erections" },
      firstName: "Draft",
      lastName: "Identity",
      email: "stale@example.com",
      phone: "0499999999",
      dob: "1970-01-01",
      lastSavedAt: savedAt,
      authContext: {
        isAuthenticated: true,
        hasProfile: true,
        hasCompleteIdentity: true,
        hasMedicare: true,
        hasAddress: true,
        hasPhone: true,
        hasSex: true,
      },
    })
    localStorage.setItem("instantmed-draft-consult", JSON.stringify({
      serviceType: "consult",
      currentStepId: "ed-health",
      answers: { consultSubtype: "ed", edGoal: "improve_erections" },
      lastSavedAt: savedAt,
    }))

    const profilePrefill = {
      identity: {
        email: "patient@example.com",
        firstName: "Pat",
        lastName: "Example",
        phone: "0412345678",
        dob: "1985-04-01",
      },
      answers: {
        ihiNumber: "8003600000000000",
        addressLine1: "12 Manual Entry Road",
        suburb: "Sydney",
        state: "NSW",
        postcode: "2000",
        sex: "M",
      },
    }

    useRequestStore.getState().discardCurrentDraft(profilePrefill)
    useRequestStore.getState().setAnswer("consultSubtype", "ed", { touch: false })
    useRequestStore.getState().setServiceType("consult")
    await new Promise((resolve) => setTimeout(resolve, 450))

    const state = useRequestStore.getState()
    expect(state.currentStepId).toBe("ed-goals")
    expect(state.lastSavedAt).toBeNull()
    expect(state.answers).toMatchObject({
      consultSubtype: "ed",
      ihiNumber: "8003600000000000",
      addressLine1: "12 Manual Entry Road",
      suburb: "Sydney",
      state: "NSW",
      postcode: "2000",
      sex: "M",
    })
    expect(state.firstName).toBe("Pat")
    expect(state.lastName).toBe("Example")
    expect(state.email).toBe("patient@example.com")
    expect(state.phone).toBe("0412345678")
    expect(state.dob).toBe("1985-04-01")
    expect(localStorage.getItem("instantmed-request-draft")).toBeNull()
    expect(localStorage.getItem("instantmed-draft-consult")).toBeNull()
    expect(fetch).not.toHaveBeenCalledWith(
      "/api/draft",
      expect.objectContaining({ method: "POST" }),
    )

    const completeEdAnswers = {
      ...state.answers,
      edGoal: "improve_erections",
      edDuration: "months",
      edAgeConfirmed: true,
      iief1: 3,
      iief2: 3,
      iief3: 3,
      iief4: 3,
      iief5: 3,
      edNitrates: false,
      edAlphaBlockers: false,
      edRecentHeartEvent: false,
      edSevereHeart: false,
      takes_medications: "no",
      has_allergies: "no",
      has_conditions: "no",
      previousEdMeds: false,
      edPreference: "doctor_recommendation",
    }
    expect(validateAnswersServerSide("consult", completeEdAnswers, {
      email: state.email,
      fullName: `${state.firstName} ${state.lastName}`,
      dateOfBirth: state.dob,
      phone: state.phone,
    })).toBeNull()
  })

  it("discards only the active service draft and preserves unrelated work", async () => {
    const savedAt = new Date().toISOString()
    const medCertSessionId = "11111111-1111-4111-8111-111111111111"
    const consultSessionId = "22222222-2222-4222-8222-222222222222"
    vi.stubGlobal("window", {})
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true })))
    localStorage.setItem(
      "instantmed-request-draft",
      JSON.stringify({
        state: {
          serviceType: "med-cert",
          currentStepId: "symptoms",
          answers: { certType: "work" },
          lastSavedAt: savedAt,
        },
        version: 0,
      }),
    )
    localStorage.setItem(
      "instantmed-draft-med-cert",
      JSON.stringify({
        serviceType: "med-cert",
        currentStepId: "symptoms",
        answers: { certType: "work" },
        lastSavedAt: savedAt,
      }),
    )
    localStorage.setItem(
      "instantmed-draft-consult",
      JSON.stringify({
        serviceType: "consult",
        currentStepId: "ed-goals",
        answers: { consultSubtype: "ed", edGoal: "confidence" },
        lastSavedAt: savedAt,
      }),
    )
    localStorage.setItem("instantmed-server-draft-med-cert", medCertSessionId)
    localStorage.setItem("instantmed-server-draft-consult", consultSessionId)
    useRequestStore.setState({
      serviceType: "med-cert",
      currentStepId: "symptoms",
      answers: { certType: "work" },
      lastSavedAt: savedAt,
    })

    useRequestStore.getState().discardCurrentDraft()

    expect(localStorage.getItem("instantmed-request-draft")).toBeNull()
    expect(localStorage.getItem("instantmed-draft-med-cert")).toBeNull()
    expect(localStorage.getItem("instantmed-draft-consult")).not.toBeNull()
    expect(useRequestStore.getState().serviceType).toBeNull()
    expect(useRequestStore.getState().answers).toEqual({})
    await vi.waitFor(() => {
      expect(localStorage.getItem("instantmed-server-draft-med-cert")).toBeNull()
    })
    expect(localStorage.getItem("instantmed-server-draft-consult")).toBe(consultSessionId)
    expect(fetch).toHaveBeenCalledWith(
      `/api/draft?id=${medCertSessionId}`,
      expect.objectContaining({ method: "DELETE", keepalive: true }),
    )
  })

  it("deletes the stale tab's server bearer while preserving a fresh same-service local flow", async () => {
    const staleFlowInstanceId = "11111111-1111-4111-8111-111111111111"
    const freshFlowInstanceId = "22222222-2222-4222-8222-222222222222"
    const staleSessionId = "33333333-3333-4333-8333-333333333333"
    const savedAt = new Date().toISOString()
    vi.stubGlobal("window", {})
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true })))

    useRequestStore.setState({
      serviceType: "med-cert",
      flowInstanceId: staleFlowInstanceId,
      currentStepId: "symptoms",
      answers: { certType: "work" },
      lastSavedAt: savedAt,
    })
    const freshDraft = {
      serviceType: "med-cert",
      flowInstanceId: freshFlowInstanceId,
      currentStepId: "certificate",
      answers: { certType: "carer" },
      lastSavedAt: savedAt,
    }
    localStorage.setItem(
      "instantmed-draft-med-cert",
      JSON.stringify(freshDraft),
    )
    localStorage.setItem(
      "instantmed-request-draft",
      JSON.stringify({ state: freshDraft, version: 0 }),
    )
    localStorage.setItem("instantmed-server-draft-med-cert", staleSessionId)
    localStorage.setItem(
      "instantmed-server-draft-flow-med-cert",
      staleFlowInstanceId,
    )

    useRequestStore.getState().discardCurrentDraft()

    expect(JSON.parse(localStorage.getItem("instantmed-draft-med-cert")!))
      .toMatchObject({ flowInstanceId: freshFlowInstanceId })
    expect(JSON.parse(localStorage.getItem("instantmed-request-draft")!))
      .toMatchObject({ state: { flowInstanceId: freshFlowInstanceId } })
    await vi.waitFor(() => {
      expect(localStorage.getItem("instantmed-server-draft-med-cert")).toBeNull()
    })
    expect(fetch).toHaveBeenCalledWith(
      `/api/draft?id=${staleSessionId}&flow=${staleFlowInstanceId}`,
      expect.objectContaining({ method: "DELETE", keepalive: true }),
    )
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

  it("does not hydrate local PHI from an explicitly retired flow", async () => {
    expect(retireDraftFlow("med-cert", RETIRED_FLOW_INSTANCE_ID)).toBe(true)
    const draft = {
      serviceType: "med-cert",
      flowInstanceId: RETIRED_FLOW_INSTANCE_ID,
      currentStepId: "certificate",
      answers: { certType: "work", duration: "3" },
      lastSavedAt: new Date().toISOString(),
    }
    localStorage.setItem(
      "instantmed-request-draft",
      JSON.stringify({ state: draft, version: 0 }),
    )
    localStorage.setItem("instantmed-draft-med-cert", JSON.stringify(draft))

    await useRequestStore.persist.rehydrate()

    expect(useRequestStore.getState().serviceType).toBeNull()
    expect(useRequestStore.getState().answers).toEqual({})
    expect(localStorage.getItem("instantmed-request-draft")).toBeNull()
    expect(localStorage.getItem("instantmed-draft-med-cert")).toBeNull()
  })

  it("does not let a stale tab rewrite a retired flow after discard", async () => {
    expect(retireDraftFlow("med-cert", RETIRED_FLOW_INSTANCE_ID)).toBe(true)
    await useRequestStore.persist.rehydrate()
    useRequestStore.setState({
      serviceType: "med-cert",
      flowInstanceId: RETIRED_FLOW_INSTANCE_ID,
      currentStepId: "certificate",
      answers: { certType: "work" },
      lastSavedAt: new Date().toISOString(),
    })

    useRequestStore.getState().setAnswer("duration", "2")
    await new Promise((resolve) => setTimeout(resolve, 450))

    expect(localStorage.getItem("instantmed-request-draft")).toBeNull()
    expect(localStorage.getItem("instantmed-draft-med-cert")).toBeNull()
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
