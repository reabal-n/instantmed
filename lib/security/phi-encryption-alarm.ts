/**
 * PHI encryption failure alarm.
 *
 * Same failure class as a misconfigured Stripe price (lib/stripe/checkout-error-alarm.ts):
 * with the PHI flags enabled, an encrypt failure means the key material is
 * missing or malformed, and EVERY write on that field dies until a human fixes
 * the env. One fatal, stably-fingerprinted Sentry event per field — not one per
 * request — so the alert survives grouping.
 *
 * Decrypt failures alarm at `error` level: reads fall back to the plaintext
 * column while the dual-write migration is in flight, so availability is
 * degraded-but-working rather than broken.
 */

import "server-only"

import { createLogger } from "@/lib/observability/logger"

const logger = createLogger("phi-encryption-alarm")

export class PhiEncryptionWriteError extends Error {
  constructor(field: string) {
    super(`PHI encryption failed for ${field}; refusing to store plaintext-only`)
    this.name = "PhiEncryptionWriteError"
  }
}

export async function reportPhiEncryptionFailure(
  err: unknown,
  ctx: {
    /** Column-qualified field, e.g. "intake_answers.answers" */
    field: string
    operation: "encrypt" | "decrypt"
    recordId?: string
  },
): Promise<void> {
  // Console only (no Error arg) — the explicit Sentry call below carries the
  // level / tags / fingerprint, and passing the error here would double-capture.
  logger.error("PHI encryption failure", {
    field: ctx.field,
    operation: ctx.operation,
    recordId: ctx.recordId ?? null,
  })

  try {
    const Sentry = await import("@sentry/nextjs")
    Sentry.captureException(err instanceof Error ? err : new Error(String(err)), {
      level: ctx.operation === "encrypt" ? "fatal" : "error",
      tags: {
        source: "phi-encryption",
        phi_field: ctx.field,
        phi_operation: ctx.operation,
      },
      fingerprint: ["phi-encryption-failure", ctx.field, ctx.operation],
      extra: { recordId: ctx.recordId ?? null },
    })
  } catch {
    // Alarm wiring must never mask or amplify the original failure.
  }
}
