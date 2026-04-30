"use client"

import { useEffect,useState } from "react"

import { cn } from "@/lib/utils"
import { getAvailabilityMessage } from "@/lib/utils/time-of-day"

interface AvailabilityIndicatorProps {
  variant?: "inline" | "badge" | "detailed"
  /** Service type - med certs are always shown as active (24/7) */
  service?: string
  className?: string
}

/**
 * Time-of-day aware availability indicator
 * Shows whether doctors are currently reviewing requests
 */
export function AvailabilityIndicator({
  variant = "inline",
  service,
  className
}: AvailabilityIndicatorProps) {
  const [availability, setAvailability] = useState(() => getAvailabilityMessage(service))

  // Update every minute to keep status current
  useEffect(() => {
    const interval = setInterval(() => {
      setAvailability(getAvailabilityMessage(service))
    }, 60000)

    return () => clearInterval(interval)
  }, [service])

  const isActive = availability.isActive

  if (variant === "badge") {
    return (
      <div className={cn(
        "inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border",
        isActive
          ? "bg-success-light text-success border-success/20 dark:bg-success/15 dark:border-success/30"
          : "bg-muted text-muted-foreground border-transparent dark:bg-white/5",
        className
      )}>
        {isActive && (
          <span className="relative flex h-2 w-2">
            <span className="motion-safe:animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-60" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-success" />
          </span>
        )}
        <span>{availability.message}</span>
      </div>
    )
  }

  if (variant === "detailed") {
    return (
      <div className={cn(
        "flex items-center gap-3 p-3 rounded-lg border",
        isActive
          ? "bg-success-light/50 border-success/20 dark:bg-success/10 dark:border-success/20"
          : "bg-white dark:bg-card border-border/50 dark:border-white/10",
        className
      )}>
        <div className={cn(
          "w-10 h-10 rounded-full flex items-center justify-center shrink-0",
          isActive
            ? "bg-success-light dark:bg-success/20"
            : "bg-muted dark:bg-white/10"
        )}>
          {isActive ? (
            <span className="relative flex h-3 w-3">
              <span className="motion-safe:animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-60" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-success" />
            </span>
          ) : (
            <span className="w-3 h-3 rounded-full bg-muted-foreground/60" />
          )}
        </div>
        <div>
          <p className={cn(
            "text-sm font-medium",
            isActive ? "text-success" : "text-foreground"
          )}>
            {availability.message}
          </p>
          <p className="text-xs text-muted-foreground">
            {availability.subtext}
          </p>
        </div>
      </div>
    )
  }

  // Inline variant (default)
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-sm", className)}>
      {isActive && (
        <span className="relative flex h-2 w-2">
          <span className="motion-safe:animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-60" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-success" />
        </span>
      )}
      <span className={isActive ? "text-success" : "text-muted-foreground"}>
        {availability.message}
      </span>
    </span>
  )
}
