import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

import {
  buildPrescriptionFulfilmentSlaAlerts,
  type PrescriptionFulfilmentDashboard,
} from "@/lib/parchment/fulfilment-dashboard"

/**
 * 2026-07-19 incident: one critical Telegram page bundled three signals, all of
 * them stale, and re-fired every 30 minutes.
 *
 *  - "8 requests exceeded the 10-minute webhook-received SLA": rows 34–77 days
 *    old, five of them a single bulk backfill. Measured against a ten-minute
 *    SLA they breach by four orders of magnitude and can never clear by ageing.
 *  - "1 request exceeded the 120-minute approved-not-prescribed SLA": an ED
 *    consult refunded that morning. A refunded request carries no prescribing
 *    obligation, so it must leave the funnel rather than breach forever.
 *  - "1 terminal click-attributed Google Ads adjustment failure": a finding
 *    from 17 days earlier, resurfaced because an unrelated user-data-only
 *    failure that morning re-armed the shared re-page window.
 *
 * These pin the three suppression rules plus the cooldown fingerprint.
 */

const HOUR = 60 * 60 * 1000

function dashboardWithWebhookStage(
  overrides: Partial<PrescriptionFulfilmentDashboard["stages"][number]>,
): PrescriptionFulfilmentDashboard {
  return {
    firstNotificationIssueIntakeId: null,
    firstNotificationIssueStatus: null,
    lookbackDays: 180,
    manualConfirmationCount: 0,
    notificationFailedCount: 0,
    notificationPendingCount: 0,
    stages: [
      {
        count: 8,
        detail: "Script confirmation exists, but notification has not landed yet.",
        emailFailedCount: 0,
        emailPendingCount: 0,
        items: [],
        key: "webhook_received",
        label: "Webhook received",
        manualConfirmedCount: 0,
        oldestMinutes: 77 * 24 * 60,
        slaBreachedCount: 8,
        slaBreachedRecentCount: 0,
        slaMinutes: 10,
        webhookConfirmedCount: 8,
        ...overrides,
      },
    ],
    total: 8,
    webhookConfirmationCount: 8,
  }
}

describe("prescription fulfilment SLA alerts", () => {
  it("does not page for a breach backlog that is too old to act on", () => {
    // Eight breaches, none recent: the 2026-07-19 state exactly.
    const alerts = buildPrescriptionFulfilmentSlaAlerts(
      dashboardWithWebhookStage({ slaBreachedCount: 8, slaBreachedRecentCount: 0 }),
    )

    expect(alerts).toEqual([])
  })

  it("pages on a recent breach and still reports the full backlog", () => {
    const alerts = buildPrescriptionFulfilmentSlaAlerts(
      dashboardWithWebhookStage({ slaBreachedCount: 8, slaBreachedRecentCount: 2 }),
    )

    expect(alerts).toHaveLength(1)
    // The pageable count drives the copy, not the backlog.
    expect(alerts[0].count).toBe(2)
    expect(alerts[0].detail).toContain("2 paid prescribing requests have exceeded")
    // The backlog is still carried so the operator can see the whole picture.
    expect(alerts[0].metadata.backlog_count).toBe(8)
  })

  it("still reports zero when a stage has no breaches at all", () => {
    expect(
      buildPrescriptionFulfilmentSlaAlerts(
        dashboardWithWebhookStage({ slaBreachedCount: 0, slaBreachedRecentCount: 0 }),
      ),
    ).toEqual([])
  })
})

/**
 * The cooldown itself needs a database, so its wiring is pinned at the source
 * level. The property that matters is not the hash — it is that cooling the
 * Telegram page never costs a recorded signal.
 */
describe("critical alert Telegram cooldown wiring", () => {
  const cronSource = readFileSync(
    join(process.cwd(), "app/api/cron/business-alerts/route.ts"),
    "utf8",
  )
  const cooldownSource = readFileSync(
    join(process.cwd(), "lib/monitoring/critical-alert-cooldown.ts"),
    "utf8",
  )

  it("never suppresses the Sentry capture, only the Telegram page", () => {
    const criticalBlock = cronSource.slice(cronSource.indexOf("criticalAlerts.length > 0"))
    const sentryIndex = criticalBlock.indexOf("Sentry.captureMessage")
    const cooldownIndex = criticalBlock.indexOf("shouldSendCriticalAlert")

    expect(sentryIndex).toBeGreaterThan(-1)
    expect(cooldownIndex).toBeGreaterThan(-1)
    // Sentry fires first and unconditionally; the gate sits only in front of
    // the Telegram send.
    expect(sentryIndex).toBeLessThan(cooldownIndex)
  })

  it("gates the Telegram send and only receipts a delivered page", () => {
    expect(cronSource).toMatch(
      /if \(await shouldSendCriticalAlert\([\s\S]{0,120}sendCriticalBusinessAlertViaTelegram/,
    )
    // Receipting an undelivered page would start a cooldown for an alert the
    // operator never saw.
    expect(cronSource).toMatch(/if \(delivered\) await recordCriticalAlertSent/)
  })

  it("fingerprints the detail text so an escalation pages immediately", () => {
    // Keying on content rather than alert type is what lets a count change or
    // a newly-added alert bypass the cooldown.
    expect(cooldownSource).toContain("createHash(\"sha256\").update(detail.trim())")
  })

  it("fails open so a lookup error can never swallow a critical alert", () => {
    const shouldSend = cooldownSource.slice(
      cooldownSource.indexOf("export async function shouldSendCriticalAlert"),
    )
    const errorBranch = shouldSend.slice(shouldSend.indexOf("if (error)"))

    expect(errorBranch).toMatch(/return true/)
    expect(shouldSend).toMatch(/catch[\s\S]{0,200}return true/)
  })

  it("caps a persistent condition well below the 30-minute cron cadence", () => {
    const cooldownHours = Number(
      /CRITICAL_ALERT_COOLDOWN_HOURS = (\d+)/.exec(cooldownSource)?.[1],
    )
    const uncooledPagesPerDay = (24 * HOUR) / (30 * 60 * 1000)

    expect(cooldownHours).toBeGreaterThan(0)
    expect(24 / cooldownHours).toBeLessThan(uncooledPagesPerDay)
  })
})
