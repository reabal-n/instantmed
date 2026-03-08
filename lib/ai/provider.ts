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
  // For conversational intake - balanced
  conversational: {
    model: 'claude-sonnet-4-20250514',
    temperature: 0.5,
    maxTokens: 1000,
  },
  // For creative suggestions - more variety
  creative: {
    model: 'claude-sonnet-4-20250514',
    temperature: 0.7,
    maxTokens: 500,
  },
  // For advanced analysis - lower temp for precision
  advanced: {
    model: 'claude-sonnet-4-20250514',
    temperature: 0.2,
    maxTokens: 4000,
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

// Get models on demand with config
export function getDefaultModel() {
  return getAnthropic()(AI_MODEL_CONFIG.clinical.model)
}

export function getAdvancedModel() {
  return getAnthropic()(AI_MODEL_CONFIG.advanced.model)
}

export function getConversationalModel() {
  return getAnthropic()(AI_MODEL_CONFIG.conversational.model)
}

export function getCreativeModel() {
  return getAnthropic()(AI_MODEL_CONFIG.creative.model)
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

/**
 * Check if AI is configured and available
 */
export function isAIConfigured(): boolean {
  return !!(getAIApiKey() || process.env.VERCEL)
}
