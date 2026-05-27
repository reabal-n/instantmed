"use client"

import { useEffect, useMemo, useState } from "react"

export function formatRefreshAge(nowMs: number, refreshedAt: Date | number | null | undefined): string {
  if (!refreshedAt) return "Updated just now"
  const refreshedMs = refreshedAt instanceof Date ? refreshedAt.getTime() : refreshedAt
  if (!Number.isFinite(refreshedMs)) return "Updated just now"

  const elapsedSeconds = Math.max(0, Math.floor((nowMs - refreshedMs) / 1000))
  if (elapsedSeconds < 5) return "Updated just now"
  if (elapsedSeconds < 60) return `Updated ${elapsedSeconds}s ago`

  const elapsedMinutes = Math.floor(elapsedSeconds / 60)
  if (elapsedMinutes < 60) {
    return `Updated ${elapsedMinutes}m ago`
  }

  const elapsedHours = Math.floor(elapsedMinutes / 60)
  return `Updated ${elapsedHours}h ago`
}

export function useRelativeRefreshAge(
  refreshedAt: Date | number | null | undefined,
  intervalMs = 5000,
): string {
  const [nowMs, setNowMs] = useState(() => Date.now())

  useEffect(() => {
    setNowMs(Date.now())
    const interval = window.setInterval(() => setNowMs(Date.now()), intervalMs)
    return () => window.clearInterval(interval)
  }, [intervalMs, refreshedAt])

  return useMemo(() => formatRefreshAge(nowMs, refreshedAt), [nowMs, refreshedAt])
}
