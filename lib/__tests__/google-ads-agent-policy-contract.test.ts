import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8")

const advertising = read("docs/ADVERTISING_COMPLIANCE.md")
const context = read("CONTEXT.md")
const operations = read("docs/OPERATIONS.md")
const policy = read("lib/ads-agent/policy.ts")
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
    expect(operations).toContain("one atomic Google Ads request")
    expect(operations).toContain("A$20/day")
    expect(operations).toContain("A$3 maximum CPC")
    expect(revenue).toContain("maximum 50% budget step")
    expect(revenue).toContain("10 attributed orders after the change")
    expect(revenue).not.toContain("tCPA cap")
  })

  it("pins the approved Women's Health paid launch without widening health targeting", () => {
    expect(advertising).toContain("IM | Search | Women's Health | AU")
    expect(advertising).toContain("UTI Assessment")
    expect(advertising).toContain("Contraception Assessment")
    expect(advertising).toContain("exact and phrase match only")
    expect(advertising).toContain("A$20/day")
    expect(advertising).toContain("A$3 maximum CPC")
    expect(advertising).toContain("No medicine-name keywords")
    expect(advertising).toContain("No advertiser-curated health audiences")
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

  it("keeps policy evaluation recommendation-only", () => {
    expect(policy).not.toMatch(
      /from ["']@\/lib\/ads-agent\/(?:account-state|client|mutations|proposals)["']/,
    )
    expect(policy).not.toMatch(/\bfetch\s*\(/)
    expect(policy).not.toContain("proposal:send")
  })
})
