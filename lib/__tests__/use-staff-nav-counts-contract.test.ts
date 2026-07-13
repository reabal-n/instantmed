import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

import {
  STAFF_NAV_POLL_INTERVAL_MS,
  startStaffNavPolling,
} from "@/lib/dashboard/use-staff-nav-counts"

const REPO_ROOT = join(__dirname, "..", "..")

function readRepoFile(relativePath: string): string {
  return readFileSync(join(REPO_ROOT, relativePath), "utf8")
}

describe("Staff nav counts hook contract", () => {
  it("waits for the interval and only polls while the page is visible", () => {
    const intervalHandle = { id: "staff-nav-poll" }
    let intervalCallback: (() => void) | undefined
    let intervalDelay: number | undefined
    let clearedHandle: typeof intervalHandle | undefined
    let visibilityState: DocumentVisibilityState = "visible"
    let refreshCount = 0

    const stopPolling = startStaffNavPolling({
      refreshCounts: () => {
        refreshCount += 1
      },
      getVisibilityState: () => visibilityState,
      setIntervalFn: (callback, delay) => {
        intervalCallback = callback
        intervalDelay = delay
        return intervalHandle
      },
      clearIntervalFn: (handle) => {
        clearedHandle = handle
      },
    })

    expect(refreshCount).toBe(0)
    expect(intervalDelay).toBe(STAFF_NAV_POLL_INTERVAL_MS)

    visibilityState = "hidden"
    intervalCallback?.()
    expect(refreshCount).toBe(0)

    visibilityState = "visible"
    intervalCallback?.()
    expect(refreshCount).toBe(1)

    stopPolling()
    expect(clearedHandle).toBe(intervalHandle)
  })

  it("is exported from the shared hook module", () => {
    const source = readRepoFile("lib/dashboard/use-staff-nav-counts.ts")
    expect(source).toContain("export function useLiveStaffNavCounts")
    expect(source).toContain('"/api/admin/staff-nav-counts"')
  })

  it("gives the operator shell one provider for every responsive nav", () => {
    const source = readRepoFile("components/operator/operator-shell.tsx")
    expect(source.match(/<StaffNavCountsProvider/g)).toHaveLength(1)
    expect(source).toContain("initialCounts={navCounts}")
    expect(source).not.toContain("navCounts={navCounts}")
  })

  it("admin sidebar consumes the shared hook (no local copy)", () => {
    const source = readRepoFile("components/admin/admin-sidebar.tsx")
    expect(source).toContain('from "@/lib/dashboard/use-staff-nav-counts"')
    // No local copy of the polling logic should remain.
    expect(source).not.toMatch(/function useLiveStaffNavCounts/)
  })

  it("doctor mobile nav consumes the shared hook", () => {
    const source = readRepoFile("components/ui/mobile-nav.tsx")
    expect(source).toContain('from "@/lib/dashboard/use-staff-nav-counts"')
    expect(source).toContain("useLiveStaffNavCounts")
  })
})
