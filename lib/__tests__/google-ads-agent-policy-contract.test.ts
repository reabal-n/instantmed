import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8")

const advertising = read("docs/ADVERTISING_COMPLIANCE.md")
const context = read("CONTEXT.md")
const operations = read("docs/OPERATIONS.md")
const revenue = read("docs/REVENUE_MODEL.md")

describe("Google Ads Agent policy documentation", () => {
  it("pins the approval-gated Ads Agent policy", () => {
    expect(advertising).toContain("Medicine-name and active-ingredient keywords are OFF")
    expect(advertising).toContain(
      "Eligible (Limited) is compatible with certified healthcare serving",
    )
    expect(operations).toContain("09:00 Australia/Sydney")
    expect(operations).toContain("Telegram Ads approval requires an immutable proposal")
    expect(operations).toContain("authorised Telegram user ID")
    expect(revenue).toContain("maximum 50% budget step")
    expect(revenue).toContain("10 attributed orders after the change")
    expect(revenue).not.toContain("tCPA cap")
  })

  it("keeps Google eligibility separate from Australian advertising clearance", () => {
    expect(advertising).toContain("Google certification eligibility is not TGA clearance")
    expect(advertising).toContain("account hard exclusions")
    expect(advertising).toContain("service-specific exclusions")
    expect(advertising).toContain("dated experimental exclusions")
    expect(advertising).toContain(
      "tCPA is an average acquisition target, never a CPC or per-conversion cap",
    )
  })

  it("defines the four Ads Agent terms in the project glossary", () => {
    for (const term of [
      "Google Ads Agent",
      "Daily Ads Brief",
      "Approval Packet",
      "Mutation Receipt",
    ]) {
      expect(context).toContain(`**${term}**:`)
    }
  })
})
