import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

const migration = readFileSync(
  join(
    process.cwd(),
    "supabase/migrations/20260723170000_create_operational_metrics.sql",
  ),
  "utf8",
)
  .toLowerCase()
  .replace(/\s+/g, " ")

describe("operational metrics migration", () => {
  it("creates the missing aggregate-only metrics table and lookup index", () => {
    expect(migration).toContain(
      "create table if not exists public.operational_metrics",
    )
    expect(migration).toContain(
      "id uuid primary key default gen_random_uuid()",
    )
    expect(migration).toContain("metric_name text not null")
    expect(migration).toContain("metric_value numeric not null")
    expect(migration).toContain(
      "dimensions jsonb not null default '{}'::jsonb",
    )
    expect(migration).toContain(
      "recorded_at timestamptz not null default now()",
    )
    expect(migration).toContain(
      "create index if not exists idx_metrics_name_time on public.operational_metrics(metric_name, recorded_at desc)",
    )
  })

  it("keeps direct browser roles out and grants only required service-role access", () => {
    expect(migration).toContain(
      "alter table public.operational_metrics enable row level security",
    )
    expect(migration).toContain(
      'drop policy if exists "operational_metrics_admin" on public.operational_metrics',
    )
    expect(migration).toContain(
      "revoke all on table public.operational_metrics from public, anon, authenticated, service_role",
    )
    expect(migration).toContain(
      "grant select, insert on table public.operational_metrics to service_role",
    )
    expect(migration).not.toContain("create policy")
  })
})
