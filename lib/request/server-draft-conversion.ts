import type { SupabaseClient } from "@supabase/supabase-js"

import { createLogger } from "@/lib/observability/logger"

const logger = createLogger("server-draft-conversion")

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export type DraftConversionResult = {
  marked: boolean
  reason: "invalid_id" | "marked" | "not_found_or_already_converted" | "query_error"
}

function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_REGEX.test(value)
}

export async function markPartialIntakeConverted(
  supabase: SupabaseClient,
  {
    intakeId,
    sessionId,
  }: {
    intakeId: string | null | undefined
    sessionId: string | null | undefined
  },
): Promise<DraftConversionResult> {
  if (!isUuid(sessionId) || !isUuid(intakeId)) {
    logger.warn("Skipped partial-intake conversion marker with invalid ids", {
      hasIntakeId: Boolean(intakeId),
      hasSessionId: Boolean(sessionId),
    })
    return { marked: false, reason: "invalid_id" }
  }

  const { data, error } = await supabase
    .from("partial_intakes")
    .update({ converted_to_intake_id: intakeId })
    .eq("session_id", sessionId)
    .is("converted_to_intake_id", null)
    .select("session_id")
    .maybeSingle()

  if (error) {
    logger.warn("Failed to mark partial intake converted", { error: error.message })
    return { marked: false, reason: "query_error" }
  }

  if (!data) {
    return { marked: false, reason: "not_found_or_already_converted" }
  }

  return { marked: true, reason: "marked" }
}
