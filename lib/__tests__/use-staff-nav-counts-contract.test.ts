import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

const REPO_ROOT = join(__dirname, "..", "..")

function readRepoFile(relativePath: string): string {
  return readFileSync(join(REPO_ROOT, relativePath), "utf8")
}

describe("Staff nav counts hook contract", () => {
  it("is exported from the shared hook module", () => {
    const source = readRepoFile("lib/dashboard/use-staff-nav-counts.ts")
    expect(source).toContain("export function useLiveStaffNavCounts")
    expect(source).toContain('"/api/admin/staff-nav-counts"')
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
