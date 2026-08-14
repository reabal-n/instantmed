import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

const root = process.cwd()

function read(path: string): string {
  return readFileSync(join(root, path), "utf8")
}

const terminalAnchors: Record<string, string> = {
  "business-alerts": "const fulfilment = prescriptionFulfilment",
  "daily-reconciliation": "Daily reconciliation clean",
  "email-dispatcher": "Email dispatcher cron completed",
  "emergency-flags": "for (const intake of abandonedIntakes)",
  "google-ads-conversions": "Google Ads conversion backfill complete",
  "google-ads-daily-brief": "Daily Google Ads brief delivered",
  "google-ads-diagnostics-watch": "Google Ads diagnostics watch passed",
  "parchment-smoke": "runParchmentSmokeValidation",
  "posthog-reconciliation": "PostHog reconciliation complete",
  "release-stale-claims": "Failed to record stale-claims run",
  "retry-auto-approval": "Retry auto-approval cron complete",
  "retry-drafts": "Retry drafts cron completed",
  "stale-queue": "Awaiting-script count failed",
  "telegram-notifications": "Telegram notification cron completed",
}

const lockProtectedJobs = [
  "daily-reconciliation",
  "google-ads-conversions",
  "posthog-reconciliation",
  "release-stale-claims",
  "retry-drafts",
]

describe("critical cron terminal outcome contract", () => {
  it("keeps the audited route inventory identical to CRITICAL_CRONS", () => {
    const heartbeat = read("lib/monitoring/cron-heartbeat.ts")
    const registry = heartbeat.match(
      /export const CRITICAL_CRONS:[\s\S]*?^}/m,
    )?.[0]
    expect(registry).toBeTruthy()

    const registeredJobs = Array.from(
      registry?.matchAll(/^ {2}"([a-z0-9-]+)":/gm) ?? [],
      (match) => match[1],
    ).sort()

    expect(registeredJobs).toEqual(Object.keys(terminalAnchors).sort())
    expect(registeredJobs).toHaveLength(14)
  })

  it.each(Object.entries(terminalAnchors))(
    "%s records a status-bearing heartbeat only after its success anchor",
    (jobName, terminalAnchor) => {
      const source = read(`app/api/cron/${jobName}/route.ts`)
      const anchorIndex = source.indexOf(terminalAnchor)
      const terminalHeartbeatIndex = source.indexOf(
        `await recordCronHeartbeat("${jobName}",`,
        anchorIndex,
      )

      expect(anchorIndex, `${jobName} terminal anchor`).toBeGreaterThan(-1)
      expect(
        terminalHeartbeatIndex,
        `${jobName} terminal heartbeat`,
      ).toBeGreaterThan(anchorIndex)
      expect(
        source.slice(terminalHeartbeatIndex, terminalHeartbeatIndex + 500),
      ).toContain("status:")
      expect(source).toContain('status: "error"')
      expect(source).not.toMatch(
        new RegExp(`recordCronHeartbeat\\(\\"${jobName}\\"\\)`),
      )
    },
  )

  it.each(lockProtectedJobs)(
    "%s distinguishes unavailable lock storage from ordinary overlap",
    (jobName) => {
      const source = read(`app/api/cron/${jobName}/route.ts`)

      expect(source).toContain('lock.reason === "unavailable"')
      expect(source).toContain('"configuration_error" : "skipped"')
    },
  )
})
