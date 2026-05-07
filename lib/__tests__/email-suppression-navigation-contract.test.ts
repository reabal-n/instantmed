import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

const root = process.cwd()

function readProjectFile(path: string): string {
  return readFileSync(join(root, path), "utf8")
}

describe("email suppression navigation contract", () => {
  it("owns suppression inside admin emails instead of the doctor portal", () => {
    expect(existsSync(join(root, "app/admin/emails/suppression/page.tsx"))).toBe(true)

    const tabsSource = readProjectFile("app/admin/emails/email-tabs-nav.tsx")
    const doctorPageSource = readProjectFile("app/doctor/email-suppression/page.tsx")

    expect(tabsSource).toContain('href: "/admin/emails/suppression"')
    expect(tabsSource).toContain('label: "Suppression"')
    expect(doctorPageSource).toContain('redirect("/admin/emails/suppression")')
    expect(doctorPageSource).not.toContain("getSuppressedEmails")
  })

  it("keeps suppression data and clearing admin-only", () => {
    const actionSource = readProjectFile("app/actions/email-suppression.ts")

    expect(actionSource).toContain('requireRole(["admin"])')
    expect(actionSource).not.toContain('requireRole(["admin", "doctor"])')
  })

  it("keeps email delivery operations admin-only", () => {
    const statsSource = readProjectFile("app/actions/email-stats.ts")

    expect(statsSource).toContain('requireRole(["admin"])')
    expect(statsSource).not.toContain('requireRole(["admin", "doctor"])')
  })

  it("points automated digest recovery links at the admin email section", () => {
    const digestSource = readProjectFile("app/api/cron/email-digest/route.ts")

    expect(digestSource).toContain("/admin/emails/suppression")
    expect(digestSource).not.toContain("/doctor/email-suppression")
  })

  it("keeps the email hub focused on hub work instead of duplicating section tabs", () => {
    const hubSource = readProjectFile("app/admin/emails/hub/email-hub-client.tsx")
    const hubPageSource = readProjectFile("app/admin/emails/hub/page.tsx")

    expect(hubSource).toContain('<TabsTrigger value="overview">Overview</TabsTrigger>')
    expect(hubSource).toContain('<TabsTrigger value="queue">Queue</TabsTrigger>')
    expect(hubSource).not.toContain('<TabsTrigger value="templates">')
    expect(hubSource).not.toContain('<TabsTrigger value="analytics">')
    expect(hubSource).not.toContain('<TabsTrigger value="settings">')
    expect(hubSource).not.toContain('href="/admin/emails/hub"')
    expect(hubSource).not.toContain("Template Settings")
    expect(hubSource).toContain("Auth recovery health")
    expect(hubSource).toContain("/email-preview/verification-code")
    expect(hubSource).toContain("/email-preview/magic-link")
    expect(hubSource).toContain("/email-preview/magic-link-recovery")
    expect(hubPageSource).toContain("authEmailHookStatus")
    expect(hubPageSource).toContain("SUPABASE_AUTH_WEBHOOK_HOOK_SECRET")
  })

  it("keeps branded magic-link and password-reset templates previewable", () => {
    const previewSource = readProjectFile("app/(dev)/email-preview/[template]/page.tsx")

    expect(previewSource).toContain('"magic-link"')
    expect(previewSource).toContain('"magic-link-recovery"')
    expect(previewSource).toContain('actionType="recovery"')
    expect(previewSource).not.toContain("Reset your password with this link:")
  })

  it("keeps the verification-code auth template previewable from the email hub", () => {
    const hubSource = readProjectFile("app/admin/emails/hub/email-hub-client.tsx")
    const previewSource = readProjectFile("app/(dev)/email-preview/[template]/page.tsx")

    expect(hubSource).toContain("Verification code template")
    expect(hubSource).toContain("Preview verification code")
    expect(previewSource).toContain('"verification-code"')
    expect(previewSource).toContain("VerificationCodeEmail")
  })
})
