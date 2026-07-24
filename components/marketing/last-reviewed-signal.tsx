'use client'

import { Clock } from 'lucide-react'
import { useEffect, useState } from 'react'

import { lastReviewedLabel } from '@/lib/brand/last-reviewed-window'
import { cn } from '@/lib/utils'

const TICK_MS = 60_000

/**
 * "Last reviewed X min ago" — REAL data only.
 *
 * Fetches the platform-wide timestamp of the most recent completed review from
 * /api/last-reviewed (cached 60s, PHI-free, seeded-E2E rows excluded) and
 * renders nothing unless that review is genuinely fresh
 * (<= LAST_REVIEWED_FRESH_MINUTES). An honest absence beats an invented number:
 * the previous implementation fabricated the value from Math.random() seeded in
 * localStorage, which on a regulated health surface was indefensible.
 *
 * Renders nothing during SSR and until the fetch resolves, matching the old
 * mount-gated behavior (no hydration mismatch, no layout reservation change).
 */
export function LastReviewedSignal({ className }: { className?: string }) {
  const [reviewedAtMs, setReviewedAtMs] = useState<number | null>(null)
  const [nowMs, setNowMs] = useState<number | null>(null)

  useEffect(() => {
    let cancelled = false

    fetch('/api/last-reviewed')
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { lastReviewedAt?: string | null } | null) => {
        if (cancelled || !data?.lastReviewedAt) return
        const parsed = Date.parse(data.lastReviewedAt)
        if (!Number.isFinite(parsed)) return
        setReviewedAtMs(parsed)
        setNowMs(Date.now())
      })
      .catch(() => {
        // Marketing garnish — a failed fetch just means no signal.
      })

    const interval = setInterval(() => setNowMs(Date.now()), TICK_MS)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [])

  if (nowMs === null) return null

  const label = lastReviewedLabel(reviewedAtMs, nowMs)
  if (!label) return null

  return (
    <p className={cn('flex items-center gap-1.5 text-xs text-muted-foreground', className)}>
      <Clock className="w-3 h-3" />
      {label}
    </p>
  )
}
