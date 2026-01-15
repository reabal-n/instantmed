'use client'

import { useEffect, useState, useRef } from 'react'
import { motion } from 'framer-motion'
import { Clock, CheckCircle2, Eye, TrendingUp } from 'lucide-react'
import { cn } from '@/lib/utils'

// Service-specific base ranges for realistic numbers
const SERVICE_RANGES = {
  'med-cert': {
    viewing: { min: 8, max: 24 },
    completedLastHour: { min: 12, max: 28 },
    completedToday: { min: 67, max: 156 },
    avgReviewTime: { min: 18, max: 32 },
  },
  'repeat-prescription': {
    viewing: { min: 5, max: 16 },
    completedLastHour: { min: 8, max: 18 },
    completedToday: { min: 45, max: 98 },
    avgReviewTime: { min: 20, max: 35 },
  },
  'general-consult': {
    viewing: { min: 3, max: 12 },
    completedLastHour: { min: 4, max: 12 },
    completedToday: { min: 28, max: 64 },
    avgReviewTime: { min: 35, max: 55 },
  },
  default: {
    viewing: { min: 12, max: 32 },
    completedLastHour: { min: 18, max: 38 },
    completedToday: { min: 89, max: 186 },
    avgReviewTime: { min: 22, max: 38 },
  },
}

type ServiceType = keyof typeof SERVICE_RANGES

interface AnimatedNumberProps {
  value: number
  suffix?: string
  className?: string
}

function AnimatedNumber({ value, suffix = '', className }: AnimatedNumberProps) {
  const [displayValue, setDisplayValue] = useState(value)
  const previousValueRef = useRef(value)
  
  useEffect(() => {
    const duration = 800
    const startValue = previousValueRef.current
    const diff = value - startValue
    const startTime = Date.now()
    
    const animate = () => {
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / duration, 1)
      
      // Easing function (ease-out cubic)
      const eased = 1 - Math.pow(1 - progress, 3)
      const current = Math.round(startValue + diff * eased)
      
      setDisplayValue(current)
      
      if (progress < 1) {
        requestAnimationFrame(animate)
      } else {
        previousValueRef.current = value
      }
    }
    
    requestAnimationFrame(animate)
  }, [value])
  
  return (
    <span className={cn("tabular-nums font-bold", className)}>
      {displayValue}{suffix}
    </span>
  )
}

interface LiveActivityStatsProps {
  service?: ServiceType
  variant?: 'horizontal' | 'vertical' | 'compact' | 'pill'
  showViewing?: boolean
  showCompleted?: boolean
  showToday?: boolean
  showAvgTime?: boolean
  className?: string
  rotateInterval?: number
}

function getRandomInRange(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function getSmallVariation(current: number, range: { min: number; max: number }): number {
  const variation = Math.floor(Math.random() * 5) - 2
  const newValue = current + variation
  return Math.max(range.min, Math.min(range.max, newValue))
}

export function LiveActivityStats({
  service = 'default',
  variant = 'horizontal',
  showViewing = true,
  showCompleted = true,
  showToday = true,
  showAvgTime = true,
  className,
  rotateInterval = 5000,
}: LiveActivityStatsProps) {
  const ranges = SERVICE_RANGES[service] || SERVICE_RANGES.default
  
  const [stats, setStats] = useState({
    viewing: getRandomInRange(ranges.viewing.min, ranges.viewing.max),
    completedLastHour: getRandomInRange(ranges.completedLastHour.min, ranges.completedLastHour.max),
    completedToday: getRandomInRange(ranges.completedToday.min, ranges.completedToday.max),
    avgReviewTime: getRandomInRange(ranges.avgReviewTime.min, ranges.avgReviewTime.max),
  })
  
  useEffect(() => {
    const interval = setInterval(() => {
      setStats(prev => ({
        viewing: getSmallVariation(prev.viewing, ranges.viewing),
        completedLastHour: getSmallVariation(prev.completedLastHour, ranges.completedLastHour),
        completedToday: Math.max(prev.completedToday, prev.completedToday + Math.floor(Math.random() * 2)),
        avgReviewTime: getSmallVariation(prev.avgReviewTime, ranges.avgReviewTime),
      }))
    }, rotateInterval)
    
    return () => clearInterval(interval)
  }, [ranges, rotateInterval])
  
  const statItems = [
    showViewing && {
      key: 'viewing',
      icon: Eye,
      value: stats.viewing,
      label: 'viewing now',
      color: 'text-amber-500',
      bgColor: 'bg-amber-500/10',
    },
    showCompleted && {
      key: 'completed',
      icon: CheckCircle2,
      value: stats.completedLastHour,
      label: 'completed last hour',
      color: 'text-emerald-500',
      bgColor: 'bg-emerald-500/10',
    },
    showToday && {
      key: 'today',
      icon: TrendingUp,
      value: stats.completedToday,
      label: 'completed today',
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
    },
    showAvgTime && {
      key: 'avgTime',
      icon: Clock,
      value: stats.avgReviewTime,
      suffix: ' min',
      label: 'avg review',
      color: 'text-violet-500',
      bgColor: 'bg-violet-500/10',
    },
  ].filter(Boolean) as Array<{
    key: string
    icon: typeof Eye
    value: number
    suffix?: string
    label: string
    color: string
    bgColor: string
  }>
  
  if (variant === 'pill') {
    return (
      <div className={cn("flex flex-wrap items-center gap-3", className)}>
        {statItems.map((item) => (
          <motion.div
            key={item.key}
            className={cn(
              "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full",
              "bg-card/50 border border-border/50 backdrop-blur-sm"
            )}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
          >
            <item.icon className={cn("w-3.5 h-3.5", item.color)} />
            <AnimatedNumber 
              value={item.value} 
              suffix={item.suffix} 
              className={cn("text-sm", item.color)} 
            />
            <span className="text-xs text-muted-foreground">{item.label}</span>
          </motion.div>
        ))}
      </div>
    )
  }
  
  if (variant === 'compact') {
    return (
      <div className={cn("flex items-center gap-4 text-xs", className)}>
        {statItems.map((item) => (
          <div key={item.key} className="flex items-center gap-1.5 text-muted-foreground">
            <item.icon className={cn("w-3.5 h-3.5", item.color)} />
            <span>
              <AnimatedNumber value={item.value} suffix={item.suffix} className="text-foreground" />
              {' '}{item.label}
            </span>
          </div>
        ))}
      </div>
    )
  }
  
  if (variant === 'vertical') {
    return (
      <div className={cn("space-y-3", className)}>
        {statItems.map((item) => (
          <motion.div
            key={item.key}
            className="flex items-center gap-3 p-3 rounded-xl bg-card/50 border border-border/50"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center", item.bgColor)}>
              <item.icon className={cn("w-4 h-4", item.color)} />
            </div>
            <div>
              <AnimatedNumber 
                value={item.value} 
                suffix={item.suffix} 
                className="text-lg text-foreground" 
              />
              <p className="text-xs text-muted-foreground">{item.label}</p>
            </div>
          </motion.div>
        ))}
      </div>
    )
  }
  
  // Default: horizontal
  return (
    <div className={cn("flex flex-wrap items-center justify-center gap-4 sm:gap-6", className)}>
      {statItems.map((item, index) => (
        <motion.div
          key={item.key}
          className="flex items-center gap-1.5 text-xs text-muted-foreground"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: index * 0.1 }}
        >
          <item.icon className={cn("w-3.5 h-3.5", item.color)} />
          <span>
            <AnimatedNumber value={item.value} suffix={item.suffix} className="text-foreground" />
            {' '}{item.label}
          </span>
        </motion.div>
      ))}
    </div>
  )
}

// Viewing banner component for urgency
interface ViewingBannerProps {
  service?: ServiceType
  className?: string
}

export function ViewingBanner({ service = 'default', className }: ViewingBannerProps) {
  const ranges = SERVICE_RANGES[service] || SERVICE_RANGES.default
  const [viewing, setViewing] = useState(getRandomInRange(ranges.viewing.min, ranges.viewing.max))
  
  useEffect(() => {
    const interval = setInterval(() => {
      setViewing(prev => getSmallVariation(prev, ranges.viewing))
    }, 5000)
    return () => clearInterval(interval)
  }, [ranges])
  
  return (
    <motion.div
      className={cn(
        "inline-flex items-center gap-2 px-4 py-2 rounded-full",
        "bg-amber-500/10 border border-amber-500/20",
        className
      )}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
    >
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-500 opacity-75" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
      </span>
      <span className="text-sm text-amber-700 dark:text-amber-400">
        <AnimatedNumber value={viewing} className="font-semibold" /> people viewing this right now
      </span>
    </motion.div>
  )
}

// Completed counter for social proof
interface CompletedCounterProps {
  service?: ServiceType
  variant?: 'hour' | 'today'
  className?: string
}

export function CompletedCounter({ service = 'default', variant = 'hour', className }: CompletedCounterProps) {
  const ranges = SERVICE_RANGES[service] || SERVICE_RANGES.default
  const range = variant === 'hour' ? ranges.completedLastHour : ranges.completedToday
  const [count, setCount] = useState(getRandomInRange(range.min, range.max))
  
  useEffect(() => {
    const interval = setInterval(() => {
      if (variant === 'today') {
        setCount(prev => Math.max(prev, prev + Math.floor(Math.random() * 2)))
      } else {
        setCount(prev => getSmallVariation(prev, range))
      }
    }, 5000)
    return () => clearInterval(interval)
  }, [range, variant])
  
  return (
    <div className={cn("flex items-center gap-1.5 text-sm text-muted-foreground", className)}>
      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
      <span>
        <AnimatedNumber value={count} className="text-foreground font-semibold" />
        {' '}completed {variant === 'hour' ? 'in the last hour' : 'today'}
      </span>
    </div>
  )
}
