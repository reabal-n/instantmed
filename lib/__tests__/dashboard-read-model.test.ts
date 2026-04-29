import { describe, expect, it, vi } from "vitest"

import { readDashboardQuery } from "@/lib/data/dashboard-read-model"

describe("readDashboardQuery", () => {
  it("returns data from a successful read operation", async () => {
    const result = await readDashboardQuery({
      label: "doctor queue",
      fallback: [],
      operation: async () => ({ data: [{ id: "intake-1" }], error: null }),
    })

    expect(result).toEqual([{ id: "intake-1" }])
  })

  it("returns fallback and reports a degraded read when Supabase returns an error", async () => {
    const onDegradedRead = vi.fn()

    const result = await readDashboardQuery({
      label: "script tasks",
      fallback: [],
      operation: async () => ({
        data: null,
        error: { message: "relation script_tasks does not exist", code: "42P01" },
      }),
      onDegradedRead,
    })

    expect(result).toEqual([])
    expect(onDegradedRead).toHaveBeenCalledWith(
      expect.objectContaining({
        label: "script tasks",
        error: expect.objectContaining({
          message: expect.stringContaining("relation script_tasks does not exist"),
        }),
      })
    )
  })

  it("retries thrown transient failures before falling back", async () => {
    const operation = vi
      .fn()
      .mockRejectedValueOnce(new Error("network reset"))
      .mockResolvedValueOnce({ data: [{ id: "task-1" }], error: null })

    const result = await readDashboardQuery({
      label: "script tasks",
      fallback: [],
      operation,
      maxAttempts: 2,
      baseDelayMs: 1,
    })

    expect(result).toEqual([{ id: "task-1" }])
    expect(operation).toHaveBeenCalledTimes(2)
  })

  it("falls back and reports after retry exhaustion", async () => {
    const onDegradedRead = vi.fn()

    const result = await readDashboardQuery({
      label: "ai approved intakes",
      fallback: [],
      operation: async () => {
        throw new Error("connection timeout")
      },
      maxAttempts: 2,
      baseDelayMs: 1,
      onDegradedRead,
    })

    expect(result).toEqual([])
    expect(onDegradedRead).toHaveBeenCalledWith(
      expect.objectContaining({
        label: "ai approved intakes",
        error: expect.objectContaining({ message: "connection timeout" }),
      })
    )
  })
})
