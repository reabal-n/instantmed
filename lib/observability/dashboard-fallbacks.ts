import { createLogger } from "@/lib/observability/logger"
import { createSafeLogContext } from "@/lib/observability/sanitize-phi"

const log = createLogger("dashboard-fallbacks")

export interface DashboardDegradedReadEvent {
  label: string
  error: Error
  attempts: number
  context?: Record<string, unknown>
}

export function reportDashboardDegradedRead(event: DashboardDegradedReadEvent): void {
  const safeContext = createSafeLogContext({
    label: event.label,
    attempts: event.attempts,
    error: event.error.message,
    ...(event.context ?? {}),
  })

  log.info("Dashboard read degraded; serving fallback", safeContext)

  if (process.env.NODE_ENV !== "production") return

  import("@sentry/nextjs")
    .then((Sentry) => {
      Sentry.captureMessage("Dashboard read degraded; serving fallback", {
        level: "warning",
        tags: {
          source: "dashboard-read-model",
          dashboard_read: event.label,
        },
        extra: safeContext,
      })
    })
    .catch(() => {
      // Observability failure must never break a dashboard read fallback.
    })
}
