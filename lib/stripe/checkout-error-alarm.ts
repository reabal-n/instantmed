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
 * Stripe price: EVERY checkout for that tier fails until a human fixes the env,
 * and the static price-config health check can't catch it (the value is a
 * well-formed `price_...` string, just the wrong one). Until now the only trace
 * was a console.error — `logger.error` forwards to Sentry only when an Error
 * object is passed, which both call sites omitted, so this catastrophic config
 * error fired NO alarm.
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
  const isMisconfiguredPrice = errorMessage.includes("No such price")
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
        checkout_error: isMisconfiguredPrice ? "no_such_price" : "session_create_failed",
        price_role: ctx.failedPriceRole ?? "unknown",
      },
      fingerprint: isMisconfiguredPrice
        ? ["stripe-no-such-price", ctx.failedPriceRole ?? "unknown"]
        : undefined,
      extra: { intakeId: ctx.intakeId, category: ctx.category },
    })
  } catch {
    // Sentry unavailable — never let alarm wiring break checkout error handling.
  }

  return { isMisconfiguredPrice, errorMessage }
}
