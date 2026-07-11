import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

function readProjectFile(path: string): string {
  return readFileSync(join(process.cwd(), path), "utf8")
}

const PATIENT_API_SURFACES = [
  "app/api/patient/certificates/[id]/download/route.ts",
  "app/api/patient/documents/[intakeId]/download/route.ts",
  "app/api/patient/download-invoice/route.ts",
  "app/api/patient/get-invoices/route.ts",
  "app/api/patient/health-profile/route.ts",
  "app/api/patient/intake-status/route.ts",
  "app/api/patient/messages/route.ts",
  "app/api/patient/nav-counts/route.ts",
  "app/api/patient/profile/route.ts",
  "app/api/patient/referral/route.ts",
  "app/api/patient/resend-confirmation/route.ts",
  "app/api/patient/retry-payment/route.ts",
] as const

describe("closed-account patient access boundary", () => {
  it.each(PATIENT_API_SURFACES)(
    "%s resolves the patient through the shared closed-account-aware API guard",
    (path) => {
      const source = readProjectFile(path)

      expect(source).toContain("getApiAuth")
      expect(source).toContain("await getApiAuth()")
      expect(source).not.toContain("await auth()")
    },
  )

  it.each([
    "app/api/search/route.ts",
    "app/api/stripe/verify-payment/route.ts",
  ])("%s uses the shared guard before service-role patient access", (path) => {
    const source = readProjectFile(path)
    const authIndex = source.indexOf("await getApiAuth()")
    const serviceRoleIndex = source.indexOf("createServiceRoleClient()")

    expect(authIndex).toBeGreaterThan(-1)
    expect(serviceRoleIndex).toBeGreaterThan(-1)
    expect(authIndex).toBeLessThan(serviceRoleIndex)
    expect(source).not.toContain("await auth()")
  })

  it("keeps the mixed-role certificate route behind the same closed-account-aware guard", () => {
    const source = readProjectFile("app/api/certificates/[id]/download/route.ts")

    expect(source).toContain("await getApiAuth()")
    expect(source).not.toContain("await auth()")
  })

  it.each([
    "app/actions/account.ts",
    "app/actions/profile-todo.ts",
    "app/patient/onboarding/actions.ts",
  ])("%s does not authorize patient mutations from raw auth IDs", (path) => {
    const source = readProjectFile(path)

    expect(source).toContain("getAuthenticatedUserWithProfile")
    expect(source).not.toContain("await auth()")
  })

  it.each([
    "app/actions/ensure-profile.ts",
    "app/api/profile/ensure/route.ts",
  ])("%s refuses a retained closed-account tombstone", (path) => {
    const source = readProjectFile(path)

    expect(source).toContain("hasClosedAuthAccountTombstone")
  })

  it("keeps the legacy current-profile helper closed-account-aware", () => {
    const source = readProjectFile("lib/data/profiles.ts")
    const helperStart = source.indexOf("export async function getCurrentProfile")
    const nextHelperStart = source.indexOf("export async function getProfileById", helperStart)
    const helperSource = source.slice(helperStart, nextHelperStart)

    expect(helperSource).toContain('.is("account_closed_at", null)')
  })

  it("gives the closed-account route its own patient-facing metadata", () => {
    const pageSource = readProjectFile("app/auth/account-closed/page.tsx")
    const clientSource = readProjectFile("app/auth/account-closed/account-closed-client.tsx")

    expect(pageSource).toContain('title: "Account closed"')
    expect(pageSource).toContain("<AccountClosedClient />")
    expect(clientSource).toContain('signOut({ scope: "local" })')
    expect(clientSource).toContain("clearInstantMedBrowserCaches()")
  })
})
