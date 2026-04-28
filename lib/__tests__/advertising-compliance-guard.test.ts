/**
 * Advertising compliance guard.
 *
 * Scans public acquisition surfaces for claims that are not allowed under the
 * current source-of-truth docs:
 *   - docs/ADVERTISING_COMPLIANCE.md
 *   - docs/SEO_CONTENT_POLICY.md
 *   - docs/BUSINESS_PLAN.md
 *
 * It catches the highest-risk phrases that previously drifted into public
 * pages, including programmatic SEO surfaces.
 */
import { readdirSync, readFileSync, statSync } from "node:fs"
import path from "node:path"

import { describe, expect, it } from "vitest"

import { BADGE_PRESETS } from "@/lib/marketing/trust-badges"

const ROOT = path.resolve(__dirname, "../..")

const EXTENSIONS = new Set([".ts", ".tsx"])

const NON_MEDCERT_FORM_FIRST_SURFACES = [
  "app/erectile-dysfunction",
  "app/hair-loss",
  "app/about/page.tsx",
  "app/about/about-client.tsx",
  "app/how-it-works/page.tsx",
  "app/online-doctor-australia/page.tsx",
  "app/weight-loss",
  "app/prescriptions",
  "components/marketing/erectile-dysfunction-landing.tsx",
  "components/marketing/hair-loss-landing.tsx",
  "components/shared/navbar/services-dropdown.tsx",
  "components/marketing/mockups/ed-hero-mockup.tsx",
  "components/marketing/sections/ed-guide-section.tsx",
  "components/marketing/sections/how-it-works-inline.tsx",
  "components/marketing/blog-cta-card.tsx",
  "components/marketing/how-it-works.tsx",
  "lib/data/ed-faq.ts",
  "lib/data/hair-loss-faq.ts",
  "lib/email/components/templates/abandoned-checkout-followup.tsx",
  "lib/marketing/contextual-messages.ts",
  "lib/marketing/homepage.ts",
  "lib/marketing/service-funnel-configs.ts",
  "lib/seo/metadata.ts",
  "lib/seo/service-metadata.ts",
  "components/request/service-hub-screen.tsx",
  "content/blog",
]

const MED_CERT_ACCEPTANCE_SURFACES = [
  "app/compare",
  "app/for",
  "app/intent",
  "app/locations",
  "app/medical-certificate",
  "components/marketing",
  "components/seo",
  "lib/data",
  "lib/marketing/med-cert-intent-config.ts",
  "lib/marketing/med-cert-selector.ts",
  "lib/marketing/services.ts",
  "lib/marketing/trust-badges.ts",
  "lib/seo",
]

const URL_PRIVACY_SURFACES = [
  "app",
  "components",
  "lib",
  "content/blog",
]

const NO_CALL_PATTERNS = [
  /\bno call needed\b/i,
  /\bno call required\b/i,
  /\bno phone call\b/i,
  /\bno conversation needed\b/i,
  /\bno need to speak\b/i,
  /\bno calls?, no\b/i,
]

const MED_CERT_ACCEPTANCE_PATTERNS = [
  /\baccepted by all\b/i,
  /\baccepted by [^"'\n]*(?:employers?|universit(?:y|ies)|schools?|government|councils?|hospitals?|health services?|agencies)\b/i,
  /\baccepted for\b/i,
  /\b(?:all|any) employers? accept/i,
  /\bemployer-accepted\b/i,
  /\bemployer accepted\b/i,
  /\bUni\s*&\s*TAFE accepted\b/i,
  /\bcommonly accepted\b/i,
  /\bmust accept\b/i,
  /\bvalid for all (?:Australian )?(?:employers|workplaces)\b/i,
  /\bHR-approved\b/i,
  /\b98%\s+accepted\b/i,
  /\bspecial consideration\b/i,
  /\bdeferred exams?\b/i,
  /\bexam deferrals?\b/i,
  /\bassignment extensions?\b/i,
  /\bjury duty\b/i,
  /\btribunal\b/i,
  /\bworkers comp\b/i,
]

const MEDICATION_QUERY_PATTERNS = [
  /[?&]medication=/i,
  /[?&]drug=/i,
]

function toFullPath(relative: string): string {
  return path.join(ROOT, relative)
}

function walk(target: string, acc: string[] = []): string[] {
  const full = toFullPath(target)
  let st
  try {
    st = statSync(full)
  } catch {
    return acc
  }

  if (st.isFile()) {
    if (EXTENSIONS.has(path.extname(full))) acc.push(full)
    return acc
  }

  for (const entry of readdirSync(full)) {
    if (entry.startsWith(".") || entry.endsWith(".test.ts") || entry.endsWith(".test.tsx")) continue
    walk(path.join(target, entry), acc)
  }

  return acc
}

function collectFiles(targets: string[]): string[] {
  return targets.flatMap((target) => walk(target))
}

function stripComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/[^\n]*/g, "$1")
}

function findHits(files: string[], patterns: RegExp[]) {
  const hits: Array<{ file: string; line: number; pattern: string; snippet: string }> = []

  for (const file of files) {
    const raw = readFileSync(file, "utf8")
    const scrubbed = stripComments(raw)
    const lines = scrubbed.split("\n")

    for (let i = 0; i < lines.length; i++) {
      for (const pattern of patterns) {
        if (pattern.test(lines[i])) {
          hits.push({
            file: path.relative(ROOT, file),
            line: i + 1,
            pattern: pattern.source,
            snippet: lines[i].trim().slice(0, 140),
          })
        }
      }
    }
  }

  return hits
}

function failWithReport(title: string, hits: ReturnType<typeof findHits>): void {
  const report = hits
    .map((hit) => `  ${hit.file}:${hit.line}  [${hit.pattern}]  ${hit.snippet}`)
    .join("\n")
  throw new Error(`${title}: ${hits.length} hit(s).\n${report}`)
}

function presetIds(preset: string): string[] {
  return (BADGE_PRESETS[preset] ?? []).map((entry) => {
    if (typeof entry === "string") return entry
    return entry.id
  })
}

describe("advertising compliance guard", () => {
  it("keeps prescription and specialty surfaces form-first instead of no-call absolute", () => {
    const hits = findHits(collectFiles(NON_MEDCERT_FORM_FIRST_SURFACES), NO_CALL_PATTERNS)
    if (hits.length > 0) {
      failWithReport("Form-first guard failed", hits)
    }

    expect(hits).toEqual([])
  })

  it("keeps med-cert surfaces clear of unsupported acceptance and high-stakes use-case claims", () => {
    const hits = findHits(collectFiles(MED_CERT_ACCEPTANCE_SURFACES), MED_CERT_ACCEPTANCE_PATTERNS)
    if (hits.length > 0) {
      failWithReport("Med-cert acceptance guard failed", hits)
    }

    expect(hits).toEqual([])
  })

  it("does not pass medicine names into URLs", () => {
    const hits = findHits(collectFiles(URL_PRIVACY_SURFACES), MEDICATION_QUERY_PATTERNS)
    if (hits.length > 0) {
      failWithReport("Prescription education URL guard failed", hits)
    }

    expect(hits).toEqual([])
  })

  it("keeps no-call badges out of non-medcert presets", () => {
    const nonMedcertPresets = ["hero_rx", "hero_consult", "hero_generic", "pre_cta", "float"]

    for (const preset of nonMedcertPresets) {
      expect(presetIds(preset), `${preset} must not use no-call badge ids`).not.toContain("no_call")
      expect(presetIds(preset), `${preset} must not use no-speaking badge ids`).not.toContain("no_speaking")
    }
  })
})
