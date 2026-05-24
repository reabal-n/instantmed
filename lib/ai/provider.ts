import { createAnthropic } from "@ai-sdk/anthropic"

/**
 * AI Provider Configuration
 *
 * Uses Anthropic Claude via Vercel AI SDK.
 * Configure via ANTHROPIC_API_KEY env var (preferred) or VERCEL_AI_GATEWAY_API_KEY.
 * Uses lazy initialization to avoid build-time errors.
 */

// Model configurations
// NOTE: claude-opus-4-7 deprecated the `temperature` param. Do NOT add a
// temperature key here; the SDK will pass it through and the API will 400.
export const AI_MODEL_CONFIG = {
  // For medical documentation - requires high accuracy
  clinical: {
    model: 'claude-opus-4-7',
    maxTokens: 2000,
  },
} as const

export type AIModelType = keyof typeof AI_MODEL_CONFIG

// Lazy provider instance
let _anthropic: ReturnType<typeof createAnthropic> | null = null

/**
 * Get the API key with priority:
 * 1. ANTHROPIC_API_KEY (preferred)
 * 2. VERCEL_AI_GATEWAY_API_KEY (production gateway)
 */
export function getAIApiKey(): string | undefined {
  return (
    process.env.ANTHROPIC_API_KEY ||
    process.env.VERCEL_AI_GATEWAY_API_KEY
  )
}

/**
 * Canonical Anthropic API base URL. Pinned explicitly because some
 * environments (notably Claude Code's interactive shell) export
 * `ANTHROPIC_BASE_URL=https://api.anthropic.com` (without `/v1`). The
 * SDK reads that env var and appends `/messages`, so requests hit
 * `/messages` (404 Not Found) instead of `/v1/messages`. Passing
 * `baseURL` explicitly to `createAnthropic` overrides the env var.
 * See CLAUDE.md gotcha "@ai-sdk/anthropic calls must pin baseURL".
 */
const ANTHROPIC_BASE_URL = "https://api.anthropic.com/v1"

function getAnthropic() {
  if (!_anthropic) {
    _anthropic = createAnthropic({
      apiKey: getAIApiKey(),
      baseURL: ANTHROPIC_BASE_URL,
    })
  }
  return _anthropic
}

/**
 * Get model with specific configuration.
 *
 * Note: `temperature` is intentionally NOT returned. claude-opus-4-7
 * deprecated the param and rejects requests that include it. Callers
 * should NOT pass temperature to the SDK; rely on model defaults.
 */
export function getModelWithConfig(type: AIModelType) {
  const config = AI_MODEL_CONFIG[type]
  return {
    model: getAnthropic()(config.model),
    maxTokens: config.maxTokens,
  }
}
