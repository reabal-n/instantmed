import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

const opsPageSource = readFileSync(
  join(process.cwd(), "app/admin/ops/page.tsx"),
  "utf8",
)
const adminHubZonesSource = readFileSync(
  join(process.cwd(), "components/admin/admin-hub-zones.tsx"),
  "utf8",
)
const adminSidebarSource = readFileSync(
  join(process.cwd(), "components/admin/admin-sidebar.tsx"),
  "utf8",
)
const opsClientSource = readFileSync(
  join(process.cwd(), "app/admin/ops/ops-client.tsx"),
  "utf8",
)
const legacyWebhooksPageSource = readFileSync(
  join(process.cwd(), "app/admin/webhooks/page.tsx"),
  "utf8",
)
const dashboardRoutesSource = readFileSync(
  join(process.cwd(), "lib/dashboard/routes.ts"),
  "utf8",
)

describe("ops dashboard data contract", () => {
  it("reads the real Stripe webhook dead-letter table", () => {
    expect(opsPageSource).toContain('.from("stripe_webhook_dead_letter")')
    expect(opsPageSource).not.toContain('.from("webhook_dlq")')
  })

  it("uses paid_at, not created_at, for stale paid intake monitoring", () => {
    expect(opsPageSource).toContain('.lt("paid_at"')
    expect(opsPageSource).not.toContain('.lt("created_at"')
  })

  it("surfaces durable webhook_failed audit events in ops recent errors", () => {
    expect(opsPageSource).toContain('action.ilike.%error%,action.eq.webhook_failed')
    expect(opsPageSource.indexOf('action.ilike.%error%,action.eq.webhook_failed')).toBeLessThan(
      opsPageSource.indexOf('.gte("created_at", weekAgo.toISOString())'),
    )
    expect(opsPageSource).toContain("filterNonActionableOpsErrors")
    expect(opsPageSource).toContain("no_awaiting_script_intake")
  })

  it("does not render a second navigation menu at the bottom of ops", () => {
    expect(opsClientSource).not.toContain("opsActionGroups")
    expect(opsClientSource).not.toContain("Recovery Paths")
    expect(opsClientSource).not.toContain("Clinical ops")
    expect(opsClientSource).not.toContain("Integration recovery")
    expect(opsClientSource).not.toContain("Audit and identity")
  })

  it("keeps webhook recovery on the canonical Stripe DLQ surface", () => {
    expect(adminHubZonesSource).toContain("ADMIN_WEBHOOK_DLQ_HREF")
    expect(dashboardRoutesSource).toContain('ADMIN_WEBHOOK_DLQ_HREF = "/admin/webhook-dlq"')
    expect(opsClientSource).toContain('href="/admin/webhook-dlq"')
    expect(adminHubZonesSource).not.toContain('href: "/admin/webhooks"')
    expect(adminSidebarSource).not.toContain('href: "/admin/webhooks"')
    expect(adminSidebarSource).not.toContain('href: "/admin/webhook-dlq"')

    expect(legacyWebhooksPageSource).toContain('redirect("/admin/webhook-dlq")')
    expect(legacyWebhooksPageSource).not.toContain('.from("webhook_events")')
    expect(legacyWebhooksPageSource).not.toContain('.from("webhook_dlq")')
  })
})
