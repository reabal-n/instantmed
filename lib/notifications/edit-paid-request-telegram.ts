import "server-only"

import { resolvePaidRequestServiceSlug } from "@/lib/notifications/paid-request-telegram"
import {
  type EditTelegramMessageOptions,
  editTelegramMessageToApproved,
  editTelegramMessageToDeclined,
  editTelegramMessageToNeedsManualReview,
} from "@/lib/notifications/telegram"
import { createLogger } from "@/lib/observability/logger"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

const log = createLogger("edit-paid-request-telegram")
const TELEGRAM_EDIT_LOOKUP_TIMEOUT_MS = 5_000

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
    .abortSignal(AbortSignal.timeout(TELEGRAM_EDIT_LOOKUP_TIMEOUT_MS))
    .maybeSingle()

  if (error || !data) return null

  const row = data as IntakeForEdit
  if (!row.paid_request_telegram_message_id) return null

  const serviceSlug = resolvePaidRequestServiceSlug({
    category: row.category,
    subtype: row.subtype,
  })

  return {
    messageId: row.paid_request_telegram_message_id,
    opts: {
      serviceSlug: serviceSlug || undefined,
      subtype: row.subtype ?? undefined,
      serviceDetail: undefined,
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
 * Change the original neutral med-cert message to "needs manual review" when
 * the auto-approval pipeline decides the intake is ineligible. Only meaningful
 * for med-cert intakes that entered the auto-approval routing pipeline.
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
