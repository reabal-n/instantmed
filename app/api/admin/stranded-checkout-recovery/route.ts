import { NextRequest, NextResponse } from "next/server"

import { verifyCronRequest } from "@/lib/api/cron-auth"
import { getApiAuth } from "@/lib/auth/helpers"
import { hasAdminAccess } from "@/lib/auth/staff-capabilities"
import { sendStrandedCheckoutRecoveryEmail } from "@/lib/email/abandoned-checkout"
import { createLogger } from "@/lib/observability/logger"
import { logAuditEvent } from "@/lib/security/audit-log"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

const log = createLogger("stranded-checkout-recovery-api")

export const dynamic = "force-dynamic"
export const maxDuration = 60

const MAX_INTAKES_PER_RUN = 25

/**
 * Recover checkouts the platform itself stranded.
 *
 * The abandoned-checkout cron only discovers candidates whose `created_at` is
 * inside its 24h lookback. An intake that enters `checkout_failed` after that
 * window closes (typically when incident remediation marks older rows) is
 * invisible to automation permanently. This is the operator escape hatch.
 *
 * Use ONLY where the platform was at fault. Ordinary abandonment belongs to the
 * cron, which sends copy that assumes the patient chose to stop.
 *
 * Defaults to DRY RUN. To send:
 *   POST { "intakeIds": ["..."], "dryRun": false }
 *
 * Payment state is never mutated. Each send is consent-gated, state-checked,
 * one-shot via the shared `abandoned_email_sent_at` CAS, and audit-logged.
 */
export async function POST(req: NextRequest) {
  // Admin session (operator in a browser) or CRON_SECRET bearer (terminal).
  const auth = await getApiAuth()
  const isAdmin = Boolean(auth && hasAdminAccess(auth.profile))
  if (!isAdmin && verifyCronRequest(req) !== null) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = (await req.json().catch(() => ({}))) as {
    intakeIds?: unknown
    dryRun?: unknown
  }

  const intakeIds = Array.isArray(body.intakeIds)
    ? body.intakeIds.filter((id): id is string => typeof id === "string" && id.length > 0)
    : []

  if (intakeIds.length === 0) {
    return NextResponse.json({ error: "intakeIds required" }, { status: 400 })
  }
  if (intakeIds.length > MAX_INTAKES_PER_RUN) {
    return NextResponse.json(
      { error: `at most ${MAX_INTAKES_PER_RUN} intakes per run` },
      { status: 400 },
    )
  }

  const dryRun = body.dryRun !== false // default true; only an explicit false sends
  const supabase = createServiceRoleClient()
  const results: Array<Record<string, unknown>> = []

  for (const intakeId of intakeIds) {
    const { data } = await supabase
      .from("intakes")
      .select("id, status, payment_status, category, subtype, created_at, abandoned_email_sent_at")
      .eq("id", intakeId)
      .maybeSingle()

    if (!data) {
      results.push({ intakeId, outcome: "not_found" })
      continue
    }

    const eligible =
      ["pending_payment", "checkout_failed"].includes(data.status) &&
      ["pending", "unpaid", "failed"].includes(data.payment_status) &&
      data.abandoned_email_sent_at === null

    if (dryRun) {
      results.push({
        intakeId,
        outcome: eligible ? "would_send" : "would_skip",
        category: data.category,
        status: data.status,
        paymentStatus: data.payment_status,
        createdAt: data.created_at,
      })
      continue
    }

    if (!eligible) {
      results.push({ intakeId, outcome: "skipped_not_eligible" })
      continue
    }

    const result = await sendStrandedCheckoutRecoveryEmail(intakeId)
    results.push({ intakeId, outcome: result.reason, sent: result.sent })

    await logAuditEvent({
      action: "stranded_checkout_recovery_email",
      actorType: isAdmin ? "admin" : "system",
      actorId: auth?.userId,
      intakeId,
      metadata: { outcome: result.reason, sent: result.sent },
    })
  }

  log.info("Stranded checkout recovery run", {
    dryRun,
    requested: intakeIds.length,
    sent: results.filter((r) => r.sent === true).length,
  })

  return NextResponse.json({ dryRun, results })
}
