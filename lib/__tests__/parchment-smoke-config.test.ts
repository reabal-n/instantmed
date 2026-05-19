import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

import { assertParchmentSmokeConfig } from "@/lib/parchment/smoke"

const smokeScriptSource = readFileSync(
  join(process.cwd(), "scripts/parchment-smoke.ts"),
  "utf8",
)

describe("assertParchmentSmokeConfig", () => {
  it("blocks sandbox Parchment for production smoke validation", () => {
    expect(() => assertParchmentSmokeConfig({
      PARCHMENT_API_URL: "https://api.sandbox.parchmenthealth.io/external",
      PARCHMENT_SMOKE_USER_ID: "doctor-user",
    })).toThrow(/sandbox/i)
  })

  it("requires a production smoke user id for live validation", () => {
    expect(() => assertParchmentSmokeConfig({
      PARCHMENT_API_URL: "https://api.parchmenthealth.io/external",
    })).toThrow(/PARCHMENT_SMOKE_USER_ID/)
  })

  it("requires the production external API base", () => {
    expect(() => assertParchmentSmokeConfig({
      PARCHMENT_API_URL: "https://api.parchmenthealth.io",
      PARCHMENT_SMOKE_USER_ID: "doctor-user",
    })).toThrow(/external API base/)
  })

  it("accepts production config with an explicit smoke user id", () => {
    expect(assertParchmentSmokeConfig({
      PARCHMENT_API_URL: "https://api.parchmenthealth.io/external",
      PARCHMENT_SMOKE_USER_ID: "doctor-user",
    })).toEqual({
      apiUrl: "https://api.parchmenthealth.io/external",
      userId: "doctor-user",
      environment: "production",
    })
  })

  it("falls back to the default production user id", () => {
    expect(assertParchmentSmokeConfig({
      PARCHMENT_API_URL: "https://api.parchmenthealth.io/external",
      PARCHMENT_DEFAULT_USER_ID: "default-doctor-user",
    })).toEqual({
      apiUrl: "https://api.parchmenthealth.io/external",
      userId: "default-doctor-user",
      environment: "production",
    })
  })

  it("smokes production token, organization validation, and SSO without logging secrets", () => {
    expect(smokeScriptSource).toContain("runParchmentSmokeValidation")
    expect(smokeScriptSource).toContain("includeSso: true")

    const consoleLines = smokeScriptSource
      .split("\n")
      .filter((line) => line.includes("console."))
      .join("\n")
    expect(consoleLines).not.toContain("partnerSecret")
    expect(consoleLines).not.toContain("organizationSecret")
  })
})
