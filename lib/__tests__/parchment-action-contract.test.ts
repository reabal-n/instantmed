import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

const parchmentSource = readFileSync(
  join(process.cwd(), "app/actions/parchment.ts"),
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

  it("keeps the prescribing identity blocker report aligned with sync retry eligibility", () => {
    expect(prescribingIdentityReportSource).toContain("PARCHMENT_PATIENT_SYNC_STATUSES")
    expect(prescribingIdentityReportSource).toContain(".in(\"status\", [...PARCHMENT_PATIENT_SYNC_STATUSES])")
    expect(prescribingIdentityReportSource).toContain("PARCHMENT_PRESCRIBING_CONSULT_SUBTYPES")
    expect(prescribingIdentityReportSource).toContain(".or(")
    expect(prescribingIdentityReportSource).not.toContain('.eq("category", "prescription")')
  })
})
