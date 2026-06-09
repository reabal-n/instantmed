import { NextRequest, NextResponse } from "next/server"

import { getApiAuth } from "@/lib/auth/helpers"
import { hasAdminAccess } from "@/lib/auth/staff-capabilities"
import { processHeardAboutUsBackfill } from "@/lib/email/heard-about-us-backfill"
import { createLogger } from "@/lib/observability/logger"

const log = createLogger("heard-backfill-api")

export const dynamic = "force-dynamic"
// One synchronous batch of ~50 sends (120ms apart + Resend latency) fits well
// under a minute; outbox dedup makes a timeout-then-retry safe.
export const maxDuration = 60

/**
 * One-time attribution backfill. Emails historical Direct/Unknown buyers a
 * one-click "how did you find us?" question (referrer-stripped dark traffic we
 * could never attribute in code). Admin-only; marketing-consent gated per
 * recipient; idempotent via email_outbox dedup so re-runs skip already-asked
 * patients.
 *
 * Defaults to DRY RUN — returns the candidate count without sending. To send:
 *   POST { "dryRun": false }            // send to all candidates
 *   POST { "dryRun": false, "limit": 20 } // staged first batch
 */
export async function POST(req: NextRequest) {
  const auth = await getApiAuth()
  if (!auth || !hasAdminAccess(auth.profile)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = (await req.json().catch(() => ({}))) as { dryRun?: unknown; limit?: unknown }
  const dryRun = body.dryRun !== false // default true; only an explicit false sends
  const limit =
    typeof body.limit === "number" && body.limit > 0 ? Math.floor(body.limit) : undefined

  try {
    const result = await processHeardAboutUsBackfill({ dryRun, limit })
    log.info("Attribution backfill run", result)
    return NextResponse.json(result)
  } catch (error) {
    log.error("Attribution backfill failed", {}, error)
    return NextResponse.json({ error: "backfill_failed" }, { status: 500 })
  }
}
