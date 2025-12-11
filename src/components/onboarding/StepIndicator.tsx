'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Step {
  id: string
  title: string
}

interface StepIndicatorProps {
  steps: Step[]
  currentStep: number
  className?: string
}

export function StepIndicator({ steps, currentStep, className }: StepIndicatorProps) {
  const progress = ((currentStep) / (steps.length - 1)) * 100

  return (
    <div className={cn('w-full', className)}>
      {/* Desktop view - Enhanced with animations */}
      <div className="hidden md:block">
        <div className="relative flex items-center justify-between">
          {/* Background line */}
          <div className="absolute top-5 left-5 right-5 h-0.5 bg-slate-200 -z-10" />
          
          {/* Animated progress line */}
          <motion.div
            className="absolute top-5 left-5 h-0.5 bg-teal-600 -z-10"
            initial={{ width: 0 }}
            animate={{ width: `calc(${progress}% - 20px)` }}
            transition={{ type: 'spring', stiffness: 100, damping: 20 }}
          />

          {steps.map((step, index) => {
            const isCompleted = index < currentStep
            const isCurrent = index === currentStep
            
            return (
              <div key={step.id} className="flex flex-col items-center gap-2 relative z-10">
                <motion.div
                  className={cn(
                    'w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium border-2 transition-colors duration-300',
                    isCompleted && 'bg-teal-600 border-teal-600 text-white',
                    isCurrent && 'bg-white border-teal-600 text-teal-600 shadow-lg shadow-teal-500/20',
                    !isCompleted && !isCurrent && 'bg-white border-slate-200 text-slate-400'
                  )}
                  initial={false}
                  animate={{
                    scale: isCurrent ? 1.1 : 1,
                  }}
                  transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                >
                  <AnimatePresence mode="wait">
                    {isCompleted ? (
                      <motion.div
                        key="check"
                        initial={{ scale: 0, rotate: -90 }}
                        animate={{ scale: 1, rotate: 0 }}
                        exit={{ scale: 0, rotate: 90 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                      >
                        <Check className="w-5 h-5" />
                      </motion.div>
                    ) : (
                      <motion.span
                        key="number"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        exit={{ scale: 0 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                      >
                        {index + 1}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </motion.div>
                
                <motion.span
                  className={cn(
                    'text-xs font-medium transition-colors text-center max-w-[80px]',
                    isCurrent ? 'text-teal-600' : isCompleted ? 'text-slate-700' : 'text-slate-400'
                  )}
                  animate={{
                    fontWeight: isCurrent ? 600 : 500,
                  }}
                >
                  {step.title}
                </motion.span>
              </div>
            )
          })}
        </div>
      </div>
      
      {/* Mobile view - Enhanced progress bar */}
      <div className="md:hidden">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <motion.div
              className="w-7 h-7 rounded-full bg-teal-600 text-white flex items-center justify-center text-xs font-semibold"
              key={currentStep}
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            >
              {currentStep + 1}
            </motion.div>
            <AnimatePresence mode="wait">
              <motion.span 
                key={currentStep}
                className="text-sm font-medium text-slate-900"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ duration: 0.2 }}
              >
                {steps[currentStep]?.title}
              </motion.span>
            </AnimatePresence>
          </div>
          <span className="text-xs text-slate-500">
            {currentStep + 1} of {steps.length}
          </span>
        </div>
        
        {/* Progress bar container */}
        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-teal-500 to-teal-600 rounded-full relative"
            initial={{ width: 0 }}
            animate={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
            transition={{ type: 'spring', stiffness: 100, damping: 20 }}
          >
            {/* Shimmer effect */}
            <div className="absolute inset-0 overflow-hidden">
              <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/30 to-transparent" />
            </div>
          </motion.div>
        </div>
        
        {/* Step indicators dots */}
        <div className="flex justify-between mt-2 px-1">
          {steps.map((_, index) => (
            <motion.div
              key={index}
              className={cn(
                'w-1.5 h-1.5 rounded-full transition-colors',
                index <= currentStep ? 'bg-teal-600' : 'bg-slate-200'
              )}
              animate={{
                scale: index === currentStep ? 1.5 : 1,
              }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

