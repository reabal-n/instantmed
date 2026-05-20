import "server-only"

import { getIntakeAnswers } from "@/lib/data/intake-answers"
import {
  resolvePaidRequestServiceDetail,
  resolvePaidRequestServiceName,
} from "@/lib/notifications/paid-request-telegram"
import {
  editTelegramMessageToApproved,
  editTelegramMessageToDeclined,
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
): Promise<{ row: IntakeForEdit; answers: Record<string, unknown> | null } | null> {
  const supabase = createServiceRoleClient()
  const { data, error } = await supabase
    .from("intakes")
    .select("paid_request_telegram_message_id, category, subtype")
    .eq("id", intakeId)
    .maybeSingle()

  if (error || !data) return null

  const row = data as IntakeForEdit
  if (!row.paid_request_telegram_message_id) return null

  let answers: Record<string, unknown> | null = null
  try {
    answers = await getIntakeAnswers(intakeId)
  } catch {
    answers = null
  }

  return { row, answers }
}

function composeServiceName(
  row: IntakeForEdit,
  answers: Record<string, unknown> | null,
): string {
  const base = resolvePaidRequestServiceName({
    category: row.category,
    subtype: row.subtype,
  })
  const detail = resolvePaidRequestServiceDetail({
    category: row.category,
    subtype: row.subtype,
    answers,
  })
  return detail ? `${base} · ${detail}` : base
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
    if (!loaded || !loaded.row.paid_request_telegram_message_id) return
    const serviceName = composeServiceName(loaded.row, loaded.answers)
    await editTelegramMessageToApproved(
      loaded.row.paid_request_telegram_message_id,
      serviceName,
    )
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
    if (!loaded || !loaded.row.paid_request_telegram_message_id) return
    const serviceName = composeServiceName(loaded.row, loaded.answers)
    await editTelegramMessageToDeclined(
      loaded.row.paid_request_telegram_message_id,
      serviceName,
    )
  } catch (error) {
    log.warn("Failed to edit Telegram message to declined (non-fatal)", {
      intakeId,
      error: String(error),
    })
  }
}
