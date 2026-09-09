import "server-only"

import { filterSeededE2EIntakes } from "@/lib/data/seeded-e2e-data"
import { isE2ETestModeEnabled } from "@/lib/dev-only-routes"

export type StaffQueryScope = "ordinary" | "synthetic"

export function getStaffQueryScope(): StaffQueryScope {
  return isE2ETestModeEnabled() ? "synthetic" : "ordinary"
}

type StaffScopeQuery = {
  eq(column: string, value: boolean): unknown
  like(column: string, pattern: string): unknown
  not(column: string, operator: string, value: string): unknown
}

/** Restrict test reads in SQL, before fetching any identity or answer fields. */
export function scopeStaffIntakes<T extends StaffScopeQuery>(query: T, scope: StaffQueryScope): T {
  if (scope === "synthetic") {
    // Both markers are written by the maintained static and random E2E fixtures.
    // This isolates synthetic data, not one run; it does not repair old ciphertext.
    const marked = query.eq("exclude_from_reporting", true) as T
    return marked.like("reference_number", "E2E-%") as T
  }

  // The resolved guard takes precedence over stray test flags on Vercel.
  return filterSeededE2EIntakes(query, {})
}
