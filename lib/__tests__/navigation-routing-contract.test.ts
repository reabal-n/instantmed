import { existsSync, readFileSync } from "node:fs"
import path from "node:path"

import { describe, expect, it } from "vitest"

import { footerLinks } from "@/lib/marketing/homepage"
import { getActiveServices, getServiceMarketingHref } from "@/lib/services/service-catalog"

const root = process.cwd()
const marketingNavFiles = [
  "components/shared/navbar.tsx",
  "components/shared/navbar/user-menu.tsx",
  "components/shared/navbar/mobile-menu-content.tsx",
  "components/shared/navbar/mobile-drawer.tsx",
]

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
    const authHandoff = path.join(root, "lib/navigation/auth-handoff.ts")
    const userMenu = readFileSync(path.join(root, "components/shared/navbar/user-menu.tsx"), "utf8")
    const navbar = readFileSync(path.join(root, "components/shared/navbar.tsx"), "utf8")
    const mobileDrawer = readFileSync(path.join(root, "components/shared/navbar/mobile-drawer.tsx"), "utf8")

    expect(existsSync(authHandoff)).toBe(true)
    expect(readFileSync(authHandoff, "utf8")).toContain('AUTH_POST_SIGNIN_HREF = "/auth/post-signin"')
    expect(userMenu).toContain("AUTH_POST_SIGNIN_HREF")
    expect(userMenu).toContain("navigateToPostSignIn(window)")
    expect(userMenu).not.toContain('href="/auth/post-signin"')
    expect(userMenu).not.toMatch(/<Link\s+href=\{STAFF_DASHBOARD_HREF\}[\s\S]*Dashboard[\s\S]*<\/Link>/)
    expect(mobileDrawer).toContain("navigateToPostSignIn(window)")
    expect(navbar).not.toContain('window.location.assign("/auth/post-signin")')
    expect(navbar).not.toContain("router.push(STAFF_DASHBOARD_HREF)")
  })

  it("keeps signed-in mobile users out of the transient log-in CTA while auth is loading", () => {
    const mobileDrawer = readFileSync(path.join(root, "components/shared/navbar/mobile-drawer.tsx"), "utf8")

    expect(mobileDrawer).toContain("!isLoaded ?")
    expect(mobileDrawer).toContain('aria-hidden="true"')
    expect(mobileDrawer).not.toContain("!(isLoaded && user)")
  })

  it("makes active mobile and patient left-rail nav clicks no-op instead of soft-refreshing", () => {
    const mobileNav = readFileSync(path.join(root, "components/ui/mobile-nav.tsx"), "utf8")
    const leftRail = readFileSync(path.join(root, "components/shell/left-rail.tsx"), "utf8")

    expect(mobileNav).toContain("if (isActive) return")
    expect(leftRail).toContain("handleCurrentRouteClick")
    expect(leftRail).toContain("event.preventDefault()")
    expect(leftRail).toContain("patientOverviewActive")
  })

  it("keeps the mobile menu icon pointer-transparent so the button receives taps", () => {
    const menuToggle = readFileSync(path.join(root, "components/shared/navbar/mobile-menu-toggle.tsx"), "utf8")

    expect(menuToggle).toContain('className="pointer-events-none"')
    expect(menuToggle).toContain('aria-hidden="true"')
  })

  it("keeps one inert drawer tree stable while CSS settles reduced motion", () => {
    const animatedMobileMenu = readFileSync(path.join(root, "components/ui/animated-mobile-menu.tsx"), "utf8")

    expect(animatedMobileMenu).toContain('data-mobile-menu-hydrated={isHydrated ? "true" : "false"}')
    expect(animatedMobileMenu).toContain(
      'data-mobile-menu-motion={prefersReducedMotion ? "static" : "animated"}',
    )
    expect(animatedMobileMenu).not.toContain("framer-motion")
    expect(animatedMobileMenu).toContain("aria-hidden={!isOpen}")
    expect(animatedMobileMenu).toContain("inert={!isOpen ? true : undefined}")
    expect(animatedMobileMenu).toContain("motion-reduce:!transition-none")
    expect(animatedMobileMenu).toContain("visible translate-x-0")
    expect(animatedMobileMenu).toContain("invisible translate-x-full")
  })

  it("keeps the navbar glow markup stable across server and client themes", () => {
    const navbar = readFileSync(path.join(root, "components/shared/navbar.tsx"), "utf8")

    expect(navbar).not.toContain('from "next-themes"')
    expect(navbar).not.toContain("useTheme()")
    expect(navbar).toContain(
      "bg-gradient-radial from-transparent via-primary/8 to-transparent dark:via-primary/15",
    )
  })

  it("defers first-interaction callbacks so they do not pre-empt the initiating nav click", () => {
    const firstInteraction = readFileSync(path.join(root, "lib/browser/first-interaction.ts"), "utf8")

    expect(firstInteraction).toContain("FIRST_INTERACTION_CALLBACK_DELAY_MS = 200")
    expect(firstInteraction).toContain('FIRST_INTERACTION_IGNORE_SELECTOR = \'[data-first-interaction-ignore="true"]\'')
    expect(firstInteraction).toContain("shouldIgnoreFirstInteraction")
    expect(firstInteraction).toContain("window.setTimeout")
    expect(firstInteraction).toContain("if (entry.active) entry.callback()")
  })

  it("keeps nav link clicks local so deferred loaders do not eat first navigation", () => {
    const navSources = [
      "components/shared/navbar/animated-nav-link.tsx",
      "components/shared/navbar/user-menu.tsx",
      "components/shared/navbar/services-dropdown.tsx",
      "components/shared/navbar/resources-dropdown.tsx",
      "components/shared/navbar/mobile-menu-toggle.tsx",
      "components/shared/navbar/mobile-drawer.tsx",
      "components/ui/animated-mobile-menu.tsx",
      "components/shared/app-sign-in-button.tsx",
      "components/shared/brand-logo.tsx",
    ]
    const navbar = readFileSync(path.join(root, "components/shared/navbar.tsx"), "utf8")

    expect(navbar).toContain('data-first-interaction-ignore="true"')

    for (const relativePath of navSources) {
      const source = readFileSync(path.join(root, relativePath), "utf8")
      expect(source, relativePath).toContain("onPointerDown")
      expect(source, relativePath).toContain("event.stopPropagation()")
    }
  })

  it("lets the staff dashboard layout use role-aware wrong-role fallback", () => {
    const dashboardLayout = readFileSync(path.join(root, "app/dashboard/layout.tsx"), "utf8")

    expect(dashboardLayout).toContain('requireRole(["admin", "doctor", "support"])')
    expect(dashboardLayout).not.toContain('redirectTo: "/sign-in"')
  })

  it("blocks direct dashboard navigation from marketing nav files", () => {
    const forbiddenPatterns = [
      'href="/dashboard"',
      "href='/dashboard'",
      "href={STAFF_DASHBOARD_HREF}",
      'window.location.assign("/dashboard")',
      "window.location.assign('/dashboard')",
      'router.push("/dashboard")',
      "router.push('/dashboard')",
      "router.push(STAFF_DASHBOARD_HREF)",
      "navigate.push(STAFF_DASHBOARD_HREF)",
    ]

    for (const relativePath of marketingNavFiles) {
      const source = readFileSync(path.join(root, relativePath), "utf8")

      for (const forbiddenPattern of forbiddenPatterns) {
        expect(source, `${relativePath} must use the post-sign-in handoff, not ${forbiddenPattern}`)
          .not.toContain(forbiddenPattern)
      }
    }
  })

  it("builds the services nav from active catalog services, including women's health", () => {
    const servicesDropdown = readFileSync(path.join(root, "components/shared/navbar/services-dropdown.tsx"), "utf8")
    const activeServiceHrefs = getActiveServices().map(getServiceMarketingHref)
    const footerServiceHrefs = footerLinks.services.map((link) => link.href)

    expect(activeServiceHrefs).toContain("/womens-health")
    expect(activeServiceHrefs).toContain("/weight-loss")
    expect(footerServiceHrefs).toEqual(activeServiceHrefs)
    expect(servicesDropdown).toContain("getActiveServices().map")
    expect(servicesDropdown).toContain("getServiceMarketingHref(service)")
    expect(servicesDropdown).toContain('isActivePath("/womens-health")')
    expect(servicesDropdown).not.toContain('title: "ED Assessment"')
  })
})
