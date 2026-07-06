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
    expect(existsSync(join(root, "app/doctor/email-suppression/page.tsx"))).toBe(false)

    const hubSource = readProjectFile("app/admin/emails/hub/email-hub-client.tsx")
    const nextConfigSource = readProjectFile("next.config.mjs")

    expect(hubSource).toContain("ADMIN_EMAIL_SUPPRESSION_HREF")
    expect(nextConfigSource).toContain('source: "/doctor/email-suppression"')
    expect(nextConfigSource).toContain('destination: "/admin/emails/suppression"')
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

  it("keeps retired digest routes out of the active cron surface", () => {
    expect(existsSync(join(root, "app/api/cron/email-digest/route.ts"))).toBe(false)
    expect(existsSync(join(root, "app/api/cron/daily-digest/route.ts"))).toBe(false)
  })

  it("keeps Email delivery focused on delivery work instead of duplicating section tabs", () => {
    const hubSource = readProjectFile("app/admin/emails/hub/email-hub-client.tsx")
    const hubPageSource = readProjectFile("app/admin/emails/hub/page.tsx")

    expect(hubSource).toContain('<TabsTrigger value="overview">Overview</TabsTrigger>')
    expect(hubSource).toContain('<TabsTrigger value="queue">Queue</TabsTrigger>')
    expect(hubSource).not.toContain('<TabsTrigger value="templates">')
    expect(hubSource).not.toContain('<TabsTrigger value="analytics">')
    expect(hubSource).not.toContain('<TabsTrigger value="settings">')
    expect(hubSource).not.toContain('href="/admin/emails/analytics"')
    expect(hubSource).not.toContain('href="/admin/emails/preview"')
    expect(hubSource).not.toContain('href="/admin/emails/hub"')
    expect(hubSource).not.toContain("Template Settings")
    expect(hubSource).toContain("Email delivery controls")
    expect(hubSource).toContain("Auth recovery")
    // verification-code preview retired with its template (Wave 2, 2026-07-06);
    // the live auth flow is magic-link only.
    expect(hubSource).not.toContain("/email-preview/verification-code")
    expect(hubSource).toContain("/email-preview/magic-link")
    expect(hubSource).not.toContain("/email-preview/magic-link-recovery")
    expect(hubPageSource).toContain("authEmailHookStatus")
    expect(hubPageSource).toContain("SUPABASE_AUTH_WEBHOOK_HOOK_SECRET")
  })

  it("keeps email editing out of clinic setup", () => {
    const settingsSource = readProjectFile("app/admin/settings/page.tsx")
    const certificateDetailsSource = readProjectFile("app/admin/settings/templates/certificate-details-client.tsx")

    expect(settingsSource).not.toContain("ADMIN_EMAIL_TEMPLATE_EDITOR_HREF")
    expect(settingsSource).not.toContain("ADMIN_EMAIL_SUPPRESSION_HREF")
    expect(settingsSource).not.toContain("/admin/emails/templates")
    expect(settingsSource).not.toContain("/admin/emails/suppression")
    expect(settingsSource).toContain("Delivery controls live in Email delivery")
    expect(certificateDetailsSource).toContain("Email templates live in Email delivery")
  })

  it("keeps branded magic-link and password-reset templates previewable", () => {
    const previewSource = readProjectFile("app/(dev)/email-preview/[template]/page.tsx")

    expect(previewSource).toContain('"magic-link"')
    expect(previewSource).toContain('"magic-link-recovery"')
    expect(previewSource).toContain('actionType="recovery"')
    expect(previewSource).not.toContain("Reset your password with this link:")
  })

  it("keeps the magic-link auth template previewable from Email delivery", () => {
    // The verification-code template was removed in the 2026-07-06 email Wave 2
    // cleanup — the live auth flow sends magic-link (link-based), never an OTP
    // code email — so only the magic-link preview affordance remains.
    const hubSource = readProjectFile("app/admin/emails/hub/email-hub-client.tsx")
    const previewSource = readProjectFile("app/(dev)/email-preview/[template]/page.tsx")

    expect(hubSource).toContain("Magic-link preview")
    expect(hubSource).not.toContain("Verification preview")
    expect(previewSource).toContain('"magic-link"')
    expect(previewSource).not.toContain("VerificationCodeEmail")
  })
})
