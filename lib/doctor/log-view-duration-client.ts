"use client"

import { fetchWithCsrf, preloadCsrfToken } from "@/lib/security/csrf-client"

export function preloadViewDurationLogging() {
  void preloadCsrfToken().catch(() => undefined)
}

export function logIntakeViewDuration(intakeId: string, startedAt: number) {
  const rawDurationMs = Date.now() - startedAt
  const durationMs = Number.isFinite(rawDurationMs)
    ? Math.max(0, Math.min(86400000, Math.round(rawDurationMs)))
    : 0

  const params = new URLSearchParams({
    intakeId,
    durationMs: String(durationMs),
  })

  void fetchWithCsrf(`/api/doctor/log-view-duration?${params.toString()}`, {
    method: "POST",
    keepalive: true,
  }).catch(() => undefined)
}
