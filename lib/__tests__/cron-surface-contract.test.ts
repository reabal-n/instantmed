import { readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

const root = process.cwd()

function read(path: string) {
  return readFileSync(join(root, path), "utf8")
}

function cronRoutePaths(): string[] {
  return readdirSync(join(root, "app/api/cron"), { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => `/api/cron/${entry.name}`)
    .sort()
}

describe("cron surface contract", () => {
  it("keeps every cron route scheduled and documented", () => {
    const vercelConfig = JSON.parse(read("vercel.json")) as {
      crons?: Array<{ path?: string; schedule?: string }>
    }
    const scheduledPaths = (vercelConfig.crons ?? [])
      .map((cron) => cron.path)
      .filter((path): path is string => Boolean(path))
      .sort()
    const routePaths = cronRoutePaths()
    const operations = read("docs/OPERATIONS.md")

    expect(routePaths).toEqual(scheduledPaths)
    for (const path of scheduledPaths) {
      expect(operations, path).toContain(path)
    }
  })

  it("keeps the local cron guard bidirectional", () => {
    const script = read("scripts/check-vercel-cron-routes.mjs")

    expect(script).toContain("readdirSync(cronRouteDir")
    expect(script).toContain("Cron route is not scheduled in vercel.json")
    expect(script).toContain("Missing route for scheduled cron")
  })

  it("keeps non-operational engagement and dashboard digest crons retired", () => {
    const vercelConfig = JSON.parse(read("vercel.json")) as {
      crons?: Array<{ path?: string }>
    }
    const scheduledPaths = new Set((vercelConfig.crons ?? []).map((cron) => cron.path))
    const orphanCheck = read("scripts/check-orphaned-files.sh")
    const retired = [
      "/api/cron/acquisition-health",
      "/api/cron/daily-digest",
      "/api/cron/decline-reengagement",
      "/api/cron/email-digest",
      "/api/cron/follow-up-reminder",
      "/api/cron/scheduled-maintenance",
      "/api/cron/subscription-nudge",
      "/api/cron/treatment-followup",
    ]

    for (const path of retired) {
      expect(scheduledPaths.has(path), path).toBe(false)
      expect(orphanCheck, path).toContain(`app${path}/route.ts`)
    }
  })

  it("keeps health-check as a heartbeat watchdog rather than a duplicate alert surface", () => {
    const healthCheckSource = read("app/api/cron/health-check/route.ts")
    const heartbeatSource = read("lib/monitoring/cron-heartbeat.ts")

    expect(healthCheckSource).toContain("checkCronHeartbeats")
    expect(healthCheckSource).not.toContain("checkQueueHealthAndAlert")
    expect(healthCheckSource).not.toContain("checkDoctorActivityAndAlert")
    expect(healthCheckSource).not.toContain("checkDeliveryHealthAndAlert")
    expect(healthCheckSource).not.toContain("getAIHealthMetrics")
    expect(heartbeatSource).not.toContain('"health-check":')
  })

  it("keeps Google Ads diagnostics watch schedule, heartbeat, and docs aligned", () => {
    const vercelConfig = JSON.parse(read("vercel.json")) as {
      crons?: Array<{ path?: string; schedule?: string }>
    }
    const diagnosticsCron = (vercelConfig.crons ?? []).find(
      (cron) => cron.path === "/api/cron/google-ads-diagnostics-watch",
    )
    const heartbeatSource = read("lib/monitoring/cron-heartbeat.ts")
    const watchRouteSource = read("app/api/cron/google-ads-diagnostics-watch/route.ts")
    const operationsSource = read("docs/OPERATIONS.md")

    expect(diagnosticsCron).toEqual({
      path: "/api/cron/google-ads-diagnostics-watch",
      schedule: "50 * * * *",
    })
    expect(heartbeatSource).toContain(
      '"google-ads-diagnostics-watch": { schedule: "50 * * * *", maxDelayMinutes: 75 }',
    )
    expect(watchRouteSource).toContain('await recordCronHeartbeat("google-ads-diagnostics-watch",')
    expect(watchRouteSource).toContain('status: "disabled"')
    expect(watchRouteSource).toContain('status: "skipped"')
    expect(watchRouteSource.indexOf('status: handledQueryFailure ? "partial_failure" : "ok"')).toBeGreaterThan(
      watchRouteSource.indexOf("Google Ads diagnostics watch passed"),
    )
    expect(operationsSource).toContain(
      "| Google Ads Diagnostics Watch | `/api/cron/google-ads-diagnostics-watch` | Hourly (:50) |",
    )
  })

  it("keeps PostHog reconciliation outcome-monitored and documented", () => {
    const vercelConfig = JSON.parse(read("vercel.json")) as {
      crons?: Array<{ path?: string; schedule?: string }>
    }
    const reconciliationCron = (vercelConfig.crons ?? []).find(
      (cron) => cron.path === "/api/cron/posthog-reconciliation",
    )
    const heartbeatSource = read("lib/monitoring/cron-heartbeat.ts")
    const routeSource = read("app/api/cron/posthog-reconciliation/route.ts")
    const operationsSource = read("docs/OPERATIONS.md")

    expect(reconciliationCron).toEqual({
      path: "/api/cron/posthog-reconciliation",
      schedule: "15 * * * *",
    })
    expect(heartbeatSource).toContain(
      '"posthog-reconciliation": { schedule: "15 * * * *",    maxDelayMinutes: 75 }',
    )
    expect(routeSource.indexOf('status: "ok"')).toBeGreaterThan(
      routeSource.indexOf("PostHog reconciliation complete"),
    )
    expect(routeSource).toContain('status: "configuration_error"')
    expect(operationsSource).toContain(
      "| PostHog Reconciliation | `/api/cron/posthog-reconciliation` | Hourly (:15) |",
    )
  })

  it("keeps business-alerts scheduled, heartbeat-monitored, and documented", () => {
    const vercelConfig = JSON.parse(read("vercel.json")) as {
      crons?: Array<{ path?: string; schedule?: string }>
    }
    const businessAlertsCron = (vercelConfig.crons ?? []).find(
      (cron) => cron.path === "/api/cron/business-alerts",
    )
    const heartbeatSource = read("lib/monitoring/cron-heartbeat.ts")
    const routeSource = read("app/api/cron/business-alerts/route.ts")
    const operationsSource = read("docs/OPERATIONS.md")

    expect(businessAlertsCron).toEqual({
      path: "/api/cron/business-alerts",
      schedule: "*/30 * * * *",
    })
    expect(heartbeatSource).toContain(
      '"business-alerts":        { schedule: "*/30 * * * *",   maxDelayMinutes: 75 }',
    )
    expect(routeSource).toContain('await recordCronHeartbeat("business-alerts",')
    expect(routeSource.indexOf('status: handledFailures > 0 ? "partial_failure" : "ok"')).toBeGreaterThan(
      routeSource.indexOf("const fulfilment = prescriptionFulfilment"),
    )
    expect(operationsSource).toContain("| Business Alerts | `/api/cron/business-alerts` | Every 30 min |")
  })
})
