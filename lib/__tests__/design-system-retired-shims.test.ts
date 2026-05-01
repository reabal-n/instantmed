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

  it("removes the unused UIX tabs compatibility wrapper", () => {
    expect(existsSync(join(root, "components/uix/tabs.tsx"))).toBe(false)
  })

  it("removes the unused dashboard stylesheet compatibility shim", () => {
    expect(existsSync(join(root, "app/dashboard-styles.css"))).toBe(false)

    for (const layoutPath of ["app/admin/layout.tsx", "app/doctor/layout.tsx", "app/patient/layout.tsx"]) {
      const layoutSource = readFileSync(join(root, layoutPath), "utf8")
      expect(layoutSource).not.toContain("dashboard-styles.css")
    }
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

  it("keeps Select on the canonical Radix API instead of legacy selectedKeys shims", () => {
    const selectSource = readFileSync(join(root, "components/ui/select.tsx"), "utf8")

    expect(selectSource).not.toContain("selectedKeys")
    expect(selectSource).not.toContain("onSelectionChange")
    expect(selectSource).not.toContain("classNames?:")
    expect(selectSource).not.toContain("key?: string")
  })

  it("does not preserve no-op dashboard animation compatibility props", () => {
    const gridSource = readFileSync(join(root, "components/dashboard/dashboard-grid.tsx"), "utf8")

    expect(gridSource).not.toContain("animate?:")
    expect(gridSource).not.toContain("animate prop")
    expect(gridSource).not.toContain("back-compat")
  })

  it("removes the legacy DashboardHeader alias in favour of DashboardPageHeader", () => {
    expect(existsSync(join(root, "components/dashboard/dashboard-header.tsx"))).toBe(false)

    const dashboardBarrel = readFileSync(join(root, "components/dashboard/index.ts"), "utf8")
    expect(dashboardBarrel).not.toContain("DashboardHeader")

    for (const adminPath of [
      "app/admin/analytics/analytics-client.tsx",
      "app/admin/finance/finance-client.tsx",
      "app/admin/ops/ops-client.tsx",
      "app/admin/ops/patient-merge-audit/page.tsx",
      "app/admin/ops/prescribing-identity/page.tsx",
    ]) {
      const source = readFileSync(join(root, adminPath), "utf8")
      expect(source).not.toContain("DashboardHeader")
    }
  })

  it("keeps the design-system version pin aligned with the latest changelog entry", () => {
    const versionSource = readFileSync(join(root, "lib/design-system/version.ts"), "utf8")
    const changelogSource = readFileSync(join(root, "docs/DESIGN_SYSTEM_CHANGELOG.md"), "utf8")

    expect(changelogSource).toContain("## [2.0.2]")
    expect(versionSource).toContain('DESIGN_SYSTEM_VERSION = "2.0.2"')
  })
})
