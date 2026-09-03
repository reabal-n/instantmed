import type { SupabaseClient } from "@supabase/supabase-js"
import { describe, expect, it, vi } from "vitest"

import { recordRecoveryEmailEngagement } from "@/lib/analytics/recovery-email-engagement"

describe("recovery email engagement", () => {
  it("records only a PHI-free marker on the owned unpaid intake", async () => {
    const filters: Array<[string, string, unknown]> = []
    let updatePayload: Record<string, unknown> | null = null
    const query = {
      eq: vi.fn((column: string, value: unknown) => {
        filters.push(["eq", column, value])
        return query
      }),
      in: vi.fn((column: string, value: unknown) => {
        filters.push(["in", column, value])
        return query
      }),
      maybeSingle: vi.fn(async () => ({ data: { id: "intake-1" }, error: null })),
      select: vi.fn(() => query),
    }
    const supabase = {
      from: vi.fn(() => ({
        update: vi.fn((payload: Record<string, unknown>) => {
          updatePayload = payload
          return query
        }),
      })),
    } as unknown as SupabaseClient

    await expect(recordRecoveryEmailEngagement({
      intakeId: "intake-1",
      patientId: "patient-1",
      supabase,
    })).resolves.toBe(true)

    expect(updatePayload).toEqual({
      recovery_email_engaged_at: expect.stringMatching(/^202\d-/),
    })
    expect(filters).toEqual(expect.arrayContaining([
      ["eq", "id", "intake-1"],
      ["eq", "patient_id", "patient-1"],
      ["in", "status", ["pending_payment", "checkout_failed"]],
      ["in", "payment_status", ["pending", "unpaid", "failed"]],
    ]))
  })

  it("fails soft when the database client throws", async () => {
    const supabase = {
      from: vi.fn(() => {
        throw new Error("network unavailable")
      }),
    } as unknown as SupabaseClient

    await expect(recordRecoveryEmailEngagement({
      intakeId: "intake-1",
      patientId: "patient-1",
      supabase,
    })).resolves.toBe(false)
  })
})
