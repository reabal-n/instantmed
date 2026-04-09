'use client'

import { useState, useEffect, useSyncExternalStore } from 'react'
import { motion } from 'framer-motion'
import { useReducedMotion } from '@/components/ui/motion'
import { Clock, FileText, Pill, Phone } from 'lucide-react'
import { cn } from '@/lib/utils'
import { SOCIAL_PROOF } from '@/lib/social-proof'

// Static, honest wait time data — no randomisation, no fake fluctuation
const SERVICE_CONFIG = {
  'med-cert': {
    label: 'Medical Certificates',
    shortLabel: 'Med Certs',
    icon: FileText,
    waitLabel: `Under ${SOCIAL_PROOF.certTurnaroundMinutes} min`,
    subtext: 'Available 24/7',
    color: 'text-primary',
    bgColor: 'bg-primary/10',
    alwaysOnline: true,
  },
  'scripts': {
    label: 'Repeat Prescriptions',
    shortLabel: 'Prescriptions',
    icon: Pill,
    waitLabel: 'Under 1 hour',
    subtext: '8am–10pm AEST',
    color: 'text-success',
    bgColor: 'bg-success-light',
    alwaysOnline: false,
  },
  'consult': {
    label: 'Consultations',
    shortLabel: 'Consults',
    icon: Phone,
    waitLabel: 'Under 1 hour',
    subtext: '8am–10pm AEST',
    color: 'text-primary',
    bgColor: 'bg-primary/10',
    alwaysOnline: false,
  },
  'consult-ed': {
    label: 'ED Consultations',
    shortLabel: 'ED',
    icon: Phone,
    waitLabel: 'Under 1 hour',
    subtext: '8am–10pm AEST',
    color: 'text-primary',
    bgColor: 'bg-primary/10',
    alwaysOnline: false,
  },
  'consult-hair-loss': {
    label: 'Hair Loss Consultations',
    shortLabel: 'Hair Loss',
    icon: Phone,
    waitLabel: 'Under 1 hour',
    subtext: '8am–10pm AEST',
    color: 'text-primary',
    bgColor: 'bg-primary/10',
    alwaysOnline: false,
  },
} as const

type ServiceType = keyof typeof SERVICE_CONFIG

// Operating hours (AEST) — 8am–10pm
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

interface LiveWaitTimeProps {
  /** Which services to display */
  services?: ServiceType[]
  /** Compact single-service display */
  service?: ServiceType
  /** Visual variant */
  variant?: 'strip' | 'card' | 'compact' | 'badge'
  /** Additional classes */
  className?: string
}

export function LiveWaitTime({
  services = ['med-cert', 'scripts', 'consult'],
  service,
  variant = 'strip',
  className,
}: LiveWaitTimeProps) {
  const mounted = useHasMounted()
  const prefersReducedMotion = useReducedMotion()
  const [isOnline, setIsOnline] = useState(true)

  // Update online status — checked every minute so UI stays accurate
  useEffect(() => {
    const updateStatus = () => setIsOnline(isWithinHours())
    updateStatus()
    const interval = setInterval(updateStatus, 60000)
    return () => clearInterval(interval)
  }, [])

  if (!mounted) return null

  // Badge variant — single service, inline pill
  if (service && variant === 'badge') {
    const config = SERVICE_CONFIG[service]
    const serviceOnline = config.alwaysOnline || isOnline

    return (
      <div className={cn(
        'inline-flex items-center gap-2 px-3 py-1.5 rounded-full',
        'bg-primary/5 border border-primary/10',
        className
      )}>
        <Clock className="w-3.5 h-3.5 text-primary" />
        <span className="text-sm">
          {serviceOnline ? (
            <>
              <span className="font-medium text-foreground">{config.waitLabel}</span>
              <span className="text-muted-foreground"> typical wait</span>
            </>
          ) : (
            <span className="font-medium text-foreground">Next business day</span>
          )}
        </span>
      </div>
    )
  }

  // Compact variant — single line, multiple services
  if (variant === 'compact') {
    const displayServices = service ? [service] : services

    return (
      <div className={cn(
        'flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-sm',
        className
      )}>
        {isOnline && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <span className="relative flex h-2 w-2">
              <span className={cn(
                'absolute inline-flex h-full w-full rounded-full bg-success opacity-75',
                !prefersReducedMotion && 'animate-ping'
              )} />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-success" />
            </span>
            <span className="font-medium text-foreground">Doctors online</span>
          </div>
        )}

        {displayServices.map(key => {
          const config = SERVICE_CONFIG[key]
          const serviceOnline = config.alwaysOnline || isOnline

          return (
            <div key={key} className="flex items-center gap-1.5 text-muted-foreground">
              <config.icon className={cn('w-3.5 h-3.5', config.color)} />
              <span>{config.shortLabel}:</span>
              <span className="font-medium text-foreground">
                {serviceOnline ? config.waitLabel : 'Next business day'}
              </span>
            </div>
          )
        })}
      </div>
    )
  }

  // Strip variant — horizontal bar used on homepage
  if (variant === 'strip') {
    return (
      <motion.div
        initial={prefersReducedMotion ? {} : { opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className={cn(
          'py-3.5 px-4',
          'bg-white dark:bg-card',
          'border-y border-border/50 dark:border-white/10',
          'shadow-sm shadow-primary/[0.04]',
          className
        )}
      >
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-8">
            {/* Status indicator */}
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className={cn(
                  'absolute inline-flex h-full w-full rounded-full opacity-75',
                  isOnline ? 'bg-success' : 'bg-muted-foreground',
                  isOnline && !prefersReducedMotion && 'animate-ping'
                )} />
                <span className={cn(
                  'relative inline-flex rounded-full h-2 w-2',
                  isOnline ? 'bg-success' : 'bg-muted-foreground'
                )} />
              </span>
              <span className="text-sm font-medium text-foreground">
                {isOnline ? 'Doctors reviewing now' : 'Review times'}
              </span>
            </div>

            <div className="h-4 w-px bg-border hidden sm:block" />

            {/* Service wait times */}
            <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6">
              {services.map(key => {
                const config = SERVICE_CONFIG[key]
                const serviceOnline = config.alwaysOnline || isOnline

                return (
                  <div
                    key={key}
                    className="group flex items-center gap-2 text-sm cursor-default"
                  >
                    <config.icon className={cn(
                      'w-4 h-4 transition-transform duration-200',
                      config.color,
                      !prefersReducedMotion && 'group-hover:scale-110'
                    )} />
                    <span className="text-muted-foreground">{config.shortLabel}:</span>
                    <span className="font-semibold text-foreground">
                      {serviceOnline ? config.waitLabel : 'Next business day'}
                    </span>
                    {serviceOnline && (
                      <span className="hidden lg:inline text-xs text-muted-foreground/70">
                        {config.subtext}
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </motion.div>
    )
  }

  // Card variant — more prominent, grid layout
  return (
    <motion.div
      initial={prefersReducedMotion ? {} : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className={cn(
        'rounded-2xl border border-border dark:border-white/10',
        'bg-white dark:bg-card',
        'shadow-md shadow-primary/[0.06] dark:shadow-none',
        'p-6',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Clock className="w-4 h-4 text-primary" />
          </div>
          <h3 className="font-semibold text-foreground">Typical Wait Times</h3>
        </div>
        <div className="flex items-center gap-1.5 text-sm">
          <span className="relative flex h-2 w-2">
            <span className={cn(
              'absolute inline-flex h-full w-full rounded-full opacity-75',
              isOnline ? 'bg-success' : 'bg-muted-foreground',
              isOnline && !prefersReducedMotion && 'animate-ping'
            )} />
            <span className={cn(
              'relative inline-flex rounded-full h-2 w-2',
              isOnline ? 'bg-success' : 'bg-muted-foreground'
            )} />
          </span>
          <span className={cn('font-medium', isOnline ? 'text-success' : 'text-muted-foreground')}>
            {isOnline ? 'Online' : 'Offline'}
          </span>
        </div>
      </div>

      {/* Service rows */}
      <div className="grid gap-2.5">
        {services.map(key => {
          const config = SERVICE_CONFIG[key]
          const serviceOnline = config.alwaysOnline || isOnline

          return (
            <motion.div
              key={key}
              whileHover={prefersReducedMotion ? {} : { scale: 1.01, x: 2 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
              className={cn(
                'flex items-center justify-between px-4 py-3 rounded-xl',
                'transition-shadow duration-200',
                'hover:shadow-sm',
                config.bgColor
              )}
            >
              <div className="flex items-center gap-3">
                <config.icon className={cn('w-4 h-4 flex-shrink-0', config.color)} />
                <div>
                  <p className="font-medium text-sm text-foreground">{config.label}</p>
                  {serviceOnline && (
                    <p className="text-xs text-muted-foreground">{config.subtext}</p>
                  )}
                </div>
              </div>
              <span className={cn(
                'text-base font-semibold tabular-nums',
                serviceOnline ? 'text-foreground' : 'text-muted-foreground'
              )}>
                {serviceOnline ? config.waitLabel : 'Next business day'}
              </span>
            </motion.div>
          )
        })}
      </div>

      <p className="text-xs text-muted-foreground mt-4 text-center">
        Based on typical review times — not a guarantee.
      </p>
    </motion.div>
  )
}

/**
 * Single service wait time indicator — convenience wrapper
 */
interface ServiceWaitBadgeProps {
  service: ServiceType
  className?: string
}

export function ServiceWaitBadge({ service, className }: ServiceWaitBadgeProps) {
  return <LiveWaitTime service={service} variant="badge" className={className} />
}
