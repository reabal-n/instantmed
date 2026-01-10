'use client'

import { Check } from 'lucide-react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import type { FlowStep, FlowStepId } from '@/lib/flow'

interface FlowStepperProps {
  steps: FlowStep[]
  currentStepId: FlowStepId
  className?: string
}

export function FlowStepper({ steps, currentStepId, className }: FlowStepperProps) {
  const currentIndex = steps.findIndex((s) => s.id === currentStepId)
  const progressPercent = Math.max(0, (currentIndex / Math.max(1, steps.length - 1)) * 100)

  return (
    <div className={cn('w-full', className)}>
      {/* Desktop: Horizontal stepper */}
      <div className="hidden sm:block">
        <div className="relative flex items-center justify-between">
          {/* Background track */}
          <div className="absolute top-4 left-0 right-0 h-0.5 bg-white/40 dark:bg-white/10 backdrop-blur-lg" />

          {/* Progress track (animated) */}
          <motion.div
            className="absolute top-4 left-0 h-0.5 bg-gradient-to-r from-primary-500 to-primary-600 origin-left shadow-[0_2px_8px_rgb(59,130,246,0.3)]"
            initial={{ scaleX: 0 }}
            animate={{ scaleX: progressPercent / 100 }}
            transition={{ type: 'spring' as const, stiffness: 100, damping: 20 }}
            style={{ width: '100%' }}
          />

          {/* Step indicators */}
          {steps.map((step, index) => {
            const isCompleted = index < currentIndex
            const isCurrent = index === currentIndex
            const isPending = index > currentIndex

            return (
              <div key={step.id} className="relative z-10 flex flex-col items-center">
                {/* Circle */}
                <motion.div
                  className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold',
                    'transition-colors duration-200',
                    isCompleted && 'bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-[0_4px_16px_rgb(59,130,246,0.25)]',
                    isCurrent && 'bg-gradient-to-r from-primary-500 to-primary-600 text-white ring-[3px] ring-primary/20 shadow-[0_4px_16px_rgb(59,130,246,0.3)]',
                    isPending && 'bg-white/70 dark:bg-gray-900/60 backdrop-blur-xl border-2 border-white/40 dark:border-white/10 text-slate-400'
                  )}
                  initial={false}
                  animate={{
                    scale: isCurrent ? 1.05 : 1,
                  }}
                  transition={{ type: 'spring' as const, stiffness: 400, damping: 25 }}
                >
                  {isCompleted ? (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring' as const, stiffness: 400, damping: 15 }}
                    >
                      <Check className="h-4 w-4" strokeWidth={3} />
                    </motion.div>
                  ) : (
                    <span>{index + 1}</span>
                  )}
                </motion.div>

                {/* Label */}
                <motion.span
                  className={cn(
                    'mt-2 text-[11px] font-medium whitespace-nowrap',
                    isCurrent && 'text-primary-600 dark:text-primary-400',
                    isCompleted && 'text-slate-600 dark:text-slate-400',
                    isPending && 'text-slate-400 dark:text-slate-500'
                  )}
                  animate={{ opacity: isCurrent ? 1 : 0.7 }}
                >
                  {step.shortLabel || step.label}
                </motion.span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Mobile: Compact pill */}
      <div className="sm:hidden">
        <div className="flex items-center gap-3">
          {/* Step indicator pill */}
          <div className="flex items-center gap-1.5 bg-white/70 dark:bg-gray-900/60 backdrop-blur-xl border border-white/40 dark:border-white/10 rounded-full px-3 py-1.5 shadow-[0_2px_8px_rgb(0,0,0,0.04)]">
            <div className="w-5 h-5 rounded-full bg-gradient-to-r from-primary-500 to-primary-600 text-white text-[10px] font-bold flex items-center justify-center shadow-[0_2px_8px_rgb(59,130,246,0.25)]">
              {currentIndex + 1}
            </div>
            <span className="text-xs font-semibold text-primary-700 dark:text-primary-400">
              {steps[currentIndex]?.shortLabel || steps[currentIndex]?.label}
            </span>
          </div>
          
          {/* Progress indicator */}
          <div className="flex-1 h-1.5 bg-white/40 dark:bg-white/10 backdrop-blur-lg rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-primary-500 to-primary-600 rounded-full shadow-[0_2px_8px_rgb(59,130,246,0.3)]"
              initial={{ width: 0 }}
              animate={{ width: `${((currentIndex + 1) / steps.length) * 100}%` }}
              transition={{ type: 'spring' as const, stiffness: 100, damping: 20 }}
            />
          </div>
          
          {/* Step count */}
          <span className="text-[10px] font-medium text-slate-400 whitespace-nowrap">
            {currentIndex + 1}/{steps.length}
          </span>
        </div>
      </div>
    </div>
  )
}
