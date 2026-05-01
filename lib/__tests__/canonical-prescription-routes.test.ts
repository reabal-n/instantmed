import { existsSync, readFileSync } from "node:fs"
import path from "node:path"

import { describe, expect, it } from "vitest"

const root = process.cwd()

describe("legacy prescription routes", () => {
  it("routes repeat prescription entry points to the canonical request flow", () => {
    const repeatPage = readFileSync(path.join(root, "app/prescriptions/repeat/page.tsx"), "utf8")
    const subtypePage = readFileSync(path.join(root, "app/prescriptions/[subtype]/page.tsx"), "utf8")

    expect(repeatPage).toContain("redirect(\"/request?service=repeat-script\")")
    expect(subtypePage).toContain("repeat: \"repeat-script\"")
    expect(subtypePage).not.toContain("repeat: \"prescription\"")
  })

  it("retires the legacy repeat_rx_requests API and doctor review stack", () => {
    const fraudDetector = readFileSync(path.join(root, "lib/security/fraud-detector.ts"), "utf8")
    const scriptTasks = readFileSync(path.join(root, "lib/data/script-tasks.ts"), "utf8")
    const nextConfig = readFileSync(path.join(root, "next.config.mjs"), "utf8")

    expect(nextConfig).toContain('source: "/doctor/repeat-rx"')
    expect(nextConfig).toContain('source: "/doctor/repeat-rx/:path*"')
    expect(nextConfig).toContain('destination: "/doctor/dashboard"')
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
})
