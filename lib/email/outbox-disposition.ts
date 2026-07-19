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
      markerColumns: Readonly<{
        sent:
          | "abandoned_email_sent_at"
          | "abandoned_followup_sent_at"
          | "reactivation_email_sent_at"
          | "review_email_sent_at"
        suppressed:
          | "abandoned_email_sent_at"
          | "abandoned_followup_sent_at"
          | "reactivation_email_sent_at"
          | "review_email_suppressed_at"
      }>
      idSource: "intake_id" | { metadataKey: "intake_id" }
    }
  | {
      kind: "marker"
      table: "prescriptions"
      markerColumns: Readonly<{
        sent: "refill_reminder_sent_at"
        suppressed: "refill_reminder_sent_at"
      }>
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
    markerColumns: {
      sent: "refill_reminder_sent_at",
      suppressed: "refill_reminder_sent_at",
    },
    idSource: { metadataKey: "prescription_id" },
  },
  cert_reactivation: {
    kind: "marker",
    table: "intakes",
    markerColumns: {
      sent: "reactivation_email_sent_at",
      suppressed: "reactivation_email_sent_at",
    },
    idSource: { metadataKey: "intake_id" },
  },
  abandoned_checkout: {
    kind: "marker",
    table: "intakes",
    markerColumns: {
      sent: "abandoned_email_sent_at",
      suppressed: "abandoned_email_sent_at",
    },
    idSource: "intake_id",
  },
  abandoned_checkout_followup: {
    kind: "marker",
    table: "intakes",
    markerColumns: {
      sent: "abandoned_followup_sent_at",
      suppressed: "abandoned_followup_sent_at",
    },
    idSource: "intake_id",
  },
  review_request: {
    kind: "marker",
    table: "intakes",
    markerColumns: {
      sent: "review_email_sent_at",
      suppressed: "review_email_suppressed_at",
    },
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

type OutboxSequenceContext = Pick<
  OutboxRow,
  "id" | "email_type" | "intake_id" | "metadata"
>

function markerRecordId(
  row: OutboxSequenceContext,
  definition: Extract<SequenceDispositionDefinition, { kind: "marker" }>,
): string | null {
  if (definition.idSource === "intake_id") return row.intake_id
  return metadataString(row.metadata, definition.idSource.metadataKey)
}

function reportMarkerFailure(input: {
  row: OutboxSequenceContext
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

export type OutboxSequenceFinalizationResult =
  | { finalized: true }
  | {
      finalized: false
      reason: "missing_record_id" | "marker_write_failed"
    }

/**
 * Finalize the owning sequence after a provider-confirmed send or terminal
 * policy suppression. Failures are surfaced without changing the provider
 * disposition: replaying an already accepted provider request is less safe
 * than letting the sequence owner recover its marker.
 */
export async function finalizeOutboxSequenceDisposition(
  row: OutboxSequenceContext,
  disposition: OutboxDispatchDisposition,
): Promise<OutboxSequenceFinalizationResult> {
  const definition = OUTBOX_SEQUENCE_DISPOSITIONS[row.email_type]
  if (!definition || definition.kind === "outbox") {
    return { finalized: true }
  }
  if (row.metadata?.test === true) return { finalized: true }

  const recordId = markerRecordId(row, definition)
  const markerColumn = definition.markerColumns[disposition]
  if (!recordId) {
    reportMarkerFailure({
      row,
      disposition,
      markerColumn,
      recordId: null,
      error: "Missing sequence marker record id",
    })
    return { finalized: false, reason: "missing_record_id" }
  }

  const timestamp = new Date().toISOString()
  const supabase = createServiceRoleClient()
  let markerWrite = supabase
    .from(definition.table)
    .update({ [markerColumn]: timestamp })
    .eq("id", recordId)
    .is(markerColumn, null)

  const oppositeDisposition = disposition === "sent" ? "suppressed" : "sent"
  const oppositeMarker = definition.markerColumns[oppositeDisposition]
  if (oppositeMarker !== markerColumn) {
    markerWrite = markerWrite.is(oppositeMarker, null)
  }

  const { error } = await markerWrite

  if (error) {
    reportMarkerFailure({
      row,
      disposition,
      markerColumn,
      recordId,
      error: error.message,
    })
    return { finalized: false, reason: "marker_write_failed" }
  }

  return { finalized: true }
}
