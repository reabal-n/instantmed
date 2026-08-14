import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

const migration = readFileSync(
  join(
    process.cwd(),
    "supabase/migrations/20260814183000_harden_cron_watchdog_alert_claims.sql",
  ),
  "utf8",
).toLowerCase()

describe("cron heartbeat watchdog migration", () => {
  it("keeps attempt time separate from the last successful outcome", () => {
    expect(migration).toContain(
      "add column if not exists last_success_at timestamptz",
    )
    expect(migration).toContain("set last_success_at = last_run_at")
    expect(migration).toContain("where last_status = 'ok'")
  })

  it("claims one receipt per job and continuous outage atomically", () => {
    expect(migration).toContain(
      "operational_metrics_cron_heartbeat_alert_unique",
    )
    expect(migration).toContain("create or replace function public.claim_cron_heartbeat_alerts")
    expect(migration).toContain("on conflict (")
    expect(migration).toContain("do nothing")
    expect(migration).toContain("returning")
  })

  it("durably establishes deployment grace and restricts both RPCs", () => {
    expect(migration).toContain(
      "operational_metrics_cron_watchdog_deployment_unique",
    )
    expect(migration).toContain(
      "create or replace function public.get_or_create_cron_watchdog_deployment",
    )
    expect(migration.match(/security invoker/g)).toHaveLength(2)
    expect(migration.match(/set search_path = ''/g)).toHaveLength(2)
    expect(migration).toContain(
      "revoke all on function public.get_or_create_cron_watchdog_deployment(text)",
    )
    expect(migration).toContain(
      "revoke all on function public.claim_cron_heartbeat_alerts(jsonb)",
    )
    expect(migration.match(/to service_role;/g)).toHaveLength(2)
  })
})
