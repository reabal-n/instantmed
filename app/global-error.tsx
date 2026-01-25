"use client"
/* eslint-disable no-console -- Global error boundary intentionally uses console for minimal dependency */

import { useEffect } from "react"
import { AlertTriangle, RefreshCw } from "lucide-react"
import * as Sentry from "@sentry/nextjs"

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

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("Global application error:", error)

    // Gather context
    const pathname = typeof window !== "undefined" ? window.location.pathname : ""
    const searchParams = typeof window !== "undefined" ? window.location.search : ""
    const appArea = getAppAreaFromPathname(pathname)
    const e2eCookies = getSafeE2ECookies()
    const isPlaywright = process.env.NEXT_PUBLIC_PLAYWRIGHT === "1" || 
      (typeof window !== "undefined" && (window as unknown as { __PLAYWRIGHT__?: boolean }).__PLAYWRIGHT__)
    
    // Report to Sentry with structured context
    const eventId = Sentry.captureException(error, {
      tags: {
        boundary: "global-error",
        app_area: appArea,
        ...(isPlaywright && { playwright: "1" }),
        ...(e2eCookies.__e2e_run_id && { e2e_run_id: e2eCookies.__e2e_run_id }),
        ...(e2eCookies.__e2e_auth_role && { user_role: e2eCookies.__e2e_auth_role }),
      },
      extra: {
        digest: error.digest,
        pathname,
        searchParams,
        ...(isPlaywright && { e2e_cookies: e2eCookies }),
      },
    })
    
    // Enhanced E2E diagnostics - log full stack trace when PLAYWRIGHT=1
    if (isPlaywright) {
      console.error("[E2E DIAGNOSTIC] Global Error Boundary Triggered")
      console.error("[E2E DIAGNOSTIC] Sentry Event ID:", eventId)
      console.error("[E2E DIAGNOSTIC] Error name:", error.name)
      console.error("[E2E DIAGNOSTIC] Error message:", error.message)
      console.error("[E2E DIAGNOSTIC] Error digest:", error.digest)
      console.error("[E2E DIAGNOSTIC] Error stack:", error.stack)
    }
  }, [error])

  return (
    <html lang="en">
      <body>
        <main
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "1rem",
            background: "linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)",
          }}
        >
          <div style={{ textAlign: "center", maxWidth: "400px" }}>
            <div
              style={{
                marginBottom: "1.5rem",
                display: "inline-flex",
                padding: "1rem",
                borderRadius: "1rem",
                background: "rgba(251, 191, 36, 0.1)",
              }}
            >
              <AlertTriangle style={{ width: "3rem", height: "3rem", color: "#f59e0b" }} />
            </div>

            <h1
              style={{
                fontSize: "1.5rem",
                fontWeight: "bold",
                marginBottom: "0.5rem",
                color: "#0a0f1c",
              }}
            >
              Something went wrong
            </h1>
            <p
              style={{
                color: "#64748b",
                marginBottom: "1.5rem",
                fontSize: "0.875rem",
              }}
            >
              We encountered an unexpected error. Please try refreshing the page.
            </p>

            <button
              onClick={reset}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "0.75rem 1.5rem",
                borderRadius: "9999px",
                background: "linear-gradient(135deg, #2563EB 0%, #00C9A0 100%)",
                color: "#0a0f1c",
                fontWeight: "600",
                border: "none",
                cursor: "pointer",
                fontSize: "0.875rem",
              }}
            >
              <RefreshCw style={{ width: "1rem", height: "1rem" }} />
              Try Again
            </button>
          </div>
        </main>
      </body>
    </html>
  )
}
