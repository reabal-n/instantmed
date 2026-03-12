"use client"

import { useEffect, useState, useSyncExternalStore } from "react"
import { Moon, Sun } from "lucide-react"
import { cn } from "@/lib/utils"
import { useServiceAvailability } from "@/components/providers/service-availability-provider"

interface DoctorAvailabilityProps {
  className?: string
  variant?: "badge" | "banner"
  showAfterHoursUpsell?: boolean
  onAfterHoursClick?: () => void
}

function getHourAndMinuteInTimezone(timezone: string): { hour: number; minute: number } {
  const now = new Date()
  const formatter = new Intl.DateTimeFormat("en-AU", {
    timeZone: timezone,
    hour: "numeric",
    minute: "numeric",
    hour12: false,
  })
  const parts = formatter.formatToParts(now)
  const hour = parseInt(parts.find(p => p.type === "hour")?.value ?? "0", 10)
  const minute = parseInt(parts.find(p => p.type === "minute")?.value ?? "0", 10)
  return { hour, minute }
}

function isWithinHours(openHour: number, closeHour: number, timezone: string): boolean {
  const { hour } = getHourAndMinuteInTimezone(timezone)
  return hour >= openHour && hour < closeHour
}

function getTimeUntilOpen(openHour: number, closeHour: number, timezone: string): { hours: number; minutes: number } {
  const { hour: currentHour, minute: currentMinute } = getHourAndMinuteInTimezone(timezone)

  let hoursUntil: number
  let minutesUntil: number

  if (currentHour >= closeHour) {
    hoursUntil = 24 - currentHour + openHour
    minutesUntil = 60 - currentMinute
    if (minutesUntil === 60) {
      minutesUntil = 0
    } else {
      hoursUntil -= 1
    }
  } else if (currentHour < openHour) {
    hoursUntil = openHour - currentHour - 1
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

function formatNextOpen(openHour: number): string {
  const ampm = openHour >= 12 ? "pm" : "am"
  const displayHour = openHour > 12 ? openHour - 12 : openHour === 0 ? 12 : openHour
  return `${displayHour}${ampm}`
}

export function DoctorAvailability({
  className,
  variant = "badge",
  showAfterHoursUpsell = false,
  onAfterHoursClick,
}: DoctorAvailabilityProps) {
  const { businessHours } = useServiceAvailability()
  const openHour = businessHours.enabled ? businessHours.open : 0
  const closeHour = businessHours.enabled ? businessHours.close : 24
  const tz = businessHours.timezone || "Australia/Sydney"

  const [isOnline, setIsOnline] = useState(() => isWithinHours(openHour, closeHour, tz))
  const [countdown, setCountdown] = useState(() => getTimeUntilOpen(openHour, closeHour, tz))
  const isClient = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  )

  useEffect(() => {
    if (!isClient) return
    const updateStatus = () => {
      const online = isWithinHours(openHour, closeHour, tz)
      setIsOnline(online)
      if (!online) {
        setCountdown(getTimeUntilOpen(openHour, closeHour, tz))
      }
    }

    updateStatus()
    const interval = setInterval(updateStatus, 60000)

    return () => clearInterval(interval)
  }, [isClient, openHour, closeHour, tz])

  if (!isClient) {
    return null
  }

  // When hours disabled, always show as online
  const showOnline = !businessHours.enabled || isOnline
  const nextOpen = formatNextOpen(openHour)

  if (variant === "badge") {
    return (
      <div
        className={cn(
          "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium",
          showOnline
            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
            : "bg-card/60 text-muted-foreground dark:bg-white/10",
          className,
        )}
      >
        <span className={cn("w-1.5 h-1.5 rounded-full", showOnline ? "bg-emerald-500 animate-pulse" : "bg-muted-foreground/60")} />
        {showOnline ? "Doctors online now" : `Back at ${nextOpen} AEST`}
      </div>
    )
  }

  // Banner variant
  return (
    <div
      className={cn(
        "w-full px-4 py-2.5 flex items-center justify-center gap-3",
        showOnline
          ? "bg-emerald-50 dark:bg-emerald-950/30 border-b border-emerald-100 dark:border-emerald-800"
          : "bg-card/50 dark:bg-white/5 border-b border-border/50 dark:border-white/10",
        className,
      )}
    >
      {showOnline ? (
        <>
          <Sun className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span className="text-sm text-emerald-700 dark:text-emerald-400">
            <span className="inline-flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Doctors online now
            </span>
            <span className="text-emerald-600/70 dark:text-emerald-500/70 ml-1.5">— Average response: 30 min</span>
          </span>
        </>
      ) : (
        <>
          <Moon className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
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
