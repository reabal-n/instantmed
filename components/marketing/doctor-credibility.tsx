'use client'

import { motion } from 'framer-motion'
import { CheckCircle2, Clock, ShieldCheck, Stethoscope, TrendingUp,Users } from 'lucide-react'

import { TrustBadgeRow } from '@/components/shared/trust-badge'
import { useReducedMotion } from '@/components/ui/motion'
import { SOCIAL_PROOF, SOCIAL_PROOF_DISPLAY } from '@/lib/social-proof'
import { cn } from '@/lib/utils'

interface DoctorCredibilityProps {
  variant?: 'inline' | 'card' | 'section'
  stats?: ('experience' | 'approval' | 'sameDay' | 'returnRate' | 'reviews')[]
  className?: string
}

const STAT_CONFIG = {
  experience: {
    icon: Stethoscope,
    value: SOCIAL_PROOF_DISPLAY.doctorExperience,
    label: 'Your GP',
    color: 'text-primary',
    bg: 'bg-primary/10',
  },
  approval: {
    icon: CheckCircle2,
    value: `${SOCIAL_PROOF.certApprovalPercent}%`,
    label: 'Approval rate',
    color: 'text-success',
    bg: 'bg-success-light',
  },
  sameDay: {
    icon: Clock,
    value: `${SOCIAL_PROOF.sameDayDeliveryPercent}%`,
    label: 'Delivered same day',
    color: 'text-primary',
    bg: 'bg-primary/10',
  },
  returnRate: {
    icon: Users,
    value: `${SOCIAL_PROOF.patientReturnPercent}%`,
    label: 'Come back again',
    color: 'text-primary',
    bg: 'bg-primary/10',
  },
  reviews: {
    icon: TrendingUp,
    value: `${SOCIAL_PROOF.averageRating}/5`,
    label: 'patient rating',
    color: 'text-warning',
    bg: 'bg-amber-500/10',
  },
} as const

export function DoctorCredibility({
  variant = 'inline',
  stats = ['experience', 'approval', 'sameDay', 'reviews'],
  className,
}: DoctorCredibilityProps) {
  const prefersReducedMotion = useReducedMotion()

  if (variant === 'inline') {
    return (
      <div className={cn(
        'flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-sm',
        className
      )}>
        {stats.map((key) => {
          const config = STAT_CONFIG[key]
          return (
            <div key={key} className="flex items-center gap-2 text-muted-foreground">
              <config.icon className={cn('w-4 h-4', config.color)} />
              <span>
                <span className="font-semibold text-foreground">{config.value}</span>
                <span className="ml-1">{config.label}</span>
              </span>
            </div>
          )
        })}
      </div>
    )
  }

  if (variant === 'card') {
    return (
      <div className={cn(
        'rounded-2xl border border-border/50 bg-white dark:bg-card p-6',
        'shadow-md shadow-primary/[0.06] dark:shadow-none',
        className
      )}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">AHPRA-registered doctors</h3>
            <p className="text-xs text-muted-foreground">{SOCIAL_PROOF_DISPLAY.doctorExperience}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {stats.filter(s => s !== 'experience').map((key) => {
            const config = STAT_CONFIG[key]
            return (
              <div key={key} className={cn('rounded-xl p-3', config.bg)}>
                <div className={cn('text-lg font-semibold', config.color)}>{config.value}</div>
                <div className="text-xs text-muted-foreground">{config.label}</div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  // Section variant
  return (
    <section className={cn('py-16', className)}>
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={prefersReducedMotion ? {} : { y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-10"
        >
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Our doctors</p>
          <h2 className="text-2xl sm:text-3xl font-semibold text-foreground">
            {SOCIAL_PROOF_DISPLAY.doctorExperience}
          </h2>
          <p className="text-muted-foreground mt-2">
            Every request reviewed by a qualified, AHPRA-registered Australian GP.
          </p>
        </motion.div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map((key, i) => {
            const config = STAT_CONFIG[key]
            return (
              <motion.div
                key={key}
                initial={prefersReducedMotion ? {} : { y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.3 }}
                className="text-center p-5 rounded-2xl bg-white dark:bg-card border border-border/50 dark:border-white/15 shadow-md shadow-primary/[0.06] dark:shadow-none"
              >
                <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-3', config.bg)}>
                  <config.icon className={cn('w-5 h-5', config.color)} />
                </div>
                <div className={cn('text-2xl font-semibold', config.color)}>{config.value}</div>
                <div className="text-sm text-muted-foreground mt-1">{config.label}</div>
              </motion.div>
            )
          })}
        </div>

        <TrustBadgeRow preset="doctor_credibility" className="mt-4" />
      </div>
    </section>
  )
}
