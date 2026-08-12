import { describe, expect, it } from "vitest"

import {
  buildStaleHumanQueueAlert,
  STALE_HUMAN_QUEUE_CATEGORIES,
  STALE_HUMAN_QUEUE_THRESHOLD_HOURS,
} from "@/lib/monitoring/stale-human-queue"

// The operator chose a targeted Telegram ALERT over an autonomous auto-pause:
// page when the oldest paid-but-unreviewed request passes 24h. Medical
// certificates join this queue only when they remain unpaid-outcome stale;
// clean protocol-issued requests should leave it long before the threshold.

const NOW = new Date("2026-06-11T12:00:00Z")
const hoursAgo = (h: number) => new Date(NOW.getTime() - h * 3_600_000).toISOString()

describe("buildStaleHumanQueueAlert", () => {
  it("includes medical_certificate because any 24h-stale paid cert already needs human recovery", () => {
    expect([...STALE_HUMAN_QUEUE_CATEGORIES]).toEqual([
      "medical_certificate",
      "prescription",
      "consultation",
    ])
    expect(STALE_HUMAN_QUEUE_THRESHOLD_HOURS).toBe(24)
  })

  it("returns null when nothing is waiting", () => {
    expect(buildStaleHumanQueueAlert(null, 0, NOW)).toBeNull()
  })

  it("returns null when there are rows but no oldest timestamp", () => {
    expect(buildStaleHumanQueueAlert(null, 3, NOW)).toBeNull()
  })

  it("returns null when the oldest item is still under the 24h threshold", () => {
    expect(buildStaleHumanQueueAlert(hoursAgo(12), 2, NOW)).toBeNull()
    expect(buildStaleHumanQueueAlert(hoursAgo(23.9), 1, NOW)).toBeNull()
  })

  it("fires a critical alert once the oldest crosses 24h", () => {
    const alert = buildStaleHumanQueueAlert(hoursAgo(26), 3, NOW)
    expect(alert).not.toBeNull()
    expect(alert).toMatchObject({ metric: "human_review_queue_stalled", severity: "critical", count: 3 })
    expect(alert?.detail).toMatch(/26h/)
    expect(alert?.detail).toMatch(/stalled requests now need a human/i)
    expect(alert?.detail).not.toMatch(/every active clinical pathway/i)
  })

  it("uses singular vs plural correctly", () => {
    expect(buildStaleHumanQueueAlert(hoursAgo(30), 1, NOW)?.detail).toMatch(/1 paid request\b/)
    expect(buildStaleHumanQueueAlert(hoursAgo(30), 2, NOW)?.detail).toMatch(/2 paid requests\b/)
  })

  it("returns null on an invalid timestamp rather than throwing", () => {
    expect(buildStaleHumanQueueAlert("not-a-date", 5, NOW)).toBeNull()
  })

  it("respects a custom threshold", () => {
    expect(buildStaleHumanQueueAlert(hoursAgo(10), 1, NOW, 6)).not.toBeNull()
    expect(buildStaleHumanQueueAlert(hoursAgo(4), 1, NOW, 6)).toBeNull()
  })
})
