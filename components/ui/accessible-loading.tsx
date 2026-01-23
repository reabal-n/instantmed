"use client"

import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"
import { Loader2 } from "lucide-react"

interface AccessibleLoadingProps {
  /** Loading message for screen readers */
  message?: string
  /** Visual label (optional, for sighted users) */
  label?: string
  /** Size variant */
  size?: "sm" | "md" | "lg"
  /** Whether to show spinner */
  showSpinner?: boolean
  /** Additional className */
  className?: string
  /** Delay before showing (prevents flash for fast loads) */
  delayMs?: number
}

/**
 * Accessible Loading Component
 * 
 * Provides loading state that:
 * - Announces to screen readers via aria-live
 * - Shows visual spinner for sighted users
 * - Supports delayed appearance to prevent flash
 * - Marks container as aria-busy
 * 
 * WCAG 2.1 Level AA compliant
 */
export function AccessibleLoading({
  message = "Loading content",
  label,
  size = "md",
  showSpinner = true,
  className,
  delayMs = 0,
}: AccessibleLoadingProps) {
  const [isVisible, setIsVisible] = useState(delayMs === 0)
  const [announced, setAnnounced] = useState(false)

  // Delay visibility to prevent flash for fast loads
  useEffect(() => {
    if (delayMs === 0) return

    const timer = setTimeout(() => setIsVisible(true), delayMs)
    return () => clearTimeout(timer)
  }, [delayMs])

  // Announce loading state once
  useEffect(() => {
    if (!announced) {
      setAnnounced(true)
    }
  }, [announced])

  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-6 w-6",
    lg: "h-8 w-8",
  }

  const textClasses = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base",
  }

  return (
    <div
      role="status"
      aria-busy="true"
      aria-live="polite"
      className={cn(
        "flex flex-col items-center justify-center gap-3",
        !isVisible && "opacity-0",
        className
      )}
    >
      {/* Screen reader announcement */}
      <span className="sr-only">{message}</span>

      {/* Visual spinner */}
      {showSpinner && isVisible && (
        <Loader2 
          className={cn(
            "animate-spin text-primary",
            sizeClasses[size]
          )} 
          aria-hidden="true"
        />
      )}

      {/* Optional visible label */}
      {label && isVisible && (
        <p 
          className={cn(
            "text-muted-foreground",
            textClasses[size]
          )}
          aria-hidden="true"
        >
          {label}
        </p>
      )}
    </div>
  )
}

/**
 * Loading wrapper that adds aria-busy to children
 * Use to wrap content sections that are loading
 */
interface LoadingWrapperProps {
  isLoading: boolean
  loadingMessage?: string
  children: React.ReactNode
  className?: string
}

export function LoadingWrapper({
  isLoading,
  loadingMessage = "Loading",
  children,
  className,
}: LoadingWrapperProps) {
  return (
    <div
      aria-busy={isLoading}
      aria-live="polite"
      className={cn("relative", className)}
    >
      {/* Announce loading state change */}
      {isLoading && (
        <span className="sr-only" role="status">
          {loadingMessage}
        </span>
      )}
      {children}
    </div>
  )
}

/**
 * Full page loading state
 * For route-level loading.tsx files
 */
interface PageLoadingProps {
  message?: string
}

export function PageLoading({ message = "Loading page" }: PageLoadingProps) {
  return (
    <main 
      className="min-h-screen flex items-center justify-center"
      aria-busy="true"
    >
      <AccessibleLoading 
        message={message}
        label="Loading..."
        size="lg"
        delayMs={200}
      />
    </main>
  )
}
