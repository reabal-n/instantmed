/**
 * Doctor dashboard minimalism contract.
 *
 * After the 2026-05-25 dashboard simplification (PR2), the operator's
 * primary triage surface at /dashboard stripped three analytics/onboarding
 * cards (AttributionSourcesCard, DeclineReasonsCard, StaffReadinessPanel)
 * and dropped two chrome buttons from the queue header (sound toggle,
 * keyboard shortcuts modal trigger).
 *
 * This file pins the deletion so a future regression — reintroducing any
 * of the stripped surfaces in the dashboard's vertical stack — fails CI.
 *
 * To intentionally bring something back: delete the relevant assertion,
 * justify it in the PR description, and update docs/ROADMAP.md.
 */

import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

const root = process.cwd()

function read(path: string): string {
  return readFileSync(join(root, path), "utf8")
}

describe("doctor dashboard minimalism contract", () => {
  it("/dashboard page does not import the retired analytics + readiness cards", () => {
    const source = read("app/dashboard/page.tsx")
    // Look for actual imports / JSX usage, not bare strings — the
    // deletion comment intentionally names the retired surfaces so the
    // diff is searchable.
    expect(source).not.toMatch(/import\s*\{[^}]*\bAttributionSourcesCard\b/)
    expect(source).not.toMatch(/import\s*\{[^}]*\bDeclineReasonsCard\b/)
    expect(source).not.toMatch(/import\s*\{[^}]*\bStaffReadinessPanel\b/)
    expect(source).not.toMatch(/<AttributionSourcesCard\b/)
    expect(source).not.toMatch(/<DeclineReasonsCard\b/)
    expect(source).not.toMatch(/<StaffReadinessPanel\b/)
  })

  it("/dashboard page does not pull data fetchers for the retired cards", () => {
    const source = read("app/dashboard/page.tsx")
    expect(source).not.toContain("getAttributionSourceBreakdown")
    expect(source).not.toContain("getDeclineReasonBreakdown")
    expect(source).not.toContain("getStaffReadinessSnapshot")
  })

  it("the retired card component files no longer exist", () => {
    expect(existsSync(join(root, "components/admin/attribution-sources-card.tsx"))).toBe(false)
    expect(existsSync(join(root, "components/admin/decline-reasons-card.tsx"))).toBe(false)
    expect(existsSync(join(root, "components/admin/staff-readiness-panel.tsx"))).toBe(false)
  })

  it("the retired data-fetcher files no longer exist", () => {
    expect(existsSync(join(root, "lib/data/dashboard-attribution.ts"))).toBe(false)
    expect(existsSync(join(root, "lib/data/dashboard-decline-trends.ts"))).toBe(false)
    expect(existsSync(join(root, "lib/data/staff-readiness.ts"))).toBe(false)
  })

  it("queue header has no sound-toggle or keyboard-shortcuts button", () => {
    const source = read("app/doctor/queue/queue-filters.tsx")
    expect(source).not.toContain("Volume2")
    expect(source).not.toContain("VolumeOff")
    expect(source).not.toContain("KeyboardShortcutsModal")
    expect(source).not.toMatch(/onToggleSound/)
    expect(source).not.toMatch(/soundMuted/)
  })

  it("the keyboard-shortcuts modal component file no longer exists", () => {
    expect(existsSync(join(root, "components/doctor/keyboard-shortcuts-modal.tsx"))).toBe(false)
  })

  it("queue realtime hook no longer requires a playNotificationSound callback", () => {
    const source = read("lib/doctor/use-queue-realtime.ts")
    expect(source).not.toContain("playNotificationSound")
  })

  it("/dashboard page header keeps the three earning-pixels surfaces (test, system health, availability)", () => {
    // Subtraction is the change. These three stay; they each do one job.
    const source = read("app/dashboard/page.tsx")
    expect(source).toContain("TestDataToggleButton")
    expect(source).toContain("SystemHealthPill")
    expect(source).toContain("DoctorAvailabilityToggle")
  })
})
