"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import { useReducedMotion } from "@/components/ui/motion"
import { Button } from "@/components/ui/button"
import { AlertTriangle, Home, RefreshCw, MessageCircle } from "lucide-react"
import { createLogger } from "@/lib/observability/logger"
import { sanitizeError, sanitizeUrl } from "@/lib/observability/sanitize-phi"
import { fadeIn, fadeUp as slideUp } from "@/lib/motion"
// Sentry import removed — dynamic import in useEffect to avoid module factory race condition.
// Sentry auto-captures unhandled errors via instrumentation-client.ts anyway.

const log = createLogger("error")

/**
 * Derive app area from pathname for Sentry tagging
 */
function getAppAreaFromPathname(pathname: string): "admin" | "doctor" | "patient" | "public" {
  if (pathname.startsWith("/admin")) return "admin"
  if (pathname.startsWith("/doctor")) return "doctor"
  if (pathname.startsWith("/patient")) return "patient"
  return "public"
}

/**
 * Get safe E2E cookies for Sentry context (only __e2e_* cookies)
 */
function getSafeE2ECookies(): Record<string, string> {
  if (typeof document === "undefined") return {}
  const cookies: Record<string, string> = {}
  const cookieString = document.cookie || ""
  for (const cookie of cookieString.split(";")) {
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
  const prefersReducedMotion = useReducedMotion()

  useEffect(() => {
    // Auto-recover from ChunkLoadError (stale chunks after deployment)
    if (error.name === "ChunkLoadError" || error.message?.includes("Loading chunk")) {
      try {
        const key = "chunk-reload-" + window.location.pathname
        const lastReload = sessionStorage.getItem(key)
        const now = Date.now()
        // Only auto-reload once per path within 60 seconds to prevent loops
        if (!lastReload || now - Number(lastReload) > 60_000) {
          sessionStorage.setItem(key, String(now))
          window.location.reload()
          return
        }
      } catch {
        // sessionStorage may be unavailable
      }
    }

    // Dev-only: auto-recover from webpack chunk factory race condition (Next.js #70703).
    // Async script loading can resolve modules before factories are registered, causing
    // "Cannot read properties of undefined (reading 'call')". A single reload fixes it.
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

    // Log error with PHI sanitization for compliance
    const sanitizedError = sanitizeError(error)
    const pathname = typeof window !== "undefined" ? window.location.pathname : ""
    const searchParams = typeof window !== "undefined" ? window.location.search : ""
    const sanitizedUrl = typeof window !== "undefined"
      ? sanitizeUrl(window.location.href)
      : undefined

    log.error("[GlobalErrorBoundary]", {
      ...sanitizedError,
      url: sanitizedUrl,
      retryCount,
    })

    // Capture to Sentry with structured context (dynamic import to avoid module factory race)
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

      // Enhanced E2E diagnostics - log full error details to console for Playwright capture
      if (isPlaywright || process.env.NODE_ENV === "test") {
        // eslint-disable-next-line no-console
        console.error("[E2E DIAGNOSTIC] Error Boundary Triggered")
        // eslint-disable-next-line no-console
        console.error("[E2E DIAGNOSTIC] Sentry Event ID:", eventId)
        // eslint-disable-next-line no-console
        console.error("[E2E DIAGNOSTIC] Error name:", error.name)
        // eslint-disable-next-line no-console
        console.error("[E2E DIAGNOSTIC] Error message:", error.message)
        // eslint-disable-next-line no-console
        console.error("[E2E DIAGNOSTIC] Error digest:", error.digest)
        // eslint-disable-next-line no-console
        console.error("[E2E DIAGNOSTIC] Error stack:", error.stack)
        // eslint-disable-next-line no-console
        console.error("[E2E DIAGNOSTIC] Full error object:", JSON.stringify(error, Object.getOwnPropertyNames(error), 2))
      }
    }).catch(() => {
      // Sentry unavailable — error still handled by UI
    })
  }, [error, retryCount])

  const handleRetry = () => {
    if (retryCount < maxRetries) {
      setRetryCount(prev => prev + 1)
      reset()
    }
  }

  return (
    <main className="min-h-screen relative flex items-center justify-center px-4 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-linear-to-br from-background via-background to-dawn-50/20 dark:to-dawn-950/10" />
      
      {/* Gradient orb — static when reduced motion preferred */}
      {prefersReducedMotion ? (
        <div className="absolute top-1/3 left-1/3 w-80 h-80 bg-dawn-500/10 rounded-full blur-3xl opacity-40" />
      ) : (
        <motion.div
          className="absolute top-1/3 left-1/3 w-80 h-80 bg-dawn-500/10 rounded-full blur-3xl"
          animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeOut" }}
        />
      )}
      
      <div className="relative z-10 text-center max-w-lg">
        {/* Error Icon */}
        <motion.div 
          className="relative mb-8 inline-block"
          initial={prefersReducedMotion ? {} : { scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          <div className="relative">
            {/* Glow effect */}
            {prefersReducedMotion ? (
              <div className="absolute inset-0 rounded-3xl bg-amber-500/20 blur-xl opacity-40" />
            ) : (
              <motion.div
                className="absolute inset-0 rounded-3xl bg-amber-500/20 blur-xl"
                animate={{ opacity: [0.3, 0.6, 0.3] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
              />
            )}
            <div className="relative bg-white dark:bg-card rounded-3xl p-8 border border-border/50 shadow-md shadow-primary/[0.06]">
              <AlertTriangle className="h-14 w-14 text-amber-500" />
            </div>
          </div>
        </motion.div>

        <motion.h1
          className="text-2xl sm:text-3xl font-semibold mb-4 text-foreground"
          initial="initial"
          animate="animate"
          variants={slideUp}
          transition={{ delay: 0.2 }}
        >
          Something went wrong
        </motion.h1>
        
        <motion.p
          className="text-muted-foreground mb-2"
          initial="initial"
          animate="animate"
          variants={slideUp}
          transition={{ delay: 0.3 }}
        >
          We hit an unexpected bump. Don&apos;t worry — your data is safe.
        </motion.p>
        
        {error.digest && (
          <motion.p
            className="text-xs text-muted-foreground/60 mb-8 font-mono bg-muted/30 rounded-lg px-3 py-1.5 inline-block"
            initial="initial"
            animate="animate"
            variants={fadeIn}
            transition={{ delay: 0.4 }}
          >
            Error ID: {error.digest}
          </motion.p>
        )}

        <motion.div
          className="flex flex-col sm:flex-row items-center justify-center gap-3"
          initial="initial"
          animate="animate"
          variants={slideUp}
          transition={{ delay: 0.5 }}
        >
          <Button onClick={handleRetry} disabled={retryCount >= maxRetries} className="rounded-xl shadow-lg shadow-primary/25 w-full sm:w-auto min-h-[44px] touch-target">
            <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />
            {retryCount >= maxRetries ? "Max retries reached" : `Try Again${retryCount > 0 ? ` (${maxRetries - retryCount} left)` : ""}`}
          </Button>
          <Button variant="outline" asChild className="rounded-xl w-full sm:w-auto min-h-[44px] touch-target">
            <Link href="/">
              <Home className="mr-2 h-4 w-4" aria-hidden="true" />
              Go Home
            </Link>
          </Button>
        </motion.div>

        {/* Help Link */}
        <motion.div
          className="mt-8"
          initial="initial"
          animate="animate"
          variants={fadeIn}
          transition={{ delay: 0.7 }}
        >
          <Link
            href="/contact"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors px-4 py-2 rounded-lg hover:bg-muted/50"
          >
            <MessageCircle className="h-4 w-4" aria-hidden="true" />
            Still having issues? Contact support
          </Link>
        </motion.div>
      </div>
    </main>
  )
}
