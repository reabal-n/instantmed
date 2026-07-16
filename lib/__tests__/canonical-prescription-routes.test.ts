import { existsSync, readFileSync } from "node:fs"
import path from "node:path"

import { describe, expect, it } from "vitest"

const root = process.cwd()

describe("legacy prescription routes", () => {
  it("routes repeat prescription entry points to the canonical request flow", () => {
    const nextConfig = readFileSync(path.join(root, "next.config.mjs"), "utf8")

    expect(existsSync(path.join(root, "app/prescriptions/repeat/page.tsx"))).toBe(false)
    expect(existsSync(path.join(root, "app/prescriptions/[subtype]/page.tsx"))).toBe(false)
    expect(nextConfig).toContain('source: "/prescriptions/repeat"')
    expect(nextConfig).toContain('source: "/prescriptions/repeat-script"')
    expect(nextConfig).toContain('source: "/prescriptions/chronic"')
    expect(nextConfig).toContain('destination: "/request?service=repeat-script"')
    expect(nextConfig).toContain('source: "/prescriptions/new-medication"')
    expect(nextConfig).toContain('destination: "/consult"')
    expect(nextConfig).toContain('source: "/prescriptions/:subtype"')
  })

  it("does not route prescription marketing CTAs into retired bare consult intake", () => {
    const prescriptionsLanding = readFileSync(
      path.join(root, "components/marketing/prescriptions-landing.tsx"),
      "utf8",
    )
    const nextConfig = readFileSync(path.join(root, "next.config.mjs"), "utf8")

    expect(prescriptionsLanding).not.toContain("/request?service=consult")
    expect(prescriptionsLanding).toContain('ctaHref: "/request?service=repeat-script"')
    expect(prescriptionsLanding).toContain(
      'href: isDisabled ? "/contact" : "/request?service=repeat-script"',
    )
    expect(prescriptionsLanding).toContain(
      "For new medicines or complex care, see your regular GP.",
    )
    expect(nextConfig).not.toContain('destination: "/request?service=consult"')
  })

  it("retires the legacy repeat_rx_requests API and doctor review stack", () => {
    const fraudDetector = readFileSync(path.join(root, "lib/security/fraud-detector.ts"), "utf8")
    const scriptTasks = readFileSync(path.join(root, "lib/data/script-tasks.ts"), "utf8")
    const nextConfig = readFileSync(path.join(root, "next.config.mjs"), "utf8")

    expect(nextConfig).toContain('source: "/doctor/repeat-rx"')
    expect(nextConfig).toContain('source: "/doctor/repeat-rx/:path*"')
    // Phase 2 of dashboard remaster (2026-05-12): /doctor/dashboard 307s
    // to /dashboard. The repeat-rx redirect now points at /dashboard
    // directly to skip the double-hop.
    expect(nextConfig).toContain('destination: "/dashboard"')
    expect(existsSync(path.join(root, "app/doctor/repeat-rx/page.tsx"))).toBe(false)
    expect(existsSync(path.join(root, "app/doctor/repeat-rx/[id]/page.tsx"))).toBe(false)
    expect(existsSync(path.join(root, "app/api/repeat-rx/submit/route.ts"))).toBe(false)
    expect(existsSync(path.join(root, "app/api/repeat-rx/[id]/decision/route.ts"))).toBe(false)
    expect(existsSync(path.join(root, "lib/data/repeat-rx.ts"))).toBe(false)
    expect(fraudDetector).not.toContain('.from("repeat_rx_requests")')
    expect(fraudDetector).toContain('.from("intakes")')
    expect(fraudDetector).toContain('.from("intake_answers")')
    expect(scriptTasks).not.toContain("repeat_rx_request_id")
    expect(scriptTasks).not.toContain("createScriptTask")
  })

  it("removes the legacy inline auth and onboarding stack with its retired route", () => {
    expect(existsSync(path.join(root, "components/shared/inline-auth-step.tsx"))).toBe(false)
    expect(existsSync(path.join(root, "components/shared/inline-onboarding-step.tsx"))).toBe(false)
  })
})
