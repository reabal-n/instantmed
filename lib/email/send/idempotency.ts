import { createHash } from "node:crypto"

import type { EmailType, OutboxEntry } from "./types"

export const DB_IDEMPOTENT_EMAIL_TYPES: ReadonlySet<EmailType> = new Set([
  "request_received",
  "guest_complete_account",
  "abandoned_checkout",
  "abandoned_checkout_followup",
  "partial_intake_recovery",
  "review_request",
])

export function buildResendEmailIdempotencyKey(outboxId: string): string {
  const normalizedOutboxId = outboxId.trim()
  if (!normalizedOutboxId) {
    throw new Error("A durable outbox id is required for provider idempotency")
  }

  return `instantmed-email/${normalizedOutboxId}`
}

const METADATA_SCOPE_KEYS = [
  "followup_id",
  "reminder_number",
  "milestone",
  "recovery_tracking_id",
  "subtype",
] as const

type IdempotencyInput = Pick<
  OutboxEntry,
  "email_type" | "to_email" | "intake_id" | "patient_id" | "certificate_id" | "metadata" | "idempotency_key"
>

function stableMetadataScope(metadata: Record<string, unknown> | undefined): Record<string, unknown> {
  if (!metadata) return {}

  return Object.fromEntries(
    METADATA_SCOPE_KEYS
      .filter((key) => metadata[key] !== undefined && metadata[key] !== null)
      .map((key) => [key, metadata[key]]),
  )
}

export function buildEmailOutboxIdempotencyKey(entry: IdempotencyInput): string | null {
  if (entry.idempotency_key) {
    return entry.idempotency_key
  }

  if (!DB_IDEMPOTENT_EMAIL_TYPES.has(entry.email_type)) {
    return null
  }

  const scope = {
    certificate_id: entry.certificate_id ?? null,
    email_type: entry.email_type,
    intake_id: entry.intake_id ?? null,
    metadata: stableMetadataScope(entry.metadata),
    patient_id: entry.patient_id ?? null,
    to_email: entry.to_email.trim().toLowerCase(),
  }

  const digest = createHash("sha256")
    .update(JSON.stringify(scope))
    .digest("hex")
    .slice(0, 48)

  return `email:${entry.email_type}:${digest}`
}
