"use client"

import { useEffect } from "react"
import { AlertTriangle, RefreshCw } from "lucide-react"

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("Global application error:", error)
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
                background: "linear-gradient(135deg, #00E2B5 0%, #00C9A0 100%)",
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
