import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

const root = process.cwd()
const read = (path: string) => readFileSync(join(root, path), "utf8")

describe("system-health endpoint contract", () => {
  it("ships the /api/admin/system-health route and powers the SystemHealthPill", () => {
    const route = "app/api/admin/system-health/route.ts"
    const data = "lib/data/system-health.ts"
    const pill = "components/operator/system-health-pill.tsx"

    expect(existsSync(join(root, route))).toBe(true)
    expect(existsSync(join(root, data))).toBe(true)
    expect(existsSync(join(root, pill))).toBe(true)
  })

  it("gates the endpoint behind hasStaffAccess and falls back to EMPTY_SYSTEM_HEALTH on error", () => {
    const source = read("app/api/admin/system-health/route.ts")

    // Phase 2 of dashboard remaster (2026-05-12). Any staff role
    // (admin / doctor / support) can hit this endpoint; counts are
    // not PHI but must not leak to unauthenticated callers.
    expect(source).toContain("getApiAuth")
    expect(source).toContain("hasStaffAccess")
    expect(source).toContain('return NextResponse.json({ error: "Unauthorized" }, { status: 401 })')

    // The endpoint must never throw to the client — render the empty
    // shape if the data fetch fails so the pill keeps last-known state
    // instead of flashing red on a transient outage.
    expect(source).toContain("EMPTY_SYSTEM_HEALTH")
    expect(source).toContain("catch (error)")
  })

  it("queries recovery surfaces via Promise.allSettled with per-surface fallback to 0", () => {
    const source = read("lib/data/system-health.ts")

    // Each surface is a separate query so a single failing table doesn't
    // paint the whole pill red. Promise.allSettled is the right primitive.
    expect(source).toContain("Promise.allSettled")

    // Stuck intakes via the operational view (must filter seeded E2E data
    // so the pill doesn't fire from the seed patient in production).
    expect(source).toContain("v_stuck_intakes")
    expect(source).toContain("filterSeededE2EIntakes")

    // The other three surfaces.
    expect(source).toContain('eq("action", "webhook_failed")')
    expect(source).toContain('eq("metadata->>error_type", "parchment")')
    expect(source).toContain('from("email_outbox")')
    expect(source).toContain("countStripePriceConfigIssues")
    expect(source).toContain("stripePriceIssues")

    // Each rejection / error path must return 0, not throw.
    expect(source).toContain('result.status === "rejected"')
    expect(source).toContain("return 0")
  })

  it("renders the SystemHealthPill with a 90s visibility-gated poll and a last-known-state fallback", () => {
    const source = read("components/operator/system-health-pill.tsx")

    expect(source).toContain('fetch("/api/admin/system-health", { cache: "no-store" })')
    // 90s poll, paused while the tab is hidden (was an unconditional 45s poll that
    // doubled idle server load alongside the queue's own poll).
    expect(source).toContain("POLL_INTERVAL_MS = 90_000")
    expect(source).toContain('document.addEventListener("visibilitychange"')
    expect(source).toContain("stripePriceIssues")
    expect(source).toContain("Stripe price config")
    // On fetch failure we explicitly keep the prior state — no flashing
    // red on a single network blip.
    expect(source).toContain("Advisory; keep last known state")
  })
})
