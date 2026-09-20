import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

import { LANDING_SURFACES } from "@/lib/marketing/landing-vocabulary"

const root = process.cwd()

/** Files whose className strings are patient-facing type on the seven landing pages. */
const TYPE_SURFACES = [
  ...LANDING_SURFACES.filter((p) => p.endsWith(".tsx")),
  "components/sections/faq-section.tsx",
  "components/marketing/sections/how-it-works-inline.tsx",
] as const

const CLASS_ATTR = /className=(?:"([^"]*)"|\{`([^`]*)`\}|\{cn\(([\s\S]*?)\)\})/g

describe("landing type floor (DESIGN.md §2: 16px body, 12px minimum)", () => {
  for (const relativePath of TYPE_SURFACES) {
    it(`${relativePath} has no text under 12px and no non-overline 12px text`, () => {
      const source = readFileSync(join(root, relativePath), "utf8")
      expect(source, "arbitrary sub-14px sizes").not.toMatch(/text-\[(?:9|10|11|13)px\]/)
      const offenders: string[] = []
      for (const match of source.matchAll(CLASS_ATTR)) {
        const classes = match[1] ?? match[2] ?? match[3] ?? ""
        if (/\btext-xs\b/.test(classes) && !/\buppercase\b/.test(classes)) offenders.push(classes.trim().slice(0, 80))
      }
      expect(offenders, "text-xs is for uppercase overlines only").toEqual([])
    })
  }
})
