import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

import {
  buildIntakeAnswerChangedEvent,
  buildIntakeContinueClickedProperties,
  buildIntakeStepCompletedProperties,
  buildIntakeStepViewedProperties,
  buildIntakeValidationBlockedProperties,
  INTAKE_ANALYTICS_EVENTS,
} from "@/lib/analytics/intake-events"

const root = process.cwd()

function readProjectFile(path: string) {
  return readFileSync(join(root, path), "utf8")
}

describe("intake analytics events", () => {
  it("keeps funnel event names canonical for existing PostHog dashboards", () => {
    expect(INTAKE_ANALYTICS_EVENTS.started).toBe("intake_started")
    expect(INTAKE_ANALYTICS_EVENTS.stepViewed).toBe("step_viewed")
    expect(INTAKE_ANALYTICS_EVENTS.stepCompleted).toBe("step_completed")
    expect(INTAKE_ANALYTICS_EVENTS.checkoutViewed).toBe("checkout_viewed")
    expect(INTAKE_ANALYTICS_EVENTS.validationBlocked).toBe("intake_validation_blocked")
  })

  it("builds step view and completion payloads without patient-entered values", () => {
    expect(
      buildIntakeStepViewedProperties({
        serviceType: "consult",
        stepId: "ed-goals",
        stepIndex: 0,
        totalSteps: 6,
        subtype: "ed",
      }),
    ).toEqual({
      service_type: "consult",
      step_id: "ed-goals",
      step_number: 1,
      step_index: 0,
      total_steps: 6,
      subtype: "ed",
    })

    expect(
      buildIntakeStepCompletedProperties({
        serviceType: "consult",
        stepId: "ed-goals",
        stepIndex: 0,
        totalSteps: 6,
        subtype: "ed",
        timeOnStepMs: 4200,
      }),
    ).toEqual({
      service_type: "consult",
      step_id: "ed-goals",
      step_number: 1,
      step_index: 0,
      total_steps: 6,
      subtype: "ed",
      time_on_step_ms: 4200,
    })
  })

  it("records continue clicks separately from completed steps", () => {
    expect(
      buildIntakeContinueClickedProperties({
        serviceType: "repeat-script",
        stepId: "medical-history",
        stepIndex: 1,
        totalSteps: 4,
      }),
    ).toEqual({
      service_type: "prescription",
      step_id: "medical-history",
      step_number: 2,
      step_index: 1,
      total_steps: 4,
    })
  })

  it("tracks answer changes as safe metadata only", () => {
    const event = buildIntakeAnswerChangedEvent({
      serviceType: "consult",
      subtype: "womens_health",
      stepId: "womens-health-assessment",
      answerKey: "utiSymptoms",
      previousValue: [],
      nextValue: ["burning", "frequency"],
    })

    expect(event).toEqual({
      event: "intake_answer_changed",
      properties: {
        service_type: "consult",
        subtype: "womens_health",
        step_id: "womens-health-assessment",
        answer_key: "utiSymptoms",
        answer_group: "uti",
        field_category: "clinical",
        value_state: "filled",
        value_shape: "array",
        item_count: 2,
        change_type: "filled",
      },
    })
    expect(JSON.stringify(event)).not.toContain("burning")
    expect(JSON.stringify(event)).not.toContain("frequency")
  })

  it("does not emit noisy text keystroke changes after a text field is already filled", () => {
    expect(
      buildIntakeAnswerChangedEvent({
        serviceType: "med-cert",
        stepId: "symptoms",
        answerKey: "symptomDetails",
        previousValue: "cough",
        nextValue: "cough and sore throat",
      }),
    ).toBeNull()
  })

  it("redacts identity and free-text answer values by construction", () => {
    expect(
      buildIntakeAnswerChangedEvent({
        serviceType: "consult",
        stepId: "details",
        answerKey: "medicareNumber",
        previousValue: "",
        nextValue: "6100600875",
      }),
    ).toEqual({
      event: "intake_answer_changed",
      properties: {
        service_type: "consult",
        step_id: "details",
        answer_key: "medicareNumber",
        answer_group: "identity",
        field_category: "identity",
        value_state: "filled",
        value_shape: "redacted",
        change_type: "filled",
      },
    })
  })

  it("still emits non-text clinical selector changes for drop-off analysis", () => {
    expect(
      buildIntakeAnswerChangedEvent({
        serviceType: "consult",
        stepId: "ed-health",
        answerKey: "takes_medications",
        previousValue: "yes",
        nextValue: "no",
      }),
    ).toEqual({
      event: "intake_answer_changed",
      properties: {
        service_type: "consult",
        step_id: "ed-health",
        answer_key: "takes_medications",
        answer_group: "medication",
        field_category: "clinical",
        value_state: "filled",
        value_shape: "string",
        change_type: "changed",
      },
    })
  })

  it("summarizes validation blockers without answer values", () => {
    expect(
      buildIntakeValidationBlockedProperties({
        serviceType: "consult",
        stepId: "ed-health",
        stepIndex: 3,
        totalSteps: 6,
        blockers: ["nitrate use", "GP clearance"],
      }),
    ).toEqual({
      service_type: "consult",
      step_id: "ed-health",
      step_number: 4,
      step_index: 3,
      total_steps: 6,
      blocker_count: 2,
      blockers: ["nitrate use", "GP clearance"],
    })
  })

  it("keeps intake validation blocked wired to med-cert and women's-health blocker summaries", () => {
    const certificateSource = readProjectFile("components/request/steps/certificate-step.tsx")
    const symptomsSource = readProjectFile("components/request/steps/symptoms-step.tsx")
    const womensTypeSource = readProjectFile("components/request/steps/womens-health-type-step.tsx")
    const womensAssessmentSource = readProjectFile("components/request/steps/womens-health-assessment-step.tsx")

    expect(certificateSource).toContain("buildIntakeValidationBlockedProperties")
    expect(certificateSource).toContain("INTAKE_ANALYTICS_EVENTS.validationBlocked")
    expect(certificateSource).toContain('stepId: "certificate"')

    expect(symptomsSource).toContain("buildIntakeValidationBlockedProperties")
    expect(symptomsSource).toContain("INTAKE_ANALYTICS_EVENTS.validationBlocked")
    expect(symptomsSource).toContain('stepId: "symptoms"')

    expect(womensTypeSource).toContain('stepId: "womens-health-type"')
    expect(womensTypeSource).toContain("subtype: answers.consultSubtype")

    expect(womensAssessmentSource.match(/stepId: "womens-health-assessment"/g)).toHaveLength(2)
    expect(womensAssessmentSource.match(/subtype: answers\.consultSubtype/g)).toHaveLength(2)
  })

  // P2.1 merged medication-history into medication-step. The merged step now
  // owns the prescription-history, dose, indication, and side-effect answers,
  // so its completion payload is the surface that could leak them. It may fire
  // the legacy local `step_completed` (every other step does), but the payload
  // stays a count — the centralized hook owns the PHI-safe funnel properties.
  it("keeps the merged medication step's completion payload free of clinical answers", () => {
    const medicationSource = readProjectFile("components/request/steps/medication-step.tsx")

    // Pinned as the whole payload, so ANY added property fails this test
    // rather than only the clinical names we thought to grep for.
    expect(medicationSource).toContain(
      "posthog?.capture('step_completed', { step: 'medication', medication_count: medications.filter((m) => m.name.trim()).length })",
    )
    expect(medicationSource).not.toContain("prescription_history")
    expect(medicationSource).not.toContain("has_side_effects")
    expect(medicationSource).not.toContain("current_dose")
  })

  it("keeps specialty completion on the centralized subtype-aware funnel hook", () => {
    for (const path of [
      "components/request/steps/ed-goals-step.tsx",
      "components/request/steps/ed-assessment-step.tsx",
      "components/request/steps/ed-health-step.tsx",
      "components/request/steps/ed-preferences-step.tsx",
      "components/request/steps/hair-loss-goals-step.tsx",
      "components/request/steps/hair-loss-assessment-step.tsx",
      "components/request/steps/hair-loss-health-step.tsx",
      "components/request/steps/hair-loss-preferences-step.tsx",
      "components/request/steps/medical-history-step.tsx",
      "components/request/steps/patient-details-step.tsx",
    ]) {
      const source = readProjectFile(path)
      expect(source, path).not.toContain('capture("step_completed"')
      expect(source, path).not.toContain("capture('step_completed'")
    }
  })

  it("carries consult subtype through checkout and server-side payment funnel events", () => {
    const reviewStep = readProjectFile("components/request/steps/review-step.tsx")
    const posthogServer = readProjectFile("lib/analytics/posthog-server.ts")
    const authenticatedCheckout = readProjectFile("lib/stripe/checkout.ts")
    const authenticatedPersistence = readProjectFile("lib/stripe/checkout/persistence.ts")
    const guestCheckout = readProjectFile("lib/stripe/guest-checkout.ts")
    const retryCheckout = readProjectFile("lib/stripe/checkout/retry-payment.ts")
    const webhook = readProjectFile("app/api/stripe/webhook/handlers/checkout-session-completed.ts")

    expect(reviewStep.match(/consult_subtype: answers\.consultSubtype/g)?.length).toBeGreaterThanOrEqual(5)
    expect(posthogServer).toContain("subtype?: string | null")
    expect(posthogServer).toContain("subtype: event.subtype")
    expect(authenticatedCheckout).toContain("subtype: input.subtype")
    expect(authenticatedPersistence).toContain("subtype: input.subtype")
    expect(guestCheckout.match(/subtype: input\.subtype/g)?.length).toBeGreaterThanOrEqual(2)
    expect(retryCheckout).toContain("subtype: intake.subtype")
    expect(webhook).toContain("subtype: intakeAttribution?.subtype")
  })

  it("progressively discloses manual address fields and labels ED body metrics optional", () => {
    const detailsSource = readProjectFile("components/request/steps/patient-details-step.tsx")

    expect(detailsSource).toContain("manualAddressEntry")
    expect(detailsSource).toContain("needsAddress && manualAddressEntry")
    expect(detailsSource).toContain("Height &amp; weight (optional)")
    expect(detailsSource).toContain("You can continue without it.")
    expect(detailsSource).toContain("buildIntakeValidationBlockedProperties")
    expect(detailsSource).toContain('stepId: "details"')
    expect(detailsSource).toContain("subtype: consultSubtype")
  })
})
