export const SEEDED_E2E_PATIENT_PROFILE_ID = "e2e00000-0000-0000-0000-000000000002"

const SEEDED_E2E_PATIENT_FILTER = `(${SEEDED_E2E_PATIENT_PROFILE_ID})`

type PatientFilterQuery = {
  not(column: string, operator: string, value: string): unknown
}

type E2EEnv = Partial<Record<"PLAYWRIGHT" | "E2E" | "E2E_MODE" | "NODE_ENV", string>>

export function shouldIncludeSeededE2EData(
  env: E2EEnv = process.env,
): boolean {
  return (
    env.PLAYWRIGHT === "1" ||
    env.E2E === "true" ||
    env.E2E_MODE === "true" ||
    env.NODE_ENV === "test"
  )
}

export function filterSeededE2EIntakes<T extends PatientFilterQuery>(
  query: T,
  env?: E2EEnv,
): T {
  if (shouldIncludeSeededE2EData(env)) {
    return query
  }

  return query.not("patient_id", "in", SEEDED_E2E_PATIENT_FILTER) as T
}
