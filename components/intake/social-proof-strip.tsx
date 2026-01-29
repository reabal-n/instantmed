'use client'

import { useState, useEffect } from 'react'
import { CheckCircle2, Clock, Shield, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SocialProofStripProps {
  className?: string
  variant?: 'minimal' | 'detailed' | 'pulse'
}

interface RecentCompletion {
  name: string
  service: string
  time: string
  location: string
}

// Simulated recent completions - in production would come from API
const recentCompletions: RecentCompletion[] = [
  { name: 'Sarah M.', service: 'Medical Certificate', time: '2 min ago', location: 'Sydney' },
  { name: 'James T.', service: 'Repeat Prescription', time: '5 min ago', location: 'Melbourne' },
  { name: 'Emma L.', service: 'Medical Certificate', time: '8 min ago', location: 'Brisbane' },
  { name: 'Michael K.', service: 'Medical Certificate', time: '12 min ago', location: 'Perth' },
  { name: 'Sophie R.', service: 'GP Consult', time: '15 min ago', location: 'Adelaide' },
]

/**
 * Social proof strip for intake flow
 * Shows recent completions and live activity to build trust and create urgency
 */
export function SocialProofStrip({ 
  className,
  variant = 'minimal',
}: SocialProofStripProps) {
  const [activeNow, setActiveNow] = useState(14)
  const [completedToday, setCompletedToday] = useState(156)
  const [currentCompletion, setCurrentCompletion] = useState(0)

  // Cycle through recent completions
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentCompletion(prev => (prev + 1) % recentCompletions.length)
    }, 4000)
    return () => clearInterval(interval)
  }, [])

  // Simulate live updates
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveNow(prev => Math.max(8, prev + Math.floor(Math.random() * 3) - 1))
      if (Math.random() > 0.8) {
        setCompletedToday(prev => prev + 1)
      }
    }, 15000)
    return () => clearInterval(interval)
  }, [])

  const completion = recentCompletions[currentCompletion]

  if (variant === 'pulse') {
    return (
      <div className={cn(
        "flex items-center justify-center gap-2 py-2 px-4 bg-emerald-50 dark:bg-emerald-950/30 border-y border-emerald-200 dark:border-emerald-800",
        className
      )}>
        <div className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
        </div>
        <span className="text-sm text-emerald-700 dark:text-emerald-300">
          <span className="font-medium">{completion.name}</span> from {completion.location} just got their {completion.service}
        </span>
      </div>
    )
  }

  if (variant === 'detailed') {
    return (
      <div className={cn(
        "bg-white/80 dark:bg-white/5 backdrop-blur-xl rounded-xl border border-white/50 dark:border-white/10 p-4",
        className
      )}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Active now */}
          <div className="flex items-center gap-2">
            <div className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </div>
            <span className="text-sm">
              <span className="font-semibold text-foreground">{activeNow}</span>
              <span className="text-muted-foreground"> people completing requests now</span>
            </span>
          </div>

          {/* Completed today */}
          <div className="flex items-center gap-2 text-sm">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span className="text-muted-foreground">
              <span className="font-semibold text-foreground">{completedToday}</span> completed today
            </span>
          </div>

          {/* Average time */}
          <div className="flex items-center gap-2 text-sm">
            <Clock className="w-4 h-4 text-primary" />
            <span className="text-muted-foreground">
              Avg. <span className="font-semibold text-foreground">42 min</span> response
            </span>
          </div>
        </div>

        {/* Recent completion ticker */}
        <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-2 text-sm">
            <Zap className="w-4 h-4 text-amber-500" />
            <span className="text-muted-foreground">
              <span className="font-medium text-foreground">{completion.name}</span> from {completion.location} just completed their {completion.service}
              <span className="text-muted-foreground/60"> · {completion.time}</span>
            </span>
          </div>
        </div>
      </div>
    )
  }

  // Minimal variant (default)
  return (
    <div className={cn(
      "flex flex-wrap items-center justify-center gap-4 py-2 text-sm",
      className
    )}>
      <div className="flex items-center gap-2">
        <div className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
        </div>
        <span className="text-muted-foreground">
          <span className="font-medium text-foreground">{activeNow}</span> active now
        </span>
      </div>
      <span className="text-muted-foreground/40">·</span>
      <div className="flex items-center gap-1.5 text-muted-foreground">
        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
        <span><span className="font-medium text-foreground">{completedToday}</span> today</span>
      </div>
      <span className="text-muted-foreground/40">·</span>
      <div className="flex items-center gap-1.5 text-muted-foreground">
        <Shield className="w-3.5 h-3.5 text-primary" />
        <span>AHPRA verified</span>
      </div>
    </div>
  )
}

/**
 * Floating social proof notification
 * Shows recent completions as toast-like notifications
 */
export function SocialProofToast({ className }: { className?: string }) {
  const [isVisible, setIsVisible] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(0)

  useEffect(() => {
    // Show first notification after 5 seconds
    const showTimeout = setTimeout(() => {
      setIsVisible(true)
    }, 5000)

    // Cycle notifications every 8 seconds
    const cycleInterval = setInterval(() => {
      setIsVisible(false)
      setTimeout(() => {
        setCurrentIndex(prev => (prev + 1) % recentCompletions.length)
        setIsVisible(true)
      }, 500)
    }, 8000)

    return () => {
      clearTimeout(showTimeout)
      clearInterval(cycleInterval)
    }
  }, [])

  const completion = recentCompletions[currentIndex]

  if (!isVisible) return null

  return (
    <div className={cn(
      "fixed bottom-4 left-4 z-50 animate-in slide-in-from-left-full duration-300",
      className
    )}>
      <div className="bg-white/95 dark:bg-white/10 backdrop-blur-xl rounded-xl shadow-lg border border-white/50 dark:border-white/10 p-4 max-w-xs">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <p className="font-medium text-foreground text-sm">
              {completion.name} from {completion.location}
            </p>
            <p className="text-xs text-muted-foreground">
              Just got their {completion.service}
            </p>
            <p className="text-xs text-muted-foreground/60 mt-1">
              {completion.time}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Inline response time indicator for forms
 * Provides factual info without artificial urgency
 */
export function UrgencyIndicator({ 
  className 
}: { 
  queuePosition?: number
  estimatedMinutes?: number
  className?: string 
}) {
  return (
    <div className={cn(
      "flex items-center gap-3 p-3 bg-white/60 dark:bg-white/5 backdrop-blur-xl border border-white/50 dark:border-white/10 rounded-lg",
      className
    )}>
      <Clock className="w-5 h-5 text-primary shrink-0" />
      <div className="flex-1">
        <p className="text-sm font-medium text-foreground">
          Doctors typically respond within an hour
        </p>
        <p className="text-xs text-muted-foreground">
          During business hours (8am–10pm AEST)
        </p>
      </div>
    </div>
  )
}
