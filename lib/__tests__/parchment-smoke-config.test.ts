import { describe, expect, it } from "vitest"

import { assertParchmentSmokeConfig } from "@/lib/parchment/smoke"

describe("assertParchmentSmokeConfig", () => {
  it("requires sandbox Parchment by default", () => {
    expect(() => assertParchmentSmokeConfig({
      PARCHMENT_API_URL: "https://api.parchmenthealth.io/external",
      PARCHMENT_SMOKE_USER_ID: "doctor-user",
    })).toThrow(/sandbox/i)
  })

  it("requires a Parchment smoke user id for live validation", () => {
    expect(() => assertParchmentSmokeConfig({
      PARCHMENT_API_URL: "https://api.sandbox.parchmenthealth.io/external",
    })).toThrow(/PARCHMENT_SMOKE_USER_ID/)
  })

  it("accepts sandbox config with an explicit smoke user id", () => {
    expect(assertParchmentSmokeConfig({
      PARCHMENT_API_URL: "https://api.sandbox.parchmenthealth.io/external",
      PARCHMENT_SMOKE_USER_ID: "doctor-user",
    })).toEqual({
      apiUrl: "https://api.sandbox.parchmenthealth.io/external",
      userId: "doctor-user",
      allowProduction: false,
    })
  })
})
