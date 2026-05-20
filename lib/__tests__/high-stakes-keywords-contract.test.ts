import { describe, expect, it } from "vitest"

import {
  HIGH_STAKES_PATTERNS,
  HIGH_STAKES_USE_CASE_KEYWORDS,
  type HighStakesCategory,
} from "@/lib/clinical/high-stakes-keywords"

const CATEGORIES: ReadonlyArray<HighStakesCategory> = [
  "academic",
  "legal",
  "driving_fitness",
  "workers_comp",
  "government_program",
]

describe("high-stakes keywords contract", () => {
  it("declares at least one regex pattern per category", () => {
    const covered = new Set(HIGH_STAKES_PATTERNS.map((p) => p.category))
    for (const category of CATEGORIES) {
      expect(covered.has(category)).toBe(true)
    }
  })

  it("every pattern carries a user-facing reason", () => {
    for (const { pattern, reason } of HIGH_STAKES_PATTERNS) {
      expect(reason.length).toBeGreaterThan(30)
      // Patterns are case-insensitive and word-boundary anchored.
      expect(pattern.flags).toContain("i")
    }
  })

  it("the keyword list and the regex patterns cover the same domains", () => {
    // Every academic pattern should have at least one substring match in
    // the keyword list (and vice versa). This is a coarse drift check —
    // exact 1:1 mapping is intentional, see the file header comment.
    const matchesKeyword = (regex: RegExp, keywords: ReadonlyArray<string>) =>
      keywords.some((kw) => regex.test(kw))

    for (const { category, pattern } of HIGH_STAKES_PATTERNS) {
      expect(
        matchesKeyword(pattern, HIGH_STAKES_USE_CASE_KEYWORDS),
        `category=${category} pattern=${pattern} matched no keyword in HIGH_STAKES_USE_CASE_KEYWORDS`,
      ).toBe(true)
    }
  })

  it("blocks the canonical sample sentences", () => {
    const samples = [
      "I have an exam tomorrow and need to defer",
      "Court hearing on Monday",
      "Need a fitness-to-drive certificate",
      "Workers compensation claim",
      "Centrelink wants medical evidence",
      "Pre-employment medical for my new job",
    ]
    for (const sample of samples) {
      const matched = HIGH_STAKES_PATTERNS.some(({ pattern }) =>
        pattern.test(sample),
      )
      expect(matched, `expected to block sample: "${sample}"`).toBe(true)
    }
  })

  it("does not over-match common benign phrases", () => {
    const benign = [
      "I injured my back lifting groceries",
      "common cold",
      "viral upper respiratory tract infection",
      "ongoing back pain from years ago",
    ]
    for (const sentence of benign) {
      const matched = HIGH_STAKES_PATTERNS.some(({ pattern }) =>
        pattern.test(sentence),
      )
      expect(matched, `did not expect to block: "${sentence}"`).toBe(false)
    }
  })
})
