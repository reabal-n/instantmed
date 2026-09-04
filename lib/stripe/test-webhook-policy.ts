const PRODUCTION_SUPABASE_PROJECT_REF = "witzcrovsoumktyndqgz"

export type StripeKeyMode = "live" | "test" | "unknown"
export type SupabaseTestTarget = "local" | "production" | "unknown"
export type StripeTestNodeEnvironment = "development" | "test" | "production" | "unknown"

export interface StripeTestEventPolicyInput {
  allowTestWebhooks: boolean
  eventLivemode: boolean
  nodeEnv: StripeTestNodeEnvironment
  playwrightEnabled: boolean
  requestHost: string
  stripeKeyMode: StripeKeyMode
  supabaseTarget: SupabaseTestTarget
  supabaseUrlsMatch: boolean
  vercel?: string
  vercelEnv?: string
}

export interface SupabaseTestTargetInput {
  publicUrl?: string
  serverUrl?: string
}

interface ParsedSupabaseTarget {
  identity: string
  target: Exclude<SupabaseTestTarget, "unknown">
}

function requestHostname(requestHost: string): string | null {
  const value = requestHost.trim()
  if (!value) return null

  try {
    const url = new URL(value.includes("://") ? value : `http://${value}`)
    if (url.username || url.password) return null
    return url.hostname.replace(/^\[|\]$/g, "").toLowerCase()
  } catch {
    return null
  }
}

function isLoopbackHost(requestHost: string): boolean {
  const hostname = requestHostname(requestHost)
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1"
}

function parseSupabaseTarget(rawUrl: string | undefined): ParsedSupabaseTarget | null {
  if (!rawUrl) return null

  try {
    const url = new URL(rawUrl)
    if (
      !["http:", "https:"].includes(url.protocol) ||
      url.username ||
      url.password ||
      url.pathname !== "/" ||
      url.search ||
      url.hash
    ) {
      return null
    }

    const hostname = url.hostname.replace(/^\[|\]$/g, "").toLowerCase()
    if (hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1") {
      return {
        identity: url.origin.toLowerCase(),
        target: "local",
      }
    }

    if (url.protocol !== "https:" || url.port) return null
    if (hostname !== `${PRODUCTION_SUPABASE_PROJECT_REF}.supabase.co`) return null

    return {
      identity: `supabase:${PRODUCTION_SUPABASE_PROJECT_REF}`,
      target: "production",
    }
  } catch {
    return null
  }
}

export function classifyStripeKeyMode(key: string | undefined): StripeKeyMode {
  if (key?.match(/^(?:sk|rk)_test_/)) return "test"
  if (key?.match(/^(?:sk|rk)_live_/)) return "live"
  return "unknown"
}

/** Startup exception for the owned local production-bundle acceptance runner. */
export function mayStartLocalStripeTestBundle(env: Partial<NodeJS.ProcessEnv>): boolean {
  function ownedOrigin(raw: string | undefined, port: string): string | null {
    if (!raw) return null
    try {
      const url = new URL(raw)
      if (url.protocol !== "http:" || !isLoopbackHost(url.host) ||
        url.port !== port || url.username || url.password ||
        url.pathname !== "/" || url.search || url.hash) return null
      return url.origin.replace("localhost", "127.0.0.1")
    } catch {
      return null
    }
  }

  const app = ownedOrigin(env.NEXT_PUBLIC_APP_URL, "3060")
  const database = ownedOrigin(env.SUPABASE_URL, "55321")
  return env.NODE_ENV === "production" &&
    env.PLAYWRIGHT === "1" && env.ALLOW_STRIPE_TEST_WEBHOOKS === "true" &&
    env.VERCEL === undefined && env.VERCEL_ENV === undefined &&
    classifyStripeKeyMode(env.STRIPE_SECRET_KEY) === "test" &&
    app !== null && app === ownedOrigin(env.NEXT_PUBLIC_SITE_URL, "3060") &&
    database !== null && database === ownedOrigin(env.NEXT_PUBLIC_SUPABASE_URL, "55321")
}

export function classifySupabaseTestTarget(
  input: SupabaseTestTargetInput,
): { supabaseTarget: SupabaseTestTarget; supabaseUrlsMatch: boolean } {
  const effectiveServerUrl = input.serverUrl ?? input.publicUrl
  const serverTarget = parseSupabaseTarget(effectiveServerUrl)
  const publicTarget = parseSupabaseTarget(input.publicUrl)

  if (!serverTarget || !publicTarget || serverTarget.identity !== publicTarget.identity) {
    return { supabaseTarget: "unknown", supabaseUrlsMatch: false }
  }

  return {
    supabaseTarget: serverTarget.target,
    supabaseUrlsMatch: true,
  }
}

export function mayProcessStripeTestEvent(input: StripeTestEventPolicyInput): boolean {
  if (input.eventLivemode) return true

  const hasVercelMarker = input.vercel !== undefined || input.vercelEnv !== undefined
  if (hasVercelMarker || !input.playwrightEnabled || !isLoopbackHost(input.requestHost)) {
    return false
  }

  if (input.nodeEnv === "development" || input.nodeEnv === "test") {
    return true
  }

  return input.nodeEnv === "production" &&
    input.allowTestWebhooks &&
    input.stripeKeyMode === "test" &&
    input.supabaseUrlsMatch &&
    input.supabaseTarget === "local"
}
