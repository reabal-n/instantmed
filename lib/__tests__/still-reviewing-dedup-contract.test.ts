import { readFileSync } from "node:fs"
import { resolve } from "node:path"

import { describe, expect, it } from "vitest"

/**
 * Two crons send the IDENTICAL still_reviewing email but historically tracked
 * it on different columns — retry-auto-approval on follow_up_sent_at (45-min
 * trigger), stale-queue on delay_notification_sent_at (2h trigger). With no
 * cross-guard the patient received the same email twice (observed 2026-06-08).
 *
 * Both candidate queries must now guard on BOTH columns so whichever cron
 * sends first blocks the other. This contract pins that.
 */
const retrySource = readFileSync(
  resolve(process.cwd(), "app/api/cron/retry-auto-approval/route.ts"),
  "utf-8",
)
const staleSource = readFileSync(
  resolve(process.cwd(), "app/api/cron/stale-queue/route.ts"),
  "utf-8",
)

describe("still_reviewing dedup contract", () => {
  it("retry-auto-approval guards on both follow_up_sent_at and delay_notification_sent_at", () => {
    expect(retrySource).toMatch(/\.is\("follow_up_sent_at",\s*null\)/)
    expect(retrySource).toMatch(/\.is\("delay_notification_sent_at",\s*null\)/)
  })

  it("stale-queue guards on both delay_notification_sent_at and follow_up_sent_at", () => {
    expect(staleSource).toMatch(/\.is\("delay_notification_sent_at",\s*null\)/)
    expect(staleSource).toMatch(/\.is\("follow_up_sent_at",\s*null\)/)
  })
})
