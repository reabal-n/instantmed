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
  const progressPercent = (currentIndex / (steps.length - 1)) * 100

  return (
    <div className={cn('w-full', className)}>
      {/* Desktop: Numbered pills */}
      <div className="hidden sm:block">
        <div className="relative flex items-center justify-between">
          {/* Background track */}
          <div className="absolute top-1/2 left-0 right-0 h-0.5 -translate-y-1/2 bg-slate-200" />

          {/* Progress track */}
          <motion.div
            className="absolute top-1/2 left-0 h-0.5 -translate-y-1/2 bg-emerald-500"
            initial={{ width: 0 }}
            animate={{ width: `${progressPercent}%` }}
            transition={{ type: 'spring', stiffness: 100, damping: 20 }}
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
                    'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors',
                    isCompleted && 'bg-emerald-500 text-white',
                    isCurrent && 'bg-emerald-500 text-white ring-4 ring-emerald-100',
                    isPending && 'bg-white border-2 border-slate-200 text-slate-400'
                  )}
                  animate={{
                    scale: isCurrent ? 1.1 : 1,
                  }}
                  transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                >
                  {isCompleted ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <span>{index + 1}</span>
                  )}
                </motion.div>

                {/* Label */}
                <span
                  className={cn(
                    'mt-2 text-xs font-medium whitespace-nowrap',
                    isCurrent && 'text-emerald-600',
                    isCompleted && 'text-slate-600',
                    isPending && 'text-slate-400'
                  )}
                >
                  {step.shortLabel || step.label}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Mobile: Compact progress bar */}
      <div className="sm:hidden">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-emerald-500 text-white text-xs font-semibold flex items-center justify-center">
              {currentIndex + 1}
            </span>
            <span className="text-sm font-medium text-slate-900">
              {steps[currentIndex]?.label}
            </span>
          </div>
          <span className="text-xs text-slate-400">
            {currentIndex + 1} of {steps.length}
          </span>
        </div>

        {/* Progress bar */}
        <div className="h-1 bg-slate-200 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-emerald-500 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${((currentIndex + 1) / steps.length) * 100}%` }}
            transition={{ type: 'spring', stiffness: 100, damping: 20 }}
          />
        </div>
      </div>
    </div>
  )
}
