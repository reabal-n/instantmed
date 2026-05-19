import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

const root = process.cwd()
const read = (path: string) => readFileSync(join(root, path), "utf8")

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
})
