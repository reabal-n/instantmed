import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@/lib/analytics/capture", () => ({ capture: vi.fn() }))

import { useRequestStore } from "@/components/request/store"

describe("request progress navigation", () => {
  beforeEach(() => {
    useRequestStore.setState(useRequestStore.getInitialState(), true)
    useRequestStore.setState({
      serviceType: "med-cert",
      currentStepId: "certificate",
      answers: {
        certType: "work",
        duration: "1",
        startDate: "2026-07-16",
      },
    })
  })

  it("records the furthest visited step after a validated advance", () => {
    useRequestStore.getState().nextStep()

    expect(useRequestStore.getState().currentStepId).toBe("symptoms")
    expect(useRequestStore.getState().furthestVisitedStepId).toBe("symptoms")
  })

  it("blocks a later visited step until a material edit is revalidated", () => {
    useRequestStore.getState().nextStep()
    useRequestStore.getState().nextStep()
    useRequestStore.getState().nextStep()
    expect(useRequestStore.getState().currentStepId).toBe("checkout")

    useRequestStore.getState().goToStep("symptoms")
    useRequestStore.getState().setAnswer("symptomDetails", "A mild headache since this morning")
    useRequestStore.getState().goToStep("checkout")

    expect(useRequestStore.getState().currentStepId).toBe("symptoms")
    expect(useRequestStore.getState().stepsNeedingRevalidation).toContain("symptoms")
  })

  it("returns directly to a previously visited later step when nothing changed", () => {
    useRequestStore.getState().nextStep()
    useRequestStore.getState().nextStep()
    useRequestStore.getState().nextStep()

    useRequestStore.getState().goToStep("symptoms")
    useRequestStore.getState().goToStep("checkout")

    expect(useRequestStore.getState().currentStepId).toBe("checkout")
  })

  // P2.1 merged `medication-history` into `medication`, so the medicine ->
  // dose/attestation dependency became intra-step and the registry's
  // `invalidatesSteps` hop is gone. The guarantee it bought must survive: a
  // patient who edits their medicine at review cannot get back to pay without
  // passing the merged step's own validated Continue (which re-demands the
  // unchanged-regimen attestation that syncToStore clears on a medicine edit).
  it("blocks the pay step after a medicine edit until the merged medication step revalidates", () => {
    useRequestStore.setState({
      serviceType: "repeat-script",
      currentStepId: "medication",
      furthestVisitedStepId: null,
      stepsNeedingRevalidation: [],
      answers: {
        medications: [{ name: "Existing medicine" }],
        prescriptionHistory: "less_than_3_months",
        currentDose: "One daily",
        indication: "Existing indication",
        doseChanged: false,
        hasSideEffects: false,
        hasAllergies: false,
        hasConditions: false,
        hasOtherMedications: false,
        isPregnantOrBreastfeeding: false,
      },
    })
    useRequestStore.getState().setAuthContext({
      isAuthenticated: true,
      hasProfile: true,
      hasCompleteIdentity: true,
      hasMedicare: true,
      hasAddress: true,
      hasPhone: true,
      hasSex: true,
    })
    // medication -> medical-history -> review (details is skipped for a
    // complete authenticated profile).
    useRequestStore.getState().nextStep()
    useRequestStore.getState().nextStep()
    expect(useRequestStore.getState().currentStepId).toBe("review")

    useRequestStore.getState().goToStep("medication")
    useRequestStore.getState().setAnswer("medications", [{ name: "Updated medicine" }])
    expect(useRequestStore.getState().stepsNeedingRevalidation).toEqual(["medication"])

    // The edit pins the reachable ceiling to the merged step itself.
    useRequestStore.getState().goToStep("review")
    expect(useRequestStore.getState().currentStepId).toBe("medication")

    // Unrelated later work is untouched — only the edited step is re-gated.
    useRequestStore.getState().nextStep()
    expect(useRequestStore.getState().currentStepId).toBe("medical-history")
    expect(useRequestStore.getState().stepsNeedingRevalidation).toEqual([])

    useRequestStore.getState().goToStep("review")
    expect(useRequestStore.getState().currentStepId).toBe("review")
  })

  it("treats a changed bulk answer update as a material edit", () => {
    useRequestStore.getState().nextStep()
    useRequestStore.getState().nextStep()
    useRequestStore.getState().nextStep()
    useRequestStore.getState().goToStep("symptoms")

    useRequestStore.getState().setAnswers({
      symptomDetails: "A mild headache and fatigue since this morning",
      symptomDuration: "today",
    })
    useRequestStore.getState().goToStep("checkout")

    expect(useRequestStore.getState().currentStepId).toBe("symptoms")
  })

  it("requires details revalidation after an identity edit", () => {
    useRequestStore.getState().nextStep()
    useRequestStore.getState().nextStep()
    useRequestStore.getState().nextStep()
    useRequestStore.getState().goToStep("details")

    useRequestStore.getState().setIdentity({ firstName: "Rey" })
    useRequestStore.getState().goToStep("checkout")

    expect(useRequestStore.getState().currentStepId).toBe("details")
  })

  it("revalidates the women’s-health assessment after changing pathway type", () => {
    useRequestStore.setState({
      serviceType: "consult",
      currentStepId: "womens-health-type",
      furthestVisitedStepId: null,
      stepsNeedingRevalidation: [],
      answers: {
        consultSubtype: "womens_health",
        womensHealthOption: "uti",
      },
    })
    useRequestStore.getState().setAuthContext({
      isAuthenticated: true,
      hasProfile: true,
      hasCompleteIdentity: true,
      hasMedicare: true,
      hasAddress: true,
      hasPhone: true,
      hasSex: true,
    })
    useRequestStore.getState().nextStep()
    useRequestStore.getState().nextStep()
    useRequestStore.getState().nextStep()
    expect(useRequestStore.getState().currentStepId).toBe("review")

    useRequestStore.getState().goToStep("womens-health-type")
    useRequestStore.getState().setAnswer("womensHealthOption", "ocp_new")
    useRequestStore.getState().nextStep()
    useRequestStore.getState().goToStep("review")
    expect(useRequestStore.getState().currentStepId).toBe("womens-health-assessment")

    useRequestStore.getState().nextStep()
    useRequestStore.getState().goToStep("review")
    expect(useRequestStore.getState().currentStepId).toBe("review")
  })

  it("clears hidden UTI answers when switching to the new-pill pathway", () => {
    useRequestStore.setState({
      serviceType: "consult",
      currentStepId: "womens-health-type",
      furthestVisitedStepId: "review",
      stepsNeedingRevalidation: [],
      answers: {
        consultSubtype: "womens_health",
        womensHealthOption: "uti",
        utiSymptoms: ["burning"],
        utiRedFlags: "yes",
        utiPregnant: "not_sure",
        utiDetails: "Symptoms started yesterday",
        hasConditions: false,
      },
    })

    useRequestStore.getState().setAnswer("womensHealthOption", "ocp_new")

    expect(useRequestStore.getState().answers).toEqual({
      consultSubtype: "womens_health",
      womensHealthOption: "ocp_new",
      hasConditions: false,
    })
  })

  it("resets progress metadata when the consult subtype branch changes", () => {
    useRequestStore.setState({
      serviceType: "consult",
      currentStepId: "review",
      furthestVisitedStepId: "review",
      stepsNeedingRevalidation: ["ed-health"],
      answers: { consultSubtype: "ed" },
    })

    useRequestStore.getState().setAnswer("consultSubtype", "hair_loss")

    expect(useRequestStore.getState().furthestVisitedStepId).toBeNull()
    expect(useRequestStore.getState().stepsNeedingRevalidation).toEqual([])
  })

  it("does not create revalidation work for URL or profile prefills", () => {
    useRequestStore.setState({
      serviceType: "consult",
      currentStepId: "womens-health-type",
      furthestVisitedStepId: null,
      stepsNeedingRevalidation: [],
      answers: { consultSubtype: "womens_health" },
    })

    useRequestStore.getState().setAnswer("womensHealthOption", "uti", { touch: false })
    useRequestStore.getState().setAnswer("medicareNumber", "2950017091", { touch: false })
    useRequestStore.getState().setIdentity({ firstName: "Rey" }, { touch: false })

    expect(useRequestStore.getState().stepsNeedingRevalidation).toEqual([])
    expect(useRequestStore.getState().furthestVisitedStepId).toBeNull()
  })
})
