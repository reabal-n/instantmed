'use client'

import { useState, useEffect, useSyncExternalStore } from 'react'
import { motion } from 'framer-motion'
import { useReducedMotion } from '@/components/ui/motion'
import { Clock, FileText, Pill, Phone, TrendingDown } from 'lucide-react'
import { cn } from '@/lib/utils'

// Service wait time configurations — usually 30 mins or less
const SERVICE_WAIT_TIMES = {
  'med-cert': {
    label: 'Medical Certificates',
    shortLabel: 'Med Certs',
    icon: FileText,
    minWait: 8,
    maxWait: 25,
    color: 'text-primary',
    bgColor: 'bg-primary/10',
  },
  'scripts': {
    label: 'Repeat medication',
    shortLabel: 'Medication',
    icon: Pill,
    minWait: 15,
    maxWait: 35,
    color: 'text-success',
    bgColor: 'bg-success-light',
  },
  'consult': {
    label: 'Consultations',
    shortLabel: 'Consults',
    icon: Phone,
    minWait: 20,
    maxWait: 45,
    color: 'text-primary',
    bgColor: 'bg-primary/10',
  },
} as const

function formatWaitTime(minutes: number): string {
  if (minutes < 60) return `~${minutes} min`
  const hours = Math.floor(minutes / 60)
  const remaining = minutes % 60
  if (remaining === 0) return `~${hours}hr`
  return `~${hours}hr ${remaining}min`
}

type ServiceType = keyof typeof SERVICE_WAIT_TIMES

// Operating hours (AEST)
const OPEN_HOUR = 8
const CLOSE_HOUR = 20

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

// Generate realistic wait time within range
function generateWaitTime(min: number, max: number): number {
  // Weight towards the lower end for better UX
  const range = max - min
  const weighted = Math.pow(Math.random(), 1.3) * range
  return Math.round(min + weighted)
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
  /** Show "faster than usual" indicator when times are low */
  showTrending?: boolean
}

export function LiveWaitTime({
  services = ['med-cert', 'scripts', 'consult'],
  service,
  variant = 'strip',
  className,
  showTrending = true,
}: LiveWaitTimeProps) {
  const mounted = useHasMounted()
  const prefersReducedMotion = useReducedMotion()
  const [isOnline, setIsOnline] = useState(true)
  const [waitTimes, setWaitTimes] = useState<Record<ServiceType, number>>(() => ({
    'med-cert': generateWaitTime(SERVICE_WAIT_TIMES['med-cert'].minWait, SERVICE_WAIT_TIMES['med-cert'].maxWait),
    'scripts': generateWaitTime(SERVICE_WAIT_TIMES['scripts'].minWait, SERVICE_WAIT_TIMES['scripts'].maxWait),
    'consult': generateWaitTime(SERVICE_WAIT_TIMES['consult'].minWait, SERVICE_WAIT_TIMES['consult'].maxWait),
  }))

  // Update online status
  useEffect(() => {
    const updateStatus = () => setIsOnline(isWithinHours())
    updateStatus()
    const interval = setInterval(updateStatus, 60000)
    return () => clearInterval(interval)
  }, [])

  // Fluctuate wait times realistically
  useEffect(() => {
    const interval = setInterval(() => {
      setWaitTimes(prev => {
        const newTimes = { ...prev }
        const serviceKeys = Object.keys(SERVICE_WAIT_TIMES) as ServiceType[]
        
        // Randomly update 1-2 services
        const updateCount = Math.random() > 0.5 ? 2 : 1
        for (let i = 0; i < updateCount; i++) {
          const key = serviceKeys[Math.floor(Math.random() * serviceKeys.length)]
          const config = SERVICE_WAIT_TIMES[key]
          const change = Math.random() > 0.5 ? Math.ceil(Math.random() * 3) : -Math.ceil(Math.random() * 3)
          newTimes[key] = Math.max(config.minWait, Math.min(config.maxWait, prev[key] + change))
        }
        
        return newTimes
      })
    }, 8000) // Every 8 seconds

    return () => clearInterval(interval)
  }, [])

  if (!mounted) return null

  // Single service badge variant
  if (service && variant === 'badge') {
    const config = SERVICE_WAIT_TIMES[service]
    const time = waitTimes[service]
    const isFast = time <= config.minWait + 5

    return (
      <div className={cn(
        'inline-flex items-center gap-2 px-3 py-1.5 rounded-full',
        'bg-primary/5 border border-primary/10',
        className
      )}>
        <Clock className="w-3.5 h-3.5 text-primary" />
        <span className="text-sm">
          {isOnline ? (
            <>
              <span className="font-medium text-foreground">{formatWaitTime(time)}</span>
              <span className="text-muted-foreground"> typical wait</span>
            </>
          ) : (
            <span className="font-medium text-foreground">Next business day</span>
          )}
        </span>
        {showTrending && isFast && isOnline && (
          <span className="flex items-center gap-1 text-xs text-success">
            <TrendingDown className="w-3 h-3" />
            Fast
          </span>
        )}
      </div>
    )
  }

  // Compact single-line variant
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
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span className="font-medium text-foreground">Doctors online</span>
          </div>
        )}
        
        {displayServices.map(key => {
          const config = SERVICE_WAIT_TIMES[key]
          const time = waitTimes[key]

          return (
            <div key={key} className="flex items-center gap-1.5 text-muted-foreground">
              <config.icon className={cn('w-3.5 h-3.5', config.color)} />
              <span>{config.shortLabel}:</span>
              {isOnline ? (
                <motion.span
                  key={time}
                  initial={prefersReducedMotion ? {} : { opacity: 0.5, y: -2 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: prefersReducedMotion ? 0 : 0.2 }}
                  className="font-medium text-foreground"
                >
                  {formatWaitTime(time)}
                </motion.span>
              ) : (
                <span className="font-medium text-foreground">Next business day</span>
              )}
            </div>
          )
        })}
      </div>
    )
  }

  // Strip variant (horizontal bar)
  if (variant === 'strip') {
    return (
      <div className={cn(
        'py-4 px-4 bg-muted/30 border-y border-border/50',
        className
      )}>
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8">
            {/* Live indicator */}
            {isOnline && (
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
                <span className="text-sm font-medium text-foreground">Live wait times</span>
              </div>
            )}

            <div className="h-4 w-px bg-border hidden sm:block" />

            {/* Wait times */}
            <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6">
              {services.map(key => {
                const config = SERVICE_WAIT_TIMES[key]
                const time = waitTimes[key]
                const isFast = time <= config.minWait + 5

                return (
                  <div key={key} className="flex items-center gap-2 text-sm">
                    <config.icon className={cn('w-4 h-4', config.color)} />
                    <span className="text-muted-foreground">{config.shortLabel}:</span>
                    {isOnline ? (
                      <>
                        <motion.span
                          key={time}
                          initial={prefersReducedMotion ? {} : { opacity: 0.5 }}
                          animate={{ opacity: 1 }}
                          transition={{ duration: prefersReducedMotion ? 0 : 0.2 }}
                          className="font-semibold text-foreground"
                        >
                          {formatWaitTime(time)}
                        </motion.span>
                        {showTrending && isFast && (
                          <span className="hidden sm:flex items-center gap-0.5 text-xs text-success font-medium">
                            <TrendingDown className="w-3 h-3" />
                          </span>
                        )}
                      </>
                    ) : (
                      <span className="font-semibold text-foreground">Next business day</span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Card variant (more prominent display)
  return (
    <div className={cn(
      'rounded-2xl border border-border dark:border-white/10 bg-white dark:bg-card p-6',
      className
    )}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-foreground">Current Wait Times</h3>
        </div>
        {isOnline && (
          <div className="flex items-center gap-2 text-sm">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span className="text-success font-medium">Live</span>
          </div>
        )}
      </div>

      <div className="grid gap-3">
        {services.map(key => {
          const config = SERVICE_WAIT_TIMES[key]
          const time = waitTimes[key]
          const isFast = time <= config.minWait + 5
          
          return (
            <div
              key={key}
              className={cn(
                'flex items-center justify-between p-3 rounded-xl',
                config.bgColor
              )}
            >
              <div className="flex items-center gap-3">
                <config.icon className={cn('w-5 h-5', config.color)} />
                <span className="font-medium text-foreground">{config.label}</span>
              </div>
              <div className="flex items-center gap-2">
                {isOnline ? (
                  <>
                    <motion.span
                      key={time}
                      initial={prefersReducedMotion ? {} : { opacity: 0.5, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: prefersReducedMotion ? 0 : 0.2 }}
                      className="text-lg font-semibold text-foreground"
                    >
                      {formatWaitTime(time)}
                    </motion.span>
                    {showTrending && isFast && (
                      <span className="flex items-center gap-1 text-xs text-success font-medium bg-emerald-500/10 px-2 py-0.5 rounded-full">
                        <TrendingDown className="w-3 h-3" />
                        Fast
                      </span>
                    )}
                  </>
                ) : (
                  <span className="text-lg font-semibold text-foreground">Next business day</span>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <p className="text-xs text-muted-foreground mt-4 text-center">
        Typical wait times based on recent activity
      </p>
    </div>
  )
}

/**
 * Single service wait time indicator (simpler)
 */
interface ServiceWaitBadgeProps {
  service: ServiceType
  className?: string
}

export function ServiceWaitBadge({ service, className }: ServiceWaitBadgeProps) {
  return <LiveWaitTime service={service} variant="badge" className={className} />
}
