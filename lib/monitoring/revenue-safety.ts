export const NO_PURCHASE_WARNING_WINDOW_HOURS = 24
export const NO_PURCHASE_CRITICAL_WINDOW_HOURS = 48
export const NO_PURCHASE_PARTIAL_DRAFT_DEMAND_THRESHOLD = 10
export const NO_PURCHASE_INTAKE_DEMAND_THRESHOLD = 1

export const REVENUE_PURCHASE_PAYMENT_STATUSES = [
  "paid",
  "partially_refunded",
  "refunded",
] as const

export const CHECKOUT_DEMAND_STATUSES = ["pending_payment", "checkout_failed"] as const
export const CHECKOUT_DEMAND_PAYMENT_STATUSES = ["pending", "unpaid", "failed"] as const

export type NoPurchaseRevenueWindow = {
  windowHours: number
  paidIntakes: number
  createdIntakes: number
  checkoutStageIntakes: number
  partialDrafts: number
}

export type NoPurchaseRevenueAlert = {
  metric: "no_purchase_window"
  severity: "warning" | "critical"
  detail: string
  count: number
  metadata: {
    count: number
    window: string
    window_hours: number
    paid_intakes: number
    created_intakes: number
    checkout_stage_intakes: number
    partial_drafts: number
    intake_demand_threshold: number
    partial_draft_demand_threshold: number
  }
}

function hasDemandSignal(window: NoPurchaseRevenueWindow): boolean {
  return (
    window.createdIntakes >= NO_PURCHASE_INTAKE_DEMAND_THRESHOLD ||
    window.checkoutStageIntakes >= NO_PURCHASE_INTAKE_DEMAND_THRESHOLD ||
    window.partialDrafts >= NO_PURCHASE_PARTIAL_DRAFT_DEMAND_THRESHOLD
  )
}

export function buildNoPurchaseRevenueAlert(
  window: NoPurchaseRevenueWindow,
): NoPurchaseRevenueAlert | null {
  if (window.paidIntakes > 0 || !hasDemandSignal(window)) return null

  const severity =
    window.windowHours >= NO_PURCHASE_CRITICAL_WINDOW_HOURS ? "critical" : "warning"
  const detail =
    `No paid intakes in ${window.windowHours}h despite ` +
    `${window.createdIntakes} created intakes, ` +
    `${window.checkoutStageIntakes} checkout-stage intakes, and ` +
    `${window.partialDrafts} active drafts`

  return {
    metric: "no_purchase_window",
    severity,
    detail,
    count: window.paidIntakes,
    metadata: {
      count: window.paidIntakes,
      window: `${window.windowHours}h`,
      window_hours: window.windowHours,
      paid_intakes: window.paidIntakes,
      created_intakes: window.createdIntakes,
      checkout_stage_intakes: window.checkoutStageIntakes,
      partial_drafts: window.partialDrafts,
      intake_demand_threshold: NO_PURCHASE_INTAKE_DEMAND_THRESHOLD,
      partial_draft_demand_threshold: NO_PURCHASE_PARTIAL_DRAFT_DEMAND_THRESHOLD,
    },
  }
}
