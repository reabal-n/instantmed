"use client"

import { useRouter } from "next/navigation"
import { useEffect, useRef, useState } from "react"

const REFRESH_MS = 60_000
const TICK_MS = 15_000

/**
 * Live indicator + silent auto-refresh for the operator Overview.
 *
 * The page is a `force-dynamic` server component, so `router.refresh()` re-runs
 * every data helper (PostHog HogQL + Google Ads GAQL + Supabase) server-side and
 * streams fresh values in without a full navigation. We only refresh while the
 * tab is visible so a backgrounded cockpit doesn't hammer the APIs.
 */
export function LiveRefresh({ generatedAt }: { generatedAt: string }) {
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [now, setNow] = useState(0)
  const generatedMs = useRef(new Date(generatedAt).getTime())

  // Keep the "synced Xs ago" label current without a network call.
  useEffect(() => {
    setMounted(true)
    setNow(Date.now())
    const tick = setInterval(() => setNow(Date.now()), TICK_MS)
    return () => clearInterval(tick)
  }, [])

  // Reset the age clock whenever the server sends a newer snapshot.
  useEffect(() => {
    generatedMs.current = new Date(generatedAt).getTime()
    setNow(Date.now())
  }, [generatedAt])

  useEffect(() => {
    const refresh = setInterval(() => {
      if (typeof document === "undefined" || document.visibilityState === "visible") {
        router.refresh()
      }
    }, REFRESH_MS)
    return () => clearInterval(refresh)
  }, [router])

  const seconds = Math.max(0, Math.round((now - generatedMs.current) / 1000))
  const ago = seconds < 60 ? `${seconds}s ago` : `${Math.round(seconds / 60)}m ago`

  return (
    <span
      className="inline-flex items-center gap-1.5 text-xs text-muted-foreground"
      title="Live data from PostHog, Google Ads, and Supabase. Auto-refreshes every 60s."
    >
      <span
        aria-hidden="true"
        className="h-2 w-2 shrink-0 rounded-full bg-emerald-500 ring-1 ring-inset ring-black/5 motion-safe:animate-pulse"
      />
      {mounted ? `Live · synced ${ago}` : "Live"}
    </span>
  )
}
