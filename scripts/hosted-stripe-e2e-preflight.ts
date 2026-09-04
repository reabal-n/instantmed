import Stripe from "stripe"

import {
  classifyStripeKeyMode,
  classifySupabaseTestTarget,
  mayProcessStripeTestEvent,
  type StripeKeyMode,
} from "../lib/stripe/test-webhook-policy"

export const HOSTED_STRIPE_PRICE_REQUIREMENTS = [
  { envKey: "STRIPE_PRICE_MEDCERT", amountCents: 2495 },
  { envKey: "STRIPE_PRICE_MEDCERT_2DAY", amountCents: 2995 },
  { envKey: "STRIPE_PRICE_MEDCERT_3DAY", amountCents: 3995 },
  { envKey: "STRIPE_PRICE_REPEAT_SCRIPT", amountCents: 2995 },
  { envKey: "STRIPE_PRICE_CONSULT", amountCents: 4995 },
  { envKey: "STRIPE_PRICE_CONSULT_ED", amountCents: 4995 },
  { envKey: "STRIPE_PRICE_CONSULT_HAIR_LOSS", amountCents: 4995 },
  { envKey: "STRIPE_PRICE_CONSULT_WOMENS_HEALTH", amountCents: 4995 },
  { envKey: "STRIPE_PRICE_CONSULT_WEIGHT_LOSS", amountCents: 8995 },
  { envKey: "STRIPE_PRICE_PRIORITY_FEE", amountCents: 995 },
] as const

type HostedStripePriceEnvironmentKey =
  (typeof HOSTED_STRIPE_PRICE_REQUIREMENTS)[number]["envKey"]

export interface RetrievedStripePrice {
  active: boolean
  currency: string
  id: string
  livemode: boolean
  type: "one_time" | "recurring"
  unit_amount: number | null
}

export interface HostedStripeE2EContext {
  appUrl: string
  priceIds: Record<HostedStripePriceEnvironmentKey, string>
  stripeKeyMode: StripeKeyMode
  supabaseUrl: string
}

export interface HostedStripeE2EPreflightOptions {
  env?: Partial<NodeJS.ProcessEnv>
  retrievePrice?: (priceId: string) => Promise<RetrievedStripePrice>
}

function fail(message: string): never {
  throw new Error(`Hosted Stripe E2E preflight failed: ${message}`)
}

function parseExactLoopbackOrigin(
  raw: string | undefined,
  expectedPort: string,
  label: string,
): URL {
  if (!raw) fail(`${label} is required`)

  let url: URL
  try {
    url = new URL(raw)
  } catch {
    fail(`${label} must be an explicit loopback URL`)
  }

  const hostname = url.hostname.replace(/^\[|\]$/g, "").toLowerCase()
  if (
    url.protocol !== "http:" ||
    !["127.0.0.1", "localhost", "::1"].includes(hostname) ||
    url.port !== expectedPort ||
    url.username ||
    url.password ||
    (url.pathname !== "/" && url.pathname !== "") ||
    url.search ||
    url.hash
  ) {
    fail(`${label} must be the owned loopback origin on port ${expectedPort}`)
  }

  return url
}

function sameLoopbackTarget(left: URL, right: URL): boolean {
  const normalizeHost = (url: URL) => {
    const host = url.hostname.replace(/^\[|\]$/g, "").toLowerCase()
    return host === "localhost" ? "127.0.0.1" : host
  }
  return normalizeHost(left) === normalizeHost(right) && left.port === right.port
}

function requireExactValue(
  env: Partial<NodeJS.ProcessEnv>,
  key: string,
  expected: string,
): void {
  if (env[key] !== expected) fail(`${key} must be exactly ${expected}`)
}

function requireAbsent(env: Partial<NodeJS.ProcessEnv>, key: string): void {
  if (Object.prototype.hasOwnProperty.call(env, key)) {
    fail(`${key} must be absent`)
  }
}

function configuredPriceIds(
  env: Partial<NodeJS.ProcessEnv>,
): Record<HostedStripePriceEnvironmentKey, string> {
  const entries = HOSTED_STRIPE_PRICE_REQUIREMENTS.map(({ envKey }) => {
    const value = env[envKey]
    if (!value || !/^price_[A-Za-z0-9_]+$/.test(value)) {
      fail(`${envKey} must be an explicit Stripe Price ID`)
    }
    return [envKey, value] as const
  })
  return Object.fromEntries(entries) as Record<HostedStripePriceEnvironmentKey, string>
}

async function defaultRetrievePrice(
  stripeKey: string,
  priceId: string,
): Promise<RetrievedStripePrice> {
  const stripe = new Stripe(stripeKey, {
    maxNetworkRetries: 0,
    timeout: 15_000,
  })
  const price = await stripe.prices.retrieve(priceId)
  return {
    active: price.active,
    currency: price.currency,
    id: price.id,
    livemode: price.livemode,
    type: price.type,
    unit_amount: price.unit_amount,
  }
}

export async function assertHostedStripeE2EEnvironment(
  options: HostedStripeE2EPreflightOptions = {},
): Promise<HostedStripeE2EContext> {
  const env = options.env ?? process.env
  requireExactValue(env, "NODE_ENV", "production")
  requireExactValue(env, "PLAYWRIGHT", "1")
  requireExactValue(env, "ALLOW_STRIPE_TEST_WEBHOOKS", "true")
  requireAbsent(env, "VERCEL")
  requireAbsent(env, "VERCEL_ENV")

  const appUrl = parseExactLoopbackOrigin(
    env.NEXT_PUBLIC_APP_URL,
    "3060",
    "NEXT_PUBLIC_APP_URL",
  )
  const siteUrl = parseExactLoopbackOrigin(
    env.NEXT_PUBLIC_SITE_URL,
    "3060",
    "NEXT_PUBLIC_SITE_URL",
  )
  if (!sameLoopbackTarget(appUrl, siteUrl)) {
    fail("application URLs must identify the same loopback target")
  }

  const publicSupabaseUrl = parseExactLoopbackOrigin(
    env.NEXT_PUBLIC_SUPABASE_URL,
    "55321",
    "NEXT_PUBLIC_SUPABASE_URL",
  )
  const serverSupabaseUrl = parseExactLoopbackOrigin(
    env.SUPABASE_URL,
    "55321",
    "SUPABASE_URL",
  )
  const ownedSupabaseUrl = parseExactLoopbackOrigin(
    env.HOSTED_STRIPE_E2E_SUPABASE_API_URL,
    "55321",
    "HOSTED_STRIPE_E2E_SUPABASE_API_URL",
  )
  if (
    !sameLoopbackTarget(publicSupabaseUrl, serverSupabaseUrl) ||
    !sameLoopbackTarget(publicSupabaseUrl, ownedSupabaseUrl)
  ) {
    fail("Supabase public, server, and runner-owned URLs must match")
  }

  const stripeKey = env.STRIPE_SECRET_KEY
  const stripeKeyMode = classifyStripeKeyMode(stripeKey)
  if (!stripeKey || stripeKeyMode !== "test") {
    fail("STRIPE_SECRET_KEY must be a dedicated test-mode secret or restricted key")
  }

  const supabaseTarget = classifySupabaseTestTarget({
    publicUrl: publicSupabaseUrl.origin,
    serverUrl: serverSupabaseUrl.origin,
  })
  const policyAllows = mayProcessStripeTestEvent({
    allowTestWebhooks: env.ALLOW_STRIPE_TEST_WEBHOOKS === "true",
    eventLivemode: false,
    nodeEnv: env.NODE_ENV === "production" ? "production" : "unknown",
    playwrightEnabled: env.PLAYWRIGHT === "1",
    requestHost: appUrl.host,
    stripeKeyMode,
    supabaseTarget: supabaseTarget.supabaseTarget,
    supabaseUrlsMatch: supabaseTarget.supabaseUrlsMatch,
    vercel: Object.prototype.hasOwnProperty.call(env, "VERCEL")
      ? env.VERCEL
      : undefined,
    vercelEnv: Object.prototype.hasOwnProperty.call(env, "VERCEL_ENV")
      ? env.VERCEL_ENV
      : undefined,
  })
  if (!policyAllows) fail("Task 1 webhook policy rejected this runtime")

  const priceIds = configuredPriceIds(env)
  const retrievePrice = options.retrievePrice ?? (
    (priceId: string) => defaultRetrievePrice(stripeKey, priceId)
  )

  for (const requirement of HOSTED_STRIPE_PRICE_REQUIREMENTS) {
    let price: RetrievedStripePrice
    try {
      price = await retrievePrice(priceIds[requirement.envKey])
    } catch {
      throw new Error(
        `Stripe price retrieval failed for ${requirement.envKey}; provider response suppressed`,
      )
    }

    if (
      price.id !== priceIds[requirement.envKey] ||
      price.livemode !== false ||
      price.active !== true ||
      price.currency.toLowerCase() !== "aud" ||
      price.unit_amount !== requirement.amountCents ||
      price.type !== "one_time"
    ) {
      throw new Error(
        `Stripe price validation failed for ${requirement.envKey}; provider response suppressed`,
      )
    }
  }

  return {
    appUrl: appUrl.origin,
    priceIds,
    stripeKeyMode,
    supabaseUrl: publicSupabaseUrl.origin,
  }
}

export function assertStripeCliWebhookSecret(
  value: unknown,
): asserts value is string {
  if (typeof value !== "string" || !/^whsec_[A-Za-z0-9]{24,}$/.test(value)) {
    throw new Error("Stripe CLI did not provide a valid webhook signing secret")
  }
}
