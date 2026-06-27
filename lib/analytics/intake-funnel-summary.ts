import { INTAKE_ANALYTICS_EVENTS } from "@/lib/analytics/intake-events"

export const INTAKE_FUNNEL_EVENT_NAMES = [
  INTAKE_ANALYTICS_EVENTS.started,
  INTAKE_ANALYTICS_EVENTS.checkoutViewed,
  // Reliable SERVER event (emitted at Stripe session creation via
  // trackIntakeFunnelStep) — the trustworthy "reached pay" denominator.
  // checkout_viewed is client-only (deferred init + adblock-droppable), so the
  // checkout_viewed→paid rate understates real conversion. payment_initiated→paid
  // is server→server and is the rate to trust. See serverCheckoutToPaidRate.
  "intake_funnel_payment_initiated",
  "purchase_completed_server",
] as const

export const INTAKE_STEP_FRICTION_EVENT_NAMES = [
  INTAKE_ANALYTICS_EVENTS.stepViewed,
  INTAKE_ANALYTICS_EVENTS.continueClicked,
  INTAKE_ANALYTICS_EVENTS.validationBlocked,
  INTAKE_ANALYTICS_EVENTS.stepCompleted,
] as const

export const POSTHOG_INTAKE_FUNNEL_EVENT_NAMES = [
  ...INTAKE_FUNNEL_EVENT_NAMES,
  ...INTAKE_STEP_FRICTION_EVENT_NAMES,
] as const

type IntakeFunnelEventName = (typeof POSTHOG_INTAKE_FUNNEL_EVENT_NAMES)[number]

export interface IntakeFunnelAggregateRow {
  count: number
  event: string
  serviceType?: string | null
  stepId?: string | null
  stepIndex?: number | null
  subtype?: string | null
}

export interface BuildIntakeFunnelSummaryInput {
  dateFrom: string
  dateTo: string
  days: number
  rows: IntakeFunnelAggregateRow[]
}

export interface IntakeFunnelStageSummary {
  count: number
  dropOffFromPrevious: number | null
  event: (typeof INTAKE_FUNNEL_EVENT_NAMES)[number]
  key: "started" | "checkoutViewed" | "paymentInitiated" | "paid"
  label: string
  rateFromPrevious: number | null
}

export interface IntakeFunnelTotals {
  // checkout_viewed (client) → paid. Understates real conversion because the
  // denominator is a droppable client event; kept for continuity.
  checkoutToPaidRate: number | null
  checkoutViewed: number
  paid: number
  paymentInitiated: number
  // payment_initiated (server) → paid. Both server-side, so this is the
  // TRUSTWORTHY "reached pay → paid" conversion rate. Use this one.
  serverCheckoutToPaidRate: number | null
  startToCheckoutDropOff: number
  startToCheckoutRate: number | null
  started: number
}

export interface IntakeFunnelServiceSummary {
  checkoutToPaidRate: number | null
  checkoutViewed: number
  paid: number
  paymentInitiated: number
  serverCheckoutToPaidRate: number | null
  serviceLabel: string
  serviceType: string
  startToCheckoutRate: number | null
  started: number
  subtype: string | null
}

export interface IntakeStepFrictionSummary {
  blocked: number
  blockedPerContinueRate: number | null
  completed: number
  completionRate: number | null
  continueClicked: number
  dropOffCount: number
  frictionScore: number
  serviceLabel: string
  serviceType: string
  stepId: string
  stepIndex: number | null
  subtype: string | null
  viewed: number
}

export interface IntakeFunnelSummary {
  byService: IntakeFunnelServiceSummary[]
  dateFrom: string
  dateTo: string
  days: number
  events: typeof INTAKE_FUNNEL_EVENT_NAMES
  stages: IntakeFunnelStageSummary[]
  stepFriction: IntakeStepFrictionSummary[]
  totals: IntakeFunnelTotals
}

type ServiceKey = {
  serviceType: string
  subtype: string | null
}

type StepKey = ServiceKey & {
  stepId: string
  stepIndex: number | null
}

function isFunnelEventName(event: string): event is IntakeFunnelEventName {
  return POSTHOG_INTAKE_FUNNEL_EVENT_NAMES.includes(event as IntakeFunnelEventName)
}

function safeCount(value: number): number {
  return Number.isFinite(value) && value > 0 ? Math.round(value) : 0
}

function rate(numerator: number, denominator: number): number | null {
  if (denominator <= 0) return null
  return Math.round((numerator / denominator) * 100)
}

function normalizeServiceType(value: string | null | undefined): string {
  if (!value) return "unknown"
  if (value === "repeat-script" || value === "repeat-rx" || value === "repeat-prescription") {
    return "prescription"
  }
  // payment_initiated carries the Stripe category ("medical_certificate"); the
  // client step/checkout events carry "med-cert". Normalise both to one bucket.
  if (value === "medcert" || value === "medical-certificate" || value === "medical_certificate") return "med-cert"
  return value
}

function normalizeSubtype(value: string | null | undefined): string | null {
  return value && value.trim() ? value : null
}

function serviceLabel({ serviceType, subtype }: ServiceKey): string {
  if (subtype === "ed") return "ED"
  if (subtype === "hair_loss" || subtype === "hair-loss") return "Hair loss"
  if (subtype === "womens_health" || subtype === "women-health") return "Women's health"
  if (subtype === "weight_loss" || subtype === "weight-loss") return "Weight loss"
  if (serviceType === "med-cert") return "Medical certificate"
  if (serviceType === "prescription") return "Repeat medication"
  if (serviceType === "consult") return "Consult"
  return "Unknown"
}

function serviceKey(input: ServiceKey): string {
  return `${input.serviceType}::${input.subtype ?? ""}`
}

function stepKey(input: StepKey): string {
  return `${serviceKey(input)}::${input.stepId}::${input.stepIndex ?? ""}`
}

function sortServiceSummaries(
  a: IntakeFunnelServiceSummary,
  b: IntakeFunnelServiceSummary,
): number {
  if (b.started !== a.started) return b.started - a.started
  if (b.checkoutViewed !== a.checkoutViewed) return b.checkoutViewed - a.checkoutViewed
  return a.serviceLabel.localeCompare(b.serviceLabel)
}

function sortStepFriction(
  a: IntakeStepFrictionSummary,
  b: IntakeStepFrictionSummary,
): number {
  if (b.frictionScore !== a.frictionScore) return b.frictionScore - a.frictionScore
  if (b.blocked !== a.blocked) return b.blocked - a.blocked
  if (b.viewed !== a.viewed) return b.viewed - a.viewed
  return a.stepId.localeCompare(b.stepId)
}

export function buildIntakeFunnelSummary(
  input: BuildIntakeFunnelSummaryInput,
): IntakeFunnelSummary {
  const totalsByEvent = new Map<string, number>()
  const serviceBuckets = new Map<string, ServiceKey & Record<typeof INTAKE_FUNNEL_EVENT_NAMES[number], number>>()
  const stepBuckets = new Map<string, StepKey & Record<typeof INTAKE_STEP_FRICTION_EVENT_NAMES[number], number>>()

  for (const row of input.rows) {
    if (!isFunnelEventName(row.event)) continue

    const count = safeCount(row.count)
    totalsByEvent.set(row.event, (totalsByEvent.get(row.event) ?? 0) + count)

    const serviceType = normalizeServiceType(row.serviceType)
    const subtype = normalizeSubtype(row.subtype)

    if (INTAKE_FUNNEL_EVENT_NAMES.includes(row.event as typeof INTAKE_FUNNEL_EVENT_NAMES[number])) {
      const key = serviceKey({ serviceType, subtype })
      const existing = serviceBuckets.get(key) ?? {
        checkout_viewed: 0,
        intake_funnel_payment_initiated: 0,
        intake_started: 0,
        purchase_completed_server: 0,
        serviceType,
        subtype,
      }
      existing[row.event as typeof INTAKE_FUNNEL_EVENT_NAMES[number]] += count
      serviceBuckets.set(key, existing)
    }

    if (
      row.stepId &&
      INTAKE_STEP_FRICTION_EVENT_NAMES.includes(row.event as typeof INTAKE_STEP_FRICTION_EVENT_NAMES[number])
    ) {
      const step = {
        serviceType,
        stepId: row.stepId,
        stepIndex: typeof row.stepIndex === "number" ? row.stepIndex : null,
        subtype,
      }
      const key = stepKey(step)
      const existing = stepBuckets.get(key) ?? {
        intake_continue_clicked: 0,
        intake_validation_blocked: 0,
        serviceType,
        step_completed: 0,
        stepId: row.stepId,
        stepIndex: step.stepIndex,
        step_viewed: 0,
        subtype,
      }
      existing[row.event as typeof INTAKE_STEP_FRICTION_EVENT_NAMES[number]] += count
      stepBuckets.set(key, existing)
    }
  }

  const started = totalsByEvent.get(INTAKE_ANALYTICS_EVENTS.started) ?? 0
  const checkoutViewed = totalsByEvent.get(INTAKE_ANALYTICS_EVENTS.checkoutViewed) ?? 0
  const paymentInitiated = totalsByEvent.get("intake_funnel_payment_initiated") ?? 0
  const paid = totalsByEvent.get("purchase_completed_server") ?? 0

  const stages: IntakeFunnelStageSummary[] = [
    {
      count: started,
      dropOffFromPrevious: null,
      event: INTAKE_ANALYTICS_EVENTS.started,
      key: "started",
      label: "Started",
      rateFromPrevious: null,
    },
    {
      count: checkoutViewed,
      dropOffFromPrevious: Math.max(started - checkoutViewed, 0),
      event: INTAKE_ANALYTICS_EVENTS.checkoutViewed,
      key: "checkoutViewed",
      label: "Reached checkout",
      rateFromPrevious: rate(checkoutViewed, started),
    },
    {
      count: paymentInitiated,
      dropOffFromPrevious: Math.max(checkoutViewed - paymentInitiated, 0),
      event: "intake_funnel_payment_initiated",
      key: "paymentInitiated",
      label: "Payment started (server)",
      rateFromPrevious: rate(paymentInitiated, checkoutViewed),
    },
    {
      // Paid rate is taken from the reliable server denominator
      // (payment_initiated), NOT the client checkout_viewed — this is the
      // trustworthy conversion at the pay moment.
      count: paid,
      dropOffFromPrevious: Math.max(paymentInitiated - paid, 0),
      event: "purchase_completed_server",
      key: "paid",
      label: "Paid",
      rateFromPrevious: rate(paid, paymentInitiated),
    },
  ]

  const byService = Array.from(serviceBuckets.values())
    .map((bucket) => ({
      checkoutToPaidRate: bucket.purchase_completed_server > 0
        ? rate(bucket.purchase_completed_server, bucket.checkout_viewed)
        : null,
      checkoutViewed: bucket.checkout_viewed,
      paid: bucket.purchase_completed_server,
      paymentInitiated: bucket.intake_funnel_payment_initiated,
      serverCheckoutToPaidRate: rate(bucket.purchase_completed_server, bucket.intake_funnel_payment_initiated),
      serviceLabel: serviceLabel(bucket),
      serviceType: bucket.serviceType,
      startToCheckoutRate: rate(bucket.checkout_viewed, bucket.intake_started),
      started: bucket.intake_started,
      subtype: bucket.subtype,
    }))
    .filter((bucket) => bucket.started > 0 || bucket.checkoutViewed > 0)
    .sort(sortServiceSummaries)

  const stepFriction = Array.from(stepBuckets.values())
    .map((bucket) => {
      const viewed = bucket.step_viewed
      const completed = bucket.step_completed
      const blocked = bucket.intake_validation_blocked
      const dropOffCount = Math.max(viewed - completed, 0)

      return {
        blocked,
        blockedPerContinueRate: rate(blocked, bucket.intake_continue_clicked),
        completed,
        completionRate: rate(completed, viewed),
        continueClicked: bucket.intake_continue_clicked,
        dropOffCount,
        frictionScore: dropOffCount + blocked,
        serviceLabel: serviceLabel(bucket),
        serviceType: bucket.serviceType,
        stepId: bucket.stepId,
        stepIndex: bucket.stepIndex,
        subtype: bucket.subtype,
        viewed,
      }
    })
    .filter((step) => step.frictionScore > 0 || step.viewed > 0)
    .sort(sortStepFriction)

  return {
    byService,
    dateFrom: input.dateFrom,
    dateTo: input.dateTo,
    days: input.days,
    events: INTAKE_FUNNEL_EVENT_NAMES,
    stages,
    stepFriction,
    totals: {
      checkoutToPaidRate: rate(paid, checkoutViewed),
      checkoutViewed,
      paid,
      paymentInitiated,
      serverCheckoutToPaidRate: rate(paid, paymentInitiated),
      startToCheckoutDropOff: Math.max(started - checkoutViewed, 0),
      startToCheckoutRate: rate(checkoutViewed, started),
      started,
    },
  }
}
