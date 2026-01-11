'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Clock, CheckCircle2, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { RequestStatus } from './status-timeline'

interface SLACountdownProps {
  targetTime: string
  status: RequestStatus
  className?: string
}

export function SLACountdown({ targetTime, status, className }: SLACountdownProps) {
  const [timeRemaining, setTimeRemaining] = useState<{
    minutes: number
    seconds: number
    isOverdue: boolean
    totalSeconds: number
  }>({ minutes: 0, seconds: 0, isOverdue: false, totalSeconds: 0 })
  
  useEffect(() => {
    const calculateTime = () => {
      const now = new Date().getTime()
      const target = new Date(targetTime).getTime()
      const diff = target - now
      
      if (diff <= 0) {
        setTimeRemaining({ minutes: 0, seconds: 0, isOverdue: true, totalSeconds: 0 })
      } else {
        const totalSeconds = Math.floor(diff / 1000)
        const minutes = Math.floor(totalSeconds / 60)
        const seconds = totalSeconds % 60
        setTimeRemaining({ minutes, seconds, isOverdue: false, totalSeconds })
      }
    }
    
    calculateTime()
    const interval = setInterval(calculateTime, 1000)
    
    return () => clearInterval(interval)
  }, [targetTime])
  
  // Calculate progress (1 hour = 3600 seconds)
  const maxSeconds = 3600
  const progress = Math.min(1, (maxSeconds - timeRemaining.totalSeconds) / maxSeconds)
  
  // Determine state
  const isCompleted = status === 'completed' || status === 'approved'
  const isUrgent = !isCompleted && timeRemaining.totalSeconds < 600 && !timeRemaining.isOverdue // < 10 min
  
  if (isCompleted) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className={cn(
          'bg-emerald-500 text-white rounded-2xl p-6 text-center',
          className
        )}
      >
        <CheckCircle2 className="w-12 h-12 mx-auto mb-3" />
        <h3 className="text-xl font-bold mb-1">Complete</h3>
        <p className="text-emerald-100 text-sm">Your request has been processed.</p>
      </motion.div>
    )
  }
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'rounded-2xl overflow-hidden',
        isUrgent || timeRemaining.isOverdue 
          ? 'bg-linear-to-br from-dawn-500 to-orange-500'
          : 'bg-linear-to-br from-emerald-500 to-emerald-600',
        className
      )}
    >
      {/* Progress bar */}
      <div className="h-1 bg-white/20">
        <motion.div
          className="h-full bg-white/40"
          initial={{ width: 0 }}
          animate={{ width: `${progress * 100}%` }}
          transition={{ duration: 0.5 }}
        />
      </div>
      
      <div className="p-6 text-white text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Clock className={cn(
            'w-5 h-5',
            !timeRemaining.isOverdue && 'animate-pulse'
          )} />
          <span className="text-sm font-medium text-white/80">
            {timeRemaining.isOverdue ? 'Taking longer than usual' : 'Estimated completion'}
          </span>
        </div>
        
        {/* Countdown display */}
        <div className="flex items-center justify-center gap-1 mb-3">
          {timeRemaining.isOverdue ? (
            <div className="flex items-center gap-2">
              <AlertCircle className="w-6 h-6" />
              <span className="text-2xl font-bold">We&apos;re on it</span>
            </div>
          ) : (
            <>
              <div className="bg-white/20 rounded-lg px-4 py-2 min-w-[4rem]">
                <span className="text-3xl font-bold tabular-nums">
                  {String(timeRemaining.minutes).padStart(2, '0')}
                </span>
                <p className="text-xs text-white/60 mt-0.5">min</p>
              </div>
              <span className="text-3xl font-bold">:</span>
              <div className="bg-white/20 rounded-lg px-4 py-2 min-w-[4rem]">
                <span className="text-3xl font-bold tabular-nums">
                  {String(timeRemaining.seconds).padStart(2, '0')}
                </span>
                <p className="text-xs text-white/60 mt-0.5">sec</p>
              </div>
            </>
          )}
        </div>
        
        <p className="text-sm text-white/80">
          {timeRemaining.isOverdue 
            ? 'Complex requests may take longer. We\'ll notify you shortly.'
            : isUrgent 
              ? 'Almost there! A doctor is reviewing now.'
              : 'A doctor will review your request soon.'
          }
        </p>
      </div>
    </motion.div>
  )
}
