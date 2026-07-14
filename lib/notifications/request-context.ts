import "server-only"

import {
  CONSULT_SUBTYPE_LABELS,
  normalizeConsultSubtypeParam,
} from "@/lib/request/consult-subtypes"
import { readAnswers } from "@/lib/security/phi-field-wrappers"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import {
  extractRepeatScriptMedications,
  formatRepeatScriptMedicationCompactLabel,
} from "@/lib/validation/repeat-script-medications"

const MAX_TELEGRAM_REQUEST_DETAIL_CHARS = 80

/**
 * Load only the encrypted answer blob needed to derive the bounded medicine
 * label. Callers fail soft so a context lookup can never block a request page.
 */
export async function loadTelegramRequestAnswers(
  intakeId: string,
): Promise<Record<string, unknown> | null> {
  const supabase = createServiceRoleClient()
  const { data, error } = await supabase
    .from("intake_answers")
    .select("answers, answers_encrypted")
    .eq("intake_id", intakeId)
    .maybeSingle()

  if (error) {
    throw new Error("Could not load Telegram request context")
  }
  if (!data) return null

  const row = data as {
    answers: Record<string, unknown> | null
    answers_encrypted: unknown
  }
  return readAnswers({
    answers: row.answers,
    answers_enc: row.answers_encrypted as never,
  })
}

/**
 * Telegram is an operator pager, not a clinical record. Keep the one allowed
 * request descriptor single-line and bounded before Markdown escaping.
 */
export function sanitizeTelegramRequestDetail(value: string | null | undefined): string | undefined {
  if (!value) return undefined

  const normalized = Array.from(value, (character) => {
    const codePoint = character.codePointAt(0) ?? 0
    return codePoint <= 31 || codePoint === 127 ? " " : character
  }).join("")
    .replace(/\s+/g, " ")
    .trim()
  if (!normalized) return undefined

  const characters = Array.from(normalized)
  if (characters.length <= MAX_TELEGRAM_REQUEST_DETAIL_CHARS) return normalized
  return `${characters.slice(0, MAX_TELEGRAM_REQUEST_DETAIL_CHARS - 1).join("")}…`
}

export function getTelegramConsultLabel(subtype: string | null | undefined): string | undefined {
  const normalized = normalizeConsultSubtypeParam(subtype)
  return normalized ? CONSULT_SUBTYPE_LABELS[normalized] : undefined
}

/**
 * Returns only the explicit operator-approved context for a paid request:
 * canonical consult type or the selected repeat-script medicine label. Never
 * falls back to free-text medicine descriptions, symptoms, notes, or identity.
 */
export function getTelegramRequestDetail(input: {
  answers?: Record<string, unknown> | null
  serviceSlug?: string | null
  subtype?: string | null
}): string | undefined {
  if (input.serviceSlug === "consult") {
    return sanitizeTelegramRequestDetail(getTelegramConsultLabel(input.subtype))
  }

  if (input.serviceSlug !== "common-scripts" || !input.answers) return undefined
  const medication = extractRepeatScriptMedications(input.answers)[0]
  return medication
    ? sanitizeTelegramRequestDetail(formatRepeatScriptMedicationCompactLabel(medication))
    : undefined
}
