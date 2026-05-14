import { createAnthropic } from "@ai-sdk/anthropic"

/**
 * AI Provider Configuration
 *
 * Uses Anthropic Claude via Vercel AI SDK.
 * Configure via ANTHROPIC_API_KEY env var (preferred) or VERCEL_AI_GATEWAY_API_KEY.
 * Uses lazy initialization to avoid build-time errors.
 */

// Model configurations with recommended temperatures
export const AI_MODEL_CONFIG = {
  // For medical documentation - requires high accuracy
  clinical: {
    model: 'claude-sonnet-4-20250514',
    temperature: 0.1,
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

function getAnthropic() {
  if (!_anthropic) {
    _anthropic = createAnthropic({
      apiKey: getAIApiKey(),
    })
  }
  return _anthropic
}

/**
 * Get model with specific configuration
 */
export function getModelWithConfig(type: AIModelType) {
  const config = AI_MODEL_CONFIG[type]
  return {
    model: getAnthropic()(config.model),
    temperature: config.temperature,
    maxTokens: config.maxTokens,
  }
}
