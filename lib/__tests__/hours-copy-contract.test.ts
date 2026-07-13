import { readdirSync, readFileSync, statSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

/**
 * 24/7 positioning contract (operator decision 2026-07-03).
 *
 * The platform operates 24 hours a day. Patient-facing copy had accumulated
 * 58 claims of an "8am–10pm AEST review window" (plus 08:00–22:00 and even a
 * 7am–10pm variant) across marketing pages, SEO data, and blog guides —
 * copy that both understated the service and drifted into three different
 * windows. This scan keeps any review-hours window claim from creeping back
 * into patient-facing surfaces. Say "24/7" calmly where hours matter; never
 * promise a turnaround time.
 */

const ROOT = process.cwd()
const SCAN_DIRS = ["app", "components", "lib/seo", "lib/marketing", "lib/microcopy", "lib/data", "content"]
const SCAN_EXTENSIONS = new Set([".ts", ".tsx", ".mdx", ".md"])

// Review-window claim shapes. Deliberately narrow: scenario copy may still
// mention clock times ("submit at 5am before school", "clinics close at 6pm"),
// but a WINDOW claim shaped like our retired operating-hours framing fails.
const WINDOW_CLAIM = /8\s?am\s*(?:–|-|—|to)\s*10\s?pm|08:00\s*(?:–|-|—)\s*22:00|7\s?am\s*(?:–|-|—|to)\s*10\s?pm|first review at \d{1,2}(?::\d{2})?\s?(?:am|pm)|review hours \(|clinical review hours/i

function collectFiles(dir: string): string[] {
  const absolute = join(ROOT, dir)
  const entries = readdirSync(absolute)
  const files: string[] = []
  for (const entry of entries) {
    const path = join(absolute, entry)
    const stats = statSync(path)
    if (stats.isDirectory()) {
      if (entry === "node_modules" || entry === "__tests__") continue
      files.push(...collectFiles(join(dir, entry)))
    } else if (SCAN_EXTENSIONS.has(entry.slice(entry.lastIndexOf(".")))) {
      files.push(join(dir, entry))
    }
  }
  return files
}

// The GEO/AI-readable text files are what answer engines quote — they carried
// the retired window for 7 days after #252 because this scan only covered
// ts/tsx/mdx/md (found 2026-07-10, ChatGPT = the #1 acquisition channel).
const PUBLIC_TEXT_FILES = ["public/llms.txt", "public/llms-full.txt"]
const POLICY_DOC_FILES = ["docs/BRAND.md"]

describe("24/7 hours copy contract", () => {
  it("keeps retired review-hours window claims out of patient-facing copy", () => {
    const offenders: string[] = []
    for (const dir of SCAN_DIRS) {
      for (const file of collectFiles(dir)) {
        const source = readFileSync(join(ROOT, file), "utf8")
        const match = source.match(WINDOW_CLAIM)
        if (match) offenders.push(`${file} :: ${match[0]}`)
      }
    }
    expect(
      offenders,
      `Review-hours window claims found — the platform is 24/7 (see CLAUDE.md Hours row): ${offenders.join("; ")}`,
    ).toEqual([])
  })

  it("keeps retired review-hours window claims out of the AI-readable public text files", () => {
    const offenders: string[] = []
    for (const file of PUBLIC_TEXT_FILES) {
      const source = readFileSync(join(ROOT, file), "utf8")
      const match = source.match(WINDOW_CLAIM)
      if (match) offenders.push(`${file} :: ${match[0]}`)
    }
    expect(
      offenders,
      `Review-hours window claims found in GEO text files — these feed ChatGPT/answer engines directly: ${offenders.join("; ")}`,
    ).toEqual([])
  })

  it("keeps retired review-hours window instructions out of public-copy policy docs", () => {
    const offenders: string[] = []
    for (const file of POLICY_DOC_FILES) {
      const source = readFileSync(join(ROOT, file), "utf8")
      const match = source.match(WINDOW_CLAIM)
      if (match) offenders.push(`${file} :: ${match[0]}`)
    }
    expect(
      offenders,
      `Review-hours window instructions found in public-copy policy docs: ${offenders.join("; ")}`,
    ).toEqual([])
  })

  it("keeps operating-hours window fields out of the social-proof module (computed strings evade source grep)", async () => {
    // SOCIAL_PROOF_DISPLAY.operatingHours used to compute "8am–10pm" at
    // runtime from numeric fields — invisible to the literal scan above.
    // Assert at the export level so a reintroduced window field fails here.
    const socialProof = await import("@/lib/social-proof")
    const proofKeys = Object.keys(socialProof.SOCIAL_PROOF)
    expect(proofKeys.filter((k) => /operatingHours/i.test(k))).toEqual([])

    const display = socialProof.SOCIAL_PROOF_DISPLAY as Record<string, string>
    for (const [key, value] of Object.entries(display)) {
      expect(
        WINDOW_CLAIM.test(value),
        `SOCIAL_PROOF_DISPLAY.${key} renders a review-hours window ("${value}") — the platform is 24/7`,
      ).toBe(false)
    }
  })

  it("keeps the terms of service on the 24/7 availability wording", () => {
    const terms = readFileSync(join(ROOT, "app/terms/page.tsx"), "utf8")
    expect(terms).toContain("The service operates 24 hours a day, 7 days a week.")
    expect(terms).toContain("We do not guarantee specific response times.")
  })
})
