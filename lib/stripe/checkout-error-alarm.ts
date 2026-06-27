import { createLogger } from "@/lib/observability/logger"

const logger = createLogger("stripe-checkout-error")

export interface CheckoutFailureContext {
  intakeId: string
  category: string
  failedPriceRole?: string | null
}

export interface CheckoutFailureReport {
  isMisconfiguredPrice: boolean
  errorMessage: string
}

/**
 * Report a Stripe checkout-session creation failure to Sentry.
 *
 * A "No such price" means a STRIPE_PRICE_* env var points at a wrong or deleted
 * Stripe price; a "Missing STRIPE_PRICE_* environment variable" means the env is
 * absent and resolution throws before Stripe is called. Both are config
 * catastrophes: EVERY checkout for that tier fails until a human fixes the env,
 * and the static price-config health check can't catch a well-formed-but-wrong
 * value. Until now the only trace was a console.error — `logger.error` forwards
 * to Sentry only when an Error object is passed, which the call sites omitted, so
 * this catastrophic config error fired NO alarm.
 *
 * We escalate it as `fatal` with a stable fingerprint per price role, so one
 * alertable Sentry issue fires per misconfigured tier (not one per failed
 * checkout). Generic session-create failures are reported at `error` level.
 * Never throws — payment error handling must continue even if Sentry is down.
 */
export async function reportCheckoutSessionFailure(
  stripeError: unknown,
  ctx: CheckoutFailureContext,
): Promise<CheckoutFailureReport> {
  const errorMessage = stripeError instanceof Error ? stripeError.message : String(stripeError)
  // Two distinct price-config catastrophes, both fatal. (1) A STRIPE_PRICE_* env
  // points at a deleted/wrong Stripe price → Stripe returns "No such price".
  // (2) A STRIPE_PRICE_* env is missing entirely → our own getRequiredStripePriceEnv
  // throws "Missing STRIPE_PRICE_* environment variable" before Stripe is even
  // called. Either way every checkout for that tier dies until a human fixes the
  // env, and the static price-config health check can't catch a well-formed but
  // wrong value. Both must alarm loudly.
  const isNoSuchPrice = errorMessage.includes("No such price")
  const isMissingPriceEnv = /Missing\s+STRIPE_PRICE/i.test(errorMessage)
  const isMisconfiguredPrice = isNoSuchPrice || isMissingPriceEnv
  const err = stripeError instanceof Error ? stripeError : new Error(errorMessage)

  // Console only here (no Error arg) so we don't double-capture; the explicit
  // Sentry call below carries the rich tags / level / fingerprint.
  logger.error("Stripe checkout session creation failed", {
    intakeId: ctx.intakeId,
    category: ctx.category,
    failedPriceRole: ctx.failedPriceRole ?? "unknown",
    isMisconfiguredPrice,
  })

  try {
    const Sentry = await import("@sentry/nextjs")
    Sentry.captureException(err, {
      level: isMisconfiguredPrice ? "fatal" : "error",
      tags: {
        source: "checkout",
        checkout_error: isNoSuchPrice
          ? "no_such_price"
          : isMissingPriceEnv
            ? "missing_price_env"
            : "session_create_failed",
        price_role: ctx.failedPriceRole ?? "unknown",
      },
      fingerprint: isMisconfiguredPrice
        ? [
            isNoSuchPrice ? "stripe-no-such-price" : "stripe-missing-price-env",
            ctx.failedPriceRole ?? "unknown",
          ]
        : undefined,
      extra: { intakeId: ctx.intakeId, category: ctx.category },
    })
  } catch {
    // Sentry unavailable — never let alarm wiring break checkout error handling.
  }

  return { isMisconfiguredPrice, errorMessage }
}
