"use client"

import { useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { AlertTriangle, Home, RefreshCw, MessageCircle } from "lucide-react"

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log error with structured context for observability
    const errorLog = {
      timestamp: new Date().toISOString(),
      level: "error",
      message: error.message,
      name: error.name,
      digest: error.digest,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
      url: typeof window !== "undefined" ? window.location.href : undefined,
      userAgent: typeof navigator !== "undefined" ? navigator.userAgent : undefined,
    }
    
    console.error("[GlobalErrorBoundary]", JSON.stringify(errorLog))
    
    // In production, you would send this to an error tracking service
    // Example: Sentry.captureException(error)
  }, [error])

  return (
    <main className="min-h-screen bg-hero flex items-center justify-center px-4">
      <div className="text-center max-w-lg">
        {/* Error Icon */}
        <div className="relative mb-8">
          <div className="glass-card rounded-2xl p-6 inline-flex animate-float">
            <AlertTriangle className="h-16 w-16 text-amber-500" />
          </div>
        </div>

        <h1
          className="text-2xl sm:text-3xl font-bold mb-4 animate-fade-in-up opacity-0"
          style={{ animationDelay: "0.1s", animationFillMode: "forwards", fontFamily: "var(--font-display)" }}
        >
          Something went wrong
        </h1>
        <p
          className="text-muted-foreground mb-2 animate-fade-in-up opacity-0"
          style={{ animationDelay: "0.2s", animationFillMode: "forwards" }}
        >
          We hit an unexpected bump. Don&apos;t worry — your data is safe.
        </p>
        {error.digest && (
          <p
            className="text-xs text-muted-foreground/60 mb-8 font-mono animate-fade-in-up opacity-0"
            style={{ animationDelay: "0.25s", animationFillMode: "forwards" }}
          >
            Error ID: {error.digest}
          </p>
        )}

        <div
          className="flex flex-col sm:flex-row items-center justify-center gap-3 animate-fade-in-up opacity-0"
          style={{ animationDelay: "0.3s", animationFillMode: "forwards" }}
        >
          <Button onClick={reset} className="rounded-full btn-premium text-[#0A0F1C] w-full sm:w-auto">
            <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />
            Try Again
          </Button>
          <Button variant="outline" asChild className="rounded-full w-full sm:w-auto bg-transparent">
            <Link href="/">
              <Home className="mr-2 h-4 w-4" aria-hidden="true" />
              Go Home
            </Link>
          </Button>
        </div>

        {/* Help Link */}
        <div
          className="mt-8 animate-fade-in-up opacity-0"
          style={{ animationDelay: "0.4s", animationFillMode: "forwards" }}
        >
          <Link
            href="/contact"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-[#00E2B5] transition-colors"
          >
            <MessageCircle className="h-4 w-4" aria-hidden="true" />
            Still having issues? Contact support
          </Link>
        </div>
      </div>
    </main>
  )
}
