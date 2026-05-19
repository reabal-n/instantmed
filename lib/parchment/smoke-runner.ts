import {
  PARCHMENT_SCOPES,
  parchmentSsoResponseSchema,
  parchmentTokenResponseSchema,
  validateIntegrationResponseSchema,
} from "@/lib/parchment/types"

import { assertParchmentSmokeConfig } from "./smoke"

type SmokeEnv = Record<string, string | undefined>

export interface ParchmentSmokeValidationResult {
  apiHost: string
  checkedAt: string
  environment: "production"
  requestId?: string
  sso?: {
    expiresIn: number
    validated: boolean
  }
  token: {
    validated: boolean
  }
  organization: {
    validated: boolean
  }
}

interface RequiredSmokeConfig {
  apiHost: string
  apiUrl: string
  organizationId: string
  organizationSecret: string
  partnerId: string
  partnerSecret: string
  userId: string
}

function getApiHost(apiUrl: string): string {
  try {
    return new URL(apiUrl).hostname.toLowerCase()
  } catch {
    return "unknown"
  }
}

function getRequiredSmokeConfig(env: SmokeEnv): RequiredSmokeConfig {
  const config = assertParchmentSmokeConfig(env)
  const partnerId = env.PARCHMENT_PARTNER_ID?.trim()
  const partnerSecret = env.PARCHMENT_PARTNER_SECRET?.trim()
  const organizationId = env.PARCHMENT_ORGANIZATION_ID?.trim()
  const organizationSecret = env.PARCHMENT_ORGANIZATION_SECRET?.trim()

  if (!partnerId || !partnerSecret || !organizationId || !organizationSecret) {
    throw new Error("Missing Parchment credential configuration for production smoke test.")
  }

  return {
    apiHost: getApiHost(config.apiUrl),
    apiUrl: config.apiUrl,
    organizationId,
    organizationSecret,
    partnerId,
    partnerSecret,
    userId: config.userId,
  }
}

async function getSmokeToken(config: RequiredSmokeConfig): Promise<string> {
  const response = await fetch(`${config.apiUrl}/v1/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-partner-id": config.partnerId,
      "x-partner-secret": config.partnerSecret,
      "x-organization-id": config.organizationId,
      "x-organization-secret": config.organizationSecret,
      "x-user-id": config.userId,
    },
    body: JSON.stringify({
      grantType: "client_credentials",
      scope: [PARCHMENT_SCOPES.CREATE_PATIENT, PARCHMENT_SCOPES.READ_PATIENT],
    }),
  })

  if (!response.ok) {
    throw new Error(`Parchment token request failed: ${response.status}`)
  }

  const parsed = parchmentTokenResponseSchema.parse(await response.json())
  return parsed.data.accessToken
}

async function validateSmokeIntegration(config: RequiredSmokeConfig, token: string) {
  const response = await fetch(`${config.apiUrl}/v1/organizations/${config.organizationId}/validate`, {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${token}`,
      "x-organization-secret": config.organizationSecret,
    },
  })

  if (!response.ok) {
    throw new Error(`Parchment integration validation failed: ${response.status}`)
  }

  return validateIntegrationResponseSchema.parse(await response.json())
}

async function generateSmokeSsoUrl(config: RequiredSmokeConfig): Promise<{ expiresIn: number }> {
  const response = await fetch(`${config.apiUrl}/v1/sso`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-partner-id": config.partnerId,
      "x-partner-secret": config.partnerSecret,
      "x-organization-id": config.organizationId,
      "x-organization-secret": config.organizationSecret,
      "x-user-id": config.userId,
    },
    body: JSON.stringify({ redirect_path: "/" }),
  })

  if (!response.ok) {
    throw new Error(`Parchment SSO request failed: ${response.status}`)
  }

  const parsed = parchmentSsoResponseSchema.parse(await response.json())
  return { expiresIn: parsed.data.expires_in }
}

export async function runParchmentSmokeValidation(options: {
  env?: SmokeEnv
  includeSso?: boolean
} = {}): Promise<ParchmentSmokeValidationResult> {
  const env = options.env ?? process.env
  const config = getRequiredSmokeConfig(env)
  const token = await getSmokeToken(config)
  const organization = await validateSmokeIntegration(config, token)
  if (!organization.data.validated) {
    throw new Error("Parchment validation endpoint returned validated=false")
  }

  const sso = options.includeSso ? await generateSmokeSsoUrl(config) : null

  return {
    apiHost: config.apiHost,
    checkedAt: new Date().toISOString(),
    environment: "production",
    organization: {
      validated: organization.data.validated,
    },
    requestId: organization.requestId,
    sso: sso
      ? {
          expiresIn: sso.expiresIn,
          validated: true,
        }
      : undefined,
    token: {
      validated: true,
    },
  }
}
