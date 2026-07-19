import { beforeEach, describe, expect, it } from "vitest"

import {
  claimBrowserPurchaseCompleted,
  getBrowserPurchaseCompletedInsertId,
} from "../analytics/browser-purchase-dedup"

let storage: Record<string, string>

function installLocalStorage() {
  Object.defineProperty(global, "window", {
    value: {
      localStorage: {
        getItem: (key: string) => storage[key] ?? null,
        setItem: (key: string, value: string) => {
          storage[key] = value
        },
        removeItem: (key: string) => {
          delete storage[key]
        },
      },
    },
    writable: true,
  })
}

beforeEach(() => {
  storage = {}
  installLocalStorage()
})

describe("browser purchase deduplication", () => {
  it("uses an opaque PostHog insert id without exposing the intake id", () => {
    const insertId = getBrowserPurchaseCompletedInsertId()
    expect(insertId).toMatch(/^ph_evt_[a-z0-9]+$/)
    expect(insertId).not.toContain("intake_123")
  })

  it("claims a browser purchase only once inside the deduplication window", () => {
    expect(claimBrowserPurchaseCompleted("intake_123", 1_000)).toBe(true)
    expect(claimBrowserPurchaseCompleted("intake_123", 2_000)).toBe(false)
  })

  it("uses separate deduplication slots per intake", () => {
    expect(claimBrowserPurchaseCompleted("intake_123", 1_000)).toBe(true)
    expect(claimBrowserPurchaseCompleted("intake_456", 2_000)).toBe(true)
  })

  it("allows a fresh claim after the local browser latch expires", () => {
    expect(claimBrowserPurchaseCompleted("intake_123", 1_000)).toBe(true)
    expect(claimBrowserPurchaseCompleted("intake_123", 86_402_000)).toBe(true)
  })

  it("fails open when browser storage is unavailable", () => {
    Object.defineProperty(global, "window", {
      value: {
        localStorage: {
          getItem: () => {
            throw new Error("storage blocked")
          },
          setItem: () => {
            throw new Error("storage blocked")
          },
        },
      },
      writable: true,
    })

    expect(claimBrowserPurchaseCompleted("intake_123", 1_000)).toBe(true)
  })
})
