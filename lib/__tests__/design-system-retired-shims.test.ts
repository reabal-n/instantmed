import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

const root = process.cwd()

describe("retired design-system shims", () => {
  it("uses canonical dashboard primitive filenames instead of legacy glass/glow shims", () => {
    expect(existsSync(join(root, "components/dashboard/stat-card.tsx"))).toBe(true)
    expect(existsSync(join(root, "components/dashboard/status-badge.tsx"))).toBe(true)

    expect(existsSync(join(root, "components/dashboard/glass-stat-card.tsx"))).toBe(false)
    expect(existsSync(join(root, "components/dashboard/glow-badge.tsx"))).toBe(false)

    const barrel = readFileSync(join(root, "components/dashboard/index.ts"), "utf8")
    expect(barrel).not.toContain("./glass-stat-card")
    expect(barrel).not.toContain("./glow-badge")
  })

  it("removes the unused multi-service hero mockup shim", () => {
    expect(existsSync(join(root, "components/marketing/hero-multi-service-mockup.tsx"))).toBe(false)
  })

  it("removes the unused GlassCard effect module", () => {
    expect(existsSync(join(root, "components/effects/glass-card.tsx"))).toBe(false)
  })

  it("uses canonical segmented radio naming instead of GlassRadioGroup", () => {
    expect(existsSync(join(root, "components/ui/segmented-radio-group.tsx"))).toBe(true)
    expect(existsSync(join(root, "components/ui/glass-radio-group.tsx"))).toBe(false)

    const onboardingSource = readFileSync(join(root, "components/shared/inline-onboarding-step.tsx"), "utf8")
    const uiBarrelSource = readFileSync(join(root, "components/ui/index.ts"), "utf8")

    expect(onboardingSource).not.toContain("GlassRadioGroup")
    expect(onboardingSource).not.toContain("glass-radio-group")
    expect(uiBarrelSource).not.toContain("GlassRadioGroup")
    expect(uiBarrelSource).not.toContain("glass-radio-group")
  })

  it("keeps the design-system version pin aligned with the latest changelog entry", () => {
    const versionSource = readFileSync(join(root, "lib/design-system/version.ts"), "utf8")
    const changelogSource = readFileSync(join(root, "docs/DESIGN_SYSTEM_CHANGELOG.md"), "utf8")

    expect(changelogSource).toContain("## [2.0.1]")
    expect(versionSource).toContain('DESIGN_SYSTEM_VERSION = "2.0.1"')
  })
})
