import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

describe("staff release gates", () => {
  const read = (file: string) => readFileSync(join(process.cwd(), file), "utf8")

  it("ships executable ops checks for staff roles, Sentry, and production dashboard smoke", () => {
    const pkg = JSON.parse(read("package.json")) as { scripts: Record<string, string> }

    expect(pkg.scripts["check:staff-roles"]).toBe("tsx scripts/check-staff-role-readiness.ts")
    expect(pkg.scripts["fix:staff-roles"]).toBe("tsx scripts/fix-staff-admin-roles.ts")
    expect(pkg.scripts["check:sentry"]).toBe("tsx scripts/check-sentry-access.ts")
    expect(pkg.scripts["e2e:prod-dashboard"]).toContain("e2e/prod-dashboard-auth-smoke.spec.ts")
  })

  it("runs the authenticated production dashboard smoke after deploys and on a schedule", () => {
    const workflow = read(".github/workflows/prod-dashboard-auth-smoke.yml")

    expect(workflow).toContain("deployment_status")
    expect(workflow).toContain("*/15 * * * *")
    expect(workflow).toContain("secrets.DASHBOARD_SMOKE_COOKIE_HEADER")
    expect(workflow).toContain("pnpm e2e:prod-dashboard")
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

  it("requires an authenticated production cookie before claiming /dashboard is healthy", () => {
    const source = read("e2e/prod-dashboard-auth-smoke.spec.ts")

    expect(source).toContain("DASHBOARD_SMOKE_COOKIE_HEADER is required")
    expect(source).toContain("/dashboard should return 200")
    expect(source).toContain("Something went wrong")
    expect(source).toContain("Error loading dashboard")
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
