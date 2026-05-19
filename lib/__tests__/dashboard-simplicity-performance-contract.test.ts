import {
  existsSync,
  readdirSync,
  readFileSync,
} from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

const root = process.cwd()
const read = (path: string) => readFileSync(join(root, path), "utf8")
const collectSourceFiles = (dir: string): string[] => {
  const absoluteDir = join(root, dir)
  const entries = readdirSync(absoluteDir, { withFileTypes: true })

  return entries.flatMap((entry) => {
    const relativePath = `${dir}/${entry.name}`

    if (entry.isDirectory()) return collectSourceFiles(relativePath)
    if (!/\.(ts|tsx)$/.test(entry.name)) return []

    return [relativePath]
  })
}

describe("dashboard simplicity and runtime performance contracts", () => {
  it("keeps the patient app shell free of decorative page-transition runtime", () => {
    const source = read("app/patient/patient-shell.tsx")

    expect(source).not.toContain("framer-motion")
    expect(source).not.toContain("AnimatePresence")
    expect(source).not.toContain("motion.div")
  })

  it("keeps the patient dashboard scannable without scroll-triggered animation wrappers", () => {
    const source = read("components/patient/panel-dashboard.tsx")

    expect(source).not.toContain("framer-motion")
    expect(source).not.toContain("whileInView")
    expect(source).not.toContain("stagger.")
    expect(source).toContain("next/dynamic")
    expect(source).toContain("profile-drawers")
    expect(source).toContain("patient/intake-detail-drawer")
    expect(source).toContain("patient/referral-card")
  })

  it("keeps patient routes off the broad patient component barrel", () => {
    expect(existsSync(join(root, "components/patient/index.ts"))).toBe(false)

    const patientRouteSources = [
      "app/patient/page.tsx",
      "app/patient/intakes/intakes-client.tsx",
      "app/patient/intakes/[id]/client.tsx",
      "app/patient/prescriptions/client.tsx",
      "app/patient/documents/documents-client.tsx",
      "app/patient/messages/messages-client.tsx",
    ]

    for (const file of patientRouteSources) {
      expect(read(file)).not.toContain('from "@/components/patient"')
    }
  })

  it("keeps profile housekeeping static and defers drawer forms until opened", () => {
    const todoSource = read("components/patient/profile-todo-card.tsx")
    const drawerSource = read("components/patient/profile-drawers.tsx")
    const panelDashboardSource = read("components/patient/panel-dashboard.tsx")

    expect(todoSource).not.toContain("framer-motion")
    expect(todoSource).not.toContain("AnimatePresence")
    expect(drawerSource).not.toContain("framer-motion")
    expect(drawerSource).toContain("@/components/panels/panel-provider")
    expect(panelDashboardSource).toContain("import(\"@/components/panels/drawer-panel\")")
  })

  it("keeps the default panel provider out of the Framer Motion bundle path", () => {
    const providerSource = read("components/panels/panel-provider.tsx")
    const patientShellSource = read("app/patient/patient-shell.tsx")

    expect(providerSource).not.toContain("framer-motion")
    expect(providerSource).not.toContain("AnimatePresence")
    expect(patientShellSource).toContain("@/components/panels/panel-provider")
    expect(patientShellSource).toContain("@/components/shell/left-rail")
    expect(patientShellSource).not.toContain("@/components/shell'")
    expect(existsSync(join(root, "components/shell/authenticated-shell.tsx"))).toBe(false)
  })

  it("avoids high-frequency whole-queue redraws in the staff cockpit", () => {
    const source = read("app/doctor/queue/queue-client.tsx")

    expect(source).toContain("}, 60000)")
    expect(source).toContain("if (intakes.length === 0)")
    expect(source).not.toContain("}, 30000)")
  })

  it("keeps staff queue DOM rows windowed at the scale boundary", () => {
    const source = read("app/doctor/queue/queue-table.tsx")

    expect(source).toContain("QUEUE_DOM_WINDOW_LIMIT = 100")
    expect(source).toContain("filteredIntakes.slice(0, QUEUE_DOM_WINDOW_LIMIT)")
    expect(source).toContain("renderedIntakes.map")
  })

  it("keeps queue hover peeks from blocking primary row actions", () => {
    const source = read("components/doctor/queue/queue-row-peek.tsx")

    expect(source).toContain("pointer-events-none")
  })

  it("keeps route-facing code off broad public component barrels", () => {
    const blockedBarrelPattern =
      /from\s+["']@\/components\/(?:marketing|marketing\/sections|marketing\/shared|sections|shared)["']/g
    const files = [
      ...collectSourceFiles("app"),
      ...collectSourceFiles("components"),
    ]
    const offenders = files.flatMap((file) => {
      const matches = read(file).match(blockedBarrelPattern) ?? []

      return matches.map((match) => `${file}: ${match}`)
    })

    expect(offenders).toEqual([])
  })

  it("keeps pricing content server-rendered and isolates the sticky CTA client island", () => {
    const pricingContentSource = read("app/pricing/pricing-content.tsx")
    const stickyCtaSource = read("app/pricing/pricing-sticky-cta.tsx")

    expect(pricingContentSource.startsWith('"use client"')).toBe(false)
    expect(pricingContentSource).not.toContain("framer-motion")
    expect(pricingContentSource).not.toContain("useEffect")
    expect(stickyCtaSource.startsWith('"use client"')).toBe(true)
    expect(stickyCtaSource).toContain("IntersectionObserver")
  })
})
