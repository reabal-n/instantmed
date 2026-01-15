'use client'

import { useState, useEffect } from 'react'
import { Users, Clock, CheckCircle2, TrendingUp } from 'lucide-react'
import { cn } from '@/lib/utils'

interface LiveActivityCounterProps {
  className?: string
  variant?: 'banner' | 'badge' | 'detailed'
}

interface ActivityStats {
  activeNow: number
  completedToday: number
  averageResponseMinutes: number
  lastCompleted: string
}

/**
 * Live activity counter showing real-time platform activity
 * Creates social proof and urgency
 */
export function LiveActivityCounter({ 
  className,
  variant = 'badge'
}: LiveActivityCounterProps) {
  const [stats, setStats] = useState<ActivityStats>({
    activeNow: 12,
    completedToday: 147,
    averageResponseMinutes: 38,
    lastCompleted: '2 minutes ago'
  })

  useEffect(() => {
    // Simulate real-time updates
    const interval = setInterval(() => {
      setStats(prev => ({
        ...prev,
        activeNow: Math.max(5, prev.activeNow + Math.floor(Math.random() * 3) - 1),
        completedToday: prev.completedToday + (Math.random() > 0.7 ? 1 : 0),
        lastCompleted: `${Math.floor(Math.random() * 5) + 1} minutes ago`
      }))
    }, 30000)

    return () => clearInterval(interval)
  }, [])

  if (variant === 'badge') {
    return (
      <div className={cn(
        "inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800",
        className
      )}>
        <div className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
        </div>
        <span className="text-sm text-emerald-700 dark:text-emerald-300 font-medium">
          {stats.activeNow} people completing requests now
        </span>
      </div>
    )
  }

  if (variant === 'banner') {
    return (
      <div className={cn(
        "bg-primary/5 border-y border-primary/10 py-3",
        className
      )}>
        <div className="mx-auto max-w-5xl px-4">
          <div className="flex flex-wrap items-center justify-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <div className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </div>
              <span className="text-foreground font-medium">{stats.activeNow} active now</span>
            </div>
            <div className="hidden sm:flex items-center gap-2 text-muted-foreground">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>{stats.completedToday} completed today</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="w-4 h-4 text-primary" />
              <span>~{stats.averageResponseMinutes} min average</span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Detailed variant
  return (
    <div className={cn(
      "bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6",
      className
    )}>
      <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
        <TrendingUp className="w-5 h-5 text-primary" />
        Live Platform Activity
      </h3>

      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl">
          <div className="flex items-center gap-2 mb-1">
            <div className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </div>
            <span className="text-xs text-emerald-700 dark:text-emerald-400 font-medium">Active Now</span>
          </div>
          <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">{stats.activeNow}</p>
        </div>

        <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs text-muted-foreground font-medium">Completed Today</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{stats.completedToday}</p>
        </div>

        <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs text-muted-foreground font-medium">Avg Response</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{stats.averageResponseMinutes}m</p>
        </div>

        <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl">
          <div className="flex items-center gap-2 mb-1">
            <Users className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs text-muted-foreground font-medium">Last Completed</span>
          </div>
          <p className="text-sm font-medium text-foreground">{stats.lastCompleted}</p>
        </div>
      </div>
    </div>
  )
}

/**
 * Simple "X people viewing" indicator
 */
export function ViewingNowIndicator({ count = 8, className }: { count?: number; className?: string }) {
  return (
    <div className={cn("flex items-center gap-2 text-sm text-muted-foreground", className)}>
      <div className="flex -space-x-1.5">
        {[...Array(Math.min(count, 4))].map((_, i) => (
          <div 
            key={i}
            className="w-6 h-6 rounded-full bg-primary/10 border-2 border-white dark:border-slate-900 flex items-center justify-center text-[10px] font-medium text-primary"
          >
            {String.fromCharCode(65 + i)}
          </div>
        ))}
        {count > 4 && (
          <div className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 border-2 border-white dark:border-slate-900 flex items-center justify-center text-[10px] font-medium text-muted-foreground">
            +{count - 4}
          </div>
        )}
      </div>
      <span>{count} people viewing this service</span>
    </div>
  )
}
