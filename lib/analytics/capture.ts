/**
 * Safe PostHog event capture via dynamic import.
 *
 * Avoids static `import posthog from "posthog-js"` which triggers the
 * webpack chunk factory race condition in dev (Next.js #70703).
 */

import { resolvePostHogClient } from "@/lib/analytics/posthog-client-resolver"

const POSTHOG_CAPTURE_RETRY_MS = 100
const POSTHOG_CAPTURE_MAX_RETRIES = 50
type SafeCaptureOptions = {
  send_instantly?: boolean
  transport?: "XHR" | "fetch" | "sendBeacon"
}

export function capture(
  event: string,
  properties?: Record<string, unknown>,
  options?: SafeCaptureOptions,
  attempt = 0,
) {
  if (!process.env.NEXT_PUBLIC_POSTHOG_KEY || process.env.NEXT_PUBLIC_PLAYWRIGHT === "1") {
    return
  }

  import("posthog-js").then((module) => {
    const posthog = resolvePostHogClient(module)
    if (!posthog) return

    if (posthog.__loaded) {
      posthog.capture(event, properties, options)
      return
    }

    if (attempt >= POSTHOG_CAPTURE_MAX_RETRIES) return
    setTimeout(
      () => capture(event, properties, options, attempt + 1),
      POSTHOG_CAPTURE_RETRY_MS,
    )
  }).catch(() => {})
}

export function captureException(error: unknown) {
  import("posthog-js").then((module) => {
    const posthog = resolvePostHogClient(module)
    if (!posthog) return

    if (posthog.__loaded) {
      posthog.captureException(error)
    }
  }).catch(() => {})
}
