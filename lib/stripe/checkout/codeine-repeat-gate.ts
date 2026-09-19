import "server-only"

import { formatRequestAgainDate } from "@/lib/clinical/codeine-repeat-window"
import { isCodeineCombinationMedication } from "@/lib/clinical/controlled-substances"
import { findRecentCodeineScript } from "@/lib/clinical/recent-codeine-script"
import { recordSafetyEvaluationForOperators } from "@/lib/safety/audit-log"
import type { createServiceRoleClient } from "@/lib/supabase/service-role"
import {
  buildRepeatScriptMedicationValidationText,
  extractRepeatScriptMedications,
} from "@/lib/validation/repeat-script-medications"

import { checkoutFailure, type CheckoutFailureResult } from "../checkout-failure"

/**
 * Codeine combination repeat gate (operator decision 2026-09-19).
 *
 * Panadeine Forte and the other paracetamol/ibuprofen + codeine products are
 * prescribed case by case, at most once every 7 days. Before this gate a
 * re-request paid, reached the doctor, was declined, and was refunded in full:
 * nine of the ten codeine-class declines in the 60 days to 2026-09-19 were
 * re-requests inside 7 days of a prior script. The gate stops those BEFORE
 * payment on every path that can mint a payable Stripe session.
 *
 * Signed-in patients see the dated reason. Guests are asked to sign in: a
 * guest checkout has not proven control of the email it typed, so the gate
 * never discloses prescription history to an unauthenticated form.
 */

type SupabaseClient = ReturnType<typeof createServiceRoleClient>

export const CODEINE_REPEAT_RULE_ID = "codeine_repeat_within_7d"

export const CODEINE_REPEAT_GUEST_MESSAGE = "Please sign in to request this medicine again."

export type CodeineRepeatGateResult =
  | { blocked: false }
  | { blocked: true; latestIssuedDate: string; daysSince: number; requestAgainOn: string }

export type BlockedCodeineRepeatGate = Extract<CodeineRepeatGateResult, { blocked: true }>

export function requestsCodeineCombinationMedicine(answers: Record<string, unknown>): boolean {
  return extractRepeatScriptMedications(answers).some((entry) =>
    isCodeineCombinationMedication(buildRepeatScriptMedicationValidationText(entry)),
  )
}

export async function evaluateCodeineRepeatGate(args: {
  answers: Record<string, unknown>
  now?: Date
  patientIds: ReadonlyArray<string>
  supabase: SupabaseClient
}): Promise<CodeineRepeatGateResult> {
  if (!requestsCodeineCombinationMedicine(args.answers)) return { blocked: false }
  const recent = await findRecentCodeineScript(args.supabase, {
    patientIds: args.patientIds,
    now: args.now,
  })
  if (
    !recent
    || !recent.withinWindow
    || recent.latestIssuedDate == null
    || recent.daysSince == null
    || recent.requestAgainOn == null
  ) {
    return { blocked: false }
  }
  return {
    blocked: true,
    latestIssuedDate: recent.latestIssuedDate,
    daysSince: recent.daysSince,
    requestAgainOn: recent.requestAgainOn,
  }
}

export function codeineRepeatBlockMessage(gate: BlockedCodeineRepeatGate): string {
  return (
    `We issued a prescription containing codeine for you on ${formatRequestAgainDate(gate.latestIssuedDate)}. `
    + "Our doctors prescribe codeine combination medicines at most once every 7 days, so this request can't be paid for yet. "
    + `You can request it again from ${formatRequestAgainDate(gate.requestAgainOn)}.`
  )
}

/**
 * Records the operator-visible receipt (sanitized metadata only) and returns
 * the checkout failure for the audience. Never throws into checkout.
 */
export async function refuseCodeineRepeatCheckout(args: {
  answers: Record<string, unknown>
  audience: "guest" | "signed_in"
  context: "checkout" | "guest_resume" | "retry_payment"
  gate: BlockedCodeineRepeatGate
  requestId?: string
  serviceSlug: string
}): Promise<CheckoutFailureResult> {
  await recordSafetyEvaluationForOperators({
    answers: args.answers,
    context: args.context,
    requestId: args.requestId,
    result: {
      isAllowed: false,
      outcome: "DECLINE",
      riskTier: "medium",
      blockReason: `Codeine combination repeat requested ${args.gate.daysSince} day(s) after the previous script.`,
      requiresCall: false,
      triggeredRuleIds: [CODEINE_REPEAT_RULE_ID],
    },
    serviceSlug: args.serviceSlug,
  })
  if (args.audience === "guest") {
    return checkoutFailure("auth_or_session", CODEINE_REPEAT_GUEST_MESSAGE, { requiresSignIn: true })
  }
  return checkoutFailure("clinical_or_input_validation", codeineRepeatBlockMessage(args.gate), {
    requestAgainOn: args.gate.requestAgainOn,
  })
}
