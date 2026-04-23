"use client"

import {
  AlertTriangle,
  FileText,
  Home,
  LogIn,
  Mail,
  MessageCircle,
  RefreshCw,
  WifiOff,
} from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useRef,useState } from "react"

import { Button } from "@/components/ui/button"
import { ErrorRefChip } from "@/components/ui/error-ref-chip"
import { CONTACT_EMAIL } from "@/lib/constants"

// Detect error type for better messaging
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
  
  if (message.includes("auth") || message.includes("unauthorized") || message.includes("401")) {
    return {
      type: "auth" as const,
      title: "Session expired",
      description: "Your session has expired. Please sign in again.",
      icon: LogIn,
    }
  }
  
  return {
    type: "unknown" as const,
    title: "Something went wrong",
    description: "We couldn't load this page. This might be a temporary issue.",
    icon: AlertTriangle,
  }
}

export default function PatientError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const router = useRouter()
  const [isRetrying, setIsRetrying] = useState(false)
  const retryCount = useRef(0)
  const maxRetries = 3
  const errorInfo = getErrorInfo(error)
  const IconComponent = errorInfo.icon

  useEffect(() => {
    import("@sentry/nextjs").then((Sentry) => {
      Sentry.captureException(error, {
        tags: { boundary: "patient", errorType: getErrorInfo(error).type },
        extra: { digest: error.digest },
      })
    })
  }, [error])

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

  const handleAuthRedirect = () => {
    router.push("/sign-in?redirect=" + encodeURIComponent(window.location.pathname))
  }

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="text-center max-w-md">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-destructive-light mb-6" aria-hidden="true">
          <IconComponent className="h-8 w-8 text-destructive" />
        </div>

        <h1 className="text-2xl font-semibold tracking-tight mb-2">{errorInfo.title}</h1>
        <p className="text-muted-foreground mb-6">
          {errorInfo.description}
        </p>

        <ErrorRefChip digest={error.digest} />

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          {errorInfo.type === "auth" ? (
            <Button onClick={handleAuthRedirect} className="w-full sm:w-auto">
              <LogIn className="mr-2 h-4 w-4" />
              Sign in
            </Button>
          ) : (
            <Button
              onClick={handleRetry}
              disabled={isRetrying || retryCount.current >= maxRetries}
              className="w-full sm:w-auto"
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${isRetrying ? "animate-spin" : ""}`} />
              {isRetrying ? "Retrying..." : retryCount.current >= maxRetries ? "Please contact support" : "Try again"}
            </Button>
          )}
          <Button variant="outline" asChild className="w-full sm:w-auto">
            <Link href="/patient">
              <Home className="mr-2 h-4 w-4" />
              Dashboard
            </Link>
          </Button>
        </div>

        <div className="mt-6 pt-6 border-t border-border/50 space-y-3">
          <Link
            href="/patient/intakes"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <FileText className="h-4 w-4" />
            View your requests
          </Link>
          
          <div className="block">
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <MessageCircle className="h-4 w-4" />
              Contact support
            </Link>
          </div>

          <p className="text-xs text-muted-foreground">
            <Mail className="inline h-3 w-3 mr-1" />
            <a href={`mailto:${CONTACT_EMAIL}`} className="hover:text-foreground transition-colors">{CONTACT_EMAIL}</a>
          </p>
        </div>
      </div>
    </div>
  )
}
