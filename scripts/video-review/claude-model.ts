import { createAnthropic } from "@ai-sdk/anthropic"
import type { LanguageModel } from "ai"

export const CLAUDE_DIRECT_MODEL = "claude-opus-4-7"
export const CLAUDE_GATEWAY_MODEL = "anthropic/claude-opus-4.7"

const ANTHROPIC_BASE_URL = "https://api.anthropic.com/v1"

export function getClaudeCredentialSource(): "anthropic" | "gateway" | null {
  if (process.env.ANTHROPIC_API_KEY?.trim()) return "anthropic"
  if (getGatewayKey()) return "gateway"
  return null
}

export function getClaudeModelLabel(): string {
  return getClaudeCredentialSource() === "gateway"
    ? CLAUDE_GATEWAY_MODEL
    : CLAUDE_DIRECT_MODEL
}

export function getClaudeModel(): LanguageModel {
  const directKey = process.env.ANTHROPIC_API_KEY?.trim()
  if (directKey) {
    const anthropic = createAnthropic({
      apiKey: directKey,
      baseURL: ANTHROPIC_BASE_URL,
    })
    return anthropic(CLAUDE_DIRECT_MODEL)
  }

  const gatewayKey = getGatewayKey()
  if (!gatewayKey) {
    throw new Error(
      "No Claude credential found. Set ANTHROPIC_API_KEY, AI_GATEWAY_API_KEY, or VERCEL_AI_GATEWAY_API_KEY.",
    )
  }

  // AI SDK Gateway string models read AI_GATEWAY_API_KEY specifically.
  // Keep VERCEL_AI_GATEWAY_API_KEY as a project-compatible alias.
  if (!process.env.AI_GATEWAY_API_KEY?.trim()) {
    process.env.AI_GATEWAY_API_KEY = gatewayKey
  }

  return CLAUDE_GATEWAY_MODEL
}

function getGatewayKey(): string | undefined {
  return (
    process.env.AI_GATEWAY_API_KEY?.trim() ||
    process.env.VERCEL_AI_GATEWAY_API_KEY?.trim()
  )
}
