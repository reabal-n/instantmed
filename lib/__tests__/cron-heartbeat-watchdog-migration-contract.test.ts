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

const outcomeMigration = readFileSync(
  join(
    process.cwd(),
    "supabase/migrations/20260814185000_record_truthful_cron_outcomes.sql",
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

  it("atomically separates invocation, recovery, and failure outcomes", () => {
    expect(outcomeMigration).toContain(
      "add column if not exists last_failure_at timestamptz",
    )
    expect(outcomeMigration).toContain(
      "create or replace function public.record_cron_heartbeat_outcome",
    )
    expect(outcomeMigration).toContain(
      "failed_outcome := not p_rearm_outage and p_status <> 'skipped'",
    )
    expect(outcomeMigration).toContain("on conflict (job_name) do update")
    expect(outcomeMigration).toContain(
      "run_count = case",
    )
    expect(outcomeMigration).toContain(
      "when heartbeat.run_count < 9223372036854775807::bigint",
    )
    expect(outcomeMigration).toContain(
      "create or replace function public.increment_cron_run_count()",
    )
    expect(outcomeMigration).toContain(
      "and old.run_count < 9223372036854775807::bigint",
    )
    expect(outcomeMigration).toContain(
      "when p_rearm_outage then excluded.last_run_at",
    )
    expect(outcomeMigration).toContain("security invoker")
    expect(outcomeMigration).toContain("set search_path = ''")
    expect(outcomeMigration).toContain(
      "revoke all on function public.record_cron_heartbeat_outcome(text, text, integer, integer, boolean)",
    )
    expect(outcomeMigration).toContain("to service_role;")
  })

  it("does not count the failure-boundary backfill as a cron invocation", () => {
    const triggerDefinition = outcomeMigration.indexOf(
      "create or replace function public.increment_cron_run_count()",
    )
    const failureBackfill = outcomeMigration.indexOf(
      "update public.cron_heartbeats",
    )

    expect(triggerDefinition).toBeGreaterThan(-1)
    expect(failureBackfill).toBeGreaterThan(triggerDefinition)
    expect(outcomeMigration).toContain(
      "when new.last_run_at is distinct from old.last_run_at",
    )
    expect(outcomeMigration).toContain(
      "else old.run_count",
    )
  })
})
