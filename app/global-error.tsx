"use client"

import { useEffect } from "react"

/**
 * Global error boundary — last-resort fallback that replaces the entire root layout.
 *
 * IMPORTANT: This file must stay MINIMAL. No heavy imports (Sentry, Framer Motion,
 * lucide-react, etc.) — any module that touches webpack hooks or has complex
 * initialization can crash the hydration bootstrap, causing a blank page.
 *
 * Sentry captures unhandled errors automatically via instrumentation-client.ts.
 * ChunkLoadError auto-recovery uses only browser APIs (sessionStorage, location).
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Auto-recover from ChunkLoadError (stale chunks after deployment)
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
        // sessionStorage may be unavailable — fall through to error UI
      }
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
              {/* Inline SVG — no lucide-react import to avoid module init failures */}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="48"
                height="48"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#f59e0b"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3" />
                <path d="M12 9v4" />
                <path d="M12 17h.01" />
              </svg>
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
                color: "white",
                fontWeight: "600",
                border: "none",
                cursor: "pointer",
                fontSize: "0.875rem",
              }}
            >
              {/* Inline SVG — RefreshCw icon */}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
                <path d="M21 3v5h-5" />
                <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
                <path d="M8 16H3v5" />
              </svg>
              Try Again
            </button>
          </div>
        </main>
      </body>
    </html>
  )
}
