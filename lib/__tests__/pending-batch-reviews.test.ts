import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  createServiceRoleClient: vi.fn(),
}))

vi.mock("@/lib/supabase/service-role", () => ({
  createServiceRoleClient: mocks.createServiceRoleClient,
}))

const OLDEST = "2026-07-10T01:00:00.000Z"

function createHarness(result: {
  data?: Array<Record<string, unknown>> | null
  count?: number | null
  error?: { message: string } | null
}) {
  const calls: Array<[string, ...unknown[]]> = []
  const chain = {
    select: vi.fn((...args: unknown[]) => {
      calls.push(["select", ...args])
      return chain
    }),
    eq: vi.fn((...args: unknown[]) => {
      calls.push(["eq", ...args])
      return chain
    }),
    in: vi.fn((...args: unknown[]) => {
      calls.push(["in", ...args])
      return chain
    }),
    is: vi.fn((...args: unknown[]) => {
      calls.push(["is", ...args])
      return chain
    }),
    not: vi.fn((...args: unknown[]) => {
      calls.push(["not", ...args])
      return chain
    }),
    order: vi.fn((...args: unknown[]) => {
      calls.push(["order", ...args])
      return chain
    }),
    limit: vi.fn((...args: unknown[]) => {
      calls.push(["limit", ...args])
      return chain
    }),
    then: (resolve: (value: unknown) => unknown) => resolve({
      data: result.data ?? [],
      count: result.count ?? 0,
      error: result.error ?? null,
    }),
  }

  return {
    calls,
    supabase: { from: vi.fn(() => chain) },
  }
}

describe("getPendingBatchReviews", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns eligible medical certificates oldest first with exact aggregate state", async () => {
    const harness = createHarness({
      count: 2,
      data: [
        {
          id: "11111111-1111-4111-8111-111111111111",
          ai_approved_at: OLDEST,
          batch_reviewed_at: null,
          patient: [{ id: "patient-1", full_name: "Test Patient" }],
          service: [{ id: "service-1", name: "Medical certificate" }],
        },
      ],
    })
    mocks.createServiceRoleClient.mockReturnValue(harness.supabase)

    const { getPendingBatchReviews } = await import("@/lib/data/intakes/queries")
    await expect(getPendingBatchReviews({ limit: 20 })).resolves.toMatchObject({
      total: 2,
      oldestApprovedAt: OLDEST,
      degraded: false,
      data: [expect.objectContaining({
        id: "11111111-1111-4111-8111-111111111111",
        patient: expect.objectContaining({ id: "patient-1" }),
        service: expect.objectContaining({ id: "service-1" }),
      })],
    })

    expect(harness.calls).toEqual(expect.arrayContaining([
      ["eq", "ai_approved", true],
      ["eq", "category", "medical_certificate"],
      ["in", "status", ["approved", "completed"]],
      ["is", "batch_reviewed_at", null],
      ["order", "ai_approved_at", { ascending: true, nullsFirst: false }],
      ["limit", 20],
    ]))
    expect(harness.calls.find(([method]) => method === "select")?.[2]).toEqual({
      count: "exact",
    })
  })

  it("exposes a degraded empty result instead of hiding a failed read", async () => {
    const harness = createHarness({ error: { message: "database unavailable" } })
    mocks.createServiceRoleClient.mockReturnValue(harness.supabase)

    const { getPendingBatchReviews } = await import("@/lib/data/intakes/queries")
    await expect(getPendingBatchReviews()).resolves.toEqual({
      data: [],
      total: 0,
      oldestApprovedAt: null,
      degraded: true,
    })
  })
})
