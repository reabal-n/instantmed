import { readdirSync, readFileSync, statSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

import { getApprovedClaim } from "@/lib/marketing/approved-claims"

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

// Operator-console strings, never rendered to a patient. `business_hours_*` is
// a real internal control (review-timing reference only, never a checkout
// blocker — CLAUDE.md Operational controls), and its admin label already states
// that requests are accepted 24/7. Renaming it would make the operator surface
// describe the flag less accurately, so exclude the file instead of the phrase.
const INTERNAL_OPERATOR_FILES = new Set(["lib/data/types/feature-flags.ts"])

// Review-window claim shapes. Deliberately narrow: scenario copy may still
// mention clock times ("submit at 5am before school", "clinics close at 6pm"),
// but a WINDOW claim shaped like our retired operating-hours framing fails.
// `review hours` is matched bare, not just as `review hours (` or `clinical
// review hours`. Those two shapes let the plain phrase ("Doctor review follows
// when available during review hours") survive on 13 indexed /for and
// deep-city surfaces while this contract reported green — the copy sweep in
// #252 removed the clock-shaped windows and left the framing behind. The
// review-hours framing is retired outright (CLAUDE.md Hours row), so any
// mention is a failure; there is no compliant use of the phrase.
const WINDOW_CLAIM = /8\s?am\s*(?:–|-|—|to)\s*10\s?pm|08:00\s*(?:–|-|—)\s*22:00|7\s?am\s*(?:–|-|—|to)\s*10\s?pm|first review at \d{1,2}(?::\d{2})?\s?(?:am|pm)|review hours/i

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
        if (INTERNAL_OPERATOR_FILES.has(file)) continue
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

  it("keeps operating-hours window fields out of the social-proof module", async () => {
    const socialProof = await import("@/lib/social-proof")
    const proofKeys = Object.keys(socialProof.SOCIAL_PROOF)
    expect(proofKeys.filter((k) => /operatingHours/i.test(k))).toEqual([])
  })

  it("keeps the terms of service on the 24/7 availability wording", () => {
    const terms = readFileSync(join(ROOT, "app/terms/page.tsx"), "utf8")
    expect(terms).toContain('getApprovedClaim("availability_24_7")')
    expect(getApprovedClaim("availability_24_7")).toContain("submitted and reviewed 24/7")
    expect(terms).toContain("We do not guarantee specific response times.")
  })
})
