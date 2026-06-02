import { createHash } from "node:crypto"

import Stripe from "stripe"

import { AI_MODEL_CONFIG } from "@/lib/ai/provider"
import { assertParchmentSmokeConfig } from "@/lib/parchment/smoke"
import { STRIPE_PRICE_ENV_KEYS } from "@/lib/stripe/price-config-health"

import { hydrateLocalEnv } from "./video-review/local-env"

type CheckStatus = "pass" | "warn" | "fail"

type CheckResult = {
  status: CheckStatus
  name: string
  detail: string
}

function isConfigured(value: string | undefined): value is string {
  const trimmed = value?.trim()
  return Boolean(trimmed) && !trimmed?.includes("placeholder")
}

function result(status: CheckStatus, name: string, detail: string): CheckResult {
  return { status, name, detail }
}

function strictStatus(): CheckStatus {
  return CHECK_INTEGRATIONS_STRICT ? "fail" : "warn"
}

function missingConfiguredEnvKeys(keys: string[]): string[] {
  return keys.filter((key) => !isConfigured(process.env[key]))
}

function missingGoogleAdsCoreEnvKeys(
  customerId: string | null,
  conversionActionId: string | null,
  developerToken?: string,
): string[] {
  const missing: string[] = []
  if (!customerId) missing.push("GOOGLE_ADS_CUSTOMER_ID")
  if (!conversionActionId) missing.push("GOOGLE_ADS_CONVERSION_ACTION_PURCHASE")
  if (!isConfigured(developerToken)) missing.push("GOOGLE_ADS_DEVELOPER_TOKEN")
  return missing
}

function formatEnvList(keys: string[]): string {
  return keys.join(", ")
}

const CHECK_INTEGRATIONS_STRICT =
  process.argv.includes("--strict") ||
  process.env.CHECK_INTEGRATIONS_STRICT === "1" ||
  process.env.GITHUB_REF_PROTECTED === "true"
const DEFAULT_OPENAI_REVIEW_MODEL = "gpt-5.5-pro"

hydrateLocalEnv([
  "ANTHROPIC_API_KEY",
  "ANTHROPIC_CLINICAL_MODEL",
  "CLAUDE_MODEL",
  "OPENAI_API_KEY",
  "OPENAI_REVIEW_MODEL",
  "ANTHROPIC_MODEL",
  "ANTHROPIC_CLAUDE_MODEL",
  "GOOGLE_ADS_API_VERSION",
  "GOOGLE_ADS_CLIENT_ID",
  "GOOGLE_ADS_CLIENT_SECRET",
  "GOOGLE_ADS_CONVERSION_ACTION_PURCHASE",
  "GOOGLE_ADS_CUSTOMER_ID",
  "GOOGLE_ADS_DEVELOPER_TOKEN",
  "GOOGLE_ADS_LOGIN_CUSTOMER_ID",
  "GOOGLE_ADS_QUOTA_PROJECT_ID",
  "GOOGLE_ADS_REFRESH_TOKEN",
  "GOOGLE_ADS_SERVER_CONVERSION_DISABLED",
  "PARCHMENT_API_URL",
  "PARCHMENT_ORGANIZATION_ID",
  "PARCHMENT_PARTNER_ID",
  "PARCHMENT_SMOKE_USER_ID",
  "RESEND_API_KEY",
  "RESEND_FROM_EMAIL",
  "RESEND_SEND_SMOKE",
  "STRIPE_SECRET_KEY",
  ...STRIPE_PRICE_ENV_KEYS,
])

function normalizeGoogleAdsNumericId(value?: string | null): string | null {
  const trimmed = value?.trim()
  if (!trimmed) return null
  const resourceId = trimmed.match(/\/(\d+)$/)?.[1]
  const normalized = (resourceId || trimmed).replace(/-/g, "")
  return /^\d+$/.test(normalized) ? normalized : null
}

async function fetchGoogleAdsAccessToken(): Promise<string | null> {
  const clientId = process.env.GOOGLE_ADS_CLIENT_ID
  const clientSecret = process.env.GOOGLE_ADS_CLIENT_SECRET
  const refreshToken = process.env.GOOGLE_ADS_REFRESH_TOKEN
  if (!isConfigured(clientId) || !isConfigured(clientSecret) || !isConfigured(refreshToken)) return null

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  })

  if (!response.ok) return null
  const payload = await response.json() as { access_token?: string }
  return payload.access_token ?? null
}

async function preflightGoogleAdsPurchaseConversionAction(): Promise<CheckResult> {
  if (process.env.GOOGLE_ADS_SERVER_CONVERSION_DISABLED === "1" || process.env.GOOGLE_ADS_SERVER_CONVERSION_DISABLED === "true") {
    return result(
      CHECK_INTEGRATIONS_STRICT ? "fail" : "warn",
      "Google Ads conversion action",
      "Server-side Google Ads purchase uploads are disabled; attribution cannot be trusted for paid ramp decisions.",
    )
  }

  const customerId = normalizeGoogleAdsNumericId(process.env.GOOGLE_ADS_CUSTOMER_ID)
  const conversionActionId = normalizeGoogleAdsNumericId(process.env.GOOGLE_ADS_CONVERSION_ACTION_PURCHASE)
  const developerToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN

  const missingCoreKeys = missingGoogleAdsCoreEnvKeys(customerId, conversionActionId, developerToken)
  if (missingCoreKeys.length > 0) {
    return result(
      "warn",
      "Google Ads conversion action",
      `Google Ads env is incomplete (${formatEnvList(missingCoreKeys)}); skipped UPLOAD_CLICKS validation.`,
    )
  }

  const missingOauthKeys = missingConfiguredEnvKeys([
    "GOOGLE_ADS_CLIENT_ID",
    "GOOGLE_ADS_CLIENT_SECRET",
    "GOOGLE_ADS_REFRESH_TOKEN",
  ])
  if (missingOauthKeys.length > 0) {
    return result(
      "warn",
      "Google Ads conversion action",
      `Google Ads OAuth env is incomplete (${formatEnvList(missingOauthKeys)}); skipped UPLOAD_CLICKS validation.`,
    )
  }
  const configuredDeveloperToken = developerToken?.trim() || ""

  const accessToken = await fetchGoogleAdsAccessToken()
  if (!accessToken) {
    return result(
      "warn",
      "Google Ads conversion action",
      "Google Ads OAuth token could not be minted; refresh token or OAuth client credentials may be invalid.",
    )
  }

  const apiVersion = process.env.GOOGLE_ADS_API_VERSION || "v24"
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${accessToken}`,
    "developer-token": configuredDeveloperToken,
  }
  const loginCustomerId = normalizeGoogleAdsNumericId(process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID)
  if (loginCustomerId) headers["login-customer-id"] = loginCustomerId
  if (process.env.GOOGLE_ADS_QUOTA_PROJECT_ID) {
    headers["x-goog-user-project"] = process.env.GOOGLE_ADS_QUOTA_PROJECT_ID
  }

  const response = await fetch(
    `https://googleads.googleapis.com/${apiVersion}/customers/${customerId}/googleAds:search`,
    {
      method: "POST",
      headers,
      body: JSON.stringify({
        query: [
          "SELECT",
          "conversion_action.id,",
          "conversion_action.name,",
          "conversion_action.resource_name,",
          "conversion_action.status,",
          "conversion_action.type",
          "FROM conversion_action",
          `WHERE conversion_action.id = ${conversionActionId}`,
        ].join(" "),
      }),
    },
  )

  if (!response.ok) {
    return result("fail", "Google Ads conversion action", `Google Ads search returned ${response.status}; expected UPLOAD_CLICKS validation to succeed.`)
  }

  const payload = await response.json() as {
    results?: Array<{
      conversionAction?: {
        name?: string
        status?: string
        type?: string
      }
    }>
  }
  const action = payload.results?.[0]?.conversionAction
  if (!action) {
    return result("fail", "Google Ads conversion action", "Configured purchase conversion action was not found.")
  }

  if (action.type !== "UPLOAD_CLICKS") {
    return result("fail", "Google Ads conversion action", `${action.name || "Configured action"} is ${action.type || "unknown"}, expected UPLOAD_CLICKS.`)
  }

  if (action.status !== "ENABLED") {
    return result(
      "fail",
      "Google Ads conversion action",
      `Configured UPLOAD_CLICKS conversion action is ${action.status || "not enabled"}; expected ENABLED.`,
    )
  }

  return result("pass", "Google Ads conversion action", "Purchase conversion action is enabled UPLOAD_CLICKS.")
}

async function checkStripePriceTypes(): Promise<CheckResult[]> {
  const secretKey = process.env.STRIPE_SECRET_KEY
  if (!isConfigured(secretKey)) {
    return [result("warn", "Stripe price types", "STRIPE_SECRET_KEY is not configured; skipped live Stripe price type validation.")]
  }

  const stripe = new Stripe(secretKey, { apiVersion: "2025-10-29.clover" })
  const results: CheckResult[] = []

  for (const key of STRIPE_PRICE_ENV_KEYS) {
    const priceId = process.env[key]?.trim()
    if (!isConfigured(priceId)) {
      results.push(result("warn", `Stripe ${key}`, `${key} is not configured; skipped.`))
      continue
    }

    const price = await stripe.prices.retrieve(priceId)
    if (price.type !== "one_time" || price.recurring) {
      results.push(result("fail", `Stripe ${key}`, `${priceId} must be a one_time Stripe price, got ${price.type}.`))
      continue
    }

    results.push(result("pass", `Stripe ${key}`, `${priceId} is one_time.`))
  }

  return results
}

async function checkGoogleAdsConversionAction(): Promise<CheckResult[]> {
  return [await preflightGoogleAdsPurchaseConversionAction()]
}

async function checkResendDomainOwnership(): Promise<CheckResult[]> {
  const apiKey = process.env.RESEND_API_KEY
  const fromEmail = process.env.RESEND_FROM_EMAIL
  if (!isConfigured(apiKey) || !isConfigured(fromEmail)) {
    return [result("warn", "Resend domain", "RESEND_API_KEY or RESEND_FROM_EMAIL is not configured; skipped domain ownership validation.")]
  }

  if (!isValidResendFromEmail(fromEmail)) {
    return [result("fail", "Resend sender", "RESEND_FROM_EMAIL must be email@example.com or Name <email@example.com> without wrapping quote characters.")]
  }

  const domain = parseEmailDomain(fromEmail)
  if (!domain) {
    return [result("fail", "Resend domain", "RESEND_FROM_EMAIL must include a domain.")]
  }

  const response = await fetch("https://api.resend.com/domains", {
    headers: { Authorization: `Bearer ${apiKey}` },
  })

  if (!response.ok) {
    const payload = await response.json().catch(() => null) as ResendErrorPayload | null
    if (response.status === 401 && isResendRestrictedKeyError(payload)) {
      if (shouldRunResendSendSmoke()) {
        return [await checkResendRestrictedSendSmoke(apiKey, fromEmail, domain)]
      }

      return [
        result(
          "warn",
          "Resend domain",
          `${domain} uses a restricted send-only API key; skipped Domains API validation. Strict mode runs a Resend test-sink send smoke.`,
        ),
      ]
    }

    return [result(strictStatus(), "Resend domain", `Resend domains API returned ${response.status}.`)]
  }

  const payload = await response.json() as { data?: Array<{ name?: string; status?: string }> }
  const match = payload.data?.find((entry) => entry.name?.toLowerCase() === domain)
  if (!match) {
    return [result(strictStatus(), "Resend domain", `${domain} was not found in Resend domains.`)]
  }

  if (match.status !== "verified") {
    return [result(strictStatus(), "Resend domain", `${domain} is ${match.status || "unknown"}, not verified.`)]
  }

  return [result("pass", "Resend domain", `${domain} is verified.`)]
}

type ResendErrorPayload = {
  name?: string
  message?: string
  error?: {
    name?: string
    code?: string
    message?: string
  }
  code?: string
}

function isValidResendFromEmail(value: string): boolean {
  const trimmed = value.trim()
  if (!trimmed || trimmed.startsWith("\"") || trimmed.endsWith("\"") || trimmed.startsWith("'") || trimmed.endsWith("'")) {
    return false
  }

  const emailPattern = "[^@<>\\s]+@[^@<>\\s]+\\.[^@<>\\s]+"
  const plain = new RegExp(`^${emailPattern}$`)
  const display = new RegExp(`^[^<>\\r\\n]+ <${emailPattern}>$`)
  return plain.test(trimmed) || display.test(trimmed)
}

function isResendRestrictedKeyError(payload: ResendErrorPayload | null): boolean {
  const values = [
    payload?.name,
    payload?.code,
    payload?.message,
    payload?.error?.name,
    payload?.error?.code,
    payload?.error?.message,
  ].filter(Boolean).map((value) => String(value).toLowerCase())

  return values.some((value) => value.includes("restricted_api_key"))
}

function shouldRunResendSendSmoke(): boolean {
  return CHECK_INTEGRATIONS_STRICT || process.env.RESEND_SEND_SMOKE === "1"
}

function resendSmokeIdempotencyKey(domain: string): string {
  const today = new Date().toISOString().slice(0, 10)
  const digest = createHash("sha256").update(`${domain}:${today}`).digest("hex").slice(0, 12)
  return `instantmed-check-integrations-${today}-${digest}`
}

function sanitizeResendMessage(message: string | undefined): string {
  return (message || "unknown error").replace(/re_[A-Za-z0-9_]+/g, "[redacted_key]")
}

async function checkResendRestrictedSendSmoke(
  apiKey: string,
  fromEmail: string,
  domain: string,
): Promise<CheckResult> {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "Idempotency-Key": resendSmokeIdempotencyKey(domain),
    },
    body: JSON.stringify({
      from: fromEmail,
      to: ["delivered@resend.dev"],
      subject: `InstantMed integration smoke ${new Date().toISOString().slice(0, 10)}`,
      html: "<p>InstantMed Resend integration smoke.</p>",
      text: "InstantMed Resend integration smoke.",
    }),
  })

  const payload = await response.json().catch(() => null) as (ResendErrorPayload & { id?: string }) | null
  if (!response.ok || !payload?.id) {
    const message = sanitizeResendMessage(payload?.message || payload?.error?.message)
    return result("fail", "Resend send smoke", `Restricted Resend send smoke returned ${response.status}: ${message}.`)
  }

  return result("pass", "Resend send smoke", `Restricted send key accepted a test-sink email from ${domain}.`)
}

function parseEmailDomain(value: string): string | null {
  const trimmed = value.trim()
  const angleAddress = trimmed.match(/<([^<>@\s]+@[^<>\s]+)>/)?.[1]
  const email = angleAddress || trimmed
  const domain = email.split("@")[1]?.replace(/[>"'\s]+$/g, "").trim().toLowerCase()
  return domain || null
}

async function checkAnthropicModels(): Promise<CheckResult[]> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!isConfigured(apiKey)) {
    return [result("warn", "Anthropic model", "ANTHROPIC_API_KEY is not configured; skipped live model validation.")]
  }

  const results: CheckResult[] = []
  for (const config of Object.values(AI_MODEL_CONFIG)) {
    const response = await fetch(`https://api.anthropic.com/v1/models/${config.model}`, {
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
    })

    if (!response.ok) {
      results.push(result(strictStatus(), "Anthropic model", `${config.model} returned ${response.status}.`))
      continue
    }

    results.push(result("pass", "Anthropic model", `${config.model} is available.`))
  }

  return results
}

async function checkOpenAIReviewModel(): Promise<CheckResult[]> {
  const apiKey = process.env.OPENAI_API_KEY
  const model = process.env.OPENAI_REVIEW_MODEL?.trim() || DEFAULT_OPENAI_REVIEW_MODEL

  if (!isConfigured(apiKey)) {
    return [result("warn", "OpenAI review model", "OPENAI_API_KEY is not configured; skipped GPT review model validation.")]
  }

  const response = await fetch(`https://api.openai.com/v1/models/${encodeURIComponent(model)}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  })

  if (!response.ok) {
    return [result(strictStatus(), "OpenAI review model", `${model} returned ${response.status}.`)]
  }

  return [result("pass", "OpenAI review model", `${model} is available.`)]
}

async function checkParchmentReadiness(): Promise<CheckResult[]> {
  const hasAnyParchmentConfig = [
    "PARCHMENT_API_URL",
    "PARCHMENT_PARTNER_ID",
    "PARCHMENT_ORGANIZATION_ID",
    "PARCHMENT_SMOKE_USER_ID",
  ].some((key) => isConfigured(process.env[key]))

  if (!hasAnyParchmentConfig) {
    return [result("warn", "Parchment smoke config", "Parchment env is not configured; skipped production smoke config validation.")]
  }

  try {
    const config = assertParchmentSmokeConfig(process.env)
    return [result("pass", "Parchment smoke config", `${config.environment} smoke user configured via PARCHMENT_SMOKE_USER_ID.`)]
  } catch (error) {
    return [
      result(
        "fail",
        "Parchment smoke config",
        error instanceof Error ? error.message : "Parchment smoke config is invalid.",
      ),
    ]
  }
}

async function main() {
  const checks = [
    ...(await checkStripePriceTypes()),
    ...(await checkGoogleAdsConversionAction()),
    ...(await checkResendDomainOwnership()),
    ...(await checkAnthropicModels()),
    ...(await checkOpenAIReviewModel()),
    ...(await checkParchmentReadiness()),
  ]

  for (const check of checks) {
    const prefix = check.status === "pass" ? "ok" : check.status
    console.log(`${prefix}: ${check.name} - ${check.detail}`)
  }

  const failures = checks.filter((check) => check.status === "fail")
  const warnings = checks.filter((check) => check.status === "warn")
  if (failures.length > 0 || (CHECK_INTEGRATIONS_STRICT && warnings.length > 0)) {
    const strictWarningText = CHECK_INTEGRATIONS_STRICT && warnings.length > 0
      ? `; strict mode treats ${warnings.length} warning${warnings.length === 1 ? "" : "s"} as release-blocking`
      : ""
    console.error(`Integration validation failed (${failures.length} issue${failures.length === 1 ? "" : "s"}${strictWarningText}).`)
    process.exit(1)
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})
