'use client'

import { useState, useEffect, useSyncExternalStore } from 'react'
import { Sun, Moon } from 'lucide-react'
import { motion } from 'framer-motion'

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

export function DoctorAvailabilityPill() {
  const [isOnline, setIsOnline] = useState(true)
  const mounted = useHasMounted()

  useEffect(() => {
    const updateStatus = () => setIsOnline(isWithinHours())
    updateStatus()
    const interval = setInterval(updateStatus, 60000)
    return () => clearInterval(interval)
  }, [])

  if (!mounted) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5, duration: 0.4 }}
      className="flex justify-center"
    >
      <div className="inline-flex items-center gap-3 px-5 py-2.5 rounded-full backdrop-blur-xl bg-white/60 dark:bg-white/10 border border-white/40 dark:border-white/20 shadow-lg shadow-black/5 dark:shadow-black/20">
        {isOnline ? (
          <>
            <Sun className="w-4 h-4 text-emerald-500" />
            <span className="flex items-center gap-2 text-sm font-medium text-foreground">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              Doctors online now
            </span>
            <span className="text-sm text-muted-foreground">—</span>
            <span className="text-sm text-muted-foreground">Average response: 45 min</span>
          </>
        ) : (
          <>
            <Moon className="w-4 h-4 text-slate-400" />
            <span className="text-sm font-medium text-foreground">
              Doctors back at 8am AEST
            </span>
          </>
        )}
      </div>
    </motion.div>
  )
}
