"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { AlertTriangle, Home, RefreshCw, MessageCircle, Copy, Check, ChevronDown, ChevronUp } from "lucide-react"

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const [isRetrying, setIsRetrying] = useState(false)
  const [copied, setCopied] = useState(false)
  const [showDetails, setShowDetails] = useState(false)

  useEffect(() => {
    // Log the error to an error reporting service
    console.error("Application error:", error)
  }, [error])

  const handleRetry = async () => {
    setIsRetrying(true)
    // Small delay for visual feedback
    await new Promise((resolve) => setTimeout(resolve, 500))
    reset()
    setIsRetrying(false)
  }

  const copyErrorId = () => {
    if (error.digest) {
      navigator.clipboard.writeText(error.digest)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <main className="min-h-screen bg-hero flex items-center justify-center px-4" role="main">
      <div className="text-center max-w-lg">
        {/* Animated Error Illustration */}
        <div className="relative mb-8">
          {/* Background pulse rings */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-32 h-32 rounded-full bg-amber-500/10 animate-ping" style={{ animationDuration: "2s" }} />
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div
              className="w-24 h-24 rounded-full bg-amber-500/20"
              style={{ animation: "pulse 2s ease-in-out infinite", animationDelay: "0.5s" }}
            />
          </div>

          {/* Main icon card */}
          <div className="relative glass-card rounded-2xl p-6 inline-flex animate-float shadow-lg">
            <AlertTriangle className="h-16 w-16 text-amber-500" aria-hidden="true" />
          </div>
        </div>

        <h1
          className="text-2xl sm:text-3xl font-bold mb-4 animate-fade-in-up opacity-0"
          style={{ animationDelay: "0.1s", animationFillMode: "forwards", fontFamily: "var(--font-display)" }}
        >
          Oops! Something went wrong
        </h1>
        <p
          className="text-muted-foreground mb-4 animate-fade-in-up opacity-0"
          style={{ animationDelay: "0.2s", animationFillMode: "forwards" }}
        >
          We hit an unexpected bump. Don&apos;t worry — your data is safe and we&apos;re on it.
        </p>

        {/* Error details (expandable) */}
        {error.digest && (
          <div
            className="mb-8 animate-fade-in-up opacity-0"
            style={{ animationDelay: "0.25s", animationFillMode: "forwards" }}
          >
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              {showDetails ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              {showDetails ? "Hide details" : "Show error details"}
            </button>

            {showDetails && (
              <div className="mt-3 p-3 rounded-lg bg-muted/50 border border-border/50 animate-fade-in">
                <div className="flex items-center justify-between gap-2">
                  <code className="text-xs font-mono text-muted-foreground truncate">Error ID: {error.digest}</code>
                  <button
                    onClick={copyErrorId}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {copied ? (
                      <>
                        <Check className="h-3 w-3 text-green-500" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3" />
                        Copy
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Action buttons */}
        <div
          className="flex flex-col sm:flex-row items-center justify-center gap-3 animate-fade-in-up opacity-0"
          style={{ animationDelay: "0.3s", animationFillMode: "forwards" }}
        >
          <Button
            onClick={handleRetry}
            disabled={isRetrying}
            className="rounded-full btn-premium text-[#0A0F1C] w-full sm:w-auto min-w-[140px]"
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${isRetrying ? "animate-spin" : ""}`} aria-hidden="true" />
            {isRetrying ? "Retrying..." : "Try Again"}
          </Button>
          <Button variant="outline" asChild className="rounded-full w-full sm:w-auto bg-transparent">
            <Link href="/">
              <Home className="mr-2 h-4 w-4" aria-hidden="true" />
              Go Home
            </Link>
          </Button>
        </div>

        {/* Helpful suggestions */}
        <div
          className="mt-10 pt-8 border-t border-border/50 animate-fade-in-up opacity-0"
          style={{ animationDelay: "0.4s", animationFillMode: "forwards" }}
        >
          <p className="text-sm text-muted-foreground mb-4">Things you can try:</p>
          <ul className="text-sm text-muted-foreground space-y-2 text-left max-w-xs mx-auto">
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">•</span>
              Refresh the page and try again
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">•</span>
              Check your internet connection
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">•</span>
              Clear your browser cache
            </li>
          </ul>
        </div>

        {/* Help Link */}
        <div
          className="mt-8 animate-fade-in-up opacity-0"
          style={{ animationDelay: "0.5s", animationFillMode: "forwards" }}
        >
          <Link
            href="/contact"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-[#00E2B5] transition-colors group"
          >
            <MessageCircle className="h-4 w-4 group-hover:scale-110 transition-transform" aria-hidden="true" />
            Still having issues? Contact support
          </Link>
        </div>
      </div>
    </main>
  )
}
