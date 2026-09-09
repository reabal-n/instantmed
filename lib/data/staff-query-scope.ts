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
export function scopeStaffIntakes<T>(query: T, scope: StaffQueryScope): T {
  // PostgREST's recursive overloads are expensive to structurally compare with
  // this small interface. Adapt only the filter boundary, retaining the original
  // builder/result type for the caller; these filters never change its selection.
  const filters = query as unknown as StaffScopeQuery
  if (scope === "synthetic") {
    // Both markers are written by the maintained static and random E2E fixtures.
    // This isolates synthetic data, not one run; it does not repair old ciphertext.
    const marked = filters.eq("exclude_from_reporting", true) as StaffScopeQuery
    return marked.like("reference_number", "E2E-%") as T
  }

  // The resolved guard takes precedence over stray test flags on Vercel.
  return filterSeededE2EIntakes(filters, {}) as unknown as T
}
