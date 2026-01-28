'use client'

import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

/**
 * SessionProgress - Minimal progress indicator for flows
 * 
 * Philosophy:
 * - Floating dots, not stepped progress bar
 * - Shows where you are, not overwhelming detail
 * - Gentle animations
 * - Optional step labels
 * - No numbers unless helpful
 */

interface SessionProgressProps {
  currentStep: number
  totalSteps: number
  stepLabel?: string
  showStepNumbers?: boolean
  className?: string
}

export function SessionProgress({ 
  currentStep, 
  totalSteps, 
  stepLabel,
  showStepNumbers = false,
  className 
}: SessionProgressProps) {
  const progress = (currentStep / (totalSteps - 1)) * 100

  return (
    <div className={cn("flex flex-col items-center gap-2", className)}>
      {/* Dots with progress line */}
      <div className="flex items-center gap-3 relative">
        {Array.from({ length: totalSteps }).map((_, i) => {
          const isComplete = i < currentStep
          const isCurrent = i === currentStep
          
          return (
            <motion.div
              key={i}
              className={cn(
                "w-2.5 h-2.5 rounded-full relative z-10 transition-all duration-300",
                isComplete && "bg-primary scale-100",
                isCurrent && "bg-primary/80 scale-110",
                !isComplete && !isCurrent && "bg-gray-300"
              )}
              animate={{
                scale: isCurrent ? 1.1 : 1
              }}
              transition={{ duration: 0.3 }}
              role="progressbar"
              aria-valuenow={isComplete ? 100 : isCurrent ? 50 : 0}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`Step ${i + 1} of ${totalSteps}`}
            />
          )
        })}
        
        {/* Animated progress line */}
        <motion.div 
          className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-primary/20 rounded-full z-0"
          initial={{ width: '10%' }}
          animate={{ width: `${Math.max(10, progress)}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
      </div>

      {/* Step label */}
      {stepLabel && (
        <p className="text-xs text-muted-foreground">
          {showStepNumbers && (
            <>
              Step {currentStep + 1} of {totalSteps}:{' '}
            </>
          )}
          <span className="font-medium text-foreground">{stepLabel}</span>
        </p>
      )}
    </div>
  )
}

/**
 * SessionProgressDots - Even simpler version (just dots, no labels)
 */
export function SessionProgressDots({ 
  currentStep, 
  totalSteps,
  className 
}: {
  currentStep: number
  totalSteps: number
  className?: string
}) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      {Array.from({ length: totalSteps }).map((_, i) => (
        <div
          key={i}
          className={cn(
            "w-2 h-2 rounded-full transition-all duration-300",
            i === currentStep && "bg-primary scale-125",
            i < currentStep && "bg-primary/60",
            i > currentStep && "bg-gray-300"
          )}
          aria-hidden="true"
        />
      ))}
    </div>
  )
}
