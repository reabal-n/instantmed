export interface ParchmentSmokeConfig {
  apiUrl: string
  userId: string
  allowProduction: boolean
}

type SmokeEnv = Record<string, string | undefined>

export function assertParchmentSmokeConfig(env: SmokeEnv = process.env): ParchmentSmokeConfig {
  const apiUrl = env.PARCHMENT_API_URL?.trim()
  const userId = env.PARCHMENT_SMOKE_USER_ID?.trim()
  const allowProduction = env.PARCHMENT_SMOKE_ALLOW_PRODUCTION === "true"

  if (!apiUrl) {
    throw new Error("PARCHMENT_API_URL is required for the Parchment smoke test.")
  }

  if (!userId) {
    throw new Error("PARCHMENT_SMOKE_USER_ID is required for the Parchment smoke test.")
  }

  if (!allowProduction && !apiUrl.toLowerCase().includes("sandbox")) {
    throw new Error("Parchment smoke tests must run against sandbox unless PARCHMENT_SMOKE_ALLOW_PRODUCTION=true.")
  }

  return { apiUrl, userId, allowProduction }
}
