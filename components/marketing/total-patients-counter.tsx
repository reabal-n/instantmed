'use client'

import { useSyncExternalStore } from 'react'
import { motion } from 'framer-motion'
import { useReducedMotion } from '@/components/ui/motion'
import type { LucideIcon } from 'lucide-react'
import { Users, TrendingUp, CheckCircle2, Clock, Star, ShieldCheck, Send } from 'lucide-react'
import { cn } from '@/lib/utils'
import NumberFlow from '@number-flow/react'
import { SOCIAL_PROOF } from '@/lib/social-proof'
import { usePatientCount } from '@/lib/hooks/use-patient-count'

// ── Stat presets - centralized social proof stats per service ────────
export interface StatEntry {
  icon: LucideIcon
  value: number
  suffix: string
  label: string
  color: string
  decimals?: number
}

export const STAT_PRESETS: Record<string, readonly StatEntry[]> = {
  'med-cert': [
    { icon: Users, value: SOCIAL_PROOF.certApprovalPercent, suffix: '%', label: 'requests approved', color: 'text-success' },
    { icon: Clock, value: SOCIAL_PROOF.certTurnaroundMinutes, suffix: ' min', label: 'avg turnaround', color: 'text-primary' },
    { icon: Star, value: SOCIAL_PROOF.averageRating, suffix: '/5', label: 'patient rating', color: 'text-amber-500', decimals: 1 },
    { icon: Send, value: SOCIAL_PROOF.sameDayDeliveryPercent, suffix: '%', label: 'same-day delivery', color: 'text-cyan-600' },
  ],
  'prescription': [
    { icon: Users, value: SOCIAL_PROOF.scriptFulfillmentPercent, suffix: '%', label: 'fulfilled same day', color: 'text-success' },
    { icon: Clock, value: SOCIAL_PROOF.averageResponseMinutes, suffix: ' min', label: 'avg response', color: 'text-primary' },
    { icon: Star, value: SOCIAL_PROOF.averageRating, suffix: '/5', label: 'patient rating', color: 'text-amber-500', decimals: 1 },
    { icon: ShieldCheck, value: SOCIAL_PROOF.refundPercent, suffix: '%', label: 'refund guarantee', color: 'text-success' },
  ],
  'consult': [
    { icon: Clock, value: SOCIAL_PROOF.certTurnaroundMinutes, suffix: ' min', label: 'avg review time', color: 'text-primary' },
    { icon: Star, value: SOCIAL_PROOF.averageRating, suffix: '/5', label: 'patient rating', color: 'text-amber-500', decimals: 1 },
    { icon: ShieldCheck, value: SOCIAL_PROOF.certApprovalPercent, suffix: '%', label: 'approval rate', color: 'text-success' },
    { icon: CheckCircle2, value: SOCIAL_PROOF.refundPercent, suffix: '%', label: "refund if we can't help", color: 'text-success' },
  ],
} as const

function useHasMounted() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  )
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
  const count = usePatientCount()
  const prefersReducedMotion = useReducedMotion()

  if (!mounted) return null

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
      </div>
    )
  }

  // Hero variant (large, prominent)
  if (variant === 'hero') {
    return (
      <div className={cn('text-center', className)}>
        <div className="flex items-center justify-center gap-3 mb-2">
          <Users className="w-8 h-8 text-primary" />
          {animate ? (
            <NumberFlow
              value={count}
              format={{ notation: 'standard' }}
              className="text-4xl sm:text-5xl font-semibold text-foreground"
            />
          ) : (
            <span className="text-4xl sm:text-5xl font-semibold text-foreground">
              {formattedCount}
            </span>
          )}
        </div>
        <p className="text-lg text-muted-foreground">{label}</p>
        {showGrowth && (
          <p className="text-sm text-success mt-1 flex items-center justify-center gap-1">
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
      initial={prefersReducedMotion ? {} : { y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: prefersReducedMotion ? 0 : 0.4 }}
      className={cn(
        'rounded-2xl border border-border dark:border-white/10 bg-white dark:bg-card p-6 text-center',
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
            className="text-3xl sm:text-4xl font-semibold text-foreground"
          />
        ) : (
          <span className="text-3xl sm:text-4xl font-semibold text-foreground">
            {formattedCount}
          </span>
        )}
      </div>

      <p className="text-muted-foreground">{label}</p>
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
  const patientCount = usePatientCount()
  const prefersReducedMotion = useReducedMotion()

  if (!mounted) return null

  return (
    <motion.div
      className={cn(
        'flex flex-wrap items-center justify-center gap-6 sm:gap-10 py-6',
        className
      )}
      initial={prefersReducedMotion ? {} : {}}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
      transition={{ duration: prefersReducedMotion ? 0 : 0.5 }}
    >
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
            <span className="font-semibold text-foreground">{SOCIAL_PROOF.certApprovalPercent}%</span>
            <span className="text-muted-foreground ml-1">approval rate</span>
          </span>
        </div>
      )}

      {showRating && (
        <div className="flex items-center gap-2 text-sm">
          <span className="text-amber-500">★</span>
          <span>
            <span className="font-semibold text-foreground">{SOCIAL_PROOF.averageRating}</span>
            <span className="text-muted-foreground ml-1">avg rating</span>
          </span>
        </div>
      )}
    </motion.div>
  )
}
