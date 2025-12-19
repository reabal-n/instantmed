'use client'

import { cn } from '@/lib/utils'
import type { OnboardingStep } from '@/lib/onboarding/types'
import { Check } from 'lucide-react'

interface ProgressBarProps {
  currentStep: OnboardingStep
  completedSteps: OnboardingStep[]
  className?: string
}

const steps: { id: OnboardingStep; label: string }[] = [
  { id: 'service', label: 'Service' },
  { id: 'eligibility', label: 'Eligibility' },
  { id: 'questions', label: 'Questions' },
  { id: 'identity', label: 'Identity' },
  { id: 'consent', label: 'Consent' },
  { id: 'review', label: 'Review' },
  { id: 'payment', label: 'Payment' },
]

export function ProgressBar({ currentStep, completedSteps, className }: ProgressBarProps) {
  const currentIndex = steps.findIndex((s) => s.id === currentStep)
  const progressPercentage = Math.max(0, (currentIndex / (steps.length - 1)) * 100)

  return (
    <div className={cn('w-full', className)}>
      {/* Mobile: Simple progress bar */}
      <div className="md:hidden">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-foreground">
            Step {currentIndex + 1} of {steps.length}
          </span>
          <span className="text-sm text-muted-foreground">
            {steps[currentIndex]?.label}
          </span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary transition-all duration-500 ease-out rounded-full progress-shine relative"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </div>

      {/* Desktop: Step indicators */}
      <div className="hidden md:flex items-center justify-between">
        {steps.map((step, index) => {
          const isCompleted = completedSteps.includes(step.id)
          const isCurrent = step.id === currentStep
          const isPast = index < currentIndex

          return (
            <div key={step.id} className="flex items-center">
              {/* Step circle */}
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    'flex items-center justify-center w-8 h-8 rounded-full border-2 transition-all duration-300',
                    isCompleted || isPast
                      ? 'bg-primary border-primary text-primary-foreground'
                      : isCurrent
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-muted-foreground/30 bg-background text-muted-foreground'
                  )}
                >
                  {isCompleted || isPast ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <span className="text-sm font-medium">{index + 1}</span>
                  )}
                </div>
                <span
                  className={cn(
                    'mt-2 text-xs font-medium transition-colors',
                    isCurrent ? 'text-primary' : 'text-muted-foreground'
                  )}
                >
                  {step.label}
                </span>
              </div>

              {/* Connector line */}
              {index < steps.length - 1 && (
                <div className="flex-1 mx-2 h-0.5 min-w-[40px]">
                  <div
                    className={cn(
                      'h-full transition-all duration-500',
                      index < currentIndex ? 'bg-primary' : 'bg-muted'
                    )}
                  />
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
