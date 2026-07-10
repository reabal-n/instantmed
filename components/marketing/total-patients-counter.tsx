'use client'

import { motion } from 'framer-motion'
import type { LucideIcon } from 'lucide-react'
import { CheckCircle2, Clock, Send,ShieldCheck, TrendingUp, Users } from 'lucide-react'
import { useSyncExternalStore } from 'react'

import { useReducedMotion } from '@/components/ui/motion'
import { GUARANTEE_LABEL } from '@/lib/marketing/voice'
import { SOCIAL_PROOF } from '@/lib/social-proof'
import { cn } from '@/lib/utils'

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
    { icon: Clock, value: SOCIAL_PROOF.certTurnaroundMinutes, suffix: ' min', label: 'avg turnaround', color: 'text-primary' },
    { icon: ShieldCheck, value: SOCIAL_PROOF.refundPercent, suffix: '%', label: GUARANTEE_LABEL.toLowerCase(), color: 'text-success' },
    { icon: TrendingUp, value: SOCIAL_PROOF.operatingDays, suffix: '', label: 'days a week', color: 'text-primary' },
    { icon: Send, value: SOCIAL_PROOF.averageResponseMinutes, suffix: ' min', label: 'avg response', color: 'text-cyan-600' },
  ],
  'prescription': [
    { icon: Clock, value: SOCIAL_PROOF.averageResponseMinutes, suffix: ' min', label: 'avg response', color: 'text-primary' },
    { icon: TrendingUp, value: SOCIAL_PROOF.operatingDays, suffix: '', label: 'days a week', color: 'text-primary' },
    { icon: ShieldCheck, value: SOCIAL_PROOF.refundPercent, suffix: '%', label: 'refund guarantee', color: 'text-success' },
    { icon: Users, value: SOCIAL_PROOF.ahpraVerifiedPercent, suffix: '%', label: 'doctor reviewed', color: 'text-success' },
  ],
  'consult': [
    { icon: Clock, value: SOCIAL_PROOF.averageResponseMinutes, suffix: ' min', label: 'avg response', color: 'text-primary' },
    { icon: TrendingUp, value: SOCIAL_PROOF.operatingDays, suffix: '', label: 'days a week', color: 'text-primary' },
    { icon: ShieldCheck, value: SOCIAL_PROOF.ahpraVerifiedPercent, suffix: '%', label: 'doctor reviewed', color: 'text-success' },
    { icon: CheckCircle2, value: SOCIAL_PROOF.refundPercent, suffix: '%', label: GUARANTEE_LABEL.toLowerCase(), color: 'text-success' },
  ],
} as const

function useHasMounted() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  )
}

/**
 * Simplified stats strip with multiple metrics.
 *
 * The `TotalPatientsCounter` component and the "patients served" count that
 * used to render here were removed 2026-07-10: the figure came from the
 * synthetic interpolation in lib/social-proof (see getPatientCount's
 * compliance note) and must not appear on public surfaces.
 */
interface StatsStripProps {
  className?: string
  showPatients?: boolean
  showReviews?: boolean
}

export function StatsStrip({
  className,
  showPatients = true,
  showReviews = true,
}: StatsStripProps) {
  const mounted = useHasMounted()
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
            <span className="font-semibold text-foreground">AHPRA-registered</span>
            <span className="text-muted-foreground ml-1">doctor review</span>
          </span>
        </div>
      )}

      {showReviews && (
        <div className="flex items-center gap-2 text-sm">
          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          <span>
            <span className="font-semibold text-foreground">{SOCIAL_PROOF.refundPercent}%</span>
            <span className="text-muted-foreground ml-1">{GUARANTEE_LABEL.toLowerCase()}</span>
          </span>
        </div>
      )}

    </motion.div>
  )
}
