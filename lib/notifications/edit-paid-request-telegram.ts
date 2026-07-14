import "server-only"

import { resolvePaidRequestServiceSlug } from "@/lib/notifications/paid-request-telegram"
import {
  getTelegramRequestDetail,
  loadTelegramRequestAnswers,
} from "@/lib/notifications/request-context"
import {
  type EditTelegramMessageOptions,
  editTelegramMessageToApproved,
  editTelegramMessageToDeclined,
  editTelegramMessageToNeedsManualReview,
} from "@/lib/notifications/telegram"
import { createLogger } from "@/lib/observability/logger"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

const log = createLogger("edit-paid-request-telegram")

type IntakeForEdit = {
  paid_request_telegram_message_id: number | null
  category: string | null
  subtype: string | null
}

async function loadIntakeForEdit(
  intakeId: string,
): Promise<{ messageId: number; opts: EditTelegramMessageOptions } | null> {
  const supabase = createServiceRoleClient()
  const { data, error } = await supabase
    .from("intakes")
    .select("paid_request_telegram_message_id, category, subtype")
    .eq("id", intakeId)
    .maybeSingle()

  if (error || !data) return null

  const row = data as IntakeForEdit
  if (!row.paid_request_telegram_message_id) return null

  const serviceSlug = resolvePaidRequestServiceSlug({
    category: row.category,
    subtype: row.subtype,
  })
  let answers: Record<string, unknown> | null = null
  if (serviceSlug === "common-scripts") {
    try {
      answers = await loadTelegramRequestAnswers(intakeId)
    } catch {
      // The original status update remains useful without the optional label.
      log.warn("Prescription label unavailable while editing Telegram request", { intakeId })
    }
  }

  return {
    messageId: row.paid_request_telegram_message_id,
    opts: {
      serviceSlug: serviceSlug || undefined,
      subtype: row.subtype ?? undefined,
      serviceDetail: getTelegramRequestDetail({ answers, serviceSlug, subtype: row.subtype }),
    },
  }
}

/**
 * Edit the original new-request Telegram message to a Reviewed state.
 *
 * Fail-soft on every hop. If the intake row cannot be loaded, the
 * message_id was never stored, or the edit API errors, the approval
 * still succeeds; the only loss is the chat staying stale.
 */
export async function editPaidRequestTelegramMessageToApproved(intakeId: string): Promise<void> {
  try {
    const loaded = await loadIntakeForEdit(intakeId)
    if (!loaded) return
    await editTelegramMessageToApproved(loaded.messageId, loaded.opts)
  } catch (error) {
    log.warn("Failed to edit Telegram message to approved (non-fatal)", {
      intakeId,
      error: String(error),
    })
  }
}

export async function editPaidRequestTelegramMessageToDeclined(intakeId: string): Promise<void> {
  try {
    const loaded = await loadIntakeForEdit(intakeId)
    if (!loaded) return
    await editTelegramMessageToDeclined(loaded.messageId, loaded.opts)
  } catch (error) {
    log.warn("Failed to edit Telegram message to declined (non-fatal)", {
      intakeId,
      error: String(error),
    })
  }
}

/**
 * Flip the original ✅ "auto" message to ❌ "needs manual review" when the
 * auto-approval pipeline decides the intake is ineligible (mental-health
 * keyword, repeat-request cooldown, duration > 3 days, etc.). Only meaningful
 * for med-cert intakes that were originally sent as auto candidates.
 */
export async function editPaidRequestTelegramMessageToNeedsManualReview(
  intakeId: string,
): Promise<void> {
  try {
    const loaded = await loadIntakeForEdit(intakeId)
    if (!loaded) return
    await editTelegramMessageToNeedsManualReview(loaded.messageId, loaded.opts)
  } catch (error) {
    log.warn("Failed to edit Telegram message to needs-manual-review (non-fatal)", {
      intakeId,
      error: String(error),
    })
  }
}
