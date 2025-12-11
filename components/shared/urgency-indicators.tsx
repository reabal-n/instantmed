"use client"

import { useState, useEffect } from "react"
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
  const [isOnline, setIsOnline] = useState(true)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    setIsOnline(isWithinHours())

    const interval = setInterval(() => {
      setIsOnline(isWithinHours())
    }, 60000)

    return () => clearInterval(interval)
  }, [])

  if (!mounted) return null

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
}

export function QueueDepth({ className }: QueueDepthProps) {
  const [depth, setDepth] = useState(0)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    // Simulate realistic queue depth based on time
    const hour = new Date().getHours()
    const isPeakHour = hour >= 9 && hour <= 17
    const baseDepth = isPeakHour ? Math.floor(Math.random() * 8) + 3 : Math.floor(Math.random() * 4)
    setDepth(baseDepth)

    // Slowly change
    const interval = setInterval(() => {
      setDepth((prev) => {
        const change = Math.random() > 0.5 ? 1 : -1
        return Math.max(0, Math.min(15, prev + change))
      })
    }, 45000)

    return () => clearInterval(interval)
  }, [])

  if (!mounted || depth === 0) return null

  return (
    <p className={cn("text-xs text-muted-foreground", className)}>
      {depth} request{depth > 1 ? "s" : ""} in queue ahead of you
    </p>
  )
}

interface CompletionTimeProps {
  className?: string
}

export function CompletionTime({ className }: CompletionTimeProps) {
  const [time, setTime] = useState(45)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const hour = new Date().getHours()
    const isPeakHour = hour >= 9 && hour <= 17
    const baseTime = isPeakHour ? 55 : 35
    setTime(baseTime + Math.floor(Math.random() * 15))
  }, [])

  if (!mounted) return null

  return <p className={cn("text-xs text-emerald-600", className)}>Most requests completed in under {time} mins today</p>
}

interface ViewerCountProps {
  className?: string
}

export function ViewerCount({ className }: ViewerCountProps) {
  const [count, setCount] = useState(0)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    // Generate realistic viewer count
    const baseCount = Math.floor(Math.random() * 8) + 3
    setCount(baseCount)

    const interval = setInterval(() => {
      setCount((prev) => {
        const change = Math.floor(Math.random() * 3) - 1
        return Math.max(2, Math.min(15, prev + change))
      })
    }, 10000)

    return () => clearInterval(interval)
  }, [])

  if (!mounted) return null

  return <p className={cn("text-xs text-muted-foreground", className)}>{count} people viewing this page</p>
}
