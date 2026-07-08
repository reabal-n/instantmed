import type { PostHog } from "posthog-js"

type PostHogModule = typeof import("posthog-js")

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function getProperty(value: unknown, key: string): unknown {
  return isRecord(value) ? value[key] : undefined
}

function isPostHogClient(value: unknown): value is PostHog {
  return (
    isRecord(value) &&
    typeof value.capture === "function" &&
    typeof value.init === "function"
  )
}

export function resolvePostHogClient(module: PostHogModule): PostHog | null {
  const defaultExport = module.default as unknown
  const candidates = [
    module.posthog,
    defaultExport,
    getProperty(defaultExport, "posthog"),
    getProperty(defaultExport, "default"),
  ]

  return candidates.find(isPostHogClient) ?? null
}
