import {
  canEmbedParchmentForHost,
  getParchmentIframeAllowedPatterns,
} from "@/lib/parchment/embed-policy"

export type ParchmentProductionReadinessStatus =
  | "awaiting_production_keys"
  | "ready"
  | "misconfigured"

export type ParchmentReadinessEnvKey =
  | "NEXT_PUBLIC_PARCHMENT_IFRAME_ALLOWED_HOSTS"
  | "PARCHMENT_API_URL"
  | "PARCHMENT_ORGANIZATION_ID"
  | "PARCHMENT_ORGANIZATION_SECRET"
  | "PARCHMENT_PARTNER_ID"
  | "PARCHMENT_PARTNER_SECRET"
  | "PARCHMENT_WEBHOOK_SECRET"
  | "PARCHMENT_DEFAULT_USER_ID"

export type ParchmentReadinessEnv = Record<string, string | undefined>

export interface ParchmentProductionReadiness {
  apiHost: string
  apiPath: string
  environment: "sandbox" | "production" | "unknown"
  externalApiPathConfigured: boolean
  iframeHosts: Array<{ allowed: boolean; host: string }>
  label: string
  message: string
  missingProductionKeys: string[]
  status: ParchmentProductionReadinessStatus
}

const REQUIRED_PRODUCTION_KEYS = [
  "PARCHMENT_API_URL",
  "PARCHMENT_PARTNER_ID",
  "PARCHMENT_PARTNER_SECRET",
  "PARCHMENT_ORGANIZATION_ID",
  "PARCHMENT_ORGANIZATION_SECRET",
  "PARCHMENT_WEBHOOK_SECRET",
  "PARCHMENT_DEFAULT_USER_ID",
] as const

function getApiHost(apiUrl: string | undefined): string {
  if (!apiUrl) return "not configured"

  try {
    return new URL(apiUrl).hostname.toLowerCase()
  } catch {
    return apiUrl.toLowerCase()
  }
}

function getApiPath(apiUrl: string | undefined): string {
  if (!apiUrl) return ""

  try {
    return new URL(apiUrl).pathname.replace(/\/$/, "")
  } catch {
    return ""
  }
}

function getEnvironment(apiHost: string): ParchmentProductionReadiness["environment"] {
  if (apiHost.includes("sandbox")) return "sandbox"
  if (apiHost !== "not configured" && apiHost.includes("parchment")) return "production"
  return "unknown"
}

export function getParchmentProductionReadiness(
  env: ParchmentReadinessEnv = process.env,
): ParchmentProductionReadiness {
  const apiHost = getApiHost(env.PARCHMENT_API_URL)
  const apiPath = getApiPath(env.PARCHMENT_API_URL)
  const environment = getEnvironment(apiHost)
  const externalApiPathConfigured = apiPath === "/external"
  const allowedPatterns = getParchmentIframeAllowedPatterns(env)
  const iframeHosts = ["instantmed.com.au", "www.instantmed.com.au"].map((host) => ({
    allowed: canEmbedParchmentForHost(host, allowedPatterns),
    host,
  }))
  const iframeReady = iframeHosts.every((host) => host.allowed)
  const missingProductionKeys = REQUIRED_PRODUCTION_KEYS.filter((key) => !env[key])

  if (environment === "sandbox") {
    return {
      apiHost,
      apiPath,
      environment,
      externalApiPathConfigured,
      iframeHosts,
      label: "Sandbox environment blocked",
      message:
        "Parchment is configured for sandbox. Production prescribing is blocked until only the production external API base is configured.",
      missingProductionKeys,
      status: "misconfigured",
    }
  }

  if (environment !== "production") {
    return {
      apiHost,
      apiPath,
      environment,
      externalApiPathConfigured,
      iframeHosts,
      label: "Parchment environment not configured",
      message:
        "Set the Parchment API URL before treating prescribing as production-ready.",
      missingProductionKeys,
      status: "misconfigured",
    }
  }

  if (missingProductionKeys.length > 0) {
    return {
      apiHost,
      apiPath,
      environment,
      externalApiPathConfigured,
      iframeHosts,
      label: "Production keys incomplete",
      message:
        "The production API host is configured, but at least one Parchment production secret is missing.",
      missingProductionKeys,
      status: "awaiting_production_keys",
    }
  }

  if (!externalApiPathConfigured) {
    return {
      apiHost,
      apiPath,
      environment,
      externalApiPathConfigured,
      iframeHosts,
      label: "Production API path incomplete",
      message:
        "The Parchment production host is configured, but this integration requires the /external API base path.",
      missingProductionKeys,
      status: "misconfigured",
    }
  }

  if (!iframeReady) {
    return {
      apiHost,
      apiPath,
      environment,
      externalApiPathConfigured,
      iframeHosts,
      label: "Iframe host allowlist needs review",
      message:
        "Production keys are present, but the InstantMed production hosts are not both allowed for the embedded prescribing frame.",
      missingProductionKeys,
      status: "misconfigured",
    }
  }

  return {
    apiHost,
    apiPath,
    environment,
    externalApiPathConfigured,
    iframeHosts,
    label: "Production prescribing ready",
    message:
      "Production Parchment keys, external API base path, and iframe hosts are configured.",
    missingProductionKeys,
    status: "ready",
  }
}
