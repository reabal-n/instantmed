"use client"

import { useEffect, useState, useSyncExternalStore } from "react"
import { cn } from "@/lib/utils"

interface DoctorsOnlineProps {
  className?: string
  variant?: "dot" | "badge" | "text"
}

const OPEN_HOUR = 8
const CLOSE_HOUR = 22

function isWithinHours(): boolean {
  const now = new Date()
  // Approximate AEST check
  const utcHour = now.getUTCHours()
  const aestHour = (utcHour + 10) % 24
  return aestHour >= OPEN_HOUR && aestHour < CLOSE_HOUR
}

export function DoctorsOnline({ className, variant = "badge" }: DoctorsOnlineProps) {
  const [isOnline, setIsOnline] = useState(() => isWithinHours())
  const isClient = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  )

  useEffect(() => {
    if (!isClient) return
    const interval = setInterval(() => {
      setIsOnline(isWithinHours())
    }, 60000)

    return () => clearInterval(interval)
  }, [isClient])

  if (!isClient) return null

  if (variant === "dot") {
    return (
      <span className={cn("relative flex h-2 w-2", className)}>
        {isOnline && (
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
        )}
        <span
          className={cn("relative inline-flex rounded-full h-2 w-2", isOnline ? "bg-emerald-500" : "bg-slate-400")}
        />
      </span>
    )
  }

  if (variant === "text") {
    return (
      <span className={cn("text-xs", isOnline ? "text-emerald-600" : "text-muted-foreground", className)}>
        {isOnline ? "Doctors online now" : "Doctors back at 8am AEST"}
      </span>
    )
  }

  // Badge variant
  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium",
        isOnline ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600",
        className,
      )}
    >
      <span className={cn("w-1.5 h-1.5 rounded-full", isOnline ? "bg-emerald-500 animate-pulse" : "bg-slate-400")} />
      {isOnline ? "Doctors online" : "Back at 8am"}
    </div>
  )
}

interface QueueDepthProps {
  className?: string
  /** Actual queue count from server. Only renders when provided. */
  count?: number
}

/**
 * QueueDepth - Shows real queue position when data is available.
 * No longer generates fake random numbers. Pass `count` from server data.
 */
export function QueueDepth({ className, count }: QueueDepthProps) {
  const isClient = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  )

  if (!isClient || count === undefined || count === 0) return null

  return (
    <p className={cn("text-xs text-muted-foreground", className)}>
      {count} request{count > 1 ? "s" : ""} in queue ahead of you
    </p>
  )
}

interface CompletionTimeProps {
  className?: string
  /** Actual average completion time in minutes from server. Falls back to static copy if not provided. */
  averageMinutes?: number
}

/**
 * CompletionTime - Shows real average completion time when data is available,
 * or a static honest statement when no data is provided.
 */
export function CompletionTime({ className, averageMinutes }: CompletionTimeProps) {
  const isClient = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  )

  if (!isClient) return null

  if (averageMinutes !== undefined) {
    return (
      <p className={cn("text-xs text-emerald-600", className)}>
        Average completion time: {averageMinutes} mins
      </p>
    )
  }

  // Static fallback -- honest and verifiable
  return (
    <p className={cn("text-xs text-emerald-600", className)}>
      Most requests reviewed within 1 hour
    </p>
  )
}

interface ViewerCountProps {
  className?: string
  /** Actual viewer count from analytics/presence system. Only renders when provided. */
  count?: number
}

/**
 * ViewerCount - Shows real viewer count when data is available from a presence system.
 * No longer generates fake random numbers. Pass `count` from real analytics.
 */
export function ViewerCount({ className, count }: ViewerCountProps) {
  const isClient = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  )

  if (!isClient || count === undefined || count <= 0) return null

  return <p className={cn("text-xs text-muted-foreground", className)}>{count} people viewing this page</p>
}
