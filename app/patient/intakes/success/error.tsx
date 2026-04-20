"use client"

import { AlertTriangle, Home, RefreshCw } from "lucide-react"
import Link from "next/link"
import { useEffect, useRef, useState } from "react"

import { Button } from "@/components/ui/button"

export default function SuccessError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const [isRetrying, setIsRetrying] = useState(false)
  const retryCount = useRef(0)
  const maxRetries = 3

  useEffect(() => {
    import("@sentry/nextjs").then((Sentry) => {
      Sentry.captureException(error, {
        tags: { boundary: "patient-intake-success" },
        extra: { digest: error.digest },
      })
    })
  }, [error])

  const handleRetry = () => {
    if (retryCount.current >= maxRetries) return
    retryCount.current += 1
    setIsRetrying(true)
    try {
      reset()
    } finally {
      setTimeout(() => setIsRetrying(false), 1000)
    }
  }

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="text-center max-w-md">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-destructive-light mb-6" aria-hidden="true">
          <AlertTriangle className="h-8 w-8 text-destructive" />
        </div>

        <h1 className="text-2xl font-semibold tracking-tight mb-2">Your payment was received</h1>
        <p className="text-muted-foreground mb-6">
          There was a display issue loading your confirmation. Your request is safe and a doctor will review it shortly.
        </p>

        {error.digest && (
          <p className="text-xs text-muted-foreground/60 mb-6 font-mono bg-muted/50 px-3 py-1.5 rounded-xl inline-block">
            Ref: {error.digest}
          </p>
        )}

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Button
            onClick={handleRetry}
            disabled={isRetrying || retryCount.current >= maxRetries}
            className="w-full sm:w-auto"
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${isRetrying ? "animate-spin" : ""}`} />
            {isRetrying ? "Retrying..." : retryCount.current >= maxRetries ? "Please contact support" : "Try again"}
          </Button>
          <Button variant="outline" asChild className="w-full sm:w-auto">
            <Link href="/patient">
              <Home className="mr-2 h-4 w-4" />
              Go to dashboard
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
