import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"

import { isProviderTerminalDeliveryStatus } from "@/lib/email/delivery-status"
import { claimOutboxRow } from "@/lib/email/send/outbox"
import type { SendEmailResult } from "@/lib/email/send/types"
import { sendFromOutboxRow } from "@/lib/email/send-email"

export type ScriptNotificationResult = "sent" | "already_sent" | "queued" | "skipped_no_patient" | "failed"

/** Preserve the existing delivery attempt and its provider idempotency key. */
export async function ensureScriptSentNotification(
  supabase: SupabaseClient,
  intakeId: string,
  sendNew: () => Promise<SendEmailResult | null>,
): Promise<ScriptNotificationResult> {
  const { data: existing, error } = await supabase.from("email_outbox")
    .select("id, status, delivery_status, retry_count")
    .eq("intake_id", intakeId)
    .eq("email_type", "script_sent")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) return "failed"
  if (existing) {
    if (isProviderTerminalDeliveryStatus(existing.delivery_status)) return "failed"
    if (existing.status === "sent") return "already_sent"
    if (["pending", "sending"].includes(existing.status)) return "queued"
    if (existing.status !== "failed" || existing.retry_count >= 10) return "failed"
    const claim = await claimOutboxRow(existing.id)
    if (!claim.claimed || !claim.row) return "failed"
    const result = await sendFromOutboxRow(claim.row)
    return result.success ? "sent" : "failed"
  }
  const result = await sendNew()
  if (!result) return "skipped_no_patient"
  if (!result.success) return "failed"
  // Concurrent calls can meet at the durable idempotency constraint.
  return result.skipped ? "queued" : "sent"
}
