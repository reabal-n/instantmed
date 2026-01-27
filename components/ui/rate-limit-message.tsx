"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Clock, AlertTriangle, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"

interface RateLimitMessageProps {
  /** Whether rate limit is currently active */
  isRateLimited: boolean
  /** Seconds until rate limit resets (optional) */
  retryAfter?: number
  /** Custom message to display */
  message?: string
  /** Callback when retry is clicked */
  onRetry?: () => void
  /** Variant style */
  variant?: "inline" | "toast" | "modal"
  className?: string
}

/**
 * Rate Limit Message Component
 * 
 * Shows a friendly, informative message when rate limits are hit.
 * Includes countdown timer if retryAfter is provided.
 */
export function RateLimitMessage({
  isRateLimited,
  retryAfter,
  message = "You're doing that too fast. Please wait a moment.",
  onRetry,
  variant = "inline",
  className,
}: RateLimitMessageProps) {
  const [countdown, setCountdown] = useState(retryAfter || 0)

  // Countdown timer
  useEffect(() => {
    if (!isRateLimited || !retryAfter) {
      setCountdown(0)
      return
    }

    setCountdown(retryAfter)
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [isRateLimited, retryAfter])

  if (!isRateLimited) return null

  if (variant === "inline") {
    return (
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className={`flex items-center gap-3 p-4 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 ${className}`}
        >
          <div className="shrink-0 p-2 rounded-full bg-amber-100 dark:bg-amber-900/50">
            <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="flex-1">
            <p className="font-medium text-amber-800 dark:text-amber-200">
              {message}
            </p>
            {countdown > 0 && (
              <p className="text-sm text-amber-600 dark:text-amber-400 mt-0.5">
                Try again in {countdown} second{countdown !== 1 ? "s" : ""}
              </p>
            )}
          </div>
          {onRetry && countdown === 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRetry}
              className="shrink-0 border-amber-300 dark:border-amber-700 hover:bg-amber-100 dark:hover:bg-amber-900/50"
            >
              <RefreshCw className="h-4 w-4 mr-1.5" />
              Retry
            </Button>
          )}
        </motion.div>
      </AnimatePresence>
    )
  }

  if (variant === "toast") {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <AlertTriangle className="h-4 w-4 text-amber-500" />
        <span>{message}</span>
        {countdown > 0 && (
          <span className="text-muted-foreground">
            ({countdown}s)
          </span>
        )}
      </div>
    )
  }

  // Modal variant
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      >
        <motion.div
          initial={{ scale: 0.95 }}
          animate={{ scale: 1 }}
          exit={{ scale: 0.95 }}
          className={`bg-card border rounded-2xl shadow-xl max-w-sm w-full p-6 text-center ${className}`}
        >
          <div className="mx-auto w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mb-4">
            <Clock className="h-8 w-8 text-amber-600 dark:text-amber-400" />
          </div>
          <h3 className="text-lg font-semibold mb-2">Slow down</h3>
          <p className="text-muted-foreground mb-4">{message}</p>
          {countdown > 0 ? (
            <div className="text-3xl font-mono font-bold text-amber-600 dark:text-amber-400">
              {countdown}s
            </div>
          ) : (
            onRetry && (
              <Button onClick={onRetry} className="w-full">
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
            )
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

/**
 * Hook for managing rate limit state
 */
export function useRateLimit(retryAfterSeconds = 30) {
  const [isRateLimited, setIsRateLimited] = useState(false)
  const [retryAfter, setRetryAfter] = useState(0)

  const triggerRateLimit = (seconds?: number) => {
    const duration = seconds || retryAfterSeconds
    setIsRateLimited(true)
    setRetryAfter(duration)

    setTimeout(() => {
      setIsRateLimited(false)
      setRetryAfter(0)
    }, duration * 1000)
  }

  const clearRateLimit = () => {
    setIsRateLimited(false)
    setRetryAfter(0)
  }

  return {
    isRateLimited,
    retryAfter,
    triggerRateLimit,
    clearRateLimit,
  }
}

/**
 * Helper to detect rate limit from API response
 */
export function isRateLimitError(error: unknown): { isRateLimit: boolean; retryAfter?: number } {
  if (error instanceof Error) {
    const message = error.message.toLowerCase()
    if (message.includes("rate limit") || message.includes("too many requests") || message.includes("429")) {
      // Try to extract retry-after from message
      const match = message.match(/(\d+)\s*second/i)
      return {
        isRateLimit: true,
        retryAfter: match ? parseInt(match[1], 10) : 30,
      }
    }
  }
  return { isRateLimit: false }
}

/**
 * Friendly messages for different rate limit scenarios
 */
export const RATE_LIMIT_MESSAGES = {
  default: "You're doing that too fast. Please wait a moment.",
  submit: "Please wait before submitting again.",
  search: "Search is temporarily limited. Please wait.",
  upload: "Too many uploads. Please wait before trying again.",
  login: "Too many login attempts. Please wait before trying again.",
  api: "Request limit reached. Please try again shortly.",
} as const
