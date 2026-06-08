import { afterEach, describe, expect, it } from "vitest"

import { processRefillReminders, refillRemindersEnabled } from "@/lib/email/refill-reminder"

// Safety contract for a marketing email: it must ship dark and only send when
// the kill-switch is set to exactly "true". These tests need no DB because the
// disabled path returns before constructing a Supabase client.
describe("refill reminder feature gate", () => {
  const original = process.env.REFILL_REMINDER_EMAILS_ENABLED

  afterEach(() => {
    if (original === undefined) delete process.env.REFILL_REMINDER_EMAILS_ENABLED
    else process.env.REFILL_REMINDER_EMAILS_ENABLED = original
  })

  it("is disabled unless REFILL_REMINDER_EMAILS_ENABLED is exactly 'true'", () => {
    delete process.env.REFILL_REMINDER_EMAILS_ENABLED
    expect(refillRemindersEnabled()).toBe(false)

    process.env.REFILL_REMINDER_EMAILS_ENABLED = "false"
    expect(refillRemindersEnabled()).toBe(false)

    process.env.REFILL_REMINDER_EMAILS_ENABLED = "1"
    expect(refillRemindersEnabled()).toBe(false)

    process.env.REFILL_REMINDER_EMAILS_ENABLED = "TRUE"
    expect(refillRemindersEnabled()).toBe(false)

    process.env.REFILL_REMINDER_EMAILS_ENABLED = "true"
    expect(refillRemindersEnabled()).toBe(true)
  })

  it("no-ops without touching the database when disabled", async () => {
    delete process.env.REFILL_REMINDER_EMAILS_ENABLED
    const result = await processRefillReminders()
    expect(result).toEqual({ enabled: false, sent: 0, failed: 0, candidates: 0 })
  })
})
