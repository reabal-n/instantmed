import { canonicalizeServiceType } from "@/lib/request/draft-storage"

export const INTAKE_ANALYTICS_EVENTS = {
  started: "intake_started",
  stepViewed: "step_viewed",
  stepCompleted: "step_completed",
  checkoutViewed: "checkout_viewed",
  continueClicked: "intake_continue_clicked",
  validationBlocked: "intake_validation_blocked",
  answerChanged: "intake_answer_changed",
  abandoned: "intake_abandoned",
  passiveAbandoned: "intake_abandoned_passive",
  safetyPrecheckBlocked: "safety_precheck_blocked",
  backClicked: "request_step_back",
  stepJumped: "request_step_jumped",
  flowCompleted: "request_flow_completed",
  draftRestored: "request_draft_restored",
  draftDiscarded: "request_draft_discarded",
  consultDraftResumed: "consult_draft_resumed",
  consultDraftCleared: "consult_draft_cleared_for_new_subtype",
} as const

type IntakeAnalyticsEventName =
  (typeof INTAKE_ANALYTICS_EVENTS)[keyof typeof INTAKE_ANALYTICS_EVENTS]

export interface PostHogCaptureLike {
  capture: (event: string, properties?: Record<string, unknown>) => void
}

interface StepPropertiesInput {
  serviceType: string | null | undefined
  stepId: string
  stepIndex?: number
  totalSteps?: number
  subtype?: string
}

interface StepCompletedInput extends StepPropertiesInput {
  timeOnStepMs: number
}

interface ValidationBlockedInput extends StepPropertiesInput {
  blockers: string[]
}

interface AnswerChangedInput {
  serviceType: string | null | undefined
  subtype?: string
  stepId: string
  answerKey: string
  previousValue: unknown
  nextValue: unknown
}

interface AnalyticsEventPayload {
  event: IntakeAnalyticsEventName
  properties: Record<string, unknown>
}

interface PassiveAbandonmentBeaconInput {
  analyticsServiceType: string
  currentStepId: string
  currentStepIndex: number
  posthog: {
    config?: { token?: string; api_host?: string }
    get_distinct_id?: () => string
  } | null
  serviceType: string | null
}

const IDENTITY_KEYS = new Set([
  "firstName",
  "lastName",
  "fullName",
  "email",
  "phone",
  "dob",
  "dateOfBirth",
  "addressLine1",
  "addressLine2",
  "suburb",
  "state",
  "postcode",
  "addressVerified",
  "addressProviderPlaceId",
  "medicareNumber",
  "medicareIrn",
  "ihiNumber",
  "sex",
])

const CONSENT_KEY_PARTS = [
  "acknowledged",
  "confirmed",
  "consent",
  "agreed",
  "terms",
]

const PREFERENCE_KEY_PARTS = [
  "preference",
  "duration",
  "certType",
  "option",
  "goal",
  "onset",
  "timeSlot",
  "startDate",
]

const FREE_TEXT_KEY_PARTS = [
  "detail",
  "details",
  "notes",
  "reason",
  "info",
  "description",
  "symptomDetails",
  "currentDose",
  "dosageInstructions",
  "current_medications",
  "otherMedications",
  "allergies",
  "conditions",
]

export function normalizeIntakeAnalyticsServiceType(
  serviceType: string | null | undefined,
) {
  return canonicalizeServiceType(serviceType) ?? serviceType ?? "unknown"
}

function baseStepProperties(input: StepPropertiesInput) {
  const properties: Record<string, unknown> = {
    service_type: normalizeIntakeAnalyticsServiceType(input.serviceType),
    step_id: input.stepId,
  }

  if (typeof input.stepIndex === "number") {
    properties.step_number = input.stepIndex + 1
    properties.step_index = input.stepIndex
  }
  if (typeof input.totalSteps === "number") properties.total_steps = input.totalSteps
  if (input.subtype) properties.subtype = input.subtype

  return properties
}

export function buildIntakeStepViewedProperties(input: StepPropertiesInput) {
  return baseStepProperties(input)
}

export function buildIntakeContinueClickedProperties(input: StepPropertiesInput) {
  return baseStepProperties(input)
}

export function buildIntakeStepCompletedProperties(input: StepCompletedInput) {
  return {
    ...baseStepProperties(input),
    time_on_step_ms: input.timeOnStepMs,
  }
}

export function buildIntakeValidationBlockedProperties(input: ValidationBlockedInput) {
  return {
    ...baseStepProperties(input),
    blocker_count: input.blockers.length,
    blockers: input.blockers,
  }
}

export function captureIntakeEvent(
  posthog: PostHogCaptureLike | null | undefined,
  event: IntakeAnalyticsEventName,
  properties?: Record<string, unknown>,
) {
  posthog?.capture(event, properties)
}

export function buildPassiveAbandonmentBeacon({
  analyticsServiceType,
  currentStepId,
  currentStepIndex,
  posthog,
  serviceType,
}: PassiveAbandonmentBeaconInput): { payload: string; url: string } | null {
  if (currentStepIndex <= 0 || !serviceType) return null

  const token = posthog?.config?.token
  const distinctId = posthog?.get_distinct_id?.()
  if (!token || !distinctId) return null

  const apiHost = (posthog.config?.api_host ?? "https://us.i.posthog.com").replace(/\/+$/, "")
  return {
    url: `${apiHost}/capture/`,
    payload: JSON.stringify({
      api_key: token,
      event: INTAKE_ANALYTICS_EVENTS.passiveAbandoned,
      properties: {
        distinct_id: distinctId,
        service_type: analyticsServiceType,
        step_id: currentStepId,
        step_number: currentStepIndex + 1,
      },
      timestamp: new Date().toISOString(),
    }),
  }
}

export function buildIntakeAnswerChangedEvent(
  input: AnswerChangedInput,
): AnalyticsEventPayload | null {
  if (Object.is(input.previousValue, input.nextValue)) return null

  const previousState = getValueState(input.previousValue)
  const nextState = getValueState(input.nextValue)
  if (previousState === "empty" && nextState === "empty") return null

  const fieldCategory = classifyAnswerField(input.answerKey)
  const valueShape = getValueShape(input.answerKey, input.nextValue, fieldCategory)
  const changeType = getChangeType(previousState, nextState)

  // Text fields are useful for "first filled" and "cleared" analysis, but
  // emitting every keystroke would be noisy and still not clinically useful.
  if (
    previousState === "filled" &&
    nextState === "filled" &&
    valueShape === "redacted"
  ) {
    return null
  }

  const properties: Record<string, unknown> = {
    service_type: normalizeIntakeAnalyticsServiceType(input.serviceType),
    step_id: input.stepId,
    answer_key: input.answerKey,
    answer_group: getAnswerGroup(input.answerKey),
    field_category: fieldCategory,
    value_state: nextState,
    value_shape: valueShape,
    change_type: changeType,
  }

  if (input.subtype) properties.subtype = input.subtype
  if (Array.isArray(input.nextValue)) {
    properties.item_count = input.nextValue.length
  }

  return {
    event: INTAKE_ANALYTICS_EVENTS.answerChanged,
    properties,
  }
}

function getValueState(value: unknown): "empty" | "filled" {
  if (value === null || value === undefined) return "empty"
  if (typeof value === "string" && value.trim() === "") return "empty"
  if (Array.isArray(value) && value.length === 0) return "empty"
  return "filled"
}

function getChangeType(
  previousState: "empty" | "filled",
  nextState: "empty" | "filled",
) {
  if (previousState === "empty" && nextState === "filled") return "filled"
  if (previousState === "filled" && nextState === "empty") return "cleared"
  return "changed"
}

function classifyAnswerField(answerKey: string) {
  if (IDENTITY_KEYS.has(answerKey)) return "identity"

  const normalized = answerKey.toLowerCase()
  if (CONSENT_KEY_PARTS.some((part) => normalized.includes(part))) return "consent"
  if (PREFERENCE_KEY_PARTS.some((part) => normalized.includes(part.toLowerCase()))) {
    return "preference"
  }

  return "clinical"
}

function getAnswerGroup(answerKey: string) {
  if (IDENTITY_KEYS.has(answerKey)) return "identity"

  const lower = answerKey.toLowerCase()
  if (lower.startsWith("uti")) return "uti"
  if (lower.startsWith("ed") || lower.startsWith("iief")) return "ed"
  if (lower.startsWith("hair")) return "hair_loss"
  if (lower.startsWith("periodpain")) return "period_pain"
  if (lower.startsWith("contraception")) return "contraception"
  if (lower.startsWith("weightloss") || lower.startsWith("wl")) return "weight_loss"
  if (lower.includes("medication") || lower.includes("dose") || lower.includes("prescription")) {
    return "medication"
  }
  if (lower.includes("allerg") || lower.includes("condition")) return "medical_history"
  if (lower.includes("symptom")) return "symptoms"
  if (lower.includes("cert") || lower.includes("duration") || lower.includes("startdate")) {
    return "certificate"
  }

  return "general"
}

function getValueShape(
  answerKey: string,
  value: unknown,
  fieldCategory: string,
) {
  if (fieldCategory === "identity") return "redacted"
  if (isFreeTextKey(answerKey)) return "redacted"
  if (Array.isArray(value)) return "array"
  if (typeof value === "boolean") return "boolean"
  if (typeof value === "number") return "number"
  if (typeof value === "string") return "string"
  if (value === null || value === undefined) return "empty"
  return "object"
}

function isFreeTextKey(answerKey: string) {
  const lower = answerKey.toLowerCase()
  return FREE_TEXT_KEY_PARTS.some((part) => lower.includes(part.toLowerCase()))
}
