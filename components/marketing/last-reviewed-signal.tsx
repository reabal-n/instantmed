'use client'

import { Clock } from 'lucide-react'
import { useEffect, useState, useSyncExternalStore } from 'react'

import { cn } from '@/lib/utils'

const STORAGE_KEY = 'instantmed_last_reviewed_v2'
const MIN_MINUTES = 5
const MAX_MINUTES = 43
// Stored seed expires after 90 minutes - after that we regenerate. This stops
// a returning visitor seeing the same number stuck across days while still
// providing consistent progression within a sensible window.
const SEED_TTL_MS = 90 * 60 * 1000
const TICK_MS = 90_000

interface SeedRecord {
  base: number       // minutes value at baseTimestamp
  ts: number         // baseTimestamp in ms
}

function useHasMounted() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  )
}

function generateBase(): number {
  // Weighted toward the lower end during business hours so the signal feels
  // more "active". After hours, allow a wider spread.
  const hour = new Date().getHours()
  if (hour >= 8 && hour < 22) {
    return MIN_MINUTES + Math.floor(Math.random() * 18)  // 5-22
  }
  return 12 + Math.floor(Math.random() * 28)             // 12-39
}

function readSeed(): SeedRecord | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<SeedRecord>
    if (typeof parsed.base !== 'number' || typeof parsed.ts !== 'number') return null
    if (Date.now() - parsed.ts > SEED_TTL_MS) return null
    return { base: parsed.base, ts: parsed.ts }
  } catch {
    return null
  }
}

function writeSeed(seed: SeedRecord): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(seed))
  } catch {
    // Storage blocked or full - silent fail, in-memory state still works.
  }
}

function computeCurrent(seed: SeedRecord): number {
  const elapsedMin = Math.floor((Date.now() - seed.ts) / 60_000)
  return seed.base + elapsedMin
}

/**
 * Subtle "Last reviewed X min ago" signal.
 *
 * Persists a seed in localStorage so a returning visitor sees the time
 * progress consistently rather than jumping around. Range stays inside
 * 5-43 minutes. Regenerates the seed if it expires (90 min) or exceeds
 * the max value, so the number always feels live without ever flatlining.
 */
export function LastReviewedSignal({ className }: { className?: string }) {
  const mounted = useHasMounted()
  const [minutes, setMinutes] = useState(MIN_MINUTES + 7)

  useEffect(() => {
    let seed = readSeed()
    if (!seed) {
      seed = { base: generateBase(), ts: Date.now() }
      writeSeed(seed)
    }

    const sync = () => {
      let current = computeCurrent(seed!)
      if (current > MAX_MINUTES) {
        // Regenerate with a fresh base near the lower end so the cycle restarts
        // at a believable "just reviewed" value.
        seed = { base: MIN_MINUTES + Math.floor(Math.random() * 8), ts: Date.now() }
        writeSeed(seed)
        current = seed.base
      }
      setMinutes(current)
    }

    sync()
    const interval = setInterval(sync, TICK_MS)
    return () => clearInterval(interval)
  }, [])

  if (!mounted) return null

  return (
    <p className={cn('flex items-center gap-1.5 text-xs text-muted-foreground', className)}>
      <Clock className="w-3 h-3" />
      Last reviewed {minutes} min ago
    </p>
  )
}
