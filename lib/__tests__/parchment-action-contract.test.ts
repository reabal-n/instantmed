import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

const parchmentSource = readFileSync(
  join(process.cwd(), "app/actions/parchment.ts"),
  "utf8",
)
const parchmentClientSource = readFileSync(
  join(process.cwd(), "lib/parchment/client.ts"),
  "utf8",
)
const prescribingIdentityReportSource = readFileSync(
  join(process.cwd(), "lib/doctor/patient-identity-report.ts"),
  "utf8",
)

function functionBody(name: string): string {
  const start = parchmentSource.indexOf(`export async function ${name}`)
  expect(start).toBeGreaterThanOrEqual(0)

  const nextExport = parchmentSource.indexOf("\nexport async function ", start + 1)
  return parchmentSource.slice(start, nextExport === -1 ? parchmentSource.length : nextExport)
}

describe("Parchment action production contract", () => {
  it("rate limits Parchment SSO generation before integration work", () => {
    const body = functionBody("getParchmentPrescribeUrlAction")

    expect(parchmentSource).toContain('from "@/lib/rate-limit/redis"')
    expect(body).toContain("checkServerActionRateLimit(")
    expect(body).toContain("`parchment:sso:${authResult.profile.id}`")
    expect(body.indexOf("checkServerActionRateLimit(")).toBeLessThan(
      body.indexOf("const flags = await getFeatureFlags()"),
    )
  })

  it("keeps manual Parchment patient sync as an admin-only recovery action", () => {
    const body = functionBody("retryParchmentPatientSyncAction")

    expect(body).toContain('requireRoleOrNull(["admin"])')
    expect(body).not.toContain('requireRoleOrNull(["doctor", "admin"])')
  })

  it("does not sync patients with the current admin's Parchment account", () => {
    const body = functionBody("retryParchmentPatientSyncAction")

    expect(body).toContain("getParchmentPrescriberCandidateIds(intake)")
    expect(body).not.toContain("authResult.profile.parchment_user_id")
  })

  it("rate limits manual Parchment patient sync before reading patient data", () => {
    const body = functionBody("retryParchmentPatientSyncAction")

    expect(body).toContain("checkServerActionRateLimit(")
    expect(body).toContain("`parchment:sync-retry:${authResult.profile.id}`")
    expect(body.indexOf("checkServerActionRateLimit(")).toBeLessThan(
      body.indexOf("const supabase = createServiceRoleClient()"),
    )
  })

  it("records prescribing-boundary evidence before returning an SSO URL", () => {
    const body = functionBody("getParchmentPrescribeUrlAction")

    expect(parchmentSource).toContain("logNoPrescribingInPlatform")
    expect(body).toContain("await logNoPrescribingInPlatform(")
    expect(body.indexOf("await logNoPrescribingInPlatform(")).toBeLessThan(
      body.indexOf('log.info("Parchment prescribe URL generated")'),
    )
  })

  it("validates the linked Parchment user before intake prescribing handoff", () => {
    const body = functionBody("getParchmentPrescribeUrlAction")

    expect(body).toContain("await validateIntegration(doctorProfile.parchment_user_id)")
    expect(body.indexOf("await validateIntegration(doctorProfile.parchment_user_id)")).toBeLessThan(
      body.indexOf("syncPatientToParchment("),
    )
    expect(body.indexOf("await validateIntegration(doctorProfile.parchment_user_id)")).toBeLessThan(
      body.indexOf("getSsoUrl("),
    )
  })

  it("keeps the prescribing identity blocker report aligned with sync retry eligibility", () => {
    expect(prescribingIdentityReportSource).toContain("PARCHMENT_PATIENT_SYNC_STATUSES")
    expect(prescribingIdentityReportSource).toContain(".in(\"status\", [...PARCHMENT_PATIENT_SYNC_STATUSES])")
    expect(prescribingIdentityReportSource).toContain("PARCHMENT_PRESCRIBING_CONSULT_SUBTYPES")
    expect(prescribingIdentityReportSource).toContain(".or(")
    expect(prescribingIdentityReportSource).not.toContain('.eq("category", "prescription")')
  })

  it("keeps Parchment user lifecycle conformance as an admin-only, rate-limited action", () => {
    const body = functionBody("runParchmentConformanceUserStepAction")

    expect(body).toContain('requireRoleOrNull(["admin"])')
    expect(body).toContain("checkServerActionRateLimit(")
    expect(body).toContain("`parchment:user-lifecycle:${authResult.profile.id}`")
    expect(body.indexOf("checkServerActionRateLimit(")).toBeLessThan(
      body.indexOf("const callerParchmentUserId"),
    )
  })

  it("labels the active Parchment environment without exposing credentials", () => {
    const start = parchmentClientSource.indexOf("export function getParchmentEnvironment()")
    const end = parchmentClientSource.indexOf("// ============================================================================\n// TOKEN CACHE", start)
    const body = parchmentClientSource.slice(start, end)

    expect(parchmentClientSource).toContain("export function getParchmentEnvironment()")
    expect(body).toContain('apiHost.includes("sandbox")')
    expect(body).toContain('label: environment === "sandbox" ? "Sandbox"')
    expect(body).not.toContain("partnerSecret")
    expect(body).not.toContain("organizationSecret")
  })

  it("blocks linking one sandbox or production Parchment user to multiple InstantMed profiles", () => {
    const body = functionBody("linkParchmentUserAction")

    expect(body).toContain("getParchmentEnvironment()")
    expect(body).toContain('.eq("parchment_user_id", trimmedUserId)')
    expect(body).toContain('.neq("id", authResult.profile.id)')
    expect(body).toContain(".maybeSingle()")
    expect(body).toContain("already linked to another InstantMed profile")
    expect(body).toContain("Could not validate this user_id")
  })

  it("does not fall back to a setup user when listing Parchment users", () => {
    const body = functionBody("listParchmentUsersAction")

    expect(body).toContain("authResult.profile.parchment_user_id?.trim()")
    expect(body).toContain("Link your Parchment user_id manually before loading the organization user list.")
    expect(body).toContain("listUsers(callerParchmentUserId)")
    expect(body).not.toContain("listUsers(authResult.profile.parchment_user_id ?? undefined)")
  })
})
