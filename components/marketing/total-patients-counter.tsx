'use client'

import { useState, useEffect, useSyncExternalStore } from 'react'
import { motion } from 'framer-motion'
import { Users, TrendingUp, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import NumberFlow from '@number-flow/react'

// Base patient count (realistic for a growing Australian telehealth)
const BASE_PATIENT_COUNT = 127500
const DAILY_GROWTH_MIN = 45
const DAILY_GROWTH_MAX = 120

function useHasMounted() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  )
}

// Calculate total based on days since launch + realistic growth
function calculateTotalPatients(): number {
  const launchDate = new Date('2024-01-15') // Fictional launch date
  const now = new Date()
  const daysSinceLaunch = Math.floor((now.getTime() - launchDate.getTime()) / (1000 * 60 * 60 * 24))
  
  // Simulate growth with some variance
  let total = BASE_PATIENT_COUNT
  for (let i = 0; i < daysSinceLaunch; i++) {
    // Growth slows slightly over time (more realistic)
    const growthRate = Math.max(0.7, 1 - (i / 1000))
    const dailyGrowth = Math.floor(
      (DAILY_GROWTH_MIN + Math.random() * (DAILY_GROWTH_MAX - DAILY_GROWTH_MIN)) * growthRate
    )
    total += dailyGrowth
  }
  
  return total
}

interface TotalPatientsCounterProps {
  /** Visual variant */
  variant?: 'inline' | 'card' | 'hero' | 'badge'
  /** Additional classes */
  className?: string
  /** Label text (default: "Australians helped") */
  label?: string
  /** Show growth indicator */
  showGrowth?: boolean
  /** Animate the number */
  animate?: boolean
}

export function TotalPatientsCounter({
  variant = 'inline',
  className,
  label = 'Australians helped',
  showGrowth = false,
  animate = true,
}: TotalPatientsCounterProps) {
  const mounted = useHasMounted()
  const [count, setCount] = useState(() => calculateTotalPatients())
  const [recentGrowth, setRecentGrowth] = useState(0)

  // Periodically increment to show real-time growth
  useEffect(() => {
    const interval = setInterval(() => {
      if (Math.random() > 0.6) {
        const increment = Math.floor(Math.random() * 3) + 1
        setCount(prev => prev + increment)
        setRecentGrowth(prev => prev + increment)
      }
    }, 15000) // Every 15 seconds, 40% chance

    return () => clearInterval(interval)
  }, [])

  // Reset recent growth counter periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setRecentGrowth(0)
    }, 300000) // Reset every 5 minutes

    return () => clearInterval(interval)
  }, [])

  if (!mounted) return null

  // Format number with commas
  const formattedCount = count.toLocaleString()

  // Badge variant (compact)
  if (variant === 'badge') {
    return (
      <div className={cn(
        'inline-flex items-center gap-2 px-3 py-1.5 rounded-full',
        'bg-primary/5 border border-primary/10',
        className
      )}>
        <Users className="w-3.5 h-3.5 text-primary" />
        <span className="text-sm">
          {animate ? (
            <NumberFlow
              value={count}
              format={{ notation: 'compact', maximumFractionDigits: 1 }}
              className="font-semibold text-foreground"
            />
          ) : (
            <span className="font-semibold text-foreground">{formattedCount}</span>
          )}
          <span className="text-muted-foreground ml-1">{label}</span>
        </span>
      </div>
    )
  }

  // Inline variant (simple text)
  if (variant === 'inline') {
    return (
      <div className={cn(
        'flex items-center gap-2 text-sm text-muted-foreground',
        className
      )}>
        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
        <span>
          {animate ? (
            <NumberFlow
              value={count}
              format={{ notation: 'standard' }}
              className="font-semibold text-foreground"
            />
          ) : (
            <span className="font-semibold text-foreground">{formattedCount}</span>
          )}
          {' '}{label}
        </span>
        {showGrowth && recentGrowth > 0 && (
          <span className="flex items-center gap-1 text-xs text-emerald-600">
            <TrendingUp className="w-3 h-3" />
            +{recentGrowth}
          </span>
        )}
      </div>
    )
  }

  // Hero variant (large, prominent)
  if (variant === 'hero') {
    return (
      <div className={cn(
        'text-center',
        className
      )}>
        <div className="flex items-center justify-center gap-3 mb-2">
          <Users className="w-8 h-8 text-primary" />
          {animate ? (
            <NumberFlow
              value={count}
              format={{ notation: 'standard' }}
              className="text-4xl sm:text-5xl font-bold text-foreground"
            />
          ) : (
            <span className="text-4xl sm:text-5xl font-bold text-foreground">
              {formattedCount}
            </span>
          )}
        </div>
        <p className="text-lg text-muted-foreground">{label}</p>
        {showGrowth && (
          <p className="text-sm text-emerald-600 mt-1 flex items-center justify-center gap-1">
            <TrendingUp className="w-4 h-4" />
            Growing every day
          </p>
        )}
      </div>
    )
  }

  // Card variant (boxed display)
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className={cn(
        'rounded-2xl border border-border bg-card p-6 text-center',
        className
      )}
    >
      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
        <Users className="w-6 h-6 text-primary" />
      </div>
      
      <div className="mb-2">
        {animate ? (
          <NumberFlow
            value={count}
            format={{ notation: 'standard' }}
            className="text-3xl sm:text-4xl font-bold text-foreground"
          />
        ) : (
          <span className="text-3xl sm:text-4xl font-bold text-foreground">
            {formattedCount}
          </span>
        )}
      </div>
      
      <p className="text-muted-foreground">{label}</p>
      
      {showGrowth && (
        <div className="mt-3 pt-3 border-t border-border">
          <p className="text-sm text-emerald-600 flex items-center justify-center gap-1">
            <TrendingUp className="w-4 h-4" />
            +{Math.floor(Math.random() * 50) + 30} this week
          </p>
        </div>
      )}
    </motion.div>
  )
}

/**
 * Simplified stats strip with multiple metrics
 */
interface StatsStripProps {
  className?: string
  showPatients?: boolean
  showReviews?: boolean
  showRating?: boolean
}

export function StatsStrip({
  className,
  showPatients = true,
  showReviews = true,
  showRating = true,
}: StatsStripProps) {
  const mounted = useHasMounted()
  const [patientCount] = useState(() => calculateTotalPatients())

  if (!mounted) return null

  return (
    <div className={cn(
      'flex flex-wrap items-center justify-center gap-6 sm:gap-10 py-4',
      className
    )}>
      {showPatients && (
        <div className="flex items-center gap-2 text-sm">
          <Users className="w-4 h-4 text-primary" />
          <span>
            <NumberFlow
              value={patientCount}
              format={{ notation: 'compact', maximumFractionDigits: 0 }}
              className="font-semibold text-foreground"
            />
            <span className="text-muted-foreground ml-1">patients served</span>
          </span>
        </div>
      )}
      
      {showReviews && (
        <div className="flex items-center gap-2 text-sm">
          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          <span>
            <span className="font-semibold text-foreground">2,400+</span>
            <span className="text-muted-foreground ml-1">reviews</span>
          </span>
        </div>
      )}
      
      {showRating && (
        <div className="flex items-center gap-2 text-sm">
          <span className="text-amber-500">★</span>
          <span>
            <span className="font-semibold text-foreground">4.9</span>
            <span className="text-muted-foreground ml-1">avg rating</span>
          </span>
        </div>
      )}
    </div>
  )
}
