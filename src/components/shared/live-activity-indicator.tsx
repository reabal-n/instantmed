'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Users } from 'lucide-react'

interface LiveActivityIndicatorProps {
  minCount?: number
  maxCount?: number
  label?: string
  showAvatars?: boolean
}

// Generate random avatar colors
const avatarColors = [
  'bg-teal-500',
  'bg-blue-500',
  'bg-purple-500',
  'bg-pink-500',
  'bg-amber-500',
  'bg-emerald-500',
]

export function LiveActivityIndicator({
  minCount = 8,
  maxCount = 24,
  label = 'people getting certificates right now',
  showAvatars = true,
}: LiveActivityIndicatorProps) {
  const [count, setCount] = useState(minCount)
  const [isLive, setIsLive] = useState(true)

  // Simulate live count updates
  useEffect(() => {
    const interval = setInterval(() => {
      setCount((prev) => {
        const change = Math.random() > 0.5 ? 1 : -1
        const newCount = prev + change
        return Math.max(minCount, Math.min(maxCount, newCount))
      })
    }, 3000 + Math.random() * 2000)

    return () => clearInterval(interval)
  }, [minCount, maxCount])

  // Pulse the live indicator
  useEffect(() => {
    const interval = setInterval(() => {
      setIsLive((prev) => !prev)
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  return (
    <motion.div
      className="inline-flex items-center gap-3 px-4 py-2.5 rounded-full bg-white/80 backdrop-blur-md border border-slate-200/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)]"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 260, damping: 20 }}
    >
      {/* Live indicator dot */}
      <div className="relative flex items-center justify-center">
        <span
          className={`w-2 h-2 rounded-full bg-emerald-500 transition-opacity duration-500 ${
            isLive ? 'opacity-100' : 'opacity-50'
          }`}
        />
        <span className="absolute w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
      </div>

      {/* Avatar stack */}
      {showAvatars && (
        <div className="flex -space-x-2">
          {[...Array(Math.min(5, count))].map((_, i) => (
            <motion.div
              key={i}
              className={`w-6 h-6 rounded-full ${avatarColors[i % avatarColors.length]} ring-2 ring-white flex items-center justify-center`}
              initial={{ scale: 0, x: -10 }}
              animate={{ scale: 1, x: 0 }}
              transition={{ delay: i * 0.05, type: 'spring', stiffness: 300, damping: 20 }}
            >
              <span className="text-[10px] font-medium text-white">
                {String.fromCharCode(65 + (i * 7) % 26)}
              </span>
            </motion.div>
          ))}
          {count > 5 && (
            <motion.div
              className="w-6 h-6 rounded-full bg-slate-100 ring-2 ring-white flex items-center justify-center"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.25, type: 'spring', stiffness: 300, damping: 20 }}
            >
              <span className="text-[9px] font-semibold text-slate-600">+{count - 5}</span>
            </motion.div>
          )}
        </div>
      )}

      {/* Count and label */}
      <div className="flex items-center gap-1.5 text-sm">
        <AnimatePresence mode="wait">
          <motion.span
            key={count}
            className="font-semibold text-slate-900 tabular-nums"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.2 }}
          >
            {count}
          </motion.span>
        </AnimatePresence>
        <span className="text-slate-500">{label}</span>
      </div>
    </motion.div>
  )
}

// Compact version for headers/footers
export function LiveActivityBadge() {
  const [count, setCount] = useState(12)

  useEffect(() => {
    const interval = setInterval(() => {
      setCount((prev) => {
        const change = Math.random() > 0.5 ? 1 : -1
        return Math.max(5, Math.min(30, prev + change))
      })
    }, 4000)

    return () => clearInterval(interval)
  }, [])

  return (
    <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
      </span>
      <span>
        <span className="font-medium text-slate-700">{count}</span> active now
      </span>
    </div>
  )
}
