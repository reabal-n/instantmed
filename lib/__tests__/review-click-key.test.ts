import { describe, expect, it } from "vitest"

import {
  createReviewClickKey,
  hashReviewClickKey,
} from "@/lib/email/review-click-key"

describe("review click keys", () => {
  it("creates a 32-byte opaque key with a stable SHA-256 hash", () => {
    const key = createReviewClickKey()

    expect(key.raw).toMatch(/^[A-Za-z0-9_-]{43}$/)
    expect(key.hash).toMatch(/^[a-f0-9]{64}$/)
    expect(hashReviewClickKey(key.raw)).toBe(key.hash)
  })

  it("rejects malformed, padded, and wrong-length keys", () => {
    expect(hashReviewClickKey(null)).toBeNull()
    expect(hashReviewClickKey("short")).toBeNull()
    expect(hashReviewClickKey(`${"a".repeat(42)}=`)).toBeNull()
    expect(hashReviewClickKey(`${"a".repeat(42)}+`)).toBeNull()
    expect(hashReviewClickKey("a".repeat(44))).toBeNull()
    expect(hashReviewClickKey("B".repeat(43))).toBeNull()
  })

  it("produces different hashes for different canonical capabilities", () => {
    const first = createReviewClickKey()
    const second = createReviewClickKey()

    expect(second.raw).not.toBe(first.raw)
    expect(second.hash).not.toBe(first.hash)
  })
})
