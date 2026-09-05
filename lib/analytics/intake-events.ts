import { capture as captureWithRetry } from "@/lib/analytics/capture"
import { normalizeFlowInstanceId } from "@/lib/analytics/flow-instance"
import { canonicalizeServiceType } from "@/lib/request/draft-storage"

export const INTAKE_ANALYTICS_EVENTS = {
  started: "intake_started",
  engaged: "intake_engaged",
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
  // Dedicated-service routing out of the repeat lane: how often a steer is
  // shown and whether patients follow it. Subtype/enforcement tokens only —
  // never the typed medication text.
  medicationSteerShown: "medication_steer_shown",
  medicationSteerFollowed: "medication_steer_followed",
  medicationSteerContextSelected: "medication_steer_context_selected",
} as const

const INTAKE_ENTRY_REF_VALUES = [
  "repeat-steer",
  "womens-health-repeat-handoff",
] as const

export type IntakeEntryRef = (typeof INTAKE_ENTRY_REF_VALUES)[number]

const INTAKE_ENTRY_REFS: ReadonlySet<string> = new Set(INTAKE_ENTRY_REF_VALUES)

/** Keep arbitrary query-string text out of analytics event properties. */
export function normalizeIntakeEntryRef(value: unknown): IntakeEntryRef | null {
  return typeof value === "string" && INTAKE_ENTRY_REFS.has(value)
    ? value as IntakeEntryRef
    : null
}

type IntakeAnalyticsEventName =
  (typeof INTAKE_ANALYTICS_EVENTS)[keyof typeof INTAKE_ANALYTICS_EVENTS]

export interface PostHogCaptureLike {
  capture: (event: string, properties?: Record<string, unknown>) => void
}

type IntakeCaptureFallback = (
  event: string,
  properties?: Record<string, unknown>,
) => void

interface StepPropertiesInput {
  flowInstanceId?: string | null
  serviceType: string | null | undefined
  stepId: string
  stepIndex?: number
  totalSteps?: number
  subtype?: string
}

interface StepCompletedInput extends StepPropertiesInput {
  timeOnStepMs: number
}

export type IntakeBlockType =
  | "validation"
  | "clinical_hard_block"
  | "service_steer"

export type IntakeBlockResolution = "shown" | "redirected" | "overridden"

interface ValidationBlockedInput extends StepPropertiesInput {
  blockType?: IntakeBlockType
  blockers: string[]
  resolution?: IntakeBlockResolution
}

interface AnswerChangedInput {
  flowInstanceId?: string | null
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
  flowInstanceId?: string | null
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
  "indication",
  "medicationForm",
  "medicationName",
  "medicationStrength",
  "symptomDetails",
  "sideEffects",
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

  const flowInstanceId = normalizeFlowInstanceId(input.flowInstanceId)
  if (flowInstanceId) properties.flow_instance_id = flowInstanceId
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

export function buildIntakeEngagedProperties(input: StepPropertiesInput) {
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
    block_type: input.blockType ?? "validation",
    ...(input.resolution ? { resolution: input.resolution } : {}),
    blocker_count: input.blockers.length,
    blockers: input.blockers,
  }
}

interface MedicationSteerInput {
  flowInstanceId?: string | null
  serviceType: string | null | undefined
  subtype: string
  enforcement?: string
  /** Structured routing-context token the patient selected (never free text). */
  context?: string
}

/**
 * Properties for the dedicated-service steer events. Carries the same
 * `flow_instance_id` as every other intake event so the steer can be joined to
 * the canonical funnel instead of floating as an unattributable event total.
 */
export function buildMedicationSteerProperties(input: MedicationSteerInput) {
  const properties: Record<string, unknown> = {
    service_type: normalizeIntakeAnalyticsServiceType(input.serviceType),
    steer_subtype: input.subtype,
  }
  const flowInstanceId = normalizeFlowInstanceId(input.flowInstanceId)
  if (flowInstanceId) properties.flow_instance_id = flowInstanceId
  if (input.enforcement) properties.enforcement = input.enforcement
  if (input.context) properties.context = input.context
  return properties
}

export function captureIntakeEvent(
  posthog: PostHogCaptureLike | null | undefined,
  event: IntakeAnalyticsEventName,
  properties?: Record<string, unknown>,
) {
  posthog?.capture(event, properties)
}

/**
 * Record the fixed women's-health current-pill handoff without accepting any
 * clinical answers or patient identity. Action events cannot rely on the React
 * PostHog context being ready, so a null client uses the existing retrying
 * singleton capture path rather than delaying patient navigation.
 */
export function captureWomensHealthRepeatHandoff({
  fallbackCapture = captureWithRetry,
  flowInstanceId,
  posthog,
}: {
  fallbackCapture?: IntakeCaptureFallback
  flowInstanceId?: string | null
  posthog: PostHogCaptureLike | null | undefined
}): void {
  const properties = buildIntakeValidationBlockedProperties({
    blockType: "service_steer",
    blockers: ["current_pill_repeat_handoff"],
    flowInstanceId,
    resolution: "redirected",
    serviceType: "consult",
    stepId: "womens-health-type",
    subtype: "womens_health",
  })

  if (posthog) {
    captureIntakeEvent(posthog, INTAKE_ANALYTICS_EVENTS.validationBlocked, properties)
    return
  }

  fallbackCapture(INTAKE_ANALYTICS_EVENTS.validationBlocked, properties)
}

export function buildPassiveAbandonmentBeacon({
  analyticsServiceType,
  currentStepId,
  currentStepIndex,
  flowInstanceId,
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
        $process_person_profile: false,
        $geoip_disable: true,
        service_type: analyticsServiceType,
        ...(normalizeFlowInstanceId(flowInstanceId)
          ? { flow_instance_id: normalizeFlowInstanceId(flowInstanceId) }
          : {}),
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

  const flowInstanceId = normalizeFlowInstanceId(input.flowInstanceId)
  if (flowInstanceId) properties.flow_instance_id = flowInstanceId
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
