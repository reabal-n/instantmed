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
    expect(identitySettingsSource).toContain("supabase.auth.linkIdentity")
    expect(identitySettingsSource).toContain("Link Google")
  })

  it("makes sandbox versus production Parchment linking explicit before recording", () => {
    expect(identityPageSource).toContain("getParchmentEnvironment")
    expect(identitySettingsSource).toContain("{parchmentEnvironment.label} environment")
    expect(identitySettingsSource).toContain("production website is configured for sandbox testing")
    expect(identitySettingsSource).toContain("Production and Sandbox Parchment user IDs are separate")
    expect(identitySettingsSource).toContain("Paste ${parchmentEnvironment.label} Parchment user_id")
    expect(identitySettingsSource).toContain("Validate {parchmentEnvironmentDisplayLabel} Integration")
  })
})
