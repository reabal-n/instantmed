import { describe, expect, it } from "vitest"

import {
  CRITICAL_ALERT_COOLDOWN_HOURS,
  fingerprintCriticalAlert,
} from "@/lib/monitoring/critical-alert-cooldown"
import {
  buildPrescriptionFulfilmentSlaAlerts,
  FULFILMENT_SLA_ALERT_MAX_AGE_DAYS,
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

  it("keeps the alert window well clear of the minute-scale SLAs", () => {
    // A ten-minute SLA with a seven-day alert window still pages for anything
    // an operator could plausibly act on the same week.
    expect(FULFILMENT_SLA_ALERT_MAX_AGE_DAYS).toBeGreaterThanOrEqual(1)
    expect(FULFILMENT_SLA_ALERT_MAX_AGE_DAYS).toBeLessThanOrEqual(14)
  })
})

describe("critical alert cooldown fingerprint", () => {
  it("treats identical detail text as the same alert", () => {
    const detail = "8 paid prescribing requests have exceeded the 10-minute SLA"

    expect(fingerprintCriticalAlert(detail)).toBe(fingerprintCriticalAlert(detail))
    // Incidental whitespace must not defeat the cooldown.
    expect(fingerprintCriticalAlert(` ${detail} `)).toBe(fingerprintCriticalAlert(detail))
  })

  it("treats an escalated count as a new alert so it pages immediately", () => {
    const before = fingerprintCriticalAlert("1 paid prescribing request has exceeded")
    const after = fingerprintCriticalAlert("5 paid prescribing requests have exceeded")

    expect(after).not.toBe(before)
  })

  it("treats an added alert type as a new alert", () => {
    const single = fingerprintCriticalAlert("Queue is stale")
    const combined = fingerprintCriticalAlert("Queue is stale; Payments are failing")

    expect(combined).not.toBe(single)
  })

  it("caps a persistent condition well below the 30-minute cron cadence", () => {
    const pagesPerDay = 24 / CRITICAL_ALERT_COOLDOWN_HOURS
    const uncooledPagesPerDay = (24 * HOUR) / (30 * 60 * 1000)

    expect(pagesPerDay).toBeLessThanOrEqual(6)
    expect(pagesPerDay).toBeLessThan(uncooledPagesPerDay)
  })
})
