/**
 * Safe PostHog event capture via dynamic import.
 *
 * Avoids static `import posthog from "posthog-js"` which triggers the
 * webpack chunk factory race condition in dev (Next.js #70703).
 * If PostHog isn't loaded, events are silently dropped.
 */

export function capture(event: string, properties?: Record<string, unknown>) {
  import("posthog-js").then(({ default: posthog }) => {
    if (posthog.__loaded) {
      posthog.capture(event, properties)
    }
  }).catch(() => {})
}

export function captureException(error: unknown) {
  import("posthog-js").then(({ default: posthog }) => {
    if (posthog.__loaded) {
      posthog.captureException(error)
    }
  }).catch(() => {})
}
