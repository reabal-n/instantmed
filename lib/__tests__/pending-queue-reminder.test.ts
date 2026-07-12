import { describe, expect, it } from "vitest"

describe("pending queue Telegram reminder", () => {
  it("represents every waiting request without identifiers or clinical detail", async () => {
    const reminderModule = await import("@/lib/notifications/pending-queue-reminder").catch(() => null)
    expect(reminderModule).not.toBeNull()

    const messages = reminderModule?.buildPendingQueueReminderMessages([
      {
        created_at: "2026-07-12T08:00:00.000Z",
        is_priority: true,
        paid_at: "2026-07-12T08:05:00.000Z",
        sla_deadline: null,
        status: "paid",
        submitted_at: "2026-07-12T08:02:00.000Z",
      },
      {
        created_at: "2026-07-12T08:30:00.000Z",
        is_priority: false,
        paid_at: "2026-07-12T08:35:00.000Z",
        sla_deadline: null,
        status: "awaiting_script",
        submitted_at: "2026-07-12T08:32:00.000Z",
      },
    ], new Date("2026-07-12T10:05:00.000Z")) ?? []

    expect(messages).toHaveLength(1)
    expect(messages[0]).toContain("2 requests waiting")
    expect(messages[0]).toContain("1. Priority · Needs review · waiting 2h")
    expect(messages[0]).toContain("2. Awaiting script · waiting 1h 30m")
    expect(messages[0]).not.toMatch(/[0-9a-f]{8}-[0-9a-f-]{27,}/i)
    expect(messages[0]).not.toMatch(/patient|medication|symptom|prescription|certificate|consult/i)
  })

  it("returns no message when the real queue is empty", async () => {
    const reminderModule = await import("@/lib/notifications/pending-queue-reminder").catch(() => null)
    expect(reminderModule).not.toBeNull()
    expect(reminderModule?.buildPendingQueueReminderMessages([], new Date())).toEqual([])
  })
})
