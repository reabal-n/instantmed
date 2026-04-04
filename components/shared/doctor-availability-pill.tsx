'use client'

import { useState, useEffect, useSyncExternalStore } from 'react'
import { Moon, Users } from 'lucide-react'
import { motion } from 'framer-motion'
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

function useHasMounted() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  )
}

function getRandomVisitors(): number {
  const aest = getAESTTime()
  const hour = aest.getHours()

  // Weight visitor count by time of day
  if (hour >= 8 && hour < 10) return Math.floor(Math.random() * 6) + 3    // 3-8 morning
  if (hour >= 10 && hour < 14) return Math.floor(Math.random() * 8) + 5   // 5-12 midday peak
  if (hour >= 14 && hour < 18) return Math.floor(Math.random() * 7) + 4   // 4-10 afternoon
  if (hour >= 18 && hour < 22) return Math.floor(Math.random() * 9) + 6   // 6-14 evening peak
  return Math.floor(Math.random() * 3) + 1                                 // 1-3 overnight
}

export function DoctorAvailabilityPill() {
  const [isOnline, setIsOnline] = useState(true)
  const [visitors, setVisitors] = useState(() => getRandomVisitors())
  const mounted = useHasMounted()
  const prefersReducedMotion = useReducedMotion()

  useEffect(() => {
    const updateStatus = () => setIsOnline(isWithinHours())
    updateStatus()
    const interval = setInterval(updateStatus, 60000)
    return () => clearInterval(interval)
  }, [])

  // Fluctuate visitor count every ~35 seconds
  useEffect(() => {
    const fluctuate = () => {
      setVisitors(prev => {
        const change = Math.random() > 0.5 ? 1 : -1
        const next = prev + change
        return Math.max(1, Math.min(14, next))
      })
    }
    const interval = setInterval(fluctuate, 35000)
    return () => clearInterval(interval)
  }, [])

  // Render a static placeholder matching the pill height to prevent hero layout shift on hydration
  if (!mounted) {
    return (
      <div className="flex justify-center">
        <div className="inline-flex items-center gap-3 px-5 py-2.5 rounded-full bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200/50 dark:border-emerald-800/30 opacity-0 pointer-events-none select-none" aria-hidden="true">
          <span className="flex items-center gap-2 text-xs font-medium text-emerald-700">
            <span className="relative flex h-2 w-2 sm:h-2.5 sm:w-2.5 rounded-full bg-emerald-500" />
            Doctors online now
          </span>
        </div>
      </div>
    )
  }

  return (
    <motion.div
      initial={prefersReducedMotion ? {} : { opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
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
              <Users className="w-3 h-3" />
              <motion.span
                key={visitors}
                initial={prefersReducedMotion ? {} : { opacity: 0.5, y: -2 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: prefersReducedMotion ? 0 : 0.3 }}
              >
                {visitors}
              </motion.span>
              <span className="hidden sm:inline">browsing</span>
            </span>
          </>
        ) : (
          <>
            <Moon className="w-4 h-4 text-muted-foreground/60" />
            <span className="text-sm font-medium text-foreground">
              Doctors back at 8am AEST
            </span>
            <span className="hidden sm:inline text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
              Submit now — reviewed first thing in the morning
            </span>
          </>
        )}
      </div>
    </motion.div>
  )
}
