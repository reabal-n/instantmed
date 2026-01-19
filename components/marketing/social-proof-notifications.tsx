'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2, MapPin, Clock, X } from 'lucide-react'
import { cn } from '@/lib/utils'

// Australian cities with population weights for realistic distribution
const LOCATIONS = [
  { city: 'Sydney', state: 'NSW', weight: 25 },
  { city: 'Melbourne', state: 'VIC', weight: 23 },
  { city: 'Brisbane', state: 'QLD', weight: 12 },
  { city: 'Perth', state: 'WA', weight: 10 },
  { city: 'Adelaide', state: 'SA', weight: 7 },
  { city: 'Gold Coast', state: 'QLD', weight: 4 },
  { city: 'Newcastle', state: 'NSW', weight: 3 },
  { city: 'Canberra', state: 'ACT', weight: 3 },
  { city: 'Wollongong', state: 'NSW', weight: 2 },
  { city: 'Hobart', state: 'TAS', weight: 2 },
  { city: 'Geelong', state: 'VIC', weight: 2 },
  { city: 'Townsville', state: 'QLD', weight: 1 },
  { city: 'Cairns', state: 'QLD', weight: 1 },
  { city: 'Darwin', state: 'NT', weight: 1 },
  { city: 'Toowoomba', state: 'QLD', weight: 1 },
  { city: 'Ballarat', state: 'VIC', weight: 1 },
  { city: 'Bendigo', state: 'VIC', weight: 1 },
  { city: 'Launceston', state: 'TAS', weight: 1 },
]

// Common Australian first names
const FIRST_NAMES = [
  'Sarah', 'Emma', 'Olivia', 'Mia', 'Charlotte', 'Amelia', 'Ava', 'Sophie',
  'James', 'William', 'Oliver', 'Jack', 'Noah', 'Thomas', 'Lucas', 'Henry',
  'Emily', 'Chloe', 'Grace', 'Lily', 'Zoe', 'Hannah', 'Ella', 'Ruby',
  'Liam', 'Ethan', 'Mason', 'Aiden', 'Samuel', 'Daniel', 'Michael', 'David',
  'Jessica', 'Amy', 'Lauren', 'Kate', 'Rachel', 'Nicole', 'Michelle', 'Lisa',
  'Chris', 'Matt', 'Josh', 'Ben', 'Ryan', 'Jake', 'Alex', 'Sam',
]

// Service types with display names and realistic completion times
const SERVICES = [
  { 
    id: 'med-cert', 
    name: 'medical certificate', 
    action: 'received their',
    minMinutes: 15,
    maxMinutes: 55,
  },
  { 
    id: 'repeat-prescription', 
    name: 'repeat prescription', 
    action: 'got their',
    minMinutes: 20,
    maxMinutes: 60,
  },
  { 
    id: 'general-consult', 
    name: 'GP consultation', 
    action: 'completed their',
    minMinutes: 30,
    maxMinutes: 90,
  },
]

interface Notification {
  id: string
  name: string
  location: string
  service: string
  action: string
  timeAgo: string
}

function getWeightedRandomLocation(): { city: string; state: string } {
  const totalWeight = LOCATIONS.reduce((sum, loc) => sum + loc.weight, 0)
  let random = Math.random() * totalWeight

  for (const location of LOCATIONS) {
    random -= location.weight
    if (random <= 0) {
      return { city: location.city, state: location.state }
    }
  }

  return LOCATIONS[0]
}

function getRandomName(): string {
  return FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)]
}

function getRandomService() {
  return SERVICES[Math.floor(Math.random() * SERVICES.length)]
}

function getRandomTimeAgo(minMinutes: number, maxMinutes: number): string {
  const minutes = Math.floor(Math.random() * (maxMinutes - minMinutes)) + minMinutes
  
  if (minutes < 2) return 'just now'
  if (minutes < 60) return `${minutes} minutes ago`
  
  const hours = Math.floor(minutes / 60)
  if (hours === 1) return '1 hour ago'
  return `${hours} hours ago`
}

function generateNotification(): Notification {
  const location = getWeightedRandomLocation()
  const service = getRandomService()
  
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    name: getRandomName(),
    location: `${location.city}, ${location.state}`,
    service: service.name,
    action: service.action,
    timeAgo: getRandomTimeAgo(service.minMinutes, service.maxMinutes),
  }
}

interface SocialProofNotificationsProps {
  /** Interval between notifications in ms (default: 25000 - 25 seconds) */
  interval?: number
  /** Initial delay before first notification in ms (default: 8000 - 8 seconds) */
  initialDelay?: number
  /** Duration notification stays visible in ms (default: 6000 - 6 seconds) */
  displayDuration?: number
  /** Position on screen */
  position?: 'bottom-left' | 'bottom-right' | 'top-left' | 'top-right'
  /** Whether to allow dismissal */
  dismissible?: boolean
  /** Maximum notifications to show before pausing (default: 5) */
  maxNotifications?: number
  /** Filter to specific service */
  serviceFilter?: 'med-cert' | 'repeat-prescription' | 'general-consult'
}

export function SocialProofNotifications({
  interval = 25000,
  initialDelay = 8000,
  displayDuration = 6000,
  position = 'bottom-left',
  dismissible = true,
  maxNotifications = 5,
  serviceFilter,
}: SocialProofNotificationsProps) {
  const [notification, setNotification] = useState<Notification | null>(null)
  const [notificationCount, setNotificationCount] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  
  // Lazy initialize dismissed state from sessionStorage
  const [isDismissed, setIsDismissed] = useState(() => {
    if (typeof window === 'undefined') return false
    return sessionStorage.getItem('social_proof_dismissed') === 'true'
  })

  const showNotification = useCallback(() => {
    if (isPaused || isDismissed) return
    if (notificationCount >= maxNotifications) {
      setIsPaused(true)
      return
    }

    let newNotification = generateNotification()
    
    // Filter by service if specified
    if (serviceFilter) {
      const service = SERVICES.find(s => s.id === serviceFilter)
      if (service) {
        newNotification = {
          ...newNotification,
          service: service.name,
          action: service.action,
          timeAgo: getRandomTimeAgo(service.minMinutes, service.maxMinutes),
        }
      }
    }

    setNotification(newNotification)
    setNotificationCount(prev => prev + 1)

    // Auto-hide after display duration
    setTimeout(() => {
      setNotification(null)
    }, displayDuration)
  }, [isPaused, isDismissed, notificationCount, maxNotifications, serviceFilter, displayDuration])

  useEffect(() => {
    // Don't show on mobile (can be intrusive)
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      return
    }

    // Already dismissed
    if (isDismissed) return

    // Initial delay before first notification
    const initialTimer = setTimeout(() => {
      showNotification()
    }, initialDelay)

    // Recurring notifications
    const intervalTimer = setInterval(() => {
      showNotification()
    }, interval)

    return () => {
      clearTimeout(initialTimer)
      clearInterval(intervalTimer)
    }
  }, [initialDelay, interval, showNotification, isDismissed])

  const handleDismiss = () => {
    setNotification(null)
    setIsDismissed(true)
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('social_proof_dismissed', 'true')
    }
  }

  const positionClasses = {
    'bottom-left': 'bottom-4 left-4',
    'bottom-right': 'bottom-4 right-4',
    'top-left': 'top-4 left-4',
    'top-right': 'top-4 right-4',
  }

  if (isDismissed) return null

  return (
    <div className={cn('fixed z-50', positionClasses[position])}>
      <AnimatePresence mode="wait">
        {notification && (
          <motion.div
            key={notification.id}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="relative max-w-sm bg-card border border-border rounded-xl shadow-lg overflow-hidden"
          >
            {/* Progress bar */}
            <motion.div
              className="absolute top-0 left-0 h-0.5 bg-primary/60"
              initial={{ width: '100%' }}
              animate={{ width: '0%' }}
              transition={{ duration: displayDuration / 1000, ease: 'linear' }}
            />

            <div className="p-4">
              <div className="flex items-start gap-3">
                {/* Icon */}
                <div className="shrink-0 w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground">
                    <span className="font-semibold">{notification.name}</span>
                    {' '}{notification.action}{' '}
                    <span className="font-medium text-primary">{notification.service}</span>
                  </p>
                  
                  <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {notification.location}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {notification.timeAgo}
                    </span>
                  </div>
                </div>

                {/* Dismiss button */}
                {dismissible && (
                  <button
                    onClick={handleDismiss}
                    className="shrink-0 p-1 rounded-full hover:bg-muted transition-colors"
                    aria-label="Dismiss notifications"
                  >
                    <X className="w-4 h-4 text-muted-foreground" />
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/**
 * Inline social proof counter for landing pages
 * Shows "X people completed this today"
 */
interface LiveCounterProps {
  service: 'med-cert' | 'repeat-prescription' | 'general-consult'
  className?: string
}

// Service-specific realistic ranges (outside component to avoid dependency issues)
const SERVICE_RANGES = {
  'med-cert': { min: 47, max: 89 },
  'repeat-prescription': { min: 23, max: 51 },
  'general-consult': { min: 12, max: 28 },
} as const

export function LiveServiceCounter({ service, className }: LiveCounterProps) {
  const [isAnimating, setIsAnimating] = useState(false)
  
  // Lazy initialize count
  const [count, setCount] = useState(() => {
    const range = SERVICE_RANGES[service]
    return Math.floor(Math.random() * (range.max - range.min)) + range.min
  })

  useEffect(() => {
    // Occasionally increment to show activity
    const interval = setInterval(() => {
      if (Math.random() > 0.7) {
        setIsAnimating(true)
        setCount(prev => prev + 1)
        setTimeout(() => setIsAnimating(false), 500)
      }
    }, 30000) // Every 30 seconds, 30% chance

    return () => clearInterval(interval)
  }, [])

  return (
    <div className={cn('flex items-center gap-2 text-sm text-muted-foreground', className)}>
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
      </span>
      <span>
        <motion.span
          key={count}
          initial={isAnimating ? { scale: 1.2, color: 'rgb(16, 185, 129)' } : {}}
          animate={{ scale: 1, color: 'inherit' }}
          className="font-medium"
        >
          {count}
        </motion.span>
        {' '}people completed this today
      </span>
    </div>
  )
}

/**
 * "People viewing now" indicator
 */
interface ViewingNowProps {
  service: 'med-cert' | 'repeat-prescription' | 'general-consult'
  className?: string
}

// Viewer ranges (outside component)
const VIEWER_RANGES = {
  'med-cert': { min: 8, max: 24 },
  'repeat-prescription': { min: 4, max: 14 },
  'general-consult': { min: 3, max: 11 },
} as const

export function ViewingNowIndicator({ service, className }: ViewingNowProps) {
  // Lazy initialize viewers
  const [viewers, setViewers] = useState(() => {
    const range = VIEWER_RANGES[service]
    return Math.floor(Math.random() * (range.max - range.min)) + range.min
  })

  useEffect(() => {
    const range = VIEWER_RANGES[service]
    
    // Fluctuate viewers periodically
    const interval = setInterval(() => {
      setViewers(prev => {
        const change = Math.random() > 0.5 ? 1 : -1
        const newValue = prev + change
        return Math.max(range.min, Math.min(range.max, newValue))
      })
    }, 8000) // Every 8 seconds

    return () => clearInterval(interval)
  }, [service])

  return (
    <div className={cn(
      'inline-flex items-center gap-2 px-3 py-1.5 rounded-full',
      'bg-amber-500/10 border border-amber-500/20',
      className
    )}>
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-500 opacity-75" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
      </span>
      <span className="text-sm font-medium text-amber-700 dark:text-amber-400">
        {viewers} people viewing now
      </span>
    </div>
  )
}

/**
 * Recent activity list for landing pages
 */
interface RecentActivityProps {
  service?: 'med-cert' | 'repeat-prescription' | 'general-consult'
  count?: number
  className?: string
}

function generateActivities(service: string | undefined, count: number): Notification[] {
  const generated: Notification[] = []
  for (let i = 0; i < count; i++) {
    let activity = generateNotification()
    if (service) {
      const svc = SERVICES.find(s => s.id === service)
      if (svc) {
        activity = {
          ...activity,
          service: svc.name,
          action: svc.action,
          timeAgo: getRandomTimeAgo(svc.minMinutes + (i * 15), svc.maxMinutes + (i * 20)),
        }
      }
    }
    generated.push(activity)
  }
  return generated
}

export function RecentActivityList({ service, count = 3, className }: RecentActivityProps) {
  // Lazy initialize activities
  const [activities] = useState(() => generateActivities(service, count))

  return (
    <div className={cn('space-y-3', className)}>
      {activities.map((activity, index) => (
        <motion.div
          key={activity.id}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.1 }}
          className="flex items-center gap-3 p-3 rounded-lg bg-card/50 border border-border/50"
        >
          <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-foreground truncate">
              <span className="font-medium">{activity.name}</span>
              {' '}{activity.action} {activity.service}
            </p>
            <p className="text-xs text-muted-foreground">
              {activity.location} · {activity.timeAgo}
            </p>
          </div>
        </motion.div>
      ))}
    </div>
  )
}

/**
 * "X completed in last hour" counter - more urgent social proof
 */
interface LastHourCounterProps {
  service: 'med-cert' | 'repeat-prescription' | 'general-consult'
  className?: string
}

const HOUR_RANGES = {
  'med-cert': { min: 12, max: 28 },
  'repeat-prescription': { min: 6, max: 15 },
  'general-consult': { min: 3, max: 9 },
} as const

export function LastHourCounter({ service, className }: LastHourCounterProps) {
  const [isAnimating, setIsAnimating] = useState(false)
  
  const [count, setCount] = useState(() => {
    const range = HOUR_RANGES[service]
    return Math.floor(Math.random() * (range.max - range.min)) + range.min
  })

  useEffect(() => {
    // Occasionally increment to show real-time activity
    const interval = setInterval(() => {
      if (Math.random() > 0.6) {
        setIsAnimating(true)
        setCount(prev => prev + 1)
        setTimeout(() => setIsAnimating(false), 500)
      }
    }, 45000) // Every 45 seconds, 40% chance

    return () => clearInterval(interval)
  }, [])

  const serviceLabels = {
    'med-cert': 'certificates issued',
    'repeat-prescription': 'prescriptions sent',
    'general-consult': 'consultations completed',
  }

  return (
    <div className={cn(
      'inline-flex items-center gap-2 px-3 py-1.5 rounded-full',
      'bg-emerald-500/10 border border-emerald-500/20',
      className
    )}>
      <Clock className="w-3.5 h-3.5 text-emerald-600" />
      <span className="text-sm text-emerald-700 dark:text-emerald-400">
        <motion.span
          key={count}
          initial={isAnimating ? { scale: 1.3, color: 'rgb(16, 185, 129)' } : {}}
          animate={{ scale: 1, color: 'inherit' }}
          className="font-semibold"
        >
          {count}
        </motion.span>
        {' '}{serviceLabels[service]} in the last hour
      </span>
    </div>
  )
}

/**
 * Compact trust + activity badge for checkout flows
 */
interface CheckoutActivityBadgeProps {
  className?: string
}

export function CheckoutActivityBadge({ className }: CheckoutActivityBadgeProps) {
  const [count] = useState(() => Math.floor(Math.random() * 15) + 8)
  
  return (
    <div className={cn(
      'flex items-center justify-center gap-2 text-xs text-muted-foreground',
      className
    )}>
      <span className="relative flex h-1.5 w-1.5">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75" />
        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
      </span>
      <span>{count} others completed checkout in the last hour</span>
    </div>
  )
}
