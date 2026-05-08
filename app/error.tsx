"use client"

import Link from "next/link"
import { useEffect, useState } from "react"

function getAppAreaFromPathname(pathname: string): "admin" | "doctor" | "patient" | "public" {
  if (pathname.startsWith("/admin")) return "admin"
  if (pathname.startsWith("/doctor")) return "doctor"
  if (pathname.startsWith("/patient")) return "patient"
  return "public"
}

function getSafeE2ECookies(): Record<string, string> {
  if (typeof document === "undefined") return {}

  const cookies: Record<string, string> = {}
  for (const cookie of (document.cookie || "").split(";")) {
    const [name, value] = cookie.trim().split("=")
    if (name?.startsWith("__e2e_")) {
      cookies[name] = value || ""
    }
  }
  return cookies
}

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const [retryCount, setRetryCount] = useState(0)
  const maxRetries = 3

  useEffect(() => {
    if (error.name === "ChunkLoadError" || error.message?.includes("Loading chunk")) {
      try {
        const key = "chunk-reload-" + window.location.pathname
        const lastReload = sessionStorage.getItem(key)
        const now = Date.now()
        if (!lastReload || now - Number(lastReload) > 60_000) {
          sessionStorage.setItem(key, String(now))
          window.location.reload()
          return
        }
      } catch {
        // sessionStorage may be unavailable
      }
    }

    if (process.env.NODE_ENV === "development" && error.message?.includes("reading 'call'")) {
      try {
        const key = "webpack-race-reload-" + window.location.pathname
        const lastReload = sessionStorage.getItem(key)
        const now = Date.now()
        if (!lastReload || now - Number(lastReload) > 30_000) {
          sessionStorage.setItem(key, String(now))
          window.location.reload()
          return
        }
      } catch {
        // fall through to error UI
      }
    }

    const pathname = typeof window !== "undefined" ? window.location.pathname : ""
    const searchParams = typeof window !== "undefined" ? window.location.search : ""
    const appArea = getAppAreaFromPathname(pathname)
    const e2eCookies = getSafeE2ECookies()
    const isPlaywright = process.env.NEXT_PUBLIC_PLAYWRIGHT === "1"

    import("@sentry/nextjs").then((Sentry) => {
      const eventId = Sentry.captureException(error, {
        tags: {
          boundary: "error",
          app_area: appArea,
          ...(isPlaywright && { playwright: "1" }),
          ...(e2eCookies.__e2e_run_id && { e2e_run_id: e2eCookies.__e2e_run_id }),
          ...(e2eCookies.__e2e_auth_role && { user_role: e2eCookies.__e2e_auth_role }),
        },
        extra: {
          digest: error.digest,
          pathname,
          searchParams,
          retryCount,
          ...(isPlaywright && { e2e_cookies: e2eCookies }),
        },
      })

      if (isPlaywright || process.env.NODE_ENV === "test") {
        // eslint-disable-next-line no-console
        console.error("[E2E DIAGNOSTIC] Error Boundary Triggered", {
          eventId,
          name: error.name,
          message: error.message,
          digest: error.digest,
          stack: error.stack,
        })
      }
    }).catch(() => {
      // Sentry unavailable - error still handled by UI
    })
  }, [error, retryCount])

  const canRetry = retryCount < maxRetries

  return (
    <main className="min-h-screen bg-background px-4 py-10 text-foreground">
      <div className="mx-auto flex min-h-[70vh] max-w-md flex-col items-center justify-center text-center">
        <div className="mb-6 inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-amber-200 bg-amber-50 text-amber-700">
          <svg
            aria-hidden="true"
            className="h-7 w-7"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3" />
            <path d="M12 9v4" />
            <path d="M12 17h.01" />
          </svg>
        </div>

        <h1 className="text-2xl font-semibold tracking-normal">Something went wrong</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          Please try again. If this keeps happening, contact support and include this reference:
          {" "}
          <span className="font-mono text-xs text-foreground">{error.digest || "not available"}</span>
        </p>

        <div className="mt-7 flex w-full flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={() => {
              setRetryCount((count) => count + 1)
              reset()
            }}
            disabled={!canRetry}
            className="inline-flex min-h-11 flex-1 items-center justify-center rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {canRetry ? "Try again" : "Max retries reached"}
          </button>
          <Link
            href="/"
            className="inline-flex min-h-11 flex-1 items-center justify-center rounded-xl border border-border bg-background px-5 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
          >
            Go home
          </Link>
        </div>
      </div>
    </main>
  )
}
