import { createLogger } from "@/lib/observability/logger"

const logger = createLogger("checkout-persistence-diagnostics")

type CheckoutPersistenceOperation =
  | "answers_encryption"
  | "answers_insert"
  | "bound_draft_growth_lookup"
  | "cancelled_recovery_compare_and_set"
  | "converted_intake_lookup"
  | "draft_checkout_claim"
  | "draft_conversion_marker"
  | "draft_growth_lookup"
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
  // An Error argument is required for the production logger's Sentry sink.
  logger.error("Checkout persistence operation failed", {
    operation,
    databaseCode: typeof code === "string" && /^[0-9A-Z]{5}$/.test(code) ? code : "unknown",
  }, new Error("Checkout persistence operation failed"))
}
