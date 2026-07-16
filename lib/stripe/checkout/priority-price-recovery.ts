import "server-only"

import { reportCheckoutSessionFailure } from "@/lib/stripe/checkout-error-alarm"
import { getOptionalStripePriceEnv, stripe } from "@/lib/stripe/client"

const PRIORITY_PRICE_ENV = "STRIPE_PRICE_PRIORITY_FEE"
const PRIORITY_PRICE_ROLE = "priority_fee"
const PRIORITY_PRICE_CURRENCY = "aud"
const PRIORITY_PRICE_UNIT_AMOUNT = 995

export type PriorityPriceRecoveryPreflight =
  | { ok: true; priceId: string | null }
  | {
      ok: false
      reason: "invalid_config" | "missing_config" | "retrieve_failed"
    }

interface PriorityPriceRecoveryContext {
  category: string
  intakeId: string
  isPriority: boolean
}

function invalidPriorityPriceReason(
  price: unknown,
  configuredPriceId: string,
): string | null {
  if (!price || typeof price !== "object") return "malformed"

  const candidate = price as Record<string, unknown>
  if (candidate.id !== configuredPriceId) return "malformed"
  if (candidate.active !== true) return "inactive"
  if (candidate.type !== "one_time" || candidate.recurring !== null) {
    return "recurring"
  }
  if (candidate.currency !== PRIORITY_PRICE_CURRENCY) return "wrong_currency"
  if (candidate.unit_amount !== PRIORITY_PRICE_UNIT_AMOUNT) return "wrong_amount"

  return null
}

/**
 * Verify the persisted Priority purchase before any recovery mutation.
 *
 * A recovery path must never rebuild a base-only Session while leaving the
 * intake marked Priority. This read-only preflight resolves and retrieves the
 * configured Price, validates the exact one-time AUD $9.95 contract, and
 * reports every failure without exposing the configured Price ID.
 */
export async function preflightPriorityPriceForRecovery({
  category,
  intakeId,
  isPriority,
}: PriorityPriceRecoveryContext): Promise<PriorityPriceRecoveryPreflight> {
  if (!isPriority) return { ok: true, priceId: null }

  const configuredPriceId = getOptionalStripePriceEnv(PRIORITY_PRICE_ENV)
  if (!configuredPriceId) {
    const error = new Error(`Missing ${PRIORITY_PRICE_ENV} environment variable`)
    await reportCheckoutSessionFailure(error, {
      category,
      failedPriceRole: PRIORITY_PRICE_ROLE,
      intakeId,
    })
    return { ok: false, reason: "missing_config" }
  }

  let price: unknown
  try {
    price = await stripe.prices.retrieve(configuredPriceId)
  } catch (error) {
    await reportCheckoutSessionFailure(error, {
      category,
      failedPriceRole: PRIORITY_PRICE_ROLE,
      intakeId,
    })
    return { ok: false, reason: "retrieve_failed" }
  }

  const invalidReason = invalidPriorityPriceReason(price, configuredPriceId)
  if (invalidReason) {
    const error = new Error(
      `Invalid ${PRIORITY_PRICE_ENV} configuration: ${invalidReason}`,
    )
    await reportCheckoutSessionFailure(error, {
      category,
      failedPriceRole: PRIORITY_PRICE_ROLE,
      intakeId,
    })
    return { ok: false, reason: "invalid_config" }
  }

  return { ok: true, priceId: configuredPriceId }
}
