"use client"

/**
 * Refund Guarantee Badge - Trust signal for checkout
 * 
 * IMPORTANT: This badge should appear next to the Pay button to reinforce
 * the refund policy at the moment of payment decision.
 * 
 * Compliance: Ensures refund policy is visible at checkout, not just landing pages.
 */

import { RefreshCw, Shield, CheckCircle } from "lucide-react"
import { cn } from "@/lib/utils"

interface RefundGuaranteeBadgeProps {
  variant?: "inline" | "card" | "minimal"
  className?: string
}

export function RefundGuaranteeBadge({
  variant = "inline",
  className,
}: RefundGuaranteeBadgeProps) {
  if (variant === "minimal") {
    return (
      <div
        className={cn(
          "flex items-center gap-1.5 text-xs text-muted-foreground",
          className
        )}
      >
        <RefreshCw className="w-3 h-3 text-green-600" />
        <span>Full refund if declined</span>
      </div>
    )
  }

  if (variant === "card") {
    return (
      <div
        className={cn(
          "rounded-xl border border-green-200 dark:border-green-900/50 bg-green-50/80 dark:bg-green-950/30 p-4",
          className
        )}
      >
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-green-100 dark:bg-green-900/50 flex items-center justify-center shrink-0">
            <Shield className="w-5 h-5 text-green-600" />
          </div>
          <div className="space-y-1">
            <p className="font-medium text-sm text-green-900 dark:text-green-200">
              Refund Guarantee
            </p>
            <p className="text-xs text-green-700 dark:text-green-400">
              Full refund if your request is declined — no questions asked
            </p>
          </div>
        </div>
      </div>
    )
  }

  // Inline variant (default) - for placement next to Pay button
  return (
    <div
      className={cn(
        "flex items-center justify-center gap-2 py-2 px-3 rounded-lg",
        "bg-green-50/80 dark:bg-green-950/30 border border-green-200/60 dark:border-green-800/40",
        className
      )}
    >
      <CheckCircle className="w-4 h-4 text-green-600 shrink-0" />
      <span className="text-xs text-green-800 dark:text-green-300">
        <span className="font-medium">Refund guarantee</span>
        <span className="text-green-600 dark:text-green-400">
          {" "}
          — full refund if your request is declined
        </span>
      </span>
    </div>
  )
}

/**
 * Compact trust strip for checkout footer
 * Shows multiple trust signals in a single row
 */
export function CheckoutTrustStrip({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-center gap-4 py-3 text-xs text-muted-foreground",
        className
      )}
    >
      <div className="flex items-center gap-1.5">
        <Shield className="w-3.5 h-3.5 text-green-600" />
        <span>AHPRA doctors</span>
      </div>
      <div className="flex items-center gap-1.5">
        <RefreshCw className="w-3.5 h-3.5 text-green-600" />
        <span>Refund if declined</span>
      </div>
      <div className="flex items-center gap-1.5">
        <CheckCircle className="w-3.5 h-3.5 text-green-600" />
        <span>Secure payment</span>
      </div>
    </div>
  )
}
