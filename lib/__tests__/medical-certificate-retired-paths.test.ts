import { existsSync, readFileSync } from "fs"
import { describe, expect, it } from "vitest"

function readFile(path: string): string {
  return readFileSync(path, "utf8")
}

describe("medical certificate retired paths", () => {
  it("does not ship the retired certificate expiry cron", () => {
    expect(existsSync("app/api/cron/expire-certificates/route.ts")).toBe(false)
    expect(existsSync("lib/__tests__/expire-certificates-route.test.ts")).toBe(false)
    expect(readFile("vercel.json")).not.toContain("/api/cron/expire-certificates")
    expect(readFile("lib/monitoring/cron-heartbeat.ts")).not.toContain('"expire-certificates"')
  })

  it("keeps date corrections on the in-place reissue path", () => {
    const source = readFile("app/actions/request-date-correction.ts")

    expect(existsSync("app/actions/regenerate-certificate.ts")).toBe(false)
    expect(source).toContain("@/app/actions/reissue-cert")
    expect(source).not.toContain("@/app/actions/regenerate-certificate")
    expect(source).not.toContain("sendTelegramAlert")
  })

  it("does not reintroduce forbidden certificate status mutations", () => {
    const certWriterFiles = [
      "app/actions/reissue-cert.ts",
      "app/actions/request-date-correction.ts",
      "lib/data/issued-certificates.ts",
      "lib/clinical/execute-cert-approval.ts",
    ]

    for (const file of certWriterFiles) {
      expect(readFile(file), file).not.toMatch(/status:\s*["'](?:expired|superseded)["']/)
    }
  })
})
