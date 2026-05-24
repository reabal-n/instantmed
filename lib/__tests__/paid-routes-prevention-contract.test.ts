/**
 * Paid-routes prevention contract.
 *
 * Generalises the cert-step-revenue-contract anti-pattern guards to
 * every component in the unified /request flow + every paid marketing
 * landing page. These guards are the cheapest possible insurance against
 * the bug classes that hit med-cert today (2026-05-24):
 *
 *   - Critical UI hidden on mobile (where most paid traffic lands)
 *   - `<main>` element missing from a public-paid route (a11y regression
 *     + e2e locator instability)
 *
 * Add new rows to PAID_INTAKE_STEPS or PAID_MARKETING_PAGES when a new
 * paid surface ships. Do NOT delete rows to make tests pass; fix the
 * source. Every row here represents revenue.
 */
import { readdirSync, readFileSync, statSync } from "fs"
import { join } from "path"
import { describe, expect, it } from "vitest"

// ── inventory ────────────────────────────────────────────────────────────────
//
// All unified-flow intake step files. New step files MUST be added here.
// Used by mobile-visibility scan; sourcing dynamically would create
// silent gaps when a new step file slips in without a contract entry.
const PAID_INTAKE_STEPS_DIR = "components/request/steps"

// All paid-marketing landing pages (the ones Google Ads traffic lands
// on). Each must include a <main> element either directly or via a
// shell wrapper that contributes one. Service-funnel-page.tsx feeds
// most of these via the shared shell; med-cert-landing has its own.
const PAID_MARKETING_SHELLS: { path: string; mustContain: string }[] = [
  { path: "components/marketing/med-cert-landing.tsx", mustContain: "<main" },
  { path: "components/marketing/service-funnel-page.tsx", mustContain: "<main" },
  { path: "components/marketing/med-cert-intent-page.tsx", mustContain: "<main" },
  { path: "components/marketing/shared/landing-page-shell.tsx", mustContain: "<main" },
  { path: "components/marketing/shared/informational-page-shell.tsx", mustContain: "<main" },
]

function listIntakeStepFiles(): string[] {
  const dir = join(process.cwd(), PAID_INTAKE_STEPS_DIR)
  let entries: string[] = []
  try {
    entries = readdirSync(dir)
  } catch {
    return []
  }
  return entries
    .filter((name) => name.endsWith(".tsx") && !name.endsWith(".test.tsx"))
    .map((name) => join(PAID_INTAKE_STEPS_DIR, name))
    .filter((rel) => {
      const abs = join(process.cwd(), rel)
      try {
        return statSync(abs).isFile()
      } catch {
        return false
      }
    })
}

describe("paid-routes prevention contract", () => {
  // ── mobile visibility across the intake flow ──────────────────────────────
  //
  // Today (2026-05-24) shipped two hidden-on-mobile bugs on the
  // certificate step that cost real conversion. Generalising the
  // anti-pattern guard to every intake step kills the bug class on
  // every flow at once — prescription, repeat-script, consult, ed,
  // hair-loss steps all included automatically.
  //
  // The guard is intentionally LOOSE: it flags any `hidden ... sm:`
  // pattern adjacent to text containing common revenue-critical words.
  // False positives are easy to allowlist; false negatives lose money.
  describe("intake steps do not hide revenue-critical copy on mobile", () => {
    const intakeStepFiles = listIntakeStepFiles()

    it("inventory is non-empty (sanity)", () => {
      // If this trips, the steps directory moved or the filter broke.
      // Fix the path before trusting any of the assertions below.
      expect(intakeStepFiles.length).toBeGreaterThan(3)
    })

    // Tokens that signal revenue-critical copy. Narrower than the first
    // draft of this contract to avoid false positives like "Press Enter
    // to continue" (a desktop-only keyboard-shortcut hint, intentional).
    // Matches today's actual bug-class copy: the date-range summary
    // line ("doctor review when available"), the price ($XX.XX), the
    // GP cap notice ("Need more than"), and trust-badge copy ("AHPRA").
    const REVENUE_TOKENS = /doctor review|Need more than|AHPRA|\$\d+\.\d+|covered by this/i

    for (const relPath of intakeStepFiles) {
      it(`${relPath} has no hidden-on-mobile wrapper around revenue copy`, () => {
        const source = readFileSync(join(process.cwd(), relPath), "utf8")
        // Step 1: find every JSX element whose className contains a
        // hidden + sm/md/lg breakpoint pattern. Step 2: for each match,
        // peek at the following ~200 chars and flag if a revenue token
        // appears there. This is two-pass to keep the regex composable
        // and the failure message useful.
        const hiddenWrapperRegex =
          /className="[^"]*hidden[^"]*(?:sm|md|lg):[^"]*"[^>]*>([\s\S]{0,800})/g
        const offenders: string[] = []
        let match: RegExpExecArray | null
        while ((match = hiddenWrapperRegex.exec(source)) !== null) {
          const wrappedContent = match[1]
          if (REVENUE_TOKENS.test(wrappedContent)) {
            offenders.push(
              match[0].slice(0, 120) + (match[0].length > 120 ? "..." : ""),
            )
          }
        }
        expect(
          offenders,
          `${relPath} contains a hidden-on-mobile wrapper around revenue-critical copy. ` +
            `If the copy is intentionally desktop-only, refactor the className OR move the copy ` +
            `out from under the hidden wrapper. Offending matches: ${JSON.stringify(offenders)}`,
        ).toEqual([])
      })
    }
  })

  // ── <main> element regression contract ────────────────────────────────────
  //
  // PR #59 fixed service-funnel-page.tsx missing <main>; it had been a
  // silent accessibility regression for 5 days. This guard ensures the
  // same regression cannot re-occur on any paid marketing landing
  // page's shell. Each shell file MUST render <main> somewhere.
  //
  // If a new shell ships, add it to PAID_MARKETING_SHELLS above.
  describe("paid marketing shells render a <main> element", () => {
    for (const { path: relPath, mustContain } of PAID_MARKETING_SHELLS) {
      it(`${relPath} contains a <main> element`, () => {
        const source = readFileSync(join(process.cwd(), relPath), "utf8")
        expect(
          source,
          `${relPath} does not render a <main> element. Screen readers lose the main landmark, ` +
            `"Skip to main content" links land on nothing semantic, and e2e tests scoping to ` +
            `getByRole("main") become unreliable. Add a <main className="relative"> wrapper ` +
            `between Navbar and MarketingFooter (see existing shells for the pattern).`,
        ).toContain(mustContain)
      })
    }
  })

  // ── document drift sentinel ───────────────────────────────────────────────
  //
  // The PAID_MARKETING_SHELLS list above is hard-coded so the contract
  // catches *deletion* of a shell (someone removes med-cert-landing.tsx
  // without updating this file). Sentinel verifies every file still
  // exists on disk; if not, the inventory is stale.
  it("every PAID_MARKETING_SHELLS entry exists on disk", () => {
    const missing: string[] = []
    for (const { path: relPath } of PAID_MARKETING_SHELLS) {
      try {
        statSync(join(process.cwd(), relPath))
      } catch {
        missing.push(relPath)
      }
    }
    expect(
      missing,
      `PAID_MARKETING_SHELLS contains entries that don't exist on disk: ${JSON.stringify(missing)}. ` +
        `If a shell was deliberately deleted, remove it from this list AND verify no public paid ` +
        `route still depends on it.`,
    ).toEqual([])
  })
})
