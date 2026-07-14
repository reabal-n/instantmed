import { checkHighStakesAnswers } from "@/lib/clinical/intake-validation"
import type { ServerSafetyCheck } from "@/lib/safety/evaluate"

const FALLBACK_REASON = "This type of certificate cannot be issued through an online assessment."

export interface HighStakesCheckoutBlock {
  initialCheckoutError: string
  matched?: string
  retryPaymentError: string
  safetyCheck: ServerSafetyCheck
}

/**
 * Canonical pre-payment representation of a high-stakes medical-certificate
 * block. Shared by initial checkout and retry-payment so their answer aliases,
 * audit shape, and patient direction cannot drift.
 */
export function getHighStakesCheckoutBlock(
  answers: Record<string, unknown>,
): HighStakesCheckoutBlock | null {
  const highStakes = checkHighStakesAnswers(answers)
  if (!highStakes.isHighStakes) return null

  const reason = highStakes.reason || FALLBACK_REASON

  return {
    initialCheckoutError: `${reason} You have not been charged. Please see a GP in person, who can carry out the assessment this document requires.`,
    matched: highStakes.matched,
    retryPaymentError: `${reason} No new payment session was created. Please see a GP in person, who can carry out the assessment this document requires.`,
    safetyCheck: {
      isAllowed: false,
      outcome: "DECLINE",
      riskTier: "high",
      blockReason: reason,
      requiresCall: false,
      triggeredRuleIds: ["high_stakes_use_case"],
    },
  }
}
