import { describe, expect, it, vi } from "vitest"

vi.mock("@sentry/nextjs", () => ({
  captureMessage: vi.fn(),
  captureException: vi.fn(),
}))

vi.mock("@/lib/notifications/telegram", () => ({
  escapeMarkdown: (value: string) => value,
  sendTelegramAlert: vi.fn(async () => false),
}))

import {
  CRON_WATCHDOG_TELEGRAM_COOLDOWN_MS,
  type OverdueCron,
  selectPageableOverdueCrons,
} from "@/lib/monitoring/cron-heartbeat"

function overdueJob(jobName: string): OverdueCron {
  return { jobName, lastRunAt: "2026-07-02T00:00:00.000Z", minutesOverdue: 42 }
}

describe("cron watchdog Telegram cooldown", () => {
  const nowMs = Date.parse("2026-07-02T12:00:00.000Z")

  it("pages every overdue cron when none paged recently", () => {
    const overdue = [overdueJob("email-dispatcher"), overdueJob("business-alerts")]

    const pageable = selectPageableOverdueCrons(overdue, new Map(), nowMs)

    expect(pageable.map((o) => o.jobName)).toEqual(["email-dispatcher", "business-alerts"])
  })

  it("suppresses a job paged inside the cooldown window", () => {
    const overdue = [overdueJob("email-dispatcher"), overdueJob("business-alerts")]
    const lastPagedAt = new Map([
      ["email-dispatcher", nowMs - CRON_WATCHDOG_TELEGRAM_COOLDOWN_MS / 2],
    ])

    const pageable = selectPageableOverdueCrons(overdue, lastPagedAt, nowMs)

    expect(pageable.map((o) => o.jobName)).toEqual(["business-alerts"])
  })

  it("re-pages a job once its cooldown lapses", () => {
    const overdue = [overdueJob("email-dispatcher")]
    const lastPagedAt = new Map([
      ["email-dispatcher", nowMs - CRON_WATCHDOG_TELEGRAM_COOLDOWN_MS - 1],
    ])

    const pageable = selectPageableOverdueCrons(overdue, lastPagedAt, nowMs)

    expect(pageable.map((o) => o.jobName)).toEqual(["email-dispatcher"])
  })

  it("pages a newly-overdue job immediately even while another job is cooling down", () => {
    // Mirrors the business-alerts per-metric rule: the overdue SET changing
    // must not suppress a job that has never paged.
    const overdue = [overdueJob("email-dispatcher"), overdueJob("retry-auto-approval")]
    const lastPagedAt = new Map([["email-dispatcher", nowMs - 60_000]])

    const pageable = selectPageableOverdueCrons(overdue, lastPagedAt, nowMs)

    expect(pageable.map((o) => o.jobName)).toEqual(["retry-auto-approval"])
  })
})
