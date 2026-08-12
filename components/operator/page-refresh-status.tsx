"use client"

import { Clock3 } from "lucide-react"
import { useRouter } from "next/navigation"
import { useEffect, useRef, useState } from "react"

import { Button } from "@/components/ui/button"

const REFRESH_MS = 5 * 60_000
const TICK_MS = 15_000

/**
 * Page-fetch freshness for bounded operator decision surfaces.
 *
 * This deliberately does not claim that every upstream source is current.
 * Source-specific evidence age and health belong beside the decision they
 * qualify, while this control reports only when the page snapshot was fetched.
 */
export function PageRefreshStatus({ generatedAt }: { generatedAt: string }) {
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [now, setNow] = useState(0)
  const generatedMs = useRef(new Date(generatedAt).getTime())

  useEffect(() => {
    setMounted(true)
    setNow(Date.now())
    const tick = setInterval(() => setNow(Date.now()), TICK_MS)
    return () => clearInterval(tick)
  }, [])

  useEffect(() => {
    generatedMs.current = new Date(generatedAt).getTime()
    setNow(Date.now())
  }, [generatedAt])

  useEffect(() => {
    const refreshIfVisible = () => {
      if (typeof document === "undefined" || document.visibilityState === "visible") {
        router.refresh()
      }
    }
    const refresh = setInterval(refreshIfVisible, REFRESH_MS)
    return () => clearInterval(refresh)
  }, [router])

  useEffect(() => {
    const refreshIfStale = () => {
      if (
        typeof document !== "undefined"
        && document.visibilityState === "visible"
        && Date.now() - generatedMs.current >= REFRESH_MS
      ) {
        router.refresh()
      }
    }
    document.addEventListener("visibilitychange", refreshIfStale)
    window.addEventListener("focus", refreshIfStale)
    return () => {
      document.removeEventListener("visibilitychange", refreshIfStale)
      window.removeEventListener("focus", refreshIfStale)
    }
  }, [router])

  const seconds = Math.max(0, Math.round((now - generatedMs.current) / 1000))
  const ago = seconds < 60 ? `${seconds}s ago` : `${Math.round(seconds / 60)}m ago`

  return (
    <div className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
      <span
        className="inline-flex items-center gap-1.5"
        title="This is when the page snapshot was fetched. Source evidence may be older and is labelled separately."
      >
        <Clock3 className="h-3.5 w-3.5" aria-hidden />
        {mounted ? `Page refreshed ${ago}` : "Page refreshed"}
      </span>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="min-h-11 px-2 text-xs sm:min-h-9"
        aria-label="Refresh page data"
        onClick={() => router.refresh()}
      >
        Refresh
      </Button>
    </div>
  )
}
