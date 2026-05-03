#!/usr/bin/env npx tsx
/* eslint-disable no-console */

import path from "node:path"

import dotenv from "dotenv"

import { assertParchmentSmokeConfig } from "@/lib/parchment/smoke"
import {
  PARCHMENT_SCOPES,
  parchmentSsoResponseSchema,
  parchmentTokenResponseSchema,
  validateIntegrationResponseSchema,
} from "@/lib/parchment/types"

dotenv.config({ path: path.join(process.cwd(), ".env.local"), override: false, quiet: true })
dotenv.config({ path: path.join(process.cwd(), ".env"), override: false, quiet: true })

async function getSmokeToken(userId: string): Promise<string> {
  const apiUrl = process.env.PARCHMENT_API_URL
  const partnerId = process.env.PARCHMENT_PARTNER_ID
  const partnerSecret = process.env.PARCHMENT_PARTNER_SECRET
  const organizationId = process.env.PARCHMENT_ORGANIZATION_ID
  const organizationSecret = process.env.PARCHMENT_ORGANIZATION_SECRET

  if (!apiUrl || !partnerId || !partnerSecret || !organizationId || !organizationSecret) {
    throw new Error("Missing Parchment credential configuration for smoke test.")
  }

  const response = await fetch(`${apiUrl}/v1/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-partner-id": partnerId,
      "x-partner-secret": partnerSecret,
      "x-organization-id": organizationId,
      "x-organization-secret": organizationSecret,
      "x-user-id": userId,
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

async function validateSmokeIntegration(userId: string): Promise<{ validated: boolean; requestId?: string }> {
  const apiUrl = process.env.PARCHMENT_API_URL
  const organizationId = process.env.PARCHMENT_ORGANIZATION_ID
  const organizationSecret = process.env.PARCHMENT_ORGANIZATION_SECRET

  if (!apiUrl || !organizationId || !organizationSecret) {
    throw new Error("Missing Parchment organization configuration for smoke test.")
  }

  const token = await getSmokeToken(userId)
  const response = await fetch(`${apiUrl}/v1/organizations/${organizationId}/validate`, {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${token}`,
      "x-organization-secret": organizationSecret,
    },
  })

  if (!response.ok) {
    throw new Error(`Parchment integration validation failed: ${response.status}`)
  }

  const parsed = validateIntegrationResponseSchema.parse(await response.json())
  return {
    ...parsed.data,
    requestId: parsed.requestId,
  }
}

async function generateSmokeSsoUrl(userId: string): Promise<{ expiresIn: number }> {
  const apiUrl = process.env.PARCHMENT_API_URL
  const partnerId = process.env.PARCHMENT_PARTNER_ID
  const partnerSecret = process.env.PARCHMENT_PARTNER_SECRET
  const organizationId = process.env.PARCHMENT_ORGANIZATION_ID
  const organizationSecret = process.env.PARCHMENT_ORGANIZATION_SECRET

  if (!apiUrl || !partnerId || !partnerSecret || !organizationId || !organizationSecret) {
    throw new Error("Missing Parchment credential configuration for SSO smoke test.")
  }

  const response = await fetch(`${apiUrl}/v1/sso`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-partner-id": partnerId,
      "x-partner-secret": partnerSecret,
      "x-organization-id": organizationId,
      "x-organization-secret": organizationSecret,
      "x-user-id": userId,
    },
    body: JSON.stringify({ redirect_path: "/" }),
  })

  if (!response.ok) {
    throw new Error(`Parchment SSO request failed: ${response.status}`)
  }

  const parsed = parchmentSsoResponseSchema.parse(await response.json())
  return { expiresIn: parsed.data.expires_in }
}

async function main(): Promise<void> {
  const config = assertParchmentSmokeConfig()

  console.log("Running Parchment sandbox smoke validation...")
  console.log(`Endpoint: ${config.apiUrl}`)

  const result = await validateSmokeIntegration(config.userId)
  if (!result.validated) {
    throw new Error("Parchment validation endpoint returned validated=false")
  }

  const sso = await generateSmokeSsoUrl(config.userId)

  console.log("Parchment sandbox smoke validation passed")
  if (result.requestId) {
    console.log(`Parchment request id: ${result.requestId}`)
  }
  console.log(`Parchment SSO expires in: ${sso.expiresIn}s`)
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})
