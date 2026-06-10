import * as Sentry from "@sentry/nextjs"
import { NextRequest, NextResponse } from "next/server"

import { trackBusinessMetric } from "@/lib/analytics/posthog-server"
import { acquireCronLock, releaseCronLock, verifyCronRequest } from "@/lib/api/cron-auth"
import { filterSeededE2EIntakes } from "@/lib/data/seeded-e2e-data"
import { recordCronHeartbeat } from "@/lib/monitoring/cron-heartbeat"
import { createLogger } from "@/lib/observability/logger"
import { captureCronError } from "@/lib/observability/sentry"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

const logger = createLogger("cron-posthog-reconciliation")

// Alert when the gap between Supabase truth and PostHog server-event truth
// exceeds this fraction. 0.10 = 10% — enough headroom for in-flight events
// and ingestion lag without missing a real outage.
const ACCEPTABLE_DELTA = 0.10

/**
 * PostHog ↔ Supabase reconciliation.
 *
 * Compares yesterday's `intakes.payment_status='paid'` count (Supabase
 * = revenue truth) against the same window's `purchase_completed_server`
 * count in PostHog (server-fired purchase event from the Stripe webhook).
 * Surfaces drift via Sentry + a PostHog business-alert metric so silent
 * analytics breakage becomes a paged signal.
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
 * - `NEXT_PUBLIC_POSTHOG_HOST` — used for the API base URL.
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
      .eq("payment_status", "paid")
      .gte("paid_at", since.toISOString())
      .lte("paid_at", now.toISOString())
    const { count: supabasePaidCount, error: supabaseError } =
      await filterSeededE2EIntakes(baseQuery)
    if (supabaseError) throw new Error(`Supabase count failed: ${supabaseError.message}`)

    // ─── PostHog truth ───────────────────────────────────────────────
    const posthogHost = process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.posthog.com"
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

    const trendsBody = {
      events: [{ id: "purchase_completed_server", type: "events", math: "total" }],
      properties: [{ key: "is_e2e", value: "false", operator: "exact", type: "event" }],
      date_from: since.toISOString(),
      date_to: now.toISOString(),
    }
    const phRes = await fetch(
      `${posthogHost}/api/projects/${posthogProjectId}/insights/trend/`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${posthogApiKey}`,
        },
        body: JSON.stringify(trendsBody),
        cache: "no-store",
      },
    )
    if (!phRes.ok) {
      // A 401/403/404 here is a configuration problem (bad/expired
      // POSTHOG_PROJECT_API_KEY, missing scope, or wrong project id), not a
      // runtime failure. Do NOT captureCronError on these — the cron runs hourly
      // and this exact flood (INSTANTMED-2A, "PostHog trends API 403") helped
      // exhaust the Sentry quota and kill ingestion in June 2026. Skip gracefully
      // like the missing-credentials branch; fix the key in Vercel prod instead.
      // See docs/audits/2026-06-10-comprehensive-audit.md.
      if (phRes.status === 401 || phRes.status === 403 || phRes.status === 404) {
        logger.warn("PostHog reconciliation skipped: trends API auth/config failure", {
          status: phRes.status,
        })
        return NextResponse.json({
          success: false,
          skipped: true,
          reason: `posthog_trends_${phRes.status}`,
        })
      }
      throw new Error(`PostHog trends API ${phRes.status}`)
    }
    const phPayload = (await phRes.json()) as {
      result?: Array<{ aggregated_value?: number; count?: number }>
    }
    const series = phPayload.result?.[0]
    const posthogPurchaseCount = Math.round(
      Number(series?.aggregated_value ?? series?.count ?? 0),
    )

    // ─── Compare ─────────────────────────────────────────────────────
    const supabasePaid = supabasePaidCount ?? 0
    const delta = supabasePaid - posthogPurchaseCount
    const fractionalDelta = supabasePaid === 0
      ? (posthogPurchaseCount === 0 ? 0 : 1)
      : Math.abs(delta) / supabasePaid

    const breached = supabasePaid >= 5 && fractionalDelta > ACCEPTABLE_DELTA

    if (breached) {
      const severity = fractionalDelta > 0.3 ? "critical" : "warning"
      Sentry.captureMessage("PostHog ↔ Supabase purchase reconciliation drift", {
        level: severity === "critical" ? "error" : "warning",
        tags: { cron: "posthog-reconciliation" },
        extra: {
          window_hours: 24,
          supabase_paid: supabasePaid,
          posthog_server_purchase: posthogPurchaseCount,
          delta,
          fractional_delta: fractionalDelta,
        },
      })
      trackBusinessMetric({
        metric: "daily_reconciliation",
        severity,
        metadata: {
          source: "posthog_reconciliation",
          supabase_paid: supabasePaid,
          posthog_server_purchase: posthogPurchaseCount,
          fractional_delta: fractionalDelta,
        },
      })
    }

    logger.info("PostHog reconciliation complete", {
      supabase_paid: supabasePaid,
      posthog_server_purchase: posthogPurchaseCount,
      delta,
      fractional_delta: fractionalDelta,
      breached,
    })

    return NextResponse.json({
      success: true,
      window_hours: 24,
      supabase_paid: supabasePaid,
      posthog_server_purchase: posthogPurchaseCount,
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
