"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Clock, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"

interface RateLimitFeedbackProps {
  /** Whether rate limit is active */
  isLimited: boolean
  /** Seconds until retry is allowed */
  retryAfterSeconds?: number
  /** Message to display */
  message?: string
  /** Callback when countdown completes */
  onCountdownComplete?: () => void
  /** Additional className */
  className?: string
}

/**
 * Rate Limit Feedback Component
 * 
 * Shows user-friendly feedback when rate limits are hit.
 * Includes countdown timer and clear messaging.
 * 
 * Usage:
 * ```tsx
 * const [isLimited, setIsLimited] = useState(false)
 * const [retryAfter, setRetryAfter] = useState(0)
 * 
 * // On 429 response:
 * setIsLimited(true)
 * setRetryAfter(response.headers.get('Retry-After') || 60)
 * 
 * <RateLimitFeedback
 *   isLimited={isLimited}
 *   retryAfterSeconds={retryAfter}
 *   onCountdownComplete={() => setIsLimited(false)}
 * />
 * ```
 */
export function RateLimitFeedback({
  isLimited,
  retryAfterSeconds = 60,
  message = "Too many requests. Please wait before trying again.",
  onCountdownComplete,
  className,
}: RateLimitFeedbackProps) {
  const [secondsRemaining, setSecondsRemaining] = useState(retryAfterSeconds)

  // Reset countdown when retryAfterSeconds changes
  useEffect(() => {
    if (isLimited) {
      setSecondsRemaining(retryAfterSeconds)
    }
  }, [isLimited, retryAfterSeconds])

  // Countdown timer
  useEffect(() => {
    if (!isLimited || secondsRemaining <= 0) return

    const interval = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          onCountdownComplete?.()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [isLimited, secondsRemaining, onCountdownComplete])

  const formatTime = (seconds: number): string => {
    if (seconds >= 60) {
      const mins = Math.floor(seconds / 60)
      const secs = seconds % 60
      return `${mins}:${secs.toString().padStart(2, "0")}`
    }
    return `${seconds}s`
  }

  return (
    <AnimatePresence>
      {isLimited && secondsRemaining > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          role="alert"
          aria-live="polite"
          className={cn(
            "flex items-center gap-3 p-4 rounded-xl",
            "bg-amber-50 dark:bg-amber-900/20",
            "border border-amber-200 dark:border-amber-800",
            "text-amber-800 dark:text-amber-200",
            className
          )}
        >
          <div className="shrink-0">
            <Clock className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <p className="font-medium">{message}</p>
            <p className="text-sm text-amber-700 dark:text-amber-300 mt-0.5">
              You can try again in{" "}
              <span className="font-mono font-medium">
                {formatTime(secondsRemaining)}
              </span>
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/**
 * Inline rate limit indicator for buttons
 */
interface RateLimitButtonProps {
  isLimited: boolean
  secondsRemaining: number
  children: React.ReactNode
  className?: string
}

export function RateLimitButton({
  isLimited,
  secondsRemaining,
  children,
  className,
}: RateLimitButtonProps) {
  if (!isLimited) {
    return <>{children}</>
  }

  return (
    <div className={cn("relative", className)}>
      <div className="opacity-50 pointer-events-none">{children}</div>
      <div className="absolute inset-0 flex items-center justify-center bg-background/80 rounded-xl">
        <span className="text-sm text-muted-foreground flex items-center gap-1.5">
          <Clock className="h-4 w-4" />
          Wait {secondsRemaining}s
        </span>
      </div>
    </div>
  )
}

/**
 * Hook to handle rate limit responses
 */
export function useRateLimit() {
  const [isLimited, setIsLimited] = useState(false)
  const [retryAfter, setRetryAfter] = useState(60)

  const handleRateLimitResponse = (response: Response) => {
    if (response.status === 429) {
      const retryHeader = response.headers.get("Retry-After")
      const seconds = retryHeader ? parseInt(retryHeader, 10) : 60
      setRetryAfter(isNaN(seconds) ? 60 : seconds)
      setIsLimited(true)
      return true
    }
    return false
  }

  const clearRateLimit = () => {
    setIsLimited(false)
    setRetryAfter(60)
  }

  return {
    isLimited,
    retryAfter,
    handleRateLimitResponse,
    clearRateLimit,
    RateLimitFeedbackComponent: () => (
      <RateLimitFeedback
        isLimited={isLimited}
        retryAfterSeconds={retryAfter}
        onCountdownComplete={clearRateLimit}
      />
    ),
  }
}

/**
 * Error state for rate limit with retry button
 */
interface RateLimitErrorStateProps {
  onRetry?: () => void
  retryAfterSeconds?: number
  className?: string
}

export function RateLimitErrorState({
  onRetry,
  retryAfterSeconds = 0,
  className,
}: RateLimitErrorStateProps) {
  const [canRetry, setCanRetry] = useState(retryAfterSeconds === 0)
  const [countdown, setCountdown] = useState(retryAfterSeconds)

  useEffect(() => {
    if (countdown <= 0) {
      setCanRetry(true)
      return
    }

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          setCanRetry(true)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [countdown])

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center p-8 text-center",
        className
      )}
    >
      <div className="p-4 rounded-full bg-amber-100 dark:bg-amber-900/30 mb-4">
        <AlertCircle className="h-8 w-8 text-amber-600 dark:text-amber-400" />
      </div>
      <h3 className="text-lg font-semibold mb-2">Slow down</h3>
      <p className="text-muted-foreground mb-4 max-w-sm">
        You&apos;ve made too many requests. Please wait a moment before trying again.
      </p>
      {onRetry && (
        <button
          onClick={onRetry}
          disabled={!canRetry}
          className={cn(
            "px-4 py-2 rounded-xl font-medium transition-colors",
            canRetry
              ? "bg-primary text-primary-foreground hover:bg-primary/90"
              : "bg-muted text-muted-foreground cursor-not-allowed"
          )}
        >
          {canRetry ? "Try again" : `Wait ${countdown}s`}
        </button>
      )}
    </div>
  )
}
