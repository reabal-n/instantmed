import { createAnthropic } from "@ai-sdk/anthropic"
import type { LanguageModel } from "ai"

import { getEnv } from "./local-env"

const ANTHROPIC_BASE_URL = "https://api.anthropic.com/v1"
const ANTHROPIC_MODELS_URL = `${ANTHROPIC_BASE_URL}/models`
const ANTHROPIC_VERSION = "2023-06-01"
const ANTHROPIC_MODEL_TIMEOUT_MS = 5000
const DIRECT_MODEL_ENV_NAMES = ["CLAUDE_MODEL", "ANTHROPIC_MODEL", "ANTHROPIC_CLAUDE_MODEL"] as const
const GATEWAY_MODEL_ENV_NAMES = [
  "CLAUDE_GATEWAY_MODEL",
  "AI_GATEWAY_CLAUDE_MODEL",
  "VERCEL_AI_GATEWAY_CLAUDE_MODEL",
] as const
const FALLBACK_DIRECT_OPUS_MODEL = "claude-opus-4-7"
const FALLBACK_GATEWAY_OPUS_MODEL = "anthropic/claude-opus-4.7"

type ClaudeCredentialSource = "anthropic" | "gateway"

export interface ClaudeModelResolution {
  source: ClaudeCredentialSource
  modelId: string
  configuredBy: "env" | "anthropic-models-api" | "fallback"
}

interface AnthropicModelInfo {
  id?: unknown
  created_at?: unknown
}

let cachedResolution:
  | {
      cacheKey: string
      promise: Promise<ClaudeModelResolution>
    }
  | null = null

export function getClaudeCredentialSource(): ClaudeCredentialSource | null {
  if (getEnv("ANTHROPIC_API_KEY")) return "anthropic"
  if (getGatewayKey()) return "gateway"
  return null
}

export async function getClaudeModelLabel(): Promise<string> {
  const resolution = await resolveClaudeModelConfig()
  return `${resolution.modelId} (${resolution.configuredBy})`
}

export async function getClaudeModel(): Promise<LanguageModel> {
  const resolution = await resolveClaudeModelConfig()

  if (resolution.source === "gateway") {
    // AI SDK Gateway string models read AI_GATEWAY_API_KEY specifically.
    // Keep VERCEL_AI_GATEWAY_API_KEY as a project-compatible alias.
    const gatewayKey = getGatewayKey()
    if (gatewayKey && !process.env.AI_GATEWAY_API_KEY?.trim()) {
      process.env.AI_GATEWAY_API_KEY = gatewayKey
    }
    return resolution.modelId
  }

  const directKey = getEnv("ANTHROPIC_API_KEY")
  if (!directKey) {
    throw new Error("No ANTHROPIC_API_KEY found for direct Claude model resolution.")
  }

  const anthropic = createAnthropic({
    apiKey: directKey,
    baseURL: ANTHROPIC_BASE_URL,
  })
  return anthropic(resolution.modelId)
}

export async function resolveClaudeModelConfig(): Promise<ClaudeModelResolution> {
  const source = getClaudeCredentialSource()
  if (!source) {
    throw new Error(
      "No Claude credential found. Set ANTHROPIC_API_KEY, AI_GATEWAY_API_KEY, or VERCEL_AI_GATEWAY_API_KEY.",
    )
  }

  const cacheKey = [
    source,
    getEnv("ANTHROPIC_API_KEY") ? "direct-key" : "",
    getGatewayKey() ? "gateway-key" : "",
    getFirstEnv(DIRECT_MODEL_ENV_NAMES) ?? "",
    getFirstEnv(GATEWAY_MODEL_ENV_NAMES) ?? "",
  ].join(":")

  if (cachedResolution?.cacheKey === cacheKey) {
    return cachedResolution.promise
  }

  const promise = source === "anthropic" ? resolveDirectModel() : resolveGatewayModel()
  cachedResolution = { cacheKey, promise }
  return promise
}

async function resolveDirectModel(): Promise<ClaudeModelResolution> {
  const configuredModel = getFirstEnv(DIRECT_MODEL_ENV_NAMES)
  if (configuredModel) {
    return { source: "anthropic", modelId: configuredModel, configuredBy: "env" }
  }

  const apiKey = getEnv("ANTHROPIC_API_KEY")
  if (apiKey) {
    const discovered = await discoverLatestAnthropicOpusModel(apiKey).catch(() => undefined)
    if (discovered) {
      return { source: "anthropic", modelId: discovered, configuredBy: "anthropic-models-api" }
    }
  }

  return { source: "anthropic", modelId: FALLBACK_DIRECT_OPUS_MODEL, configuredBy: "fallback" }
}

async function resolveGatewayModel(): Promise<ClaudeModelResolution> {
  const configuredModel = getFirstEnv(GATEWAY_MODEL_ENV_NAMES)
  if (configuredModel) {
    return { source: "gateway", modelId: configuredModel, configuredBy: "env" }
  }

  const sharedModel = getFirstEnv(DIRECT_MODEL_ENV_NAMES)
  if (sharedModel?.includes("/")) {
    return { source: "gateway", modelId: sharedModel, configuredBy: "env" }
  }

  return { source: "gateway", modelId: FALLBACK_GATEWAY_OPUS_MODEL, configuredBy: "fallback" }
}

async function discoverLatestAnthropicOpusModel(apiKey: string): Promise<string | undefined> {
  const response = await fetch(ANTHROPIC_MODELS_URL, {
    headers: {
      "anthropic-version": ANTHROPIC_VERSION,
      "x-api-key": apiKey,
    },
    signal: AbortSignal.timeout(ANTHROPIC_MODEL_TIMEOUT_MS),
  })

  if (!response.ok) {
    throw new Error(`Anthropic model list returned ${response.status}`)
  }

  const payload = (await response.json()) as { data?: AnthropicModelInfo[] }
  return selectLatestAnthropicOpusModel(payload.data ?? [])
}

export function selectLatestAnthropicOpusModel(models: AnthropicModelInfo[]): string | undefined {
  const opusModels = models
    .map((model, index) => {
      const id = typeof model.id === "string" ? model.id : ""
      const createdAt = typeof model.created_at === "string" ? Date.parse(model.created_at) : Number.NaN
      return { id, createdAt, index }
    })
    .filter((model) => model.id.startsWith("claude-opus-"))

  if (opusModels.length === 0) return undefined

  return opusModels.sort((a, b) => {
    const aHasDate = Number.isFinite(a.createdAt)
    const bHasDate = Number.isFinite(b.createdAt)

    if (aHasDate && bHasDate && a.createdAt !== b.createdAt) {
      return b.createdAt - a.createdAt
    }
    if (aHasDate !== bHasDate) {
      return aHasDate ? -1 : 1
    }
    return a.index - b.index
  })[0]?.id
}

function getFirstEnv(names: readonly string[]): string | undefined {
  for (const name of names) {
    const value = getEnv(name)
    if (value) return value
  }
  return undefined
}

function getGatewayKey(): string | undefined {
  return (
    getEnv("AI_GATEWAY_API_KEY") ||
    getEnv("VERCEL_AI_GATEWAY_API_KEY")
  )
}
