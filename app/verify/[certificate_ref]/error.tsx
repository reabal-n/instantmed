"use client"

import {
  AlertTriangle,
  Home,
  Mail,
  RefreshCw,
  WifiOff,
} from "lucide-react"
import Link from "next/link"
import { useEffect, useRef,useState } from "react"

import { Button } from "@/components/ui/button"
import { CONTACT_EMAIL } from "@/lib/constants"

function getErrorInfo(error: Error & { digest?: string }) {
  const message = error.message?.toLowerCase() || ""

  if (message.includes("network") || message.includes("fetch")) {
    return {
      type: "network" as const,
      title: "Connection issue",
      description: "Check your internet connection and try again.",
      icon: WifiOff,
    }
  }

  return {
    type: "unknown" as const,
    title: "Error loading verification",
    description: "Something went wrong verifying this certificate. Please try again.",
    icon: AlertTriangle,
  }
}

export default function VerifyCertificateError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const [isRetrying, setIsRetrying] = useState(false)
  const retryCount = useRef(0)
  const maxRetries = 3
  const errorInfo = getErrorInfo(error)
  const IconComponent = errorInfo.icon

  useEffect(() => {
    import("@sentry/nextjs").then((Sentry) => {
      Sentry.captureException(error, {
        tags: { boundary: "verify-certificate", errorType: errorInfo.type },
        extra: { digest: error.digest },
      })
    })
  }, [error, errorInfo.type])

  const handleRetry = async () => {
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
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-destructive-light mb-6" aria-hidden="true">
          <IconComponent className="h-8 w-8 text-destructive" />
        </div>

        <h1 className="text-2xl font-semibold tracking-tight mb-2">{errorInfo.title}</h1>
        <p className="text-muted-foreground mb-6">{errorInfo.description}</p>

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
            <Link href="/">
              <Home className="mr-2 h-4 w-4" />
              Home
            </Link>
          </Button>
        </div>

        <div className="mt-6 pt-6 border-t border-border/50">
          <p className="text-xs text-muted-foreground/60">
            <Mail className="inline h-3 w-3 mr-1" />
            {CONTACT_EMAIL}
          </p>
        </div>
      </div>
    </div>
  )
}
