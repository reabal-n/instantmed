"use client"

import { AlertTriangle, WifiOff, CreditCard, FileX, Clock, RefreshCw, ArrowLeft, MessageCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { motion } from "framer-motion"
import { fadeIn } from "@/components/ui/animations"

type ErrorType = "generic" | "network" | "payment" | "not-found" | "timeout" | "validation"

interface ErrorStateProps {
  type?: ErrorType
  title?: string
  message?: string
  /** Recovery suggestions shown as bullet points */
  suggestions?: string[]
  showRetry?: boolean
  showBack?: boolean
  showContact?: boolean
  onRetry?: () => void
  backHref?: string
  className?: string
}

const errorConfig: Record<
  ErrorType,
  { icon: typeof AlertTriangle; defaultTitle: string; defaultMessage: string; iconColor: string; bgColor: string }
> = {
  generic: {
    icon: AlertTriangle,
    defaultTitle: "Something went wrong",
    defaultMessage: "We hit an unexpected bump. Your data is safe.",
    iconColor: "text-dawn-500",
    bgColor: "bg-dawn-50",
  },
  network: {
    icon: WifiOff,
    defaultTitle: "Connection issue",
    defaultMessage: "Please check your internet connection and try again.",
    iconColor: "text-slate-500",
    bgColor: "bg-slate-50",
  },
  payment: {
    icon: CreditCard,
    defaultTitle: "Payment not completed",
    defaultMessage: "No worries — your answers are saved. You can complete payment when ready.",
    iconColor: "text-dawn-500",
    bgColor: "bg-dawn-50",
  },
  "not-found": {
    icon: FileX,
    defaultTitle: "Not found",
    defaultMessage: "We couldn&apos;t find what you&apos;re looking for.",
    iconColor: "text-slate-500",
    bgColor: "bg-slate-50",
  },
  timeout: {
    icon: Clock,
    defaultTitle: "Request timed out",
    defaultMessage: "This is taking longer than expected. Please try again.",
    iconColor: "text-dawn-500",
    bgColor: "bg-dawn-50",
  },
  validation: {
    icon: AlertTriangle,
    defaultTitle: "Please check your details",
    defaultMessage: "Some information needs to be corrected before continuing.",
    iconColor: "text-rose-500",
    bgColor: "bg-rose-50",
  },
}

const defaultSuggestions: Record<ErrorType, string[]> = {
  generic: [
    "Try refreshing the page",
    "Check if you're connected to the internet",
    "Clear your browser cache and try again",
  ],
  network: [
    "Check your internet connection",
    "Try again in a moment",
    "Contact support if this persists",
  ],
  payment: [
    "Check your payment method",
    "Try a different card",
    "Contact support for assistance",
  ],
  "not-found": [
    "Check the URL",
    "Go back to the homepage",
    "Use the search function",
  ],
  timeout: [
    "Check your connection speed",
    "Try again in a moment",
    "Contact support if this continues",
  ],
  validation: [
    "Review the highlighted fields",
    "Check for missing required information",
    "Ensure all dates are valid",
  ],
}

export function ErrorState({
  type = "generic",
  title,
  message,
  suggestions,
  showRetry = true,
  showBack = true,
  showContact = true,
  onRetry,
  backHref = "/",
  className,
}: ErrorStateProps) {
  const config = errorConfig[type]
  const Icon = config.icon
  const displaySuggestions = suggestions || defaultSuggestions[type]

  return (
    <motion.div
      initial="initial"
      animate="animate"
      variants={fadeIn}
      className={cn("flex flex-col items-center justify-center text-center px-4 py-12", className)}
    >
      {/* Icon */}
      <motion.div
        initial={{ scale: 0.8 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 15 }}
        className={cn("w-16 h-16 rounded-2xl flex items-center justify-center mb-6", config.bgColor)}
      >
        <Icon className={cn("w-8 h-8", config.iconColor)} />
      </motion.div>

      {/* Text */}
      <h2 className="text-xl font-semibold text-foreground mb-2">{title || config.defaultTitle}</h2>
      <p className="text-muted-foreground text-sm max-w-sm mb-6">{message || config.defaultMessage}</p>

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

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3 w-full max-w-xs">
        {showRetry && onRetry && (
          <Button onClick={onRetry} className="w-full rounded-xl min-h-[44px] touch-target">
            <RefreshCw className="w-4 h-4 mr-2" />
            Try again
          </Button>
        )}
        {showBack && (
          <Button variant="outline" asChild className="w-full rounded-xl bg-transparent min-h-[44px] touch-target">
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
