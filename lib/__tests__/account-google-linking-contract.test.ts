import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

function readIfExists(path: string): string {
  const fullPath = join(process.cwd(), path)
  return existsSync(fullPath) ? readFileSync(fullPath, "utf8") : ""
}

const googleLinkCardSource = readIfExists("components/account/google-account-link-card.tsx")
const doctorSettingsSource = readIfExists("app/doctor/settings/identity/identity-settings-client.tsx")
const patientSettingsSource = readIfExists("app/patient/settings/settings-client.tsx")
const adminSettingsSource = readIfExists("app/admin/settings/page.tsx")
const signInSource = readIfExists("app/sign-in/[[...sign-in]]/page.tsx")
const signUpSource = readIfExists("app/sign-up/[[...sign-up]]/page.tsx")
const inlineAuthSource = readIfExists("components/shared/inline-auth-step.tsx")

describe("account Google linking UX contract", () => {
  it("uses one branded Google linking card across doctor, admin, and patient settings", () => {
    expect(googleLinkCardSource).toContain("GoogleIcon")
    expect(googleLinkCardSource).toContain("supabase.auth.linkIdentity")
    expect(googleLinkCardSource).toContain('provider: "google"')
    expect(googleLinkCardSource).toContain("redirectTo")
    expect(googleLinkCardSource).toContain("Google connected")

    expect(doctorSettingsSource).toContain("GoogleAccountLinkCard")
    expect(doctorSettingsSource).toContain('redirectPath="/doctor/settings/identity#account-security"')

    expect(patientSettingsSource).toContain("GoogleAccountLinkCard")
    expect(patientSettingsSource).toContain('redirectPath="/patient/settings?tab=preferences#account-security"')

    expect(adminSettingsSource).toContain("GoogleAccountLinkCard")
    expect(adminSettingsSource).toContain('redirectPath="/admin/settings#account-security"')
  })

  it("shows patient account completion without creating another settings surface", () => {
    expect(patientSettingsSource).toContain("patientSettingsCompletionItems")
    expect(patientSettingsSource).toContain("Account completion")
    expect(patientSettingsSource).toContain("Phone")
    expect(patientSettingsSource).toContain("Date of birth")
    expect(patientSettingsSource).toContain("Home address")
    expect(patientSettingsSource).toContain("Medicare")
    expect(patientSettingsSource).toContain("Google sign-in")
  })

  it("lets patients manage account email without support and warns on unsaved settings", () => {
    expect(patientSettingsSource).toContain("supabase.auth.updateUser")
    expect(patientSettingsSource).toContain("handleEmailChange")
    expect(patientSettingsSource).toContain("Email changes need confirmation")
    expect(patientSettingsSource).toContain("pendingAccountEmail")
    expect(patientSettingsSource).toContain("Email change pending")
    expect(patientSettingsSource).toContain("Check that inbox to confirm")
    expect(patientSettingsSource).toContain("patientSettingsDirty")
    expect(patientSettingsSource).toContain("beforeunload")
    expect(patientSettingsSource).toContain("Unsaved settings changes")
    expect(patientSettingsSource).not.toContain("Contact support to change your email")
  })

  it("shows patients lightweight account security context beside Google linking", () => {
    expect(patientSettingsSource).toContain("linkedAuthProviders")
    expect(patientSettingsSource).toContain("Linked providers")
    expect(patientSettingsSource).toContain("Last sign-in")
    expect(patientSettingsSource).toContain("lastSignInLabel")
    expect(patientSettingsSource).toContain("user?.last_sign_in_at")
  })

  it("keeps Google OAuth artwork canonical instead of duplicating inline SVGs", () => {
    expect(signInSource).toContain('import { GoogleIcon } from "@/components/icons/google-icon"')
    expect(signUpSource).toContain('import { GoogleIcon } from "@/components/icons/google-icon"')
    expect(inlineAuthSource).toContain('import { GoogleIcon } from "@/components/icons/google-icon"')

    expect(signInSource).not.toContain("function GoogleIcon")
    expect(signUpSource).not.toContain("function GoogleIcon")
    expect(inlineAuthSource).not.toContain("function GoogleIcon")
  })
})
