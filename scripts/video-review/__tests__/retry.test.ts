import { describe, expect, it, vi } from "vitest"

import { withRetry, withTimeout } from "../retry"

describe("withRetry", () => {
  it("returns immediately on first success", async () => {
    const fn = vi.fn(async () => "ok")
    const result = await withRetry(fn)
    expect(result).toBe("ok")
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it("retries up to `attempts` times then surfaces the original error", async () => {
    const err = new Error("flaky")
    const fn = vi.fn(async () => {
      throw err
    })
    await expect(
      withRetry(fn, { attempts: 3, initialDelayMs: 1, maxDelayMs: 1, label: "test" }),
    ).rejects.toBe(err)
    expect(fn).toHaveBeenCalledTimes(3)
  })

  it("stops retrying when shouldRetry returns false", async () => {
    const err = new Error("permanent: bad api key")
    const fn = vi.fn(async () => {
      throw err
    })
    await expect(
      withRetry(fn, {
        attempts: 5,
        initialDelayMs: 1,
        shouldRetry: (e) => !(e as Error).message.includes("permanent"),
      }),
    ).rejects.toBe(err)
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it("succeeds on a later attempt", async () => {
    let i = 0
    const fn = vi.fn(async () => {
      i++
      if (i < 3) throw new Error(`attempt ${i}`)
      return "third time lucky"
    })
    const result = await withRetry(fn, {
      attempts: 5,
      initialDelayMs: 1,
      maxDelayMs: 2,
    })
    expect(result).toBe("third time lucky")
    expect(fn).toHaveBeenCalledTimes(3)
  })
})

describe("withTimeout", () => {
  it("resolves when the inner promise wins the race", async () => {
    const slow = new Promise<string>((r) => setTimeout(() => r("done"), 5))
    const result = await withTimeout(slow, 1000, "test")
    expect(result).toBe("done")
  })

  it("rejects with the label when the timeout fires first", async () => {
    const tooSlow = new Promise<string>((r) => setTimeout(() => r("done"), 200))
    await expect(withTimeout(tooSlow, 20, "test stage")).rejects.toThrow(
      "test stage exceeded 20ms timeout",
    )
  })
})
