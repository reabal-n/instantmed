import * as Sentry from "@sentry/nextjs"
import { NextRequest, NextResponse } from "next/server"

import { normalizePostHogApiHost } from "@/lib/analytics/posthog-host"
import { trackBusinessMetric } from "@/lib/analytics/posthog-server"
import { acquireCronLock, releaseCronLock, verifyCronRequest } from "@/lib/api/cron-auth"
import { filterReportableIntakes } from "@/lib/data/reporting-filters"
import { recordCronHeartbeat } from "@/lib/monitoring/cron-heartbeat"
import { REVENUE_PURCHASE_PAYMENT_STATUSES } from "@/lib/monitoring/revenue-safety"
import { createLogger } from "@/lib/observability/logger"
import { captureCronError } from "@/lib/observability/sentry"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

const logger = createLogger("cron-posthog-reconciliation")

// Alert when the gap between Supabase truth and PostHog server-event truth
// exceeds this fraction. 0.10 = 10% — enough headroom for in-flight events
// and ingestion lag without missing a real outage.
const ACCEPTABLE_DELTA = 0.10
const FLOW_INSTANCE_ID_HOGQL_PATTERN =
  "^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$"

function hogQlString(value: string): string {
  return `'${value.replace(/'/g, "''")}'`
}

/**
 * PostHog ↔ Supabase reconciliation.
 *
 * Compares the last 24 hours of reportable, ever-paid intakes (Supabase =
 * revenue truth) against unique valid `flow_instance_id` values on the same
 * window's `purchase_completed_server` events. Counting the flow identifier
 * makes webhook/fallback retries harmless while excluding malformed legacy
 * analytics rows from canonical coverage.
 *
 * Why this matters: shipped 2026-05-12, the dashboard audit found that
 * the client-side `purchase_completed` event was firing on only ~21% of
 * real paid intakes (adblockers / ITP). The server-side mirror fixes
 * forward, but there's no automated check that the new pipeline stays
 * healthy. This cron is that check.
 *
 * Schedule: hourly so a broken capture pipeline is detected within an
 * hour instead of "whenever we next eyeball PostHog".
 *
 * Env requirements:
 * - `POSTHOG_PROJECT_API_KEY` — read-only personal API key with access
 *   to the team's events API. Different from `NEXT_PUBLIC_POSTHOG_KEY`
 *   (which is the ingestion key).
 * - `POSTHOG_PROJECT_ID` — numeric project id (e.g. 277439).
 * - `NEXT_PUBLIC_POSTHOG_HOST` — ingestion host, normalized to the matching API host.
 */
export async function GET(request: NextRequest) {
  const authError = verifyCronRequest(request)
  if (authError) return authError

  await recordCronHeartbeat("posthog-reconciliation")

  const lock = await acquireCronLock("posthog-reconciliation")
  if (!lock.acquired) {
    return NextResponse.json({
      success: true,
      skipped: true,
      reason: lock.existingLockAge
        ? `Already running for ${lock.existingLockAge}s`
        : "Already running",
    })
  }

  try {
    const now = new Date()
    const since = new Date(now.getTime() - 24 * 60 * 60 * 1000)

    // ─── Supabase truth ──────────────────────────────────────────────
    const supabase = createServiceRoleClient()
    const baseQuery = supabase
      .from("intakes")
      .select("id", { count: "exact", head: true })
      .in("payment_status", [...REVENUE_PURCHASE_PAYMENT_STATUSES])
      .not("paid_at", "is", null)
      .gte("paid_at", since.toISOString())
      .lte("paid_at", now.toISOString())
    const { count: supabaseEverPaidCount, error: supabaseError } =
      await filterReportableIntakes(baseQuery)
    if (supabaseError) throw new Error(`Supabase count failed: ${supabaseError.message}`)

    // ─── PostHog truth ───────────────────────────────────────────────
    const posthogHost = normalizePostHogApiHost(
      process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.posthog.com",
    )
    const posthogApiKey = process.env.POSTHOG_PROJECT_API_KEY
    const posthogProjectId = process.env.POSTHOG_PROJECT_ID
    if (!posthogApiKey || !posthogProjectId) {
      logger.warn("PostHog credentials not configured — skipping reconciliation")
      return NextResponse.json({
        success: true,
        skipped: true,
        reason: "POSTHOG_PROJECT_API_KEY or POSTHOG_PROJECT_ID missing",
      })
    }

    const purchaseCountQuery = `
      SELECT count(DISTINCT toString(properties.flow_instance_id)) AS unique_valid_flows
      FROM events
      WHERE timestamp >= toDateTime(${hogQlString(since.toISOString())})
        AND timestamp <= toDateTime(${hogQlString(now.toISOString())})
        AND event = 'purchase_completed_server'
        AND properties.is_e2e = false
        AND match(
          toString(properties.flow_instance_id),
          ${hogQlString(FLOW_INSTANCE_ID_HOGQL_PATTERN)}
        )
    `.trim()
    const queryBody = {
      name: "InstantMed unique server purchase reconciliation",
      query: {
        kind: "HogQLQuery",
        query: purchaseCountQuery,
      },
    }
    const phRes = await fetch(
      `${posthogHost}/api/projects/${posthogProjectId}/query/`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${posthogApiKey}`,
        },
        body: JSON.stringify(queryBody),
        cache: "no-store",
      },
    )
    if (!phRes.ok) {
      // A 401/403/404 here is a configuration problem (bad/expired
      // POSTHOG_PROJECT_API_KEY, missing scope, wrong project id, or wrong API
      // host), not a runtime failure. Do NOT captureCronError on these — the
      // cron runs hourly and the prior trends-API flood (INSTANTMED-2A) helped
      // exhaust the Sentry quota and kill ingestion in June 2026. Skip gracefully
      // like the missing-credentials branch; fix the key in Vercel prod instead.
      // See docs/audits/2026-06-10-comprehensive-audit.md.
      if (phRes.status === 401 || phRes.status === 403 || phRes.status === 404) {
        logger.warn("PostHog reconciliation skipped: query API auth/config failure", {
          status: phRes.status,
        })
        return NextResponse.json({
          success: false,
          skipped: true,
          reason: `posthog_query_${phRes.status}`,
        })
      }
      throw new Error(`PostHog query API ${phRes.status}`)
    }
    const phPayload = (await phRes.json()) as {
      results?: unknown[][]
    }
    const posthogPurchaseCount = Number(phPayload.results?.[0]?.[0])
    if (!Number.isInteger(posthogPurchaseCount) || posthogPurchaseCount < 0) {
      throw new Error("PostHog purchase count query returned an invalid result")
    }

    // ─── Compare ─────────────────────────────────────────────────────
    const supabaseEverPaid = supabaseEverPaidCount ?? 0
    const delta = supabaseEverPaid - posthogPurchaseCount
    const fractionalDelta = supabaseEverPaid === 0
      ? (posthogPurchaseCount === 0 ? 0 : 1)
      : Math.abs(delta) / supabaseEverPaid

    const breached = supabaseEverPaid >= 5 && fractionalDelta > ACCEPTABLE_DELTA

    if (breached) {
      const severity = fractionalDelta > 0.3 ? "critical" : "warning"
      Sentry.captureMessage("PostHog ↔ Supabase purchase reconciliation drift", {
        level: severity === "critical" ? "error" : "warning",
        tags: { cron: "posthog-reconciliation" },
        extra: {
          window_hours: 24,
          supabase_reportable_ever_paid: supabaseEverPaid,
          posthog_unique_server_purchase: posthogPurchaseCount,
          delta,
          fractional_delta: fractionalDelta,
        },
      })
      trackBusinessMetric({
        metric: "daily_reconciliation",
        severity,
        metadata: {
          source: "posthog_reconciliation",
          supabase_reportable_ever_paid: supabaseEverPaid,
          posthog_unique_server_purchase: posthogPurchaseCount,
          fractional_delta: fractionalDelta,
        },
      })
    }

    logger.info("PostHog reconciliation complete", {
      supabase_reportable_ever_paid: supabaseEverPaid,
      posthog_unique_server_purchase: posthogPurchaseCount,
      delta,
      fractional_delta: fractionalDelta,
      breached,
    })

    return NextResponse.json({
      success: true,
      window_hours: 24,
      supabase_reportable_ever_paid: supabaseEverPaid,
      posthog_unique_server_purchase: posthogPurchaseCount,
      delta,
      fractional_delta: fractionalDelta,
      breached,
    })
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error))
    const eventId = captureCronError(err, { jobName: "posthog-reconciliation" })
    return NextResponse.json(
      { success: false, error: err.message, sentry_event_id: eventId },
      { status: 500 },
    )
  } finally {
    await releaseCronLock("posthog-reconciliation")
  }
}
