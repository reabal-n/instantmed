"use client"

import { AlertTriangle, WifiOff, CreditCard, FileX, Clock, RefreshCw, ArrowLeft, MessageCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { cn } from "@/lib/utils"

type ErrorType = "generic" | "network" | "payment" | "not-found" | "timeout" | "validation"

interface ErrorStateProps {
  type?: ErrorType
  title?: string
  message?: string
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
    iconColor: "text-amber-500",
    bgColor: "bg-amber-50",
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
    iconColor: "text-amber-500",
    bgColor: "bg-amber-50",
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
    iconColor: "text-amber-500",
    bgColor: "bg-amber-50",
  },
  validation: {
    icon: AlertTriangle,
    defaultTitle: "Please check your details",
    defaultMessage: "Some information needs to be corrected before continuing.",
    iconColor: "text-rose-500",
    bgColor: "bg-rose-50",
  },
}

export function ErrorState({
  type = "generic",
  title,
  message,
  showRetry = true,
  showBack = true,
  showContact = true,
  onRetry,
  backHref = "/",
  className,
}: ErrorStateProps) {
  const config = errorConfig[type]
  const Icon = config.icon

  return (
    <div className={cn("flex flex-col items-center justify-center text-center px-4 py-12", className)}>
      {/* Icon */}
      <div className={cn("w-16 h-16 rounded-2xl flex items-center justify-center mb-6", config.bgColor)}>
        <Icon className={cn("w-8 h-8", config.iconColor)} />
      </div>

      {/* Text */}
      <h2 className="text-xl font-semibold text-foreground mb-2">{title || config.defaultTitle}</h2>
      <p className="text-muted-foreground text-sm max-w-sm mb-8">{message || config.defaultMessage}</p>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3 w-full max-w-xs">
        {showRetry && onRetry && (
          <Button onClick={onRetry} className="w-full rounded-xl">
            <RefreshCw className="w-4 h-4 mr-2" />
            Try again
          </Button>
        )}
        {showBack && (
          <Button variant="outline" asChild className="w-full rounded-xl bg-transparent">
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
          className="mt-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
        >
          <MessageCircle className="w-4 h-4" />
          Need help? Contact support
        </Link>
      )}
    </div>
  )
}
