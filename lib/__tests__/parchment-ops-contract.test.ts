import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

function readProjectFile(path: string): string {
  const fullPath = join(process.cwd(), path)
  expect(existsSync(fullPath), `${path} should exist`).toBe(true)
  return readFileSync(fullPath, "utf8")
}

function exportedActionBody(source: string, name: string): string {
  const start = source.indexOf(`export async function ${name}`)
  expect(start).toBeGreaterThanOrEqual(0)
  const nextExport = source.indexOf("\nexport async function ", start + 1)
  return source.slice(start, nextExport === -1 ? source.length : nextExport)
}

describe("Parchment ops dashboard and retry contract", () => {
  it("exposes a focused admin Parchment ops page with retryable webhook failures", () => {
    const pageSource = readProjectFile("app/admin/ops/parchment/page.tsx")
    const retryButtonSource = readProjectFile("app/admin/ops/parchment/retry-webhook-button.tsx")
    const copyTokenSource = readProjectFile("app/admin/ops/parchment/copy-token-button.tsx")
    const opsSource = readProjectFile("lib/parchment/ops.ts")
    const parchmentClaimSource = readProjectFile("lib/doctor/parchment-claim.ts")

    expect(pageSource).toContain("getParchmentOpsDashboard")
    expect(pageSource).toContain("Parchment Ops")
    expect(pageSource).toContain("Parchment handoff recovery")
    expect(pageSource).toContain("Stale script handoffs, failed SSO, and patient sync issues")
    expect(pageSource).toContain("Production prescribing gate")
    expect(pageSource).toContain("Daily smoke")
    expect(pageSource).toContain("Webhook retry work")
    expect(pageSource).toContain("Failed Parchment webhooks that still need staff attention")
    expect(pageSource).toContain("Historical webhook noise")
    expect(pageSource).toContain("Latest processed events that prove the integration is alive.")
    expect(pageSource).toContain("No failed Parchment webhooks need recovery.")
    expect(pageSource).not.toContain("Actionable failures")
    expect(pageSource).toContain("RetryParchmentWebhookButton")
    expect(pageSource).toContain("Recent webhook evidence")
    expect(pageSource).toContain("CopyTokenButton")
    expect(pageSource).toContain("handoffRecovery.length > 0 || dashboard.stats.unlinkedPrescribers > 0")
    expect(pageSource).toContain("dashboard.handoffRecovery")
    expect(pageSource).not.toContain("dashboard.stats.unsyncedPatients > 0")

    expect(retryButtonSource).toContain("retryParchmentWebhookFailureAction")
    expect(retryButtonSource).toContain("Retry sync")

    expect(copyTokenSource).toContain("navigator.clipboard.writeText")
    expect(copyTokenSource).toContain("Copy")

    expect(opsSource).toContain("getParchmentOpsDashboard")
    expect(opsSource).toContain("ParchmentOpsEvent")
    expect(opsSource).toContain("recentEvents")
    expect(opsSource).toContain("isPrescribingCapableProfile")
    expect(opsSource).toContain("SYSTEM_AUTO_APPROVE_ID")
    expect(opsSource).toContain("SYSTEM_ADMIN_EMAILS")
    expect(opsSource).toContain("system@instantmed.com.au")
    expect(opsSource).toContain("auth_user_id")
    expect(opsSource).toContain("isSystemProfile")
    expect(opsSource).toContain("can_prescribe_s4")
    expect(opsSource).toContain("can_prescribe_s8")
    expect(opsSource).toContain("NON_ACTIONABLE_WEBHOOK_FAILURE_REASONS")
    expect(opsSource).toContain("historicalWebhookFailures")
    expect(opsSource).toContain("productionSmoke")
    expect(opsSource).toContain('eq("job_name", "parchment-smoke")')
    expect(opsSource).toContain("ParchmentHandoffRecoveryItem")
    expect(opsSource).toContain("handoffRecovery")
    expect(opsSource).toContain('eq("status", "awaiting_script")')
    expect(opsSource).toContain('eq("status", "approved")')
    expect(opsSource).toContain('is("parchment_reference", null)')
    expect(opsSource).toContain("PARCHMENT_PRESCRIBING_CONSULT_SUBTYPES")
    expect(parchmentClaimSource).toContain("womens_health")
    expect(opsSource).toContain("Approved script missing")
    expect(opsSource).toContain("approved_at")
    expect(opsSource).toContain("actionableFailures")
    expect(opsSource).toContain('event.status !== "destructive"')
    expect(opsSource).toContain("parchment_webhook_prescription_synced")
    expect(opsSource).toContain("retryable")
    expect(opsSource).toContain("prescription_sync_failed")
    expect(opsSource).toContain("prescriber_not_linked")
  })

  it("keeps failed Parchment webhook retry as an admin-only, rate-limited recovery action", () => {
    const actionSource = readProjectFile("app/actions/parchment-ops.ts")
    const body = exportedActionBody(actionSource, "retryParchmentWebhookFailureAction")

    expect(body).toContain('requireRoleOrNull(["admin"])')
    expect(body).toContain("checkServerActionRateLimit(")
    expect(body).toContain("`parchment:webhook-retry:${authResult.profile.id}`")
    expect(body.indexOf("checkServerActionRateLimit(")).toBeLessThan(
      body.indexOf("const supabase = createServiceRoleClient()"),
    )
    expect(body).toContain("syncParchmentPrescriptionToPms(")
    expect(body).toContain('action_type: "parchment_webhook_retry"')
    // Phase 1.3 of dashboard remaster (2026-05-11): hardcoded revalidatePath
    // calls were migrated to the central revalidateStaff helper. Ops surfaces
    // (including /admin/ops/parchment) are invalidated via { ops: true }.
    expect(body).toContain("revalidateStaff(")
    expect(body).toMatch(/revalidateStaff\([\s\S]*ops:\s*true/)
  })

  it("stores enough non-PHI webhook metadata for future Parchment prescription retries", () => {
    const webhookSource = readProjectFile("app/api/webhooks/parchment/route.ts")
    const auditSource = readProjectFile("lib/security/audit-log.ts")

    expect(auditSource).toContain("extraMetadata")
    expect(webhookSource).toContain("buildParchmentWebhookFailureMetadata")
    expect(webhookSource).toContain("scid")
    expect(webhookSource).toContain("parchment_patient_id")
    expect(webhookSource).toContain("prescriber_user_id")
    expect(webhookSource).toContain("patient_profile_id")
  })
})
