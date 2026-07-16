import { inspectCheckoutSession } from "./checkout-session-safety"

export interface CheckoutReturnPaymentState {
  checkout_error: string | null
  payment_id: string | null
  payment_status: string | null
  status: string | null
}

export type ChangedCheckoutSessionReturnResult =
  | { outcome: "not_payable" | "unresolved" }
  | { outcome: "payment_in_flight"; sessionId: string }

export async function reconcileChangedCheckoutSessionForReturn({
  intakeId,
  state,
}: {
  intakeId: string
  state: CheckoutReturnPaymentState | null
}): Promise<ChangedCheckoutSessionReturnResult> {
  if (!state?.payment_id) return { outcome: "not_payable" }

  if (state.payment_status === "paid" || state.status === "paid") {
    return { outcome: "payment_in_flight", sessionId: state.payment_id }
  }

  const inspection = await inspectCheckoutSession(state.payment_id, intakeId, {
    intakeStatus: state.status,
    paymentStatus: state.payment_status,
    storedPaymentId: state.payment_id,
  })
  if (inspection.state === "paid" || inspection.state === "payment_in_flight") {
    return { outcome: "payment_in_flight", sessionId: state.payment_id }
  }
  if (inspection.state === "unresolved") return { outcome: "unresolved" }
  return { outcome: "not_payable" }
}
