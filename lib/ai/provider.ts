import { createOpenAI } from "@ai-sdk/openai"

/**
 * AI Provider Configuration
 * 
 * Uses OpenAI via AI SDK. Configure via OPENAI_API_KEY env var.
 * Uses lazy initialization to avoid build-time errors.
 */

// Lazy provider instance (created on first use)
let _openai: ReturnType<typeof createOpenAI> | null = null

function getOpenAI() {
  if (!_openai) {
    _openai = createOpenAI({
      apiKey: process.env.OPENAI_API_KEY || process.env.AI_GATEWAY_API_KEY,
    })
  }
  return _openai
}

// Default model for general use (lazy)
export const defaultModel = {
  get provider() {
    return getOpenAI()("gpt-4o-mini")
  }
}

// Export a function to get the model for use with generateText
export function getDefaultModel() {
  return getOpenAI()("gpt-4o-mini")
}

// Export a function to get the advanced model
export function getAdvancedModel() {
  return getOpenAI()("gpt-4o")
}
