import { createOpenAI } from "@ai-sdk/openai"

/**
 * AI Provider Configuration
 * 
 * Uses OpenAI via Vercel AI Gateway. Configure via VERCEL_AI_GATEWAY_API_KEY env var.
 * Falls back to AI_GATEWAY_API_KEY or OPENAI_API_KEY for local development.
 * Uses lazy initialization to avoid build-time errors.
 */

// Model configurations with recommended temperatures
export const AI_MODEL_CONFIG = {
  // For medical documentation - requires high accuracy
  clinical: {
    model: 'gpt-4o-mini',
    temperature: 0.1,
    maxTokens: 2000,
  },
  // For conversational intake - balanced
  conversational: {
    model: 'gpt-4o-mini',
    temperature: 0.5,
    maxTokens: 1000,
  },
  // For creative suggestions - more variety
  creative: {
    model: 'gpt-4o-mini',
    temperature: 0.7,
    maxTokens: 500,
  },
  // For advanced analysis - full model
  advanced: {
    model: 'gpt-4o',
    temperature: 0.2,
    maxTokens: 4000,
  },
} as const

export type AIModelType = keyof typeof AI_MODEL_CONFIG

// Lazy provider instance
let _openai: ReturnType<typeof createOpenAI> | null = null

/**
 * Get the API key with priority:
 * 1. VERCEL_AI_GATEWAY_API_KEY (production)
 * 2. AI_GATEWAY_API_KEY (staging)
 * 3. OPENAI_API_KEY (local dev)
 */
export function getAIApiKey(): string | undefined {
  return (
    process.env.VERCEL_AI_GATEWAY_API_KEY ||
    process.env.AI_GATEWAY_API_KEY ||
    process.env.OPENAI_API_KEY
  )
}

function getOpenAI() {
  if (!_openai) {
    _openai = createOpenAI({
      apiKey: getAIApiKey(),
      baseURL: process.env.VERCEL_AI_GATEWAY_URL || 'https://api.openai.com/v1',
    })
  }
  return _openai
}

// Get models on demand with config
export function getDefaultModel() {
  return getOpenAI()(AI_MODEL_CONFIG.clinical.model)
}

export function getAdvancedModel() {
  return getOpenAI()(AI_MODEL_CONFIG.advanced.model)
}

export function getConversationalModel() {
  return getOpenAI()(AI_MODEL_CONFIG.conversational.model)
}

export function getCreativeModel() {
  return getOpenAI()(AI_MODEL_CONFIG.creative.model)
}

/**
 * Get model with specific configuration
 */
export function getModelWithConfig(type: AIModelType) {
  const config = AI_MODEL_CONFIG[type]
  return {
    model: getOpenAI()(config.model),
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
