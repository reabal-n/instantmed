/**
 * Pins the edit-mode navigation escape in the request store.
 *
 * When an authenticated user with a complete profile opens the review/pay
 * step, the 'details' step is filtered out of the active sequence by canSkip.
 * The review step's "Edit" still navigates to it (edit mode). Before the fix,
 * nextStep()/prevStep() resolved against the ACTIVE sequence only, returned
 * null for the skipped step, and silently did nothing — stranding the patient
 * on an inescapable step at the moment of payment (2026-07-02 audit, P1).
 */
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@/lib/analytics/capture", () => ({ capture: vi.fn() }))

import { useRequestStore } from "@/components/request/store"

const AUTHED_COMPLETE_PROFILE = {
  isAuthenticated: true,
  hasProfile: true,
  hasCompleteIdentity: true,
  hasMedicare: true,
  hasAddress: true,
  hasPhone: true,
  hasSex: true,
}

describe("request store edit-mode navigation escape", () => {
  beforeEach(() => {
    useRequestStore.getState().reset?.()
    useRequestStore.setState({
      serviceType: "med-cert",
      currentStepId: "certificate",
      answers: { certType: "work" },
    })
    useRequestStore.getState().setAuthContext(AUTHED_COMPLETE_PROFILE)
  })

  it("skips details in the active sequence for authed complete-profile users", () => {
    // Precondition for the scenario: 'details' must actually be skipped,
    // otherwise this test is exercising normal navigation.
    useRequestStore.setState({ currentStepId: "symptoms" })
    useRequestStore.getState().nextStep()
    expect(useRequestStore.getState().currentStepId).toBe("checkout")
  })

  it("Continue on an edit-mode (skipped) step returns to the review/pay step", () => {
    // Simulate review-step's Edit → goToStep('details') while details is
    // filtered out of activeSteps.
    useRequestStore.setState({ currentStepId: "checkout" })
    useRequestStore.getState().goToStep("details")
    expect(useRequestStore.getState().currentStepId).toBe("details")

    useRequestStore.getState().nextStep()
    expect(useRequestStore.getState().currentStepId).toBe("checkout")
  })

  it("Back on an edit-mode (skipped) step also returns to the review/pay step", () => {
    useRequestStore.setState({ currentStepId: "checkout" })
    useRequestStore.getState().goToStep("details")
    expect(useRequestStore.getState().currentStepId).toBe("details")

    useRequestStore.getState().prevStep()
    expect(useRequestStore.getState().currentStepId).toBe("checkout")
  })

  it("does not override the normal end-of-flow null on the last active step", () => {
    useRequestStore.setState({ currentStepId: "checkout" })
    useRequestStore.getState().nextStep()
    // checkout is the final step — nextStep must stay put (completion is
    // handled by onComplete, not nextStep).
    expect(useRequestStore.getState().currentStepId).toBe("checkout")
  })

  it("clears skipped Details revalidation only after Continue returns to review", () => {
    useRequestStore.setState({
      currentStepId: "checkout",
      furthestVisitedStepId: "checkout",
      stepsNeedingRevalidation: [],
    })
    useRequestStore.getState().goToStep("details")
    useRequestStore.getState().setIdentity({ firstName: "Updated" })
    expect(useRequestStore.getState().stepsNeedingRevalidation).toContain("details")

    useRequestStore.getState().nextStep()

    expect(useRequestStore.getState().currentStepId).toBe("checkout")
    expect(useRequestStore.getState().stepsNeedingRevalidation).not.toContain("details")
  })

  it("keeps a dirty skipped Details step open when Back cannot safely validate it", () => {
    useRequestStore.setState({
      currentStepId: "checkout",
      furthestVisitedStepId: "checkout",
      stepsNeedingRevalidation: [],
    })
    useRequestStore.getState().goToStep("details")
    useRequestStore.getState().setIdentity({ firstName: "Updated" })

    useRequestStore.getState().prevStep()

    expect(useRequestStore.getState().currentStepId).toBe("details")
    expect(useRequestStore.getState().stepsNeedingRevalidation).toContain("details")
  })

  it("does not let progress navigation bypass validation on a dirty skipped Details step", () => {
    useRequestStore.setState({
      currentStepId: "checkout",
      furthestVisitedStepId: "checkout",
      stepsNeedingRevalidation: [],
    })
    useRequestStore.getState().goToStep("details")
    useRequestStore.getState().setIdentity({ firstName: "Updated" })

    useRequestStore.getState().goToStep("checkout")

    expect(useRequestStore.getState().currentStepId).toBe("details")
    expect(useRequestStore.getState().stepsNeedingRevalidation).toContain("details")
  })
})
