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

/**
 * Sanitize prompt input by stripping potential PII patterns.
 *
 * Removes:
 * - Medicare numbers (10-11 digit sequences)
 * - Australian phone numbers (04xx xxx xxx, +61 format)
 * - Email addresses
 * - Date of birth patterns (DD/MM/YYYY, DD-MM-YYYY, YYYY-MM-DD)
 *
 * Returns the sanitized text with PII replaced by placeholder tokens.
 */
export function sanitizePromptInput(text: string): string {
  let sanitized = text

  // Strip email addresses (before other patterns to avoid partial matches)
  sanitized = sanitized.replace(
    /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
    "[EMAIL_REDACTED]"
  )

  // Strip Australian phone numbers: +61XXXXXXXXX or 0X XXXX XXXX variants
  sanitized = sanitized.replace(
    /\+61\s?\d[\s-]?\d{4}[\s-]?\d{4}/g,
    "[PHONE_REDACTED]"
  )
  sanitized = sanitized.replace(
    /\b0[2-9][\s-]?\d{4}[\s-]?\d{4}\b/g,
    "[PHONE_REDACTED]"
  )

  // Strip date of birth patterns: DD/MM/YYYY, DD-MM-YYYY, YYYY-MM-DD
  sanitized = sanitized.replace(
    /\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b/g,
    "[DOB_REDACTED]"
  )
  sanitized = sanitized.replace(
    /\b\d{4}[/-]\d{1,2}[/-]\d{1,2}\b/g,
    "[DOB_REDACTED]"
  )

  // Strip Medicare numbers (10-11 digit sequences)
  sanitized = sanitized.replace(
    /\b\d{10,11}\b/g,
    "[MEDICARE_REDACTED]"
  )

  return sanitized
}
