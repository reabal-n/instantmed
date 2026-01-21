"use client"
/* eslint-disable no-console -- Error boundary intentionally uses console */

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { 
  AlertTriangle, 
  Home, 
  RefreshCw, 
  FileText, 
  MessageCircle,
  WifiOff,
  LogIn,
} from "lucide-react"

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
  const errorInfo = getErrorInfo(error)
  const IconComponent = errorInfo.icon

  useEffect(() => {
    console.error("[PatientError]", error)
  }, [error])

  const handleRetry = async () => {
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
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-amber-500/10 dark:bg-amber-500/20 mb-6">
          <IconComponent className="h-8 w-8 text-amber-600 dark:text-amber-500" />
        </div>

        <h1 className="text-2xl font-bold mb-2">{errorInfo.title}</h1>
        <p className="text-muted-foreground mb-6">
          {errorInfo.description}
        </p>

        {error.digest && (
          <p className="text-xs text-muted-foreground/60 mb-6 font-mono bg-muted/50 px-3 py-1.5 rounded-lg inline-block">
            Ref: {error.digest}
          </p>
        )}

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          {errorInfo.type === "auth" ? (
            <Button onClick={handleAuthRedirect} className="w-full sm:w-auto">
              <LogIn className="mr-2 h-4 w-4" />
              Sign in
            </Button>
          ) : (
            <Button 
              onClick={handleRetry} 
              disabled={isRetrying}
              className="w-full sm:w-auto"
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${isRetrying ? "animate-spin" : ""}`} />
              {isRetrying ? "Retrying..." : "Try again"}
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
        </div>
      </div>
    </div>
  )
}
