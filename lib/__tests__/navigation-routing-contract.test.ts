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
    const nextConfig = readFileSync(path.join(root, "next.config.mjs"), "utf8")

    expect(existsSync(path.join(root, "app/doctor/intakes/page.tsx"))).toBe(false)
    expect(existsSync(path.join(root, "app/doctor/scripts/page.tsx"))).toBe(false)
    expect(nextConfig).toContain('source: "/doctor/scripts"')
    expect(nextConfig).toContain('destination: "/dashboard?status=scripts#doctor-queue"')
    expect(userMenu).not.toContain("href=\"/doctor/intakes\"")
    expect(userMenu).toContain("STAFF_DOCTOR_SCRIPTS_HREF")
  })

  it("routes the signed-in marketing dashboard entry through the post-sign-in handoff", () => {
    const userMenu = readFileSync(path.join(root, "components/shared/navbar/user-menu.tsx"), "utf8")
    const navbar = readFileSync(path.join(root, "components/shared/navbar.tsx"), "utf8")

    expect(userMenu).toMatch(/<a\s+href="\/auth\/post-signin"[\s\S]*Dashboard[\s\S]*<\/a>/)
    expect(userMenu).not.toMatch(/<Link\s+href=\{STAFF_DASHBOARD_HREF\}[\s\S]*Dashboard[\s\S]*<\/Link>/)
    expect(navbar).toContain('window.location.assign("/auth/post-signin")')
    expect(navbar).not.toContain("router.push(STAFF_DASHBOARD_HREF)")
  })
})
