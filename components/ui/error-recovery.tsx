"use client"

import { useState, useEffect } from "react"
import { AlertCircle, RefreshCw, WifiOff, ServerOff, ChevronDown, Copy, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { motion, AnimatePresence } from "framer-motion"

/**
 * Error Recovery Components
 * 
 * Provides user-friendly error handling with recovery options.
 * Helps users understand what went wrong and how to fix it.
 */

type ErrorType = "network" | "server" | "validation" | "timeout" | "unknown"

interface ErrorConfig {
  icon: React.ReactNode
  title: string
  description: string
  recoveryAction?: string
  recoveryHint?: string
}

const ERROR_CONFIGS: Record<ErrorType, ErrorConfig> = {
  network: {
    icon: <WifiOff className="w-6 h-6" />,
    title: "Connection issue",
    description: "We couldn't reach our servers. This usually means your internet connection dropped.",
    recoveryAction: "Try again",
    recoveryHint: "Check your internet connection and try again",
  },
  server: {
    icon: <ServerOff className="w-6 h-6" />,
    title: "Something went wrong",
    description: "Our servers are having a moment. Your data is safe — we just need a second.",
    recoveryAction: "Try again",
    recoveryHint: "This usually resolves itself. Try again in a few seconds.",
  },
  validation: {
    icon: <AlertCircle className="w-6 h-6" />,
    title: "Please check your details",
    description: "Some of the information provided needs to be corrected.",
    recoveryHint: "Review the highlighted fields and make corrections",
  },
  timeout: {
    icon: <RefreshCw className="w-6 h-6" />,
    title: "Taking longer than usual",
    description: "The request is taking longer than expected. Your submission may still be processing.",
    recoveryAction: "Refresh status",
    recoveryHint: "Wait a moment before trying again to avoid duplicate submissions",
  },
  unknown: {
    icon: <AlertCircle className="w-6 h-6" />,
    title: "Something unexpected happened",
    description: "We're not sure what went wrong, but we're looking into it.",
    recoveryAction: "Try again",
    recoveryHint: "If this keeps happening, please contact support",
  },
}

/**
 * Detect error type from error object or response
 */
export function detectErrorType(error: unknown): ErrorType {
  if (error instanceof TypeError && error.message.includes("fetch")) {
    return "network"
  }
  
  if (error instanceof Error) {
    const message = error.message.toLowerCase()
    if (message.includes("network") || message.includes("offline")) return "network"
    if (message.includes("timeout") || message.includes("timed out")) return "timeout"
    if (message.includes("validation") || message.includes("invalid")) return "validation"
    if (message.includes("500") || message.includes("server")) return "server"
  }

  return "unknown"
}

/**
 * Inline error banner with recovery options
 */
interface ErrorBannerProps {
  error: string | Error | null
  type?: ErrorType
  onRetry?: () => void
  onDismiss?: () => void
  className?: string
  showDetails?: boolean
}

export function ErrorBanner({
  error,
  type,
  onRetry,
  onDismiss,
  className,
  showDetails = false,
}: ErrorBannerProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [copied, setCopied] = useState(false)

  if (!error) return null

  const errorType = type || detectErrorType(error)
  const config = ERROR_CONFIGS[errorType]
  const errorMessage = error instanceof Error ? error.message : error

  const copyError = () => {
    navigator.clipboard.writeText(errorMessage)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={cn(
        "rounded-xl border p-4",
        errorType === "validation"
          ? "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800"
          : "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800",
        className
      )}
    >
      <div className="flex items-start gap-3">
        <div className={cn(
          "shrink-0 mt-0.5",
          errorType === "validation"
            ? "text-amber-600 dark:text-amber-400"
            : "text-red-600 dark:text-red-400"
        )}>
          {config.icon}
        </div>
        
        <div className="flex-1 min-w-0">
          <h4 className={cn(
            "font-medium",
            errorType === "validation"
              ? "text-amber-800 dark:text-amber-200"
              : "text-red-800 dark:text-red-200"
          )}>
            {config.title}
          </h4>
          <p className={cn(
            "text-sm mt-1",
            errorType === "validation"
              ? "text-amber-700 dark:text-amber-300"
              : "text-red-700 dark:text-red-300"
          )}>
            {config.description}
          </p>
          
          {config.recoveryHint && (
            <p className="text-xs text-muted-foreground mt-2">
              {config.recoveryHint}
            </p>
          )}

          {/* Expandable error details */}
          {showDetails && (
            <div className="mt-3">
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
              >
                <ChevronDown className={cn("w-3 h-3 transition-transform", isExpanded && "rotate-180")} />
                Technical details
              </button>
              
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="mt-2 p-2 rounded bg-black/5 dark:bg-white/5 text-xs font-mono text-muted-foreground flex items-start justify-between gap-2">
                      <code className="break-all">{errorMessage}</code>
                      <button
                        onClick={copyError}
                        className="shrink-0 p-1 hover:bg-black/10 dark:hover:bg-white/10 rounded"
                      >
                        {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Actions */}
          {(onRetry || onDismiss) && (
            <div className="flex items-center gap-2 mt-3">
              {onRetry && config.recoveryAction && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onRetry}
                  className="h-8 text-xs"
                >
                  <RefreshCw className="w-3 h-3 mr-1.5" />
                  {config.recoveryAction}
                </Button>
              )}
              {onDismiss && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={onDismiss}
                  className="h-8 text-xs"
                >
                  Dismiss
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}

/**
 * Field-level error with suggestions
 */
interface FieldErrorProps {
  error: string
  suggestions?: string[]
  className?: string
}

export function FieldError({ error, suggestions, className }: FieldErrorProps) {
  return (
    <div className={cn("text-sm", className)}>
      <p className="text-red-600 dark:text-red-400 flex items-center gap-1">
        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
        {error}
      </p>
      {suggestions && suggestions.length > 0 && (
        <ul className="mt-1 ml-5 text-xs text-muted-foreground list-disc">
          {suggestions.map((suggestion, i) => (
            <li key={i}>{suggestion}</li>
          ))}
        </ul>
      )}
    </div>
  )
}

/**
 * Network status indicator
 */
export function NetworkStatus() {
  const [isOnline, setIsOnline] = useState(true)
  const [showBanner, setShowBanner] = useState(false)

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      // Show "back online" briefly
      setShowBanner(true)
      setTimeout(() => setShowBanner(false), 3000)
    }
    
    const handleOffline = () => {
      setIsOnline(false)
      setShowBanner(true)
    }

    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)

    // Initial check - using callback to avoid lint warning
    const checkOnline = () => {
      setIsOnline(navigator.onLine)
      if (!navigator.onLine) setShowBanner(true)
    }
    checkOnline()

    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [])

  if (!showBanner) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -50 }}
        className={cn(
          "fixed top-0 left-0 right-0 z-50 py-2 px-4 text-center text-sm font-medium",
          isOnline
            ? "bg-green-500 text-white"
            : "bg-red-500 text-white"
        )}
      >
        {isOnline ? (
          <span className="flex items-center justify-center gap-2">
            <Check className="w-4 h-4" />
            You&apos;re back online
          </span>
        ) : (
          <span className="flex items-center justify-center gap-2">
            <WifiOff className="w-4 h-4" />
            No internet connection — your changes will be saved when you reconnect
          </span>
        )}
      </motion.div>
    </AnimatePresence>
  )
}

/**
 * Retry wrapper with exponential backoff
 */
interface RetryableActionProps {
  action: () => Promise<void>
  maxRetries?: number
  children: (props: {
    execute: () => void
    isRetrying: boolean
    retryCount: number
    error: Error | null
  }) => React.ReactNode
}

export function RetryableAction({ 
  action, 
  maxRetries = 3,
  children 
}: RetryableActionProps) {
  const [isRetrying, setIsRetrying] = useState(false)
  const [retryCount, setRetryCount] = useState(0)
  const [error, setError] = useState<Error | null>(null)

  const execute = async () => {
    setIsRetrying(true)
    setError(null)
    
    let attempt = 0
    while (attempt < maxRetries) {
      try {
        await action()
        setIsRetrying(false)
        setRetryCount(0)
        return
      } catch (err) {
        attempt++
        setRetryCount(attempt)
        
        if (attempt >= maxRetries) {
          setError(err instanceof Error ? err : new Error("Action failed"))
          setIsRetrying(false)
          return
        }
        
        // Exponential backoff: 1s, 2s, 4s...
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt - 1) * 1000))
      }
    }
  }

  return <>{children({ execute, isRetrying, retryCount, error })}</>
}
