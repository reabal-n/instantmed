"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import {
  AlertTriangle,
  WifiOff,
  RefreshCw,
  ArrowLeft,
  MessageCircle,
  Clock,
  FileX,
  CreditCard,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import Link from "next/link"

export type ErrorType =
  | "generic"
  | "network"
  | "payment"
  | "not-found"
  | "timeout"
  | "validation"
  | "server"

interface EnhancedErrorStateProps {
  type?: ErrorType
  title?: string
  message?: string
  /** Recovery suggestions shown as bullet points */
  suggestions?: string[]
  /** Show retry button */
  showRetry?: boolean
  /** Show back button */
  showBack?: boolean
  /** Show contact support link */
  showContact?: boolean
  /** Auto-retry functionality */
  autoRetry?: boolean
  /** Delay before auto-retry (ms) */
  retryDelay?: number
  /** Maximum retry attempts */
  maxRetries?: number
  /** Retry callback */
  onRetry?: () => void | Promise<void>
  /** Back navigation href */
  backHref?: string
  /** Custom className */
  className?: string
}

const errorConfig: Record<
  ErrorType,
  {
    icon: typeof AlertTriangle
    defaultTitle: string
    defaultMessage: string
    defaultSuggestions: string[]
    iconColor: string
    bgColor: string
  }
> = {
  generic: {
    icon: AlertTriangle,
    defaultTitle: "Something went wrong",
    defaultMessage: "We hit an unexpected bump. Your data is safe.",
    defaultSuggestions: [
      "Try refreshing the page",
      "Check if you're connected to the internet",
      "Clear your browser cache and try again",
    ],
    iconColor: "text-amber-500",
    bgColor: "bg-amber-50 dark:bg-amber-950/20",
  },
  network: {
    icon: WifiOff,
    defaultTitle: "Connection issue",
    defaultMessage: "We couldn't reach our servers. This usually means:",
    defaultSuggestions: [
      "Check your internet connection",
      "Try again in a moment",
      "Contact support if this persists",
    ],
    iconColor: "text-slate-500",
    bgColor: "bg-slate-50 dark:bg-slate-950/20",
  },
  payment: {
    icon: CreditCard,
    defaultTitle: "Payment not completed",
    defaultMessage: "No worries — your answers are saved. You can complete payment when ready.",
    defaultSuggestions: [
      "Check your payment method",
      "Try a different card",
      "Contact support for assistance",
    ],
    iconColor: "text-amber-500",
    bgColor: "bg-amber-50 dark:bg-amber-950/20",
  },
  "not-found": {
    icon: FileX,
    defaultTitle: "Not found",
    defaultMessage: "We couldn't find what you're looking for.",
    defaultSuggestions: [
      "Check the URL",
      "Go back to the homepage",
      "Use the search function",
    ],
    iconColor: "text-slate-500",
    bgColor: "bg-slate-50 dark:bg-slate-950/20",
  },
  timeout: {
    icon: Clock,
    defaultTitle: "Request timed out",
    defaultMessage: "This is taking longer than expected. Please try again.",
    defaultSuggestions: [
      "Check your connection speed",
      "Try again in a moment",
      "Contact support if this continues",
    ],
    iconColor: "text-amber-500",
    bgColor: "bg-amber-50 dark:bg-amber-950/20",
  },
  validation: {
    icon: AlertTriangle,
    defaultTitle: "Please check your details",
    defaultMessage: "Some information needs to be corrected before continuing.",
    defaultSuggestions: [
      "Review the highlighted fields",
      "Check for missing required information",
      "Ensure all dates are valid",
    ],
    iconColor: "text-rose-500",
    bgColor: "bg-rose-50 dark:bg-rose-950/20",
  },
  server: {
    icon: AlertTriangle,
    defaultTitle: "Server error",
    defaultMessage: "Our servers are experiencing issues. We're working on it.",
    defaultSuggestions: [
      "Try again in a few moments",
      "Check our status page",
      "Contact support if urgent",
    ],
    iconColor: "text-red-500",
    bgColor: "bg-red-50 dark:bg-red-950/20",
  },
}

export function EnhancedErrorState({
  type = "generic",
  title,
  message,
  suggestions,
  showRetry = true,
  showBack = true,
  showContact = true,
  autoRetry = false,
  retryDelay = 3000,
  maxRetries = 3,
  onRetry,
  backHref = "/",
  className,
}: EnhancedErrorStateProps) {
  const [retryCount, setRetryCount] = useState(0)
  const [isRetrying, setIsRetrying] = useState(false)

  const config = errorConfig[type]
  const Icon = config.icon
  const displayTitle = title || config.defaultTitle
  const displayMessage = message || config.defaultMessage
  const displaySuggestions = suggestions || config.defaultSuggestions

  // Auto-retry logic
  useEffect(() => {
    if (autoRetry && onRetry && retryCount < maxRetries && !isRetrying) {
      const timer = setTimeout(async () => {
        setIsRetrying(true)
        try {
          await onRetry()
          setRetryCount(0) // Reset on success
        } catch {
          setRetryCount((prev) => prev + 1)
        } finally {
          setIsRetrying(false)
        }
      }, retryDelay)

      return () => clearTimeout(timer)
    }
  }, [autoRetry, onRetry, retryCount, maxRetries, retryDelay, isRetrying])

  const handleRetry = async () => {
    if (!onRetry) return
    setIsRetrying(true)
    try {
      await onRetry()
      setRetryCount(0)
    } catch {
      setRetryCount((prev) => prev + 1)
    } finally {
      setIsRetrying(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn(
        "flex flex-col items-center justify-center text-center px-4 py-12",
        className
      )}
    >
      {/* Icon */}
      <motion.div
        initial={{ scale: 0.8 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 15 }}
        className={cn(
          "w-16 h-16 rounded-2xl flex items-center justify-center mb-6",
          config.bgColor
        )}
      >
        <Icon className={cn("w-8 h-8", config.iconColor)} />
      </motion.div>

      {/* Title */}
      <h2 className="text-xl font-semibold text-foreground mb-2">
        {displayTitle}
      </h2>

      {/* Message */}
      <p className="text-muted-foreground text-sm max-w-sm mb-6">
        {displayMessage}
      </p>

      {/* Suggestions */}
      {displaySuggestions.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="w-full max-w-sm mb-8"
        >
          <ul className="text-left space-y-2 text-sm text-muted-foreground">
            {displaySuggestions.map((suggestion, index) => (
              <li key={index} className="flex items-start gap-2">
                <span className="text-primary mt-0.5">•</span>
                <span>{suggestion}</span>
              </li>
            ))}
          </ul>
        </motion.div>
      )}

      {/* Auto-retry indicator */}
      {autoRetry && retryCount < maxRetries && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center gap-2 text-xs text-muted-foreground mb-4"
        >
          <Clock className="w-3 h-3" />
          <span>
            {isRetrying
              ? "Retrying..."
              : `Auto-retrying in ${Math.ceil(retryDelay / 1000)}s (${retryCount}/${maxRetries})`}
          </span>
        </motion.div>
      )}

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3 w-full max-w-xs">
        {showRetry && onRetry && (
          <Button
            onClick={handleRetry}
            disabled={isRetrying}
            className="w-full rounded-xl min-h-[44px] touch-target"
          >
            {isRetrying ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Retrying...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 mr-2" />
                Try again
              </>
            )}
          </Button>
        )}
        {showBack && (
          <Button
            variant="outline"
            asChild
            className="w-full rounded-xl bg-transparent min-h-[44px] touch-target"
          >
            <Link href={backHref}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Go back
            </Link>
          </Button>
        )}
      </div>

      {/* Contact link */}
      {showContact && (
        <Link
          href="/contact"
          className="mt-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors min-h-[44px] touch-target"
        >
          <MessageCircle className="w-4 h-4" />
          Need help? Contact support
        </Link>
      )}
    </motion.div>
  )
}

