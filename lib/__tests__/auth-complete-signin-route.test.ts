import { NextRequest } from "next/server"
import { describe, expect, it } from "vitest"

import { GET } from "@/app/api/auth/complete-signin/route"

describe("/api/auth/complete-signin", () => {
  it("redirects safe relative destinations and sets the compatibility cookie", async () => {
    const response = await GET(new NextRequest(
      "https://instantmed.com.au/api/auth/complete-signin?destination=%2Fpatient%2Fsettings",
    ))

    expect(response.headers.get("location")).toBe("https://instantmed.com.au/patient/settings")
    expect(response.headers.get("set-cookie")).toContain("profile_linked=1")
  })

  it("rejects external destinations", async () => {
    const response = await GET(new NextRequest(
      "https://instantmed.com.au/api/auth/complete-signin?destination=https%3A%2F%2Fevil.example%2Fphish",
    ))

    expect(response.headers.get("location")).toBe("https://instantmed.com.au/patient")
  })
})
