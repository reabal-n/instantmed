import "server-only"

import { createLogger } from "@/lib/observability/logger"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

import { isHeardAboutUsValue } from "./heard-about-us"

const logger = createLogger("heard-about-us")

export type RecordHeardResult = "recorded" | "noop" | "invalid" | "error"

/**
 * Write-once record of the self-reported attribution answer.
 *
 * Only sets `heard_about_us` when it is currently NULL (first answer wins), so a
 * patient who answers in-app AND later clicks the email link doesn't overwrite.
 * Service-role write (the surfaces have no auth cookie); the signed token is the
 * authorization, validated by the caller. Best-effort: never throws.
 */
export async function recordHeardAboutUs(
  intakeId: string,
  value: string,
): Promise<RecordHeardResult> {
  if (!intakeId || !isHeardAboutUsValue(value)) return "invalid"

  const supabase = createServiceRoleClient()
  const { data, error } = await supabase
    .from("intakes")
    .update({ heard_about_us: value })
    .eq("id", intakeId)
    .is("heard_about_us", null)
    .select("id")

  if (error) {
    logger.error("Failed to record heard_about_us", { intakeId, error: error.message })
    return "error"
  }

  // Empty result = intake not found OR already answered (idempotent no-op).
  return data && data.length > 0 ? "recorded" : "noop"
}
