import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

function readProjectFile(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), "utf8")
}

describe("admin feature flags layout contract", () => {
  it("keeps feature flags as a bounded operator console instead of a page-length scroll", () => {
    const client = readProjectFile("app/admin/features/features-client.tsx")
    const list = readProjectFile("app/admin/features/features-list.tsx")

    expect(client).not.toContain("OperatorScrollArea")
    expect(client).toContain("<FeaturesList")
    expect(list).toContain('data-testid="feature-flags-bounded-console"')
    expect(list).toContain('data-testid="feature-flag-critical-strip"')
    expect(list).toContain('data-testid="feature-flag-control-grid"')
    expect(list).toContain("feature-flag-tab-panel")
    expect(list).toContain("overflow-y-auto")
    expect(list).not.toContain('className="space-y-8"')
  })

  it("keeps critical kill switches visible above the detailed control panels", () => {
    const list = readProjectFile("app/admin/features/features-list.tsx")

    expect(list).toContain("Platform")
    expect(list).toContain("Med cert")
    expect(list).toContain("Repeat Rx")
    expect(list).toContain("Consults")
    expect(list).toContain("maintenance_mode")
    expect(list).toContain("disable_med_cert")
    expect(list).toContain("disable_repeat_scripts")
    expect(list).toContain("disable_consults")
  })

  it("groups lower-priority controls into tabs with internal scrolling only", () => {
    const list = readProjectFile("app/admin/features/features-list.tsx")

    expect(list).toContain('TabsTrigger value="core"')
    expect(list).toContain('TabsTrigger value="safety"')
    expect(list).toContain('TabsTrigger value="automation"')
    expect(list).toContain('TabsTrigger value="audit"')
    expect(list).toContain("Safety library")
    expect(list).toContain("Automation")
    expect(list).toContain("Recent changes")
  })

  it("keeps detailed panels compact and removes the legacy page-length kill-switch sections", () => {
    const detail = readProjectFile("app/admin/features/feature-flag-detail.tsx")

    expect(detail).not.toContain("function KillSwitchWarning")
    expect(detail).not.toContain("function ServiceKillSwitchesSection")
    expect(detail).toContain('data-testid="feature-flag-maintenance-panel"')
    expect(detail).toContain('data-testid="feature-flag-operations-panel"')
    expect(detail).toContain("rows={2}")
    expect(detail).not.toContain('className="space-y-6 px-6 pb-6"')
  })

  it("does not expose retired placeholder toggles that have no runtime implementation", () => {
    const flags = readProjectFile("lib/data/types/feature-flags.ts")

    for (const retiredFlag of [
      "script_todo_enabled",
      "batch_approve_enabled",
      "consent_versioning_enabled",
      "health_profile_enabled",
      "realtime_queue_enabled",
      "ab_testing_enabled",
      "support_tickets_enabled",
      "clinical_decision_support_enabled",
    ]) {
      expect(flags).not.toContain(retiredFlag)
    }
  })
})
