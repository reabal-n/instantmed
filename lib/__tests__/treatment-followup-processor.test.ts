import { describe, expect,it } from "vitest"

import { nextReminderNumber,shouldSendReminder } from "@/lib/email/treatment-followup"

describe("shouldSendReminder", () => {
  it("sends when due, not completed, no prior logs", () => {
    expect(
      shouldSendReminder({
        dueAt: new Date("2026-04-01"),
        now: new Date("2026-04-09"),
        completedAt: null,
        skipped: false,
        logs: [],
      })
    ).toBe(true)
  })

  it("does NOT send when completed", () => {
    expect(
      shouldSendReminder({
        dueAt: new Date("2026-04-01"),
        now: new Date("2026-04-09"),
        completedAt: new Date("2026-04-05"),
        skipped: false,
        logs: [],
      })
    ).toBe(false)
  })

  it("does NOT send when skipped", () => {
    expect(
      shouldSendReminder({
        dueAt: new Date("2026-04-01"),
        now: new Date("2026-04-09"),
        completedAt: null,
        skipped: true,
        logs: [],
      })
    ).toBe(false)
  })

  it("does NOT send when sent within last 3 days", () => {
    expect(
      shouldSendReminder({
        dueAt: new Date("2026-04-01"),
        now: new Date("2026-04-09"),
        completedAt: null,
        skipped: false,
        logs: [{ sentAt: new Date("2026-04-08") }],
      })
    ).toBe(false)
  })

  it("sends when last reminder was >3 days ago", () => {
    expect(
      shouldSendReminder({
        dueAt: new Date("2026-04-01"),
        now: new Date("2026-04-09"),
        completedAt: null,
        skipped: false,
        logs: [{ sentAt: new Date("2026-04-04") }],
      })
    ).toBe(true)
  })

  it("does NOT send after 3 reminders", () => {
    const sent = new Date("2026-04-01")
    expect(
      shouldSendReminder({
        dueAt: new Date("2026-03-01"),
        now: new Date("2026-04-09"),
        completedAt: null,
        skipped: false,
        logs: [
          { sentAt: sent },
          { sentAt: new Date("2026-03-20") },
          { sentAt: new Date("2026-03-05") },
        ],
      })
    ).toBe(false)
  })

  it("does NOT send before due date", () => {
    expect(
      shouldSendReminder({
        dueAt: new Date("2026-05-01"),
        now: new Date("2026-04-09"),
        completedAt: null,
        skipped: false,
        logs: [],
      })
    ).toBe(false)
  })
})

describe("nextReminderNumber", () => {
  it("returns 1 for empty log", () => {
    expect(nextReminderNumber([])).toBe(1)
  })
  it("returns 2 after one reminder", () => {
    expect(nextReminderNumber([{ sentAt: new Date() }])).toBe(2)
  })
  it("returns 3 after two reminders", () => {
    expect(nextReminderNumber([{ sentAt: new Date() }, { sentAt: new Date() }])).toBe(3)
  })
})
