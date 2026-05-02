import { NextRequest } from "next/server"
import { describe, expect, it } from "vitest"

import { GET } from "@/app/start/route"

describe("/start legacy request handoff", () => {
  it("returns a real redirect to the canonical request route", () => {
    const response = GET(new NextRequest(
      "https://instantmed.com.au/start?service=medical-certificate&utm_source=google",
    ))

    expect(response.status).toBe(307)
    expect(response.headers.get("location")).toBe(
      "https://instantmed.com.au/request?utm_source=google&service=med-cert",
    )
  })

  it("drops unknown legacy service values while preserving attribution params", () => {
    const response = GET(new NextRequest(
      "https://instantmed.com.au/start?service=unknown&utm_campaign=brand",
    ))

    expect(response.headers.get("location")).toBe(
      "https://instantmed.com.au/request?utm_campaign=brand",
    )
  })
})
