import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

import {
  LANDING_BLOCKED_TERMS,
  LANDING_CAVEAT_BUDGETS,
  LANDING_SURFACES,
} from "@/lib/marketing/landing-vocabulary"

const root = process.cwd()

/** Strip comments and the Next.js metadata export so only rendered copy is scanned. */
export function renderedSource(relativePath: string): string {
  return readFileSync(join(root, relativePath), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^[ \t]*\/\/.*$/gm, "")
    .replace(/^export const metadata[\s\S]*?^}/m, "")
}

describe("landing vocabulary contract (19 Sep 2026 audit)", () => {
  for (const relativePath of LANDING_SURFACES) {
    describe(relativePath, () => {
      const source = renderedSource(relativePath)

      for (const term of LANDING_BLOCKED_TERMS) {
        it(`does not say ${term.pattern}`, () => {
          const hit = source.match(term.pattern)
          expect(hit, hit ? `"${hit[0]}": ${term.reason}` : undefined).toBeNull()
        })
      }

      for (const budget of LANDING_CAVEAT_BUDGETS) {
        it(`repeats "${budget.label}" at most ${budget.max} time(s)`, () => {
          const count = (source.match(budget.pattern) ?? []).length
          expect(count, `${budget.label} appears ${count} times`).toBeLessThanOrEqual(budget.max)
        })
      }
    })
  }
})
