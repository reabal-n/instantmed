import { readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

import {
  buildIntakeAnswerChangedEvent,
  buildIntakeContinueClickedProperties,
  buildIntakeEngagedProperties,
  buildIntakeStepCompletedProperties,
  buildIntakeStepViewedProperties,
  buildIntakeValidationBlockedProperties,
  INTAKE_ANALYTICS_EVENTS,
} from "@/lib/analytics/intake-events"

const root = process.cwd()
const requestStepsDir = join(root, "components/request/steps")

function readProjectFile(path: string) {
  return readFileSync(join(root, path), "utf8")
}

describe("intake analytics events", () => {
  it("keeps funnel event names canonical for existing PostHog dashboards", () => {
    expect(INTAKE_ANALYTICS_EVENTS.started).toBe("intake_started")
    expect(INTAKE_ANALYTICS_EVENTS.stepViewed).toBe("step_viewed")
    expect(INTAKE_ANALYTICS_EVENTS.stepCompleted).toBe("step_completed")
    expect(INTAKE_ANALYTICS_EVENTS.checkoutViewed).toBe("checkout_viewed")
    expect(INTAKE_ANALYTICS_EVENTS.engaged).toBe("intake_engaged")
    expect(INTAKE_ANALYTICS_EVENTS.validationBlocked).toBe("intake_validation_blocked")
  })

  it("builds step view and completion payloads without patient-entered values", () => {
    expect(
      buildIntakeStepViewedProperties({
        flowInstanceId: "11111111-1111-4111-8111-111111111111",
        serviceType: "consult",
        stepId: "ed-goals",
        stepIndex: 0,
        totalSteps: 6,
        subtype: "ed",
      }),
    ).toEqual({
      service_type: "consult",
      flow_instance_id: "11111111-1111-4111-8111-111111111111",
      step_id: "ed-goals",
      step_number: 1,
      step_index: 0,
      total_steps: 6,
      subtype: "ed",
    })

    expect(
      buildIntakeStepCompletedProperties({
        flowInstanceId: "11111111-1111-4111-8111-111111111111",
        serviceType: "consult",
        stepId: "ed-goals",
        stepIndex: 0,
        totalSteps: 6,
        subtype: "ed",
        timeOnStepMs: 4200,
      }),
    ).toEqual({
      service_type: "consult",
      flow_instance_id: "11111111-1111-4111-8111-111111111111",
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

  it("builds a keyed first-interaction payload without answer values", () => {
    expect(
      buildIntakeEngagedProperties({
        flowInstanceId: "11111111-1111-4111-8111-111111111111",
        serviceType: "repeat-script",
        stepId: "medication",
      }),
    ).toEqual({
      service_type: "prescription",
      flow_instance_id: "11111111-1111-4111-8111-111111111111",
      step_id: "medication",
    })
  })

  it("tracks answer changes as safe metadata only", () => {
    const event = buildIntakeAnswerChangedEvent({
      flowInstanceId: "11111111-1111-4111-8111-111111111111",
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
        flow_instance_id: "11111111-1111-4111-8111-111111111111",
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
    for (const answerKey of [
      "symptomDetails",
      "medicationName",
      "medicationStrength",
      "medicationForm",
      "indication",
      "sideEffects",
    ]) {
      expect(
        buildIntakeAnswerChangedEvent({
          serviceType: "repeat-script",
          stepId: "medication",
          answerKey,
          previousValue: "first patient-entered value",
          nextValue: "edited patient-entered value",
        }),
        answerKey,
      ).toBeNull()
    }
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
      block_type: "validation",
      blocker_count: 2,
      blockers: ["nitrate use", "GP clearance"],
    })
  })

  it("classifies clinical and pathway blockers without patient-entered values", () => {
    expect(
      buildIntakeValidationBlockedProperties({
        flowInstanceId: "11111111-1111-4111-8111-111111111111",
        serviceType: "repeat-script",
        stepId: "medication",
        blockType: "clinical_hard_block",
        blockers: ["controlled_substance"],
      }),
    ).toEqual({
      service_type: "prescription",
      flow_instance_id: "11111111-1111-4111-8111-111111111111",
      step_id: "medication",
      block_type: "clinical_hard_block",
      blocker_count: 1,
      blockers: ["controlled_substance"],
    })

    expect(
      buildIntakeValidationBlockedProperties({
        serviceType: "repeat-script",
        stepId: "medication",
        blockType: "service_steer",
        resolution: "redirected",
        blockers: ["dedicated_service_steer"],
      }),
    ).toEqual({
      service_type: "prescription",
      step_id: "medication",
      block_type: "service_steer",
      resolution: "redirected",
      blocker_count: 1,
      blockers: ["dedicated_service_steer"],
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

  it("records the current-pill handoff as intentional progress with fixed privacy-safe tokens", () => {
    const womensTypeSource = readProjectFile("components/request/steps/womens-health-type-step.tsx")
    const flowAnalyticsSource = readProjectFile("components/request/hooks/use-flow-analytics.ts")

    expect(womensTypeSource).toContain("buildIntakeValidationBlockedProperties")
    expect(womensTypeSource).toContain("INTAKE_ANALYTICS_EVENTS.validationBlocked")
    expect(womensTypeSource).toContain('blockType: "service_steer"')
    expect(womensTypeSource).toContain('blockers: ["current_pill_repeat_handoff"]')
    expect(womensTypeSource).toContain('resolution: "redirected"')
    expect(womensTypeSource).toContain("markIntentionalNavigation()")
    expect(womensTypeSource).toContain('params.set("from", "womens-health-repeat-handoff")')
    expect(flowAnalyticsSource).toContain('"womens-health-repeat-handoff"')
    expect(flowAnalyticsSource).not.toMatch(/entry_ref:\s*searchParams\.get/)
  })

  it("keeps every request-step completion on the one canonical flow hook", () => {
    const stepPaths = readdirSync(requestStepsDir)
      .filter((file) => file.endsWith("-step.tsx"))
      .map((file) => `components/request/steps/${file}`)

    for (const path of stepPaths) {
      const source = readProjectFile(path)
      expect(source, `${path} must not emit a second completion schema`).not.toContain(
        'capture("step_completed"',
      )
      expect(source, `${path} must not emit a second completion schema`).not.toContain(
        "capture('step_completed'",
      )
    }
  })

  it("wires medication validation and pathway exits to privacy-safe blocker keys", () => {
    const medicationSource = readProjectFile("components/request/steps/medication-step.tsx")

    expect(medicationSource).toContain("buildIntakeValidationBlockedProperties")
    expect(medicationSource).toContain("INTAKE_ANALYTICS_EVENTS.validationBlocked")
    expect(medicationSource).toContain("const blockers = Object.keys(newErrors)")
    expect(medicationSource).toContain('blockType: "clinical_hard_block"')
    expect(medicationSource).toContain('blockers: ["controlled_substance"]')
    expect(medicationSource).toContain('blockType: "service_steer"')
    expect(medicationSource).toContain('blockers: ["dedicated_service_steer"]')
    expect(medicationSource).toMatch(
      /captureMedicationBlock\(\{\s*blockType: "validation",\s*blockers,\s*resolution: "shown",\s*\}\)/,
    )
    expect(medicationSource).not.toContain("blockers: Object.values(newErrors)")
  })

  it("separates passive arrival from the first user-touched answer", () => {
    const storeSource = readProjectFile("components/request/store.ts")

    expect(storeSource).toContain("INTAKE_ANALYTICS_EVENTS.engaged")
    expect(storeSource).toContain("buildIntakeEngagedProperties")
    expect(storeSource).toContain("if (tracksProgress && flowInstanceId)")
    expect(storeSource).toContain("capturedEngagementFlowIds.has(flowInstanceId)")
  })

  it("keeps specialty completion on the centralized subtype-aware funnel hook", () => {
    for (const path of [
      "components/request/steps/ed-goals-step.tsx",
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
    const paymentFinalizer = readProjectFile("lib/stripe/confirmed-payment-finalization.ts")

    expect(reviewStep.match(/consult_subtype: answers\.consultSubtype/g)?.length).toBeGreaterThanOrEqual(5)
    expect(posthogServer).toContain("subtype?: string | null")
    expect(posthogServer).toContain("subtype: event.subtype")
    expect(authenticatedCheckout).toContain("subtype: input.subtype")
    expect(authenticatedPersistence).toContain("subtype: input.subtype")
    expect(guestCheckout.match(/subtype: input\.subtype/g)?.length).toBeGreaterThanOrEqual(2)
    expect(retryCheckout).toContain("subtype: intake.subtype")
    expect(paymentFinalizer).toContain("attribution?.subtype")
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
