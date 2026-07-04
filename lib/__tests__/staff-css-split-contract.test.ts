import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

const root = process.cwd()
const read = (p: string) => readFileSync(join(root, p), "utf8")

/**
 * Staff CSS split (2026-07-04): public/patient pages must not pay for staff
 * cockpit utilities. app/globals.css excludes the six staff source dirs; the
 * staff layouts load a supplemental utilities-only sheet compiled from
 * exactly those dirs. Measured at introduction: public sheet 371KB→331KB raw
 * (50.3→45.4KB gz); every dropped class verified present in staff.css's
 * output (396/396, zero lost).
 */

const STAFF_APP_DIRS = ["admin", "doctor", "dashboard"] as const
const STAFF_COMPONENT_DIRS = ["operator", "doctor", "admin"] as const

describe("staff CSS split contract", () => {
  const globals = read("app/globals.css")
  const staff = read("app/staff.css")
  const shared = read("app/tailwind-shared.css")

  it("globals.css excludes every staff source dir and imports the shared theme", () => {
    for (const dir of STAFF_APP_DIRS) {
      expect(globals).toContain(`@source not "../app/${dir}";`)
    }
    for (const dir of STAFF_COMPONENT_DIRS) {
      expect(globals).toContain(`@source not "../components/${dir}";`)
    }
    expect(globals).toContain('@import "./tailwind-shared.css";')
  })

  it("staff.css scans exactly the excluded staff dirs, utilities-only, with both theme references", () => {
    for (const dir of STAFF_APP_DIRS) {
      expect(staff).toContain(`@source "./${dir}";`)
    }
    for (const dir of STAFF_COMPONENT_DIRS) {
      expect(staff).toContain(`@source "../components/${dir}";`)
    }
    // Default palette/spacing utilities (bg-emerald-*, -mx-4, ...) need the
    // DEFAULT theme available for generation; theme(reference) loads it
    // without re-emitting variables that globals.css already ships.
    expect(staff).toContain('@import "tailwindcss/theme.css" layer(theme) theme(reference);')
    // Project tokens + custom variants + custom @utility definitions come
    // from the shared file, reference-only.
    expect(staff).toContain('@reference "./tailwind-shared.css";')
    // Utilities layer only — no preflight, no base. source(none) so the
    // shared file's absence of @source stays the single scan authority.
    expect(staff).toContain('@import "tailwindcss/utilities.css" layer(utilities) source(none);')
    expect(staff).not.toContain('@import "tailwindcss"')
    expect(staff).not.toContain("preflight.css")
  })

  it("tailwind-shared.css carries the design-system directives and NO @source", () => {
    // An @source here would leak into staff.css via @reference and drag the
    // whole app back into the staff scan — the exact bug this file avoids.
    expect(shared).not.toMatch(/^@source /m)
    expect(shared).toContain("@custom-variant dark")
    expect(shared).toContain("@theme inline")
    expect(shared).toContain("@utility animate-in")
  })

  it("every staff layout (and only staff layouts) imports staff.css", () => {
    for (const dir of STAFF_APP_DIRS) {
      expect(read(`app/${dir}/layout.tsx`)).toContain('import "../staff.css"')
    }
    // The root layout must keep loading globals only — staff.css on every
    // route would undo the split.
    expect(read("app/layout.tsx")).toContain('import "./globals.css"')
    expect(read("app/layout.tsx")).not.toContain("staff.css")
  })

  it("no public or patient surface imports staff-scanned components", () => {
    // The split is safe only while public/patient code never renders
    // staff-scanned components (their classes exist solely in staff.css).
    // components/ui/mobile-nav.tsx imports the class-free
    // components/admin/staff-nav-icons.ts — pin that it stays class-free.
    const navIcons = read("components/admin/staff-nav-icons.ts")
    expect(navIcons).not.toContain("className")
  })
})
