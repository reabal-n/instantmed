export const SEEDED_E2E_PATIENT_PROFILE_ID = "e2e00000-0000-0000-0000-000000000002"

const SEEDED_E2E_PATIENT_FILTER = `(${SEEDED_E2E_PATIENT_PROFILE_ID})`

type PatientFilterQuery = {
  not(column: string, operator: string, value: string): unknown
}

type E2EEnv = Partial<Record<"PLAYWRIGHT" | "E2E" | "E2E_MODE" | "NODE_ENV", string>>

/**
 * Optional override the admin test-data toggle uses to opt one
 * specific data read in to seeing the seed patient. Set
 * `allowSeeded: true` from a server-side page that already verified
 * `hasAdminAccess(profile)` AND saw the `?showTestData=1` query
 * param. Without an explicit override, the env-based filter is the
 * only path that can show seeded data — keeps the boundary tight.
 */
export interface SeededE2EFilterOptions {
  allowSeeded?: boolean
}

export function shouldIncludeSeededE2EData(
  envOrOptions: E2EEnv | SeededE2EFilterOptions = process.env,
  maybeOptions?: SeededE2EFilterOptions,
): boolean {
  // Accept either an env object or an options object as the first arg
  // so callers can write `shouldIncludeSeededE2EData({ allowSeeded })`
  // without threading process.env through unrelated layers.
  let env: E2EEnv = process.env
  let options: SeededE2EFilterOptions = {}
  if (envOrOptions && typeof envOrOptions === "object") {
    if ("allowSeeded" in envOrOptions) {
      options = envOrOptions
    } else {
      env = envOrOptions as E2EEnv
      if (maybeOptions) options = maybeOptions
    }
  }

  if (options.allowSeeded) return true

  return (
    env.PLAYWRIGHT === "1" ||
    env.E2E === "true" ||
    env.E2E_MODE === "true" ||
    env.NODE_ENV === "test"
  )
}

export function filterSeededE2EIntakes<T extends PatientFilterQuery>(
  query: T,
  envOrOptions?: E2EEnv | SeededE2EFilterOptions,
  maybeOptions?: SeededE2EFilterOptions,
): T {
  if (shouldIncludeSeededE2EData(envOrOptions, maybeOptions)) {
    return query
  }

  return query.not("patient_id", "in", SEEDED_E2E_PATIENT_FILTER) as T
}
