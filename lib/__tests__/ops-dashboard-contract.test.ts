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
const legacyWebhooksPageSource = readFileSync(
  join(process.cwd(), "app/admin/webhooks/page.tsx"),
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
  })

  it("keeps webhook admin navigation on the canonical Stripe DLQ surface", () => {
    expect(adminHubZonesSource).toContain('href: "/admin/webhook-dlq"')
    expect(adminSidebarSource).toContain('href: "/admin/webhook-dlq"')
    expect(adminHubZonesSource).not.toContain('href: "/admin/webhooks"')
    expect(adminSidebarSource).not.toContain('href: "/admin/webhooks"')

    expect(legacyWebhooksPageSource).toContain('redirect("/admin/webhook-dlq")')
    expect(legacyWebhooksPageSource).not.toContain('.from("webhook_events")')
    expect(legacyWebhooksPageSource).not.toContain('.from("webhook_dlq")')
  })
})
