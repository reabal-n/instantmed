"use client"

/**
 * Shared Checkout Button Component
 * 
 * Consistent checkout button used across all intake flows.
 * Includes loading states, trust badges, and proper accessibility.
 */

import { forwardRef } from "react"
import { ArrowRight, Lock } from "lucide-react"
import { DotsSpinner } from "@/components/ui/spinner"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export interface CheckoutButtonProps {
  onClick: () => void
  isLoading?: boolean
  disabled?: boolean
  price?: string
  label?: string
  loadingLabel?: string
  variant?: "default" | "compact" | "prominent"
  showPrice?: boolean
  showLock?: boolean
  className?: string
}

export const CheckoutButton = forwardRef<HTMLButtonElement, CheckoutButtonProps>(
  (
    {
      onClick,
      isLoading = false,
      disabled = false,
      price,
      label = "Continue to payment",
      loadingLabel = "Processing...",
      variant = "default",
      showPrice = true,
      showLock = true,
      className,
    },
    ref
  ) => {
    const isDisabled = disabled || isLoading

    if (variant === "compact") {
      return (
        <Button
          ref={ref}
          onClick={onClick}
          disabled={isDisabled}
          className={cn(
            "w-full h-12 rounded-xl font-semibold transition-all duration-200",
            "bg-primary hover:bg-primary/90 text-primary-foreground",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            className
          )}
        >
          {isLoading ? (
            <>
              <DotsSpinner size="sm" />
              {loadingLabel}
            </>
          ) : (
            <>
              {showLock && <Lock className="w-4 h-4 mr-2" />}
              {label}
              {showPrice && price && (
                <span className="ml-2 opacity-90">• {price}</span>
              )}
            </>
          )}
        </Button>
      )
    }

    if (variant === "prominent") {
      return (
        <button
          ref={ref}
          onClick={onClick}
          disabled={isDisabled}
          className={cn(
            "w-full group relative overflow-hidden rounded-2xl p-[2px]",
            "bg-linear-to-r from-primary via-primary/80 to-primary",
            "hover:shadow-[0_8px_30px_rgb(var(--primary)/0.3)]",
            "transition-all duration-300",
            "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none",
            className
          )}
        >
          <div className="relative flex items-center justify-center gap-3 rounded-[14px] bg-primary px-6 py-4 font-semibold text-primary-foreground">
            {isLoading ? (
              <>
                <DotsSpinner size="default" />
                <span>{loadingLabel}</span>
              </>
            ) : (
              <>
                {showLock && <Lock className="w-4 h-4" />}
                <span className="text-lg">{label}</span>
                {showPrice && price && (
                  <span className="px-3 py-1 rounded-full bg-white/20 text-sm font-bold">
                    {price}
                  </span>
                )}
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </div>
        </button>
      )
    }

    // Default variant
    return (
      <Button
        ref={ref}
        onClick={onClick}
        disabled={isDisabled}
        size="lg"
        className={cn(
          "w-full h-14 rounded-xl font-semibold text-base transition-all duration-200",
          "bg-primary hover:bg-primary/90 text-primary-foreground",
          "shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0",
          "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-lg disabled:hover:translate-y-0",
          className
        )}
      >
        {isLoading ? (
          <>
            <DotsSpinner size="sm" className="mr-2" />
            {loadingLabel}
          </>
        ) : (
          <>
            {showLock && <Lock className="w-4 h-4 mr-2" />}
            {label}
            {showPrice && price && (
              <span className="ml-2 px-2 py-0.5 rounded-full bg-white/20 text-sm">
                {price}
              </span>
            )}
            <ArrowRight className="w-5 h-5 ml-2" />
          </>
        )}
      </Button>
    )
  }
)

CheckoutButton.displayName = "CheckoutButton"

/**
 * Checkout section wrapper with trust elements
 */
export function CheckoutSection({
  children,
  showSecurityNote = true,
  className,
}: {
  children: React.ReactNode
  showSecurityNote?: boolean
  className?: string
}) {
  return (
    <div className={cn("space-y-4", className)}>
      {children}
      
      {showSecurityNote && (
        <p className="text-xs text-center text-muted-foreground flex items-center justify-center gap-1.5">
          <Lock className="w-3 h-3" />
          Secured by Stripe. Your payment details are encrypted.
        </p>
      )}
    </div>
  )
}
