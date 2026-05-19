import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

const identitySettingsSource = readFileSync(
  join(process.cwd(), "app/doctor/settings/identity/identity-settings-client.tsx"),
  "utf8",
)
const identityPageSource = readFileSync(
  join(process.cwd(), "app/doctor/settings/identity/page.tsx"),
  "utf8",
)
const googleAccountLinkCardSource = readFileSync(
  join(process.cwd(), "components/account/google-account-link-card.tsx"),
  "utf8",
)

describe("doctor settings security contract", () => {
  it("routes Parchment patient-profile blockers to the exact prescriber linking section", () => {
    expect(identitySettingsSource).toContain('id="parchment-account"')
    expect(identitySettingsSource).toContain("Parchment Prescribing Account")
    expect(identitySettingsSource).toContain("This is not a per-patient step")
    expect(identityPageSource).toContain("max-w-5xl")
  })

  it("exposes real doctor account controls backed by Supabase Auth", () => {
    expect(identitySettingsSource).toContain("Account Security")
    expect(identitySettingsSource).toContain("supabase.auth.updateUser")
    expect(identitySettingsSource).toContain("Change Password")
    expect(identitySettingsSource).toContain("supabase.auth.mfa.enroll")
    expect(identitySettingsSource).toContain("supabase.auth.mfa.challengeAndVerify")
    expect(identitySettingsSource).toContain("GoogleAccountLinkCard")
    expect(googleAccountLinkCardSource).toContain("supabase.auth.linkIdentity")
    expect(googleAccountLinkCardSource).toContain("Link Google")
  })

  it("keeps certificate identity and signature in one certificate workflow", () => {
    expect(identitySettingsSource).toContain("Professional Details")
    expect(identitySettingsSource).toContain("Signature")
    expect(identitySettingsSource).toContain("certificate-identity")
    expect(identitySettingsSource).not.toContain("{/* Signature */}")
  })

  it("makes production Parchment linking explicit before prescribing", () => {
    expect(identityPageSource).toContain("getParchmentEnvironment")
    expect(identitySettingsSource).toContain("{parchmentEnvironment.label} environment")
    expect(identitySettingsSource).toContain("Production Parchment user_id for this prescriber")
    expect(identitySettingsSource).toContain("Do not paste a conformance or test user ID into production")
    expect(identitySettingsSource).toContain("Paste ${parchmentEnvironment.label} Parchment user_id")
    expect(identitySettingsSource).toContain("Validation runs automatically when you link this user and before prescribing.")
    expect(identitySettingsSource).toContain("Revalidate {parchmentEnvironmentDisplayLabel} Integration")
  })

  it("shows a compact doctor settings completion strip without adding another settings page", () => {
    expect(identitySettingsSource).toContain("settingsCompletionItems")
    expect(identitySettingsSource).toContain("Settings completion")
    expect(identitySettingsSource).toContain("Provider number")
    expect(identitySettingsSource).toContain("AHPRA")
    expect(identitySettingsSource).toContain("Signature")
    expect(identitySettingsSource).toContain("Parchment")
    expect(identitySettingsSource).toContain("MFA")
  })
})
