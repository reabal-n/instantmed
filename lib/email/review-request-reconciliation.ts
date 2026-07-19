import "server-only"

import { finalizeOutboxSequenceDisposition } from "@/lib/email/outbox-disposition"
import { REVIEW_REQUEST_BATCH_SIZE } from "@/lib/email/review-request-timing"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

export async function reconcileSentReviewRequestMarkers(
  limit = REVIEW_REQUEST_BATCH_SIZE,
): Promise<{ reconciled: number; failed: number }> {
  const supabase = createServiceRoleClient()
  const { data, error } = await supabase
    .from("intakes")
    .select("id, email_outbox!inner(id, email_type, metadata)")
    .is("review_email_sent_at", null)
    .is("review_email_suppressed_at", null)
    .eq("email_outbox.email_type", "review_request")
    .eq("email_outbox.status", "sent")
    .limit(limit)

  if (error) {
    throw new Error(`Failed to reconcile sent review request markers: ${error.message}`)
  }

  let reconciled = 0
  let failed = 0
  const seen = new Set<string>()
  for (const row of data ?? []) {
    const intakeId = typeof row.id === "string" ? row.id : null
    if (!intakeId || seen.has(intakeId)) continue
    seen.add(intakeId)
    const relation = row.email_outbox
    const outboxRows = Array.isArray(relation) ? relation : [relation]
    const outbox = outboxRows.find(
      (item) => Boolean(item) && typeof item === "object",
    ) as { id?: unknown } | undefined
    const result = await finalizeOutboxSequenceDisposition(
      {
        id: typeof outbox?.id === "string"
          ? outbox.id
          : `review-request:${intakeId}:reconciliation`,
        email_type: "review_request",
        intake_id: intakeId,
        metadata: null,
      },
      "sent",
    )
    if (result.finalized) reconciled += 1
    else failed += 1
  }

  return { reconciled, failed }
}
