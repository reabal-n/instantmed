import { existsSync, readFileSync } from "node:fs"
import path from "node:path"

import { describe, expect, it } from "vitest"

const root = process.cwd()

describe("navigation routing contracts", () => {
  it("keeps /start available as a legacy request handoff", () => {
    const middleware = readFileSync(path.join(root, "middleware.ts"), "utf8")

    expect(existsSync(path.join(root, "app/start/route.ts"))).toBe(true)
    expect(middleware).not.toContain("\"/start\"")
  })

  it("preserves protected-route query strings when bouncing to sign-in", () => {
    const middleware = readFileSync(path.join(root, "middleware.ts"), "utf8")

    expect(middleware).toContain("`${pathname}${req.nextUrl.search}`")
  })

  it("does not link the doctor user menu to the missing /doctor/intakes index", () => {
    const userMenu = readFileSync(path.join(root, "components/shared/navbar/user-menu.tsx"), "utf8")

    expect(existsSync(path.join(root, "app/doctor/intakes/page.tsx"))).toBe(false)
    expect(existsSync(path.join(root, "app/doctor/scripts/page.tsx"))).toBe(true)
    expect(userMenu).not.toContain("href=\"/doctor/intakes\"")
    expect(userMenu).toContain("href=\"/doctor/scripts\"")
  })
})
