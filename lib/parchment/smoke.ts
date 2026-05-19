export interface ParchmentSmokeConfig {
  apiUrl: string
  userId: string
  environment: "production"
}

type SmokeEnv = Record<string, string | undefined>

export function assertParchmentSmokeConfig(env: SmokeEnv = process.env): ParchmentSmokeConfig {
  const apiUrl = env.PARCHMENT_API_URL?.trim()
  const userId = env.PARCHMENT_SMOKE_USER_ID?.trim() || env.PARCHMENT_DEFAULT_USER_ID?.trim()

  if (!apiUrl) {
    throw new Error("PARCHMENT_API_URL is required for the Parchment smoke test.")
  }

  if (apiUrl.toLowerCase().includes("sandbox")) {
    throw new Error("Parchment production smoke tests must not run against sandbox.")
  }

  if (!apiUrl.toLowerCase().includes("parchmenthealth.io/external")) {
    throw new Error("PARCHMENT_API_URL must point to the production external API base.")
  }

  if (!userId) {
    throw new Error("PARCHMENT_SMOKE_USER_ID or PARCHMENT_DEFAULT_USER_ID is required for the Parchment smoke test.")
  }

  return { apiUrl, userId, environment: "production" }
}
