import "server-only"

import * as Sentry from "@sentry/nextjs"

import { createLogger } from "@/lib/observability/logger"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

import type { EmailType, OutboxRow } from "./send/types"

const logger = createLogger("email-outbox-disposition")

export type OutboxDispatchDisposition = "sent" | "suppressed"

type SequenceDispositionDefinition =
  | {
      kind: "marker"
      table: "intakes"
      markerColumn:
        | "abandoned_email_sent_at"
        | "abandoned_followup_sent_at"
        | "reactivation_email_sent_at"
        | "review_email_sent_at"
      idSource: "intake_id" | { metadataKey: "intake_id" }
    }
  | {
      kind: "marker"
      table: "prescriptions"
      markerColumn: "refill_reminder_sent_at"
      idSource: { metadataKey: "prescription_id" }
    }
  | {
      kind: "outbox"
    }

/**
 * One-shot sequence ownership after an outbox retry reaches a terminal handled
 * disposition. Column-backed sequences need their finder marker finalized;
 * heard-about-us backfill already treats the durable outbox row itself as its
 * one-time marker, regardless of provider outcome.
 */
const OUTBOX_SEQUENCE_DISPOSITIONS: Readonly<
  Partial<Record<EmailType, SequenceDispositionDefinition>>
> = {
  refill_reminder: {
    kind: "marker",
    table: "prescriptions",
    markerColumn: "refill_reminder_sent_at",
    idSource: { metadataKey: "prescription_id" },
  },
  cert_reactivation: {
    kind: "marker",
    table: "intakes",
    markerColumn: "reactivation_email_sent_at",
    idSource: { metadataKey: "intake_id" },
  },
  abandoned_checkout: {
    kind: "marker",
    table: "intakes",
    markerColumn: "abandoned_email_sent_at",
    idSource: "intake_id",
  },
  abandoned_checkout_followup: {
    kind: "marker",
    table: "intakes",
    markerColumn: "abandoned_followup_sent_at",
    idSource: "intake_id",
  },
  review_request: {
    kind: "marker",
    table: "intakes",
    markerColumn: "review_email_sent_at",
    idSource: "intake_id",
  },
  heard_about_us_backfill: {
    kind: "outbox",
  },
}

function metadataString(
  metadata: Record<string, unknown> | null,
  key: string,
): string | null {
  const value = metadata?.[key]
  return typeof value === "string" && value ? value : null
}

function markerRecordId(
  row: OutboxRow,
  definition: Extract<SequenceDispositionDefinition, { kind: "marker" }>,
): string | null {
  if (definition.idSource === "intake_id") return row.intake_id
  return metadataString(row.metadata, definition.idSource.metadataKey)
}

function reportMarkerFailure(input: {
  row: OutboxRow
  disposition: OutboxDispatchDisposition
  markerColumn: string
  recordId: string | null
  error: string
}): void {
  logger.error("[Email Dispatcher] Sequence handled marker failed", {
    outboxId: input.row.id,
    emailType: input.row.email_type,
    disposition: input.disposition,
    markerColumn: input.markerColumn,
    recordId: input.recordId,
    error: input.error,
  })
  Sentry.captureMessage("Email sequence handled marker failed after dispatcher attempt", {
    level: "error",
    tags: {
      subsystem: "email-dispatcher",
      email_type: input.row.email_type,
      marker_column: input.markerColumn,
    },
    extra: {
      outboxId: input.row.id,
      recordId: input.recordId,
      disposition: input.disposition,
    },
  })
}

/**
 * Finalize the owning sequence after a provider-confirmed send or terminal
 * policy suppression. Failures are surfaced without changing the provider
 * disposition: replaying an already accepted provider request is less safe
 * than letting the sequence owner recover its marker.
 */
export async function finalizeOutboxSequenceDisposition(
  row: OutboxRow,
  disposition: OutboxDispatchDisposition,
): Promise<void> {
  const definition = OUTBOX_SEQUENCE_DISPOSITIONS[row.email_type]
  if (!definition || definition.kind === "outbox") return
  if (row.metadata?.test === true) return

  const recordId = markerRecordId(row, definition)
  if (!recordId) {
    reportMarkerFailure({
      row,
      disposition,
      markerColumn: definition.markerColumn,
      recordId: null,
      error: "Missing sequence marker record id",
    })
    return
  }

  const timestamp = new Date().toISOString()
  const supabase = createServiceRoleClient()
  const { error } = definition.table === "prescriptions"
    ? await supabase
        .from("prescriptions")
        .update({ refill_reminder_sent_at: timestamp })
        .eq("id", recordId)
        .is("refill_reminder_sent_at", null)
    : await supabase
        .from("intakes")
        .update({ [definition.markerColumn]: timestamp })
        .eq("id", recordId)
        .is(definition.markerColumn, null)

  if (error) {
    reportMarkerFailure({
      row,
      disposition,
      markerColumn: definition.markerColumn,
      recordId,
      error: error.message,
    })
  }
}
