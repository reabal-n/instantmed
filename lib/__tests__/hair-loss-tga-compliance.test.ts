import { describe, it, expect } from "vitest"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"

/**
 * TGA compliance regression test
 *
 * Scans patient-facing intake step components for Schedule 4 drug names.
 * These must never appear in user-facing UI — only in doctor-facing
 * clinical summaries and internal store keys.
 *
 * Mirrors the pattern in hair-loss-hook-quiz.test.ts.
 */

const SCHEDULE_4_DRUG_RE =
  /\b(viagra|cialis|sildenafil|tadalafil|pde5|finasteride|minoxidil|propecia|rogaine|nizoral|dutasteride)\b/gi

const PATIENT_FACING_STEPS = [
  "components/request/steps/hair-loss-assessment-step.tsx",
  "components/request/steps/ed-preferences-step.tsx",
  "components/request/steps/ed-goals-step.tsx",
  "components/request/steps/ed-assessment-step.tsx",
  "components/request/steps/ed-health-step.tsx",
  "components/request/steps/medical-history-step.tsx",
  "components/request/steps/medication-step.tsx",
  "components/request/steps/medication-history-step.tsx",
  "components/request/steps/patient-details-step.tsx",
  "components/request/steps/symptoms-step.tsx",
  "components/request/steps/certificate-step.tsx",
  "components/request/steps/consult-reason-step.tsx",
  "components/request/steps/review-step.tsx",
  "components/request/steps/checkout-step.tsx",
  "components/request/steps/weight-loss-assessment-step.tsx",
  "components/request/steps/womens-health-assessment-step.tsx",
  "components/request/steps/womens-health-type-step.tsx",
  "components/request/steps/referral-reason-step.tsx",
  "components/request/steps/safety-step.tsx",
]

/**
 * Extract all user-facing string literals from a TSX source file.
 * Matches:
 *  - JSX text content between tags
 *  - String literals in label/description/placeholder/helpText properties
 *  - Template literals
 */
function extractUserFacingStrings(source: string): string[] {
  const strings: string[] = []

  // Match string values assigned to label, description, placeholder, helpText, title properties
  const propRe = /(?:label|description|placeholder|helpText|title|subtitle|chips)\s*[:=]\s*["'`]([^"'`]+)["'`]/g
  let match
  while ((match = propRe.exec(source)) !== null) {
    strings.push(match[1])
  }

  // Match JSX text content: >text<
  const jsxTextRe = />\s*([A-Za-z][^<>{]*?)\s*</g
  while ((match = jsxTextRe.exec(source)) !== null) {
    strings.push(match[1])
  }

  return strings
}

describe("TGA compliance — no Schedule 4 drug names in patient-facing steps", () => {
  for (const stepPath of PATIENT_FACING_STEPS) {
    describe(stepPath.split("/").pop()!, () => {
      const fullPath = resolve(process.cwd(), stepPath)
      const source = readFileSync(fullPath, "utf-8")

      it("user-facing strings contain no Schedule 4 drug names", () => {
        const strings = extractUserFacingStrings(source)
        expect(strings.length).toBeGreaterThan(0) // sanity: we actually found strings

        for (const str of strings) {
          const violations = str.match(SCHEDULE_4_DRUG_RE)
          expect(
            violations,
            `Found drug name "${violations?.[0]}" in string: "${str}" (${stepPath})`,
          ).toBeNull()
        }
      })

      it("raw source has no drug names in UI-rendered strings", () => {
        // Belt-and-suspenders: scan for drug names near JSX patterns
        // Exclude comments, imports, store keys, and internal identifiers
        const lines = source.split("\n")
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i]
          // Skip comments, imports, type annotations, store key assignments
          if (
            line.trimStart().startsWith("//") ||
            line.trimStart().startsWith("*") ||
            line.trimStart().startsWith("import") ||
            /setAnswer\(/.test(line) ||
            /=== ["']/.test(line) ||
            /answers\./.test(line) ||
            /posthog\?\.capture/.test(line)
          ) {
            continue
          }

          const drugMatch = line.match(SCHEDULE_4_DRUG_RE)
          if (drugMatch) {
            // Allow internal identifiers: store keys, object keys, value comparisons
            const isInternal =
              /onClick.*setAnswer|value:\s*["']|=== ["']|answers\[|key:\s*["']|id:\s*["']|htmlFor|\.test\(/.test(line)
            if (!isInternal) {
              expect.fail(
                `Line ${i + 1}: found "${drugMatch[0]}" in "${line.trim()}" (${stepPath})`,
              )
            }
          }
        }
      })
    })
  }
})
