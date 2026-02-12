'use client'

import { useState, useEffect, useSyncExternalStore } from 'react'
import { Moon, Users } from 'lucide-react'
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

function getRandomVisitors(): number {
  return Math.floor(Math.random() * 17) + 2 // 2-18
}

export function DoctorAvailabilityPill() {
  const [isOnline, setIsOnline] = useState(true)
  const [visitors, setVisitors] = useState(() => getRandomVisitors())
  const mounted = useHasMounted()

  useEffect(() => {
    const updateStatus = () => setIsOnline(isWithinHours())
    updateStatus()
    const interval = setInterval(updateStatus, 60000)
    return () => clearInterval(interval)
  }, [])

  // Fluctuate visitor count every 15-30 seconds
  useEffect(() => {
    const fluctuate = () => {
      setVisitors(prev => {
        const change = Math.random() > 0.5 ? 1 : -1
        const next = prev + change
        return Math.max(2, Math.min(18, next))
      })
    }
    const interval = setInterval(fluctuate, 15000 + Math.random() * 15000)
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
      <div className="inline-flex items-center gap-3 px-5 py-2.5 rounded-full backdrop-blur-xl bg-emerald-50/80 dark:bg-emerald-950/20 border border-emerald-200/50 dark:border-emerald-800/30 shadow-lg shadow-emerald-500/5 dark:shadow-emerald-500/10 hover:shadow-xl hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-all duration-300">
        {isOnline ? (
          <>
            <span className="flex items-center gap-2 text-xs font-medium text-emerald-700 dark:text-emerald-400">
              <span className="relative flex h-2 w-2 sm:h-2.5 sm:w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 sm:h-2.5 sm:w-2.5 bg-emerald-500 shadow-sm shadow-emerald-500/50" />
              </span>
              Doctors online now
            </span>
            <span className="h-3 w-px bg-emerald-300/50 dark:bg-emerald-700/50" />
            <span className="flex items-center gap-1.5 text-xs text-emerald-600/80 dark:text-emerald-400/80">
              <Users className="w-3 h-3" />
              <motion.span
                key={visitors}
                initial={{ opacity: 0.5, y: -2 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                {visitors}
              </motion.span>
              <span className="hidden sm:inline">browsing</span>
            </span>
          </>
        ) : (
          <>
            <Moon className="w-4 h-4 text-slate-400" />
            <span className="text-sm font-medium text-foreground">
              Doctors back at 8am AEST
            </span>
            <span className="hidden sm:inline text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-white/10 text-muted-foreground">
              Submit now, reviewed in morning
            </span>
          </>
        )}
      </div>
    </motion.div>
  )
}
