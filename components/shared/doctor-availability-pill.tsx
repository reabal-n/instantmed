'use client'

import { motion } from 'framer-motion'
import { Moon, Zap } from 'lucide-react'
import { useEffect, useState, useSyncExternalStore } from 'react'

import { useReducedMotion } from '@/components/ui/motion'

const OPEN_HOUR = 8
const CLOSE_HOUR = 22

function getAESTTime(): Date {
  const now = new Date()
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
    hoursUntil = 24 - currentHour + OPEN_HOUR
    minutesUntil = 60 - currentMinute
    if (minutesUntil === 60) { minutesUntil = 0 } else { hoursUntil -= 1 }
  } else if (currentHour < OPEN_HOUR) {
    hoursUntil = OPEN_HOUR - currentHour - 1
    minutesUntil = 60 - currentMinute
    if (minutesUntil === 60) { minutesUntil = 0; hoursUntil += 1 }
  } else {
    hoursUntil = 0
    minutesUntil = 0
  }

  return { hours: hoursUntil, minutes: minutesUntil }
}

function useHasMounted() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  )
}

interface DoctorAvailabilityPillProps {
  /**
   * When true, always shows the online/available state regardless of business hours.
   * Use on med cert pages - auto-approval means they're genuinely 24/7.
   */
  alwaysAvailable?: boolean
}

export function DoctorAvailabilityPill({ alwaysAvailable = false }: DoctorAvailabilityPillProps) {
  const [isOnline, setIsOnline] = useState(true)
  const [countdown, setCountdown] = useState<{ hours: number; minutes: number }>({ hours: 0, minutes: 0 })
  const mounted = useHasMounted()
  const prefersReducedMotion = useReducedMotion()

  useEffect(() => {
    if (alwaysAvailable) return
    const updateStatus = () => {
      const online = isWithinHours()
      setIsOnline(online)
      if (!online) setCountdown(getTimeUntilOpen())
    }
    updateStatus()
    const interval = setInterval(updateStatus, 60000)
    return () => clearInterval(interval)
  }, [alwaysAvailable])

  // Render a static placeholder matching the pill height to prevent hero layout shift on hydration
  if (!mounted) {
    return (
      <div className="flex justify-center">
        <div className="inline-flex items-center gap-3 px-5 py-2.5 rounded-full bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200/50 dark:border-emerald-800/30 opacity-0 pointer-events-none select-none" aria-hidden="true">
          <span className="flex items-center gap-2 text-xs font-medium text-emerald-700">
            <span className="relative flex h-2 w-2 sm:h-2.5 sm:w-2.5 rounded-full bg-emerald-500" />
            {alwaysAvailable ? 'Med certs 24/7' : 'Doctors online now'}
          </span>
        </div>
      </div>
    )
  }

  // Always-available state - med certs (auto-approved, genuinely 24/7)
  if (alwaysAvailable) {
    return (
      <motion.div
        initial={prefersReducedMotion ? {} : { y: -10 }}
        animate={{ y: 0 }}
        transition={{ delay: prefersReducedMotion ? 0 : 0.5, duration: prefersReducedMotion ? 0 : 0.4 }}
        className="flex justify-center"
      >
        <div className="inline-flex items-center gap-3 px-5 py-2.5 rounded-full bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200/50 dark:border-emerald-800/30 shadow-lg shadow-emerald-500/5 dark:shadow-emerald-500/10 hover:shadow-xl hover:bg-emerald-50/90 dark:hover:bg-emerald-950/30 transition-all duration-300">
          <span className="flex items-center gap-2 text-xs font-medium text-emerald-700 dark:text-emerald-400">
            <span className="relative flex h-2 w-2 sm:h-2.5 sm:w-2.5">
              {!prefersReducedMotion && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              )}
              <span className="relative inline-flex rounded-full h-2 w-2 sm:h-2.5 sm:w-2.5 bg-emerald-500 shadow-sm shadow-emerald-500/50" />
            </span>
            Med certs 24/7
          </span>
          <span className="h-3 w-px bg-emerald-300/50 dark:bg-emerald-700/50" />
          <span className="flex items-center gap-1.5 text-xs text-emerald-600/80 dark:text-emerald-400/80">
            <Zap className="w-3 h-3" />
            <span>Instant approval</span>
          </span>
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={prefersReducedMotion ? {} : { y: -10 }}
      animate={{ y: 0 }}
      transition={{ delay: prefersReducedMotion ? 0 : 0.5, duration: prefersReducedMotion ? 0 : 0.4 }}
      className="flex justify-center"
    >
      <div className="inline-flex items-center gap-3 px-5 py-2.5 rounded-full bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200/50 dark:border-emerald-800/30 shadow-lg shadow-emerald-500/5 dark:shadow-emerald-500/10 hover:shadow-xl hover:bg-emerald-50/90 dark:hover:bg-emerald-950/30 transition-all duration-300">
        {isOnline ? (
          <>
            <span className="flex items-center gap-2 text-xs font-medium text-emerald-700 dark:text-emerald-400">
              <span className="relative flex h-2 w-2 sm:h-2.5 sm:w-2.5">
                {!prefersReducedMotion && (
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                )}
                <span className="relative inline-flex rounded-full h-2 w-2 sm:h-2.5 sm:w-2.5 bg-emerald-500 shadow-sm shadow-emerald-500/50" />
              </span>
              Doctors online now
            </span>
            <span className="h-3 w-px bg-emerald-300/50 dark:bg-emerald-700/50" />
            <span className="flex items-center gap-1.5 text-xs text-emerald-600/80 dark:text-emerald-400/80">
              <Zap className="w-3 h-3" />
              <span>Reviewed in 1–2 hrs</span>
            </span>
          </>
        ) : (
          <>
            <Moon className="w-4 h-4 text-muted-foreground/60" />
            <span className="text-sm font-medium text-foreground">
              {countdown.hours > 0
                ? `Doctors back in ${countdown.hours}h ${countdown.minutes}m`
                : countdown.minutes > 0
                  ? `Doctors back in ${countdown.minutes}m`
                  : 'Doctors back at 8am AEST'}
            </span>
            <span className="hidden sm:inline text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
              Submit now - reviewed first thing
            </span>
          </>
        )}
      </div>
    </motion.div>
  )
}
