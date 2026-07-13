'use client'

import { motion } from 'framer-motion'
import { CheckCircle2, Users } from 'lucide-react'
import { useSyncExternalStore } from 'react'

import { useReducedMotion } from '@/components/ui/motion'
import { GUARANTEE_LABEL } from '@/lib/marketing/voice'
import { SOCIAL_PROOF } from '@/lib/social-proof'
import { cn } from '@/lib/utils'

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
 * The retired "patients served" count must not return to public surfaces
 * without a real, verifiable source.
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
