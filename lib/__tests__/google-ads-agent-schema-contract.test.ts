import { existsSync, readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

const migrationPath = join(
  process.cwd(),
  "supabase/migrations/20260727180000_google_ads_agent_control_plane.sql",
)
const sql = existsSync(migrationPath) ? readFileSync(migrationPath, "utf8") : ""
const migrationDirectory = join(process.cwd(), "supabase/migrations")
const intakeFeeMigrationName = readdirSync(migrationDirectory).find((name) =>
  name.endsWith("_google_ads_fee_cache_on_intakes.sql"),
)
const intakeFeeSql = intakeFeeMigrationName
  ? readFileSync(join(migrationDirectory, intakeFeeMigrationName), "utf8")
  : ""

describe("Google Ads Agent control-plane migration", () => {
  it("creates service-role-only Ads Agent state", () => {
    expect(sql).toContain("create table public.google_ads_agent_runs")
    expect(sql).toContain("report_date date not null unique")
    expect(sql).toContain("create table public.google_ads_change_proposals")
    expect(sql).toContain("create table public.google_ads_experiments")
    expect(sql).toContain("enable row level security")
    expect(sql).not.toMatch(/create policy/i)
  })

  it("persists replay-safe proposals and fee truth", () => {
    expect(sql).toContain("telegram_update_id bigint unique")
    expect(sql).toContain("telegram_callback_query_hash text unique")
    expect(sql).toContain("stripe_balance_transaction_id text")
    expect(sql).toContain("stripe_fee_cents integer")
    expect(sql).toContain("stripe_fee_synced_at timestamptz")
  })

  it("keeps browser roles out and avoids PHI-bearing control-plane columns", () => {
    expect(sql).toContain("revoke all on table public.google_ads_agent_runs")
    expect(sql).toContain("from public, anon, authenticated")
    expect(sql).toContain("to service_role")
    expect(sql).not.toMatch(
      /\b(patient_id|search_query|clinical_answers?|medication_name|gclid|gbraid|wbraid)\b/i,
    )
  })

  it("caches fee truth on the intake that owns the current PaymentIntent", () => {
    expect(intakeFeeSql).toContain("alter table public.intakes")
    expect(intakeFeeSql).toContain("stripe_balance_transaction_id text")
    expect(intakeFeeSql).toContain("stripe_fee_cents integer")
    expect(intakeFeeSql).toContain("stripe_fee_synced_at timestamptz")
    expect(intakeFeeSql).not.toMatch(/drop\s+(column|table)/i)
  })
})
