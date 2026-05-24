/**
 * Cert-step revenue contract.
 *
 * Med cert is the primary paid product. Every regression we shipped
 * against this flow on 2026-05-24 had the same root cause: a UI gate
 * silently downgraded conversion without anything in CI catching it.
 *
 * This file is the compounding-interest test for that bug class. Every
 * future regression of the same class should fail one of the assertions
 * below before it merges. Add new assertions here when a new fragility
 * point is discovered. Do NOT delete cases to make the test green —
 * fix the source.
 *
 * Bug history pinned by this file:
 *
 * 1. (2026-05-24 PR #61) "2 days + Tomorrow" only highlighted the
 *    Tomorrow chip. In-range chips rendered as unselected. Patients
 *    read multi-day selections as 1-day.
 *
 * 2. (2026-05-24 PR #61) Summary line was `hidden sm:flex` so MOBILE
 *    patients had zero confirmation of the date range before tapping
 *    Continue. Mobile is the majority of paid traffic.
 *
 * 3. (2026-05-24 PR #61) GP "more than 3 days" note was `hidden sm:block`
 *    so mobile patients hit the cap blind.
 *
 * 4. (2026-05-24 PR #57) Forward dates (Tomorrow, Day after) were
 *    blocked at every layer. Patients booking an upcoming sick day
 *    bounced.
 *
 * 5. (2026-05-24 PR #57) Med cert flow demanded Medicare due to a
 *    `med-cert` vs `med_cert` typo in the gate. (Pinned separately by
 *    prescribing-identity-gate-contract.test.ts; cross-referenced here.)
 */
import { readFileSync } from "fs"
import { join } from "path"
import { describe, expect, it } from "vitest"

import { getCertChipRangeState } from "@/components/request/steps/certificate-step"

const certStepSource = readFileSync(
  join(process.cwd(), "components/request/steps/certificate-step.tsx"),
  "utf8",
)

describe("cert-step revenue contract", () => {
  // ── chip range visualisation ──────────────────────────────────────────────
  describe("getCertChipRangeState", () => {
    it("returns 'start' for the start chip", () => {
      expect(getCertChipRangeState(1, 1, 2)).toBe("start")
      expect(getCertChipRangeState(0, 0, 1)).toBe("start")
      expect(getCertChipRangeState(-1, -1, 3)).toBe("start")
    })

    it("returns 'in_range' for chips covered by the duration window", () => {
      // 2 days starting Tomorrow → Tomorrow is start, Day after is in_range
      expect(getCertChipRangeState(2, 1, 2)).toBe("in_range")
      // 3 days starting Today → Tomorrow + Day after are in_range
      expect(getCertChipRangeState(1, 0, 3)).toBe("in_range")
      expect(getCertChipRangeState(2, 0, 3)).toBe("in_range")
    })

    it("returns 'unselected' for chips outside the duration window", () => {
      // 1 day starting Today → only Today is selected
      expect(getCertChipRangeState(1, 0, 1)).toBe("unselected")
      expect(getCertChipRangeState(2, 0, 1)).toBe("unselected")
      // 2 days starting Today → Day after is outside the window
      expect(getCertChipRangeState(2, 0, 2)).toBe("unselected")
    })

    it("returns 'unselected' for any chip before the start", () => {
      // 3 days starting Tomorrow → Today is before the start
      expect(getCertChipRangeState(0, 1, 3)).toBe("unselected")
      expect(getCertChipRangeState(-1, 0, 3)).toBe("unselected")
    })

    it("returns 'unselected' when start or duration is null (initial render)", () => {
      expect(getCertChipRangeState(1, null, 2)).toBe("unselected")
      expect(getCertChipRangeState(1, 1, null)).toBe("unselected")
      expect(getCertChipRangeState(1, null, null)).toBe("unselected")
    })

    it("never returns 'in_range' for a 1-day cert (single chip selection)", () => {
      // 1-day certs should only ever light up the start chip. Regression
      // guard: a future refactor that off-by-one'd the in-range check
      // would light up the chip AFTER the start, which is semantically
      // wrong (no cert is issued for that day).
      for (const start of [-1, 0, 1, 2]) {
        for (const offset of [-1, 0, 1, 2]) {
          const state = getCertChipRangeState(offset, start, 1)
          if (offset === start) {
            expect(state, `offset=${offset} start=${start}`).toBe("start")
          } else {
            expect(state, `offset=${offset} start=${start}`).toBe("unselected")
          }
        }
      }
    })
  })

  // ── mobile-visibility static contract ─────────────────────────────────────
  //
  // The summary line and GP cap note MUST be visible on every viewport.
  // Mobile is the majority of paid traffic. Hidden-on-mobile bugs cost
  // money silently.
  describe("mobile visibility", () => {
    it("does not hide the summary line behind a sm: breakpoint", () => {
      // The summary line includes "doctor review when available". Search
      // for that string in a context that includes a hidden class — if
      // present, fail. Specifically scan for `hidden ... sm:flex` or
      // `hidden ... sm:block` wrapping the summary block.
      //
      // We do this as a source-string check rather than a render test
      // because the bug was a one-line className edit that no
      // smoke-test caught. Static catches it pre-merge.
      const summaryHidden = /className="hidden[^"]*sm:flex[^"]*"[^>]*>\s*<div[^>]*>\s*<p[^>]*>\s*\{selectedDays/
      expect(certStepSource).not.toMatch(summaryHidden)
    })

    it("does not hide the 'more than 3 days' GP note behind a sm: breakpoint", () => {
      // GP note copy: "Need more than 3 days off?". If it has a hidden
      // sm:block wrapper, mobile patients can't see the 3-day cap.
      const gpNoteHidden =
        /className="hidden[^"]*sm:block[^"]*"[^>]*>\s*Need more than 3 days/
      expect(certStepSource).not.toMatch(gpNoteHidden)
    })

    it("does not introduce any new hidden-on-mobile pattern on critical copy", () => {
      // Defensive: any `className="hidden ... sm:` pattern adjacent to
      // text containing the words "day" or "doctor" or "GP" is suspect.
      // Match it loosely so a future refactor that re-hides revenue-
      // critical copy fires the guard.
      const matches = certStepSource.match(
        /className="[^"]*hidden[^"]*(?:sm|md|lg):[^"]*"[^>]*>[^<]*(?:doctor|GP|day)/gi,
      )
      expect(
        matches ?? [],
        "Suspect hidden-on-mobile pattern near revenue-critical copy: " + JSON.stringify(matches),
      ).toEqual([])
    })
  })

  // ── chip inventory ────────────────────────────────────────────────────────
  describe("chip inventory matches the documented date model", () => {
    it("START_OFFSETS includes at least one positive offset (forward dates)", () => {
      // Pin: if a future refactor reverts START_OFFSETS to past-only
      // (e.g. [-2, -1, 0] as it was before PR #57), this fails.
      // Patients booking a known upcoming sick day are the dominant
      // med-cert use case and must always be able to pick tomorrow.
      const startOffsetsMatch = certStepSource.match(
        /const START_OFFSETS\s*=\s*\[([-0-9, ]+)\]/,
      )
      expect(startOffsetsMatch, "START_OFFSETS array not found in source").toBeTruthy()
      const offsets = startOffsetsMatch![1]
        .split(",")
        .map((s) => parseInt(s.trim(), 10))
        .filter((n) => !Number.isNaN(n))
      const positives = offsets.filter((n) => n > 0)
      expect(
        positives.length,
        `START_OFFSETS must include at least one positive offset. Got: ${JSON.stringify(offsets)}`,
      ).toBeGreaterThan(0)
    })

    it("WIN_MAX allows forward dates within the validator window", () => {
      // The validator's CERTIFICATE_MAX_FORWARD_DAYS_DEFAULT is 14
      // (lib/medical-certificates/date-policy.ts). The UI's WIN_MAX
      // must allow at least the most-common forward picks (today + 2).
      const winMaxMatch = certStepSource.match(/const WIN_MAX\s*=\s*(-?\d+)/)
      expect(winMaxMatch).toBeTruthy()
      const winMax = parseInt(winMaxMatch![1], 10)
      expect(winMax, "WIN_MAX must allow at least today + 2 days forward").toBeGreaterThanOrEqual(2)
    })

    it("every START_OFFSETS value has a dedicated chipLabel (no locale-formatter fallback)", () => {
      // chipLabel has explicit cases for -1, 0, 1, 2. If START_OFFSETS
      // expands without adding cases, chips render via toLocaleDateString
      // which produces "Mon 26" style strings — fine for fallback but
      // not what design intends for the common picks. Pin so any
      // expansion forces a labeling decision.
      const startOffsetsMatch = certStepSource.match(
        /const START_OFFSETS\s*=\s*\[([-0-9, ]+)\]/,
      )
      const offsets = (startOffsetsMatch?.[1] ?? "")
        .split(",")
        .map((s) => parseInt(s.trim(), 10))
        .filter((n) => !Number.isNaN(n))

      const labelledOffsets = new Set<number>()
      const re = /if \(offset === (-?\d+)\) return "[^"]+"/g
      let m: RegExpExecArray | null
      while ((m = re.exec(certStepSource)) !== null) {
        labelledOffsets.add(parseInt(m[1], 10))
      }

      for (const offset of offsets) {
        expect(
          labelledOffsets.has(offset),
          `START_OFFSETS includes ${offset} but chipLabel has no dedicated case. Add a label or accept the locale fallback.`,
        ).toBe(true)
      }
    })
  })

  // ── upstream service-type gate cross-reference ────────────────────────────
  it("cross-references the prescribing-identity gate contract for med-cert", () => {
    // This test does not re-test the gate (that's in
    // prescribing-identity-gate-contract.test.ts) but pins the assertion
    // that the gate test EXISTS and references the canonical 'med-cert'
    // value. If someone deletes the gate test, this fails — preventing
    // a silent loss of the Medicare-not-required guard for med cert.
    const gateContract = readFileSync(
      join(process.cwd(), "lib/__tests__/prescribing-identity-gate-contract.test.ts"),
      "utf8",
    )
    expect(gateContract).toContain("med-cert")
    expect(gateContract).toMatch(/serviceType:\s*["']med-cert["']/)
  })
})
