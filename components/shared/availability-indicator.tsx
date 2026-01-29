"use client"

import { useState, useEffect } from "react"
import { cn } from "@/lib/utils"
import { getAvailabilityMessage, isWithinBusinessHours } from "@/lib/time-of-day"

interface AvailabilityIndicatorProps {
  variant?: "inline" | "badge" | "detailed"
  className?: string
}

/**
 * Time-of-day aware availability indicator
 * Shows whether doctors are currently reviewing requests
 */
export function AvailabilityIndicator({ 
  variant = "inline",
  className 
}: AvailabilityIndicatorProps) {
  const [availability, setAvailability] = useState(() => getAvailabilityMessage())
  const [isActive, setIsActive] = useState(() => isWithinBusinessHours())

  // Update every minute to keep status current
  useEffect(() => {
    const interval = setInterval(() => {
      setAvailability(getAvailabilityMessage())
      setIsActive(isWithinBusinessHours())
    }, 60000)
    
    return () => clearInterval(interval)
  }, [])

  if (variant === "badge") {
    return (
      <div className={cn(
        "inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium",
        isActive 
          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300"
          : "bg-white/60 text-slate-600 dark:bg-white/5 dark:text-slate-400",
        className
      )}>
        {isActive && (
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
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
          ? "bg-emerald-50/50 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-800"
          : "bg-white/60 border-white/50 dark:bg-white/5 dark:border-white/10",
        className
      )}>
        <div className={cn(
          "w-10 h-10 rounded-full flex items-center justify-center shrink-0",
          isActive 
            ? "bg-emerald-100 dark:bg-emerald-900/50"
            : "bg-white/60 dark:bg-white/10"
        )}>
          {isActive ? (
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
            </span>
          ) : (
            <span className="w-3 h-3 rounded-full bg-slate-400" />
          )}
        </div>
        <div>
          <p className={cn(
            "text-sm font-medium",
            isActive ? "text-emerald-800 dark:text-emerald-200" : "text-foreground"
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
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
        </span>
      )}
      <span className={isActive ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"}>
        {availability.message}
      </span>
    </span>
  )
}
