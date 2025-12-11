"use client"

import { useState, useEffect } from "react"
import { Moon, Sun } from "lucide-react"
import { cn } from "@/lib/utils"

interface DoctorAvailabilityProps {
  className?: string
  variant?: "badge" | "banner"
  showAfterHoursUpsell?: boolean
  onAfterHoursClick?: () => void
}

// Operating hours in AEST (UTC+10/+11)
const OPEN_HOUR = 8 // 8am AEST
const CLOSE_HOUR = 22 // 10pm AEST

function getAESTTime(): Date {
  const now = new Date()
  // Convert to AEST (UTC+10, ignoring DST for simplicity)
  const utc = now.getTime() + now.getTimezoneOffset() * 60000
  return new Date(utc + 10 * 3600000)
}

function isWithinHours(): boolean {
  const aest = getAESTTime()
  const hour = aest.getHours()
  return hour >= OPEN_HOUR && hour < CLOSE_HOUR
}

function getTimeUntilOpen(): { hours: number; minutes: number } {
  const aest = getAESTTime()
  const currentHour = aest.getHours()
  const currentMinute = aest.getMinutes()

  let hoursUntil: number
  let minutesUntil: number

  if (currentHour >= CLOSE_HOUR) {
    // After closing, next open is tomorrow at 8am
    hoursUntil = 24 - currentHour + OPEN_HOUR
    minutesUntil = 60 - currentMinute
    if (minutesUntil === 60) {
      minutesUntil = 0
    } else {
      hoursUntil -= 1
    }
  } else if (currentHour < OPEN_HOUR) {
    // Before opening
    hoursUntil = OPEN_HOUR - currentHour - 1
    minutesUntil = 60 - currentMinute
    if (minutesUntil === 60) {
      minutesUntil = 0
      hoursUntil += 1
    }
  } else {
    hoursUntil = 0
    minutesUntil = 0
  }

  return { hours: hoursUntil, minutes: minutesUntil }
}

export function DoctorAvailability({
  className,
  variant = "badge",
  showAfterHoursUpsell = false,
  onAfterHoursClick,
}: DoctorAvailabilityProps) {
  const [isOnline, setIsOnline] = useState(true)
  const [countdown, setCountdown] = useState({ hours: 0, minutes: 0 })
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)

    const updateStatus = () => {
      setIsOnline(isWithinHours())
      if (!isWithinHours()) {
        setCountdown(getTimeUntilOpen())
      }
    }

    updateStatus()
    const interval = setInterval(updateStatus, 60000) // Update every minute

    return () => clearInterval(interval)
  }, [])

  if (!mounted) {
    return null // Avoid hydration mismatch
  }

  if (variant === "badge") {
    return (
      <div
        className={cn(
          "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium",
          isOnline
            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
            : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
          className,
        )}
      >
        <span className={cn("w-1.5 h-1.5 rounded-full", isOnline ? "bg-emerald-500 animate-pulse" : "bg-slate-400")} />
        {isOnline ? "Doctors online now" : `Back at 8am AEST`}
      </div>
    )
  }

  // Banner variant
  return (
    <div
      className={cn(
        "w-full px-4 py-2.5 flex items-center justify-center gap-3",
        isOnline
          ? "bg-emerald-50 dark:bg-emerald-950/30 border-b border-emerald-100 dark:border-emerald-900/50"
          : "bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800",
        className,
      )}
    >
      {isOnline ? (
        <>
          <Sun className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span className="text-sm text-emerald-700 dark:text-emerald-400">
            <span className="inline-flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Doctors online now
            </span>
            <span className="text-emerald-600/70 dark:text-emerald-500/70 ml-1.5">— Average response: 45 min</span>
          </span>
        </>
      ) : (
        <>
          <Moon className="w-4 h-4 text-slate-500" />
          <span className="text-sm text-slate-600 dark:text-slate-400">
            Doctors back in{" "}
            <span className="font-semibold tabular-nums">
              {countdown.hours}h {countdown.minutes}m
            </span>
          </span>

          {showAfterHoursUpsell && onAfterHoursClick && (
            <button
              onClick={onAfterHoursClick}
              className="ml-2 px-3 py-1 bg-primary text-primary-foreground text-xs font-medium rounded-full hover:opacity-90 transition-opacity"
            >
              Get it now — $39.95
            </button>
          )}
        </>
      )}
    </div>
  )
}
