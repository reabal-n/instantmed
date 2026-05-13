import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

describe("staff release gates", () => {
  const read = (file: string) => readFileSync(join(process.cwd(), file), "utf8")

  it("ships executable ops checks for staff roles and Sentry without GitHub dashboard smoke", () => {
    const pkg = JSON.parse(read("package.json")) as { scripts: Record<string, string> }

    expect(pkg.scripts["check:staff-roles"]).toBe("tsx scripts/check-staff-role-readiness.ts")
    expect(pkg.scripts["fix:staff-roles"]).toBe("tsx scripts/fix-staff-admin-roles.ts")
    expect(pkg.scripts["check:sentry"]).toBe("tsx scripts/check-sentry-access.ts")
    expect(pkg.scripts["smoke:prod-dashboard"]).toBe("node scripts/smoke-dashboard-production.mjs")
    expect(pkg.scripts["e2e:prod-dashboard"]).toBeUndefined()
    expect(existsSync(join(process.cwd(), ".github/workflows/prod-dashboard-auth-smoke.yml"))).toBe(false)
    expect(existsSync(join(process.cwd(), "e2e/prod-dashboard-auth-smoke.spec.ts"))).toBe(false)
    expect(existsSync(join(process.cwd(), "scripts/smoke-dashboard-production.mjs"))).toBe(true)
  })

  it("keeps the staff role readiness gate read-only and aligned to the owner-admin model", () => {
    const source = read("scripts/check-staff-role-readiness.ts")

    expect(source).toContain("Expected exactly one auth-linked human admin")
    expect(source).toContain("DEFAULT_OWNER_ADMIN_EMAIL")
    expect(source).toContain("provider_number")
    expect(source).toContain("ahpra_number")
    expect(source).toContain("signature_storage_path")
    expect(source).toContain("parchment_user_id")
    expect(source).toContain("doctor_available")
    expect(source).not.toContain(".update(")
    expect(source).not.toContain(".delete(")
    expect(source).not.toContain(".insert(")
    expect(source).not.toContain(".upsert(")
  })

  it("requires an explicit apply flag before staff role normalization writes to production", () => {
    const source = read("scripts/fix-staff-admin-roles.ts")

    expect(source).toContain("hasFlag(\"--apply\")")
    expect(source).toContain("No changes written")
    expect(source).toContain("DEMOTE_ADMIN_EMAILS")
    expect(source).toContain("Refusing to demote OWNER_ADMIN_EMAIL")
    expect(source).toContain("admin_change_profile_role")
    expect(source).not.toContain(".update(")
  })
})
