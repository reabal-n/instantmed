import { captureException } from "@sentry/nextjs"

import { createLogger } from "@/lib/observability/logger"

const logger = createLogger("checkout-persistence-diagnostics")

type CheckoutPersistenceOperation =
  | "answers_encryption"
  | "answers_insert"
  | "bound_draft_growth_lookup"
  | "terminal_recovery_compare_and_set"
  | "converted_intake_lookup"
  | "draft_checkout_claim"
  | "draft_conversion_marker"
  | "draft_growth_lookup"
  | "mismatched_draft_lookup"
  | "duplicate_answers_lookup"
  | "guest_profile_insert"
  | "guest_profile_missing"
  | "intake_insert"
  | "owned_duplicate_lookup"

/** Neutral shared sink: no database payload, bearer, identity, or provider dependency. */
export function reportCheckoutPersistenceFailure(
  operation: CheckoutPersistenceOperation,
  code?: string,
): void {
  const context = {
    operation,
    databaseCode: typeof code === "string" && /^[0-9A-Z]{5}$/.test(code) ? code : "unknown",
  }
  // The explicit sink owns grouping. No Error argument here, which would
  // duplicate the capture through the general logger's production sink.
  logger.error("Checkout persistence operation failed", context)
  try {
    captureException(new Error("Checkout persistence operation failed"), {
      tags: { source: "checkout-persistence", operation, database_code: context.databaseCode },
      fingerprint: ["checkout-persistence", operation, context.databaseCode],
    })
  } catch { /* Diagnostics must not change the checkout outcome. */ }
}

/** Unexpected provider failures only; known payment/ownership blocks stay warnings. */
export function reportCheckoutProviderFailure(operation: "restored_session_inspect" | "restored_session_expire"): void {
  logger.error("Checkout provider operation failed", { operation })
  try {
    captureException(new Error("Checkout provider operation failed"), {
      tags: { source: "checkout-provider", operation },
      fingerprint: ["checkout-provider", operation],
    })
  } catch { /* Diagnostics must not change the checkout outcome. */ }
}
