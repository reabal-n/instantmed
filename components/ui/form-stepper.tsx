'use client'

import * as React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { spring } from '@/lib/motion'

// =============================================================================
// TYPES
// =============================================================================

export interface Step {
  id: string
  title: string
  description?: string
}

interface FormStepperProps {
  steps: Step[]
  currentStep: number
  /** Make stepper sticky on desktop */
  sticky?: boolean
  className?: string
}

// =============================================================================
// FORM STEPPER COMPONENT
// =============================================================================

export function FormStepper({
  steps,
  currentStep,
  sticky = true,
  className,
}: FormStepperProps) {
  const progress = steps.length > 1 
    ? (currentStep / (steps.length - 1)) * 100 
    : 100

  return (
    <div
      className={cn(
        'w-full z-40',
        sticky && 'md:sticky md:top-4',
        className
      )}
    >
      {/* Glass container on desktop */}
      <div className={cn(
        'w-full',
        sticky && 'md:glass md:rounded-2xl md:p-4 md:shadow-lg'
      )}>
        {/* Desktop: Horizontal step indicators */}
        <div className="hidden md:block">
          <div className="relative flex items-start justify-between">
            {/* Background line */}
            <div className="absolute top-4 left-4 right-4 h-0.5 bg-border" />
            
            {/* Animated progress line */}
            <motion.div
              className="absolute top-4 left-4 h-0.5 bg-primary rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `calc(${progress}% - 16px)` }}
              transition={spring.smooth}
            />

            {steps.map((step, index) => {
              const isCompleted = index < currentStep
              const isCurrent = index === currentStep
              const isPending = index > currentStep

              return (
                <div
                  key={step.id}
                  className="flex flex-col items-center relative z-10 flex-1"
                >
                  {/* Step circle */}
                  <motion.div
                    className={cn(
                      'flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium transition-colors duration-300',
                      isCompleted && 'bg-primary text-primary-foreground',
                      isCurrent && 'bg-primary text-primary-foreground ring-4 ring-primary/20',
                      isPending && 'bg-surface-elevated border border-border text-muted-foreground'
                    )}
                    animate={{ scale: isCurrent ? 1.1 : 1 }}
                    transition={spring.snappy}
                  >
                    <AnimatePresence mode="wait">
                      {isCompleted ? (
                        <motion.div
                          key="check"
                          initial={{ scale: 0, rotate: -90 }}
                          animate={{ scale: 1, rotate: 0 }}
                          exit={{ scale: 0 }}
                          transition={spring.snappy}
                        >
                          <Check className="w-4 h-4" />
                        </motion.div>
                      ) : (
                        <motion.span
                          key="number"
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          exit={{ scale: 0 }}
                          transition={spring.snappy}
                        >
                          {index + 1}
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </motion.div>

                  {/* Step label */}
                  <motion.div
                    className="mt-2 text-center"
                    animate={{ opacity: isCurrent ? 1 : 0.7 }}
                  >
                    <span
                      className={cn(
                        'text-xs font-medium transition-colors block',
                        isCurrent ? 'text-foreground' : 'text-muted-foreground'
                      )}
                    >
                      {step.title}
                    </span>
                  </motion.div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Mobile: Compact progress bar */}
        <div className="md:hidden">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <motion.div
                className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-semibold"
                key={currentStep}
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                transition={spring.snappy}
              >
                {currentStep + 1}
              </motion.div>
              <AnimatePresence mode="wait">
                <motion.span
                  key={currentStep}
                  className="text-sm font-medium text-foreground"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={{ duration: 0.2 }}
                >
                  {steps[currentStep]?.title}
                </motion.span>
              </AnimatePresence>
            </div>
            <span className="text-xs text-muted-foreground">
              {currentStep + 1} of {steps.length}
            </span>
          </div>

          {/* Progress bar */}
          <div className="h-1.5 bg-surface-elevated rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-primary rounded-full relative"
              initial={{ width: 0 }}
              animate={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
              transition={spring.smooth}
            >
              {/* Shimmer effect */}
              <div className="absolute inset-0 overflow-hidden">
                <div className="absolute inset-0 -translate-x-full animate-shimmer bg-linear-to-r from-transparent via-white/20 to-transparent" />
              </div>
            </motion.div>
          </div>

          {/* Step dots */}
          <div className="flex justify-between mt-2 px-0.5">
            {steps.map((_, index) => (
              <motion.div
                key={index}
                className={cn(
                  'w-1.5 h-1.5 rounded-full transition-colors',
                  index <= currentStep ? 'bg-primary' : 'bg-border'
                )}
                animate={{ scale: index === currentStep ? 1.5 : 1 }}
                transition={spring.snappy}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// =============================================================================
// MINI STEPPER - Compact version for inline use
// =============================================================================

interface MiniStepperProps {
  total: number
  current: number
  className?: string
}

export function MiniStepper({ total, current, className }: MiniStepperProps) {
  return (
    <div className={cn('flex items-center gap-1.5', className)}>
      {Array.from({ length: total }).map((_, index) => (
        <motion.div
          key={index}
          className={cn(
            'h-1 rounded-full transition-all duration-300',
            index === current 
              ? 'w-6 bg-primary' 
              : index < current 
                ? 'w-1.5 bg-primary/60' 
                : 'w-1.5 bg-border'
          )}
          animate={{ 
            width: index === current ? 24 : 6,
            opacity: index <= current ? 1 : 0.5,
          }}
          transition={spring.snappy}
        />
      ))}
    </div>
  )
}
