import { describe, expect, it } from "vitest"

import { resolvePostAuthDestination } from "@/lib/auth/post-auth-destination"

describe("resolvePostAuthDestination", () => {
  it("does not wrap an existing post-signin redirect inside another post-signin redirect", () => {
    expect(resolvePostAuthDestination("/auth/post-signin?intake_id=intake-123")).toBe(
      "/auth/post-signin?intake_id=intake-123",
    )
  })

  it("routes normal destinations through post-signin profile linking", () => {
    expect(resolvePostAuthDestination("/patient")).toBe(
      "/auth/post-signin?redirect=%2Fpatient",
    )
  })

  it("falls back to post-signin when there is no destination", () => {
    expect(resolvePostAuthDestination(null)).toBe("/auth/post-signin")
  })
})
