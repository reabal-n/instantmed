'use client'

import { Clock } from 'lucide-react'
import { useEffect, useState, useSyncExternalStore } from 'react'

import { cn } from '@/lib/utils'

function useHasMounted() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  )
}

/**
 * Subtle "Last reviewed X min ago" urgency signal.
 * Shows a realistic-looking time (8–45 min) that slowly increments,
 * giving the impression the service is actively processing requests.
 */
export function LastReviewedSignal({ className }: { className?: string }) {
  const mounted = useHasMounted()
  const [minutes, setMinutes] = useState(12)

  useEffect(() => {
    // Seed with a time-of-day weighted random value (busier = more recent)
    const hour = new Date().getHours()
    const base = hour >= 8 && hour < 22 ? 8 + Math.floor(Math.random() * 15) : 20 + Math.floor(Math.random() * 25)
    setMinutes(base)

    // Slowly increment every ~90 seconds to feel alive
    const interval = setInterval(() => {
      setMinutes((prev) => {
        if (prev >= 45) return 8 + Math.floor(Math.random() * 10)
        return prev + 1
      })
    }, 90000)
    return () => clearInterval(interval)
  }, [])

  if (!mounted) return null

  return (
    <p className={cn('flex items-center gap-1.5 text-xs text-muted-foreground/70', className)}>
      <Clock className="w-3 h-3" />
      Last reviewed {minutes} min ago
    </p>
  )
}
