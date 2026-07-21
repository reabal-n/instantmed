import { readFileSync } from "node:fs"
import { join } from "node:path"

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

/**
 * 2026-07-19: the owner-doctor writes scripts directly in Parchment for people
 * they know personally. Those rows carry a patient_id but no intake_id, and the
 * candidate query filtered only on status — so the cron sent a commercial
 * reorder nudge to four of them before anyone noticed.
 *
 * Source-level because the candidate query is a PostgREST builder chain with no
 * seam to assert against without a live database.
 */
describe("refill reminder audience", () => {
  const source = readFileSync(
    join(process.cwd(), "lib/email/refill-reminder.ts"),
    "utf8",
  )

  it("only considers scripts that came from a paid request", () => {
    expect(source).toContain('.not("intake_id", "is", null)')
  })

  it("keeps the no-request exclusion in the candidate query itself", () => {
    // Filtering after the fetch would still read the rows into a marketing
    // code path; the exclusion belongs in the query that defines the audience.
    const candidateFn = source.slice(
      source.indexOf("export async function findRefillReminderCandidates"),
    )
    const filterIndex = candidateFn.indexOf('.not("intake_id", "is", null)')
    const errorGuardIndex = candidateFn.indexOf("Failed to fetch refill reminder candidates")

    expect(filterIndex).toBeGreaterThan(-1)
    expect(filterIndex).toBeLessThan(errorGuardIndex)
  })
})
