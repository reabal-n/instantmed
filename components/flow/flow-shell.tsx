'use client'

import { useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { AnimatePresence, motion } from 'framer-motion'
import { FlowTopBar } from './flow-top-bar'
import { FlowStepper } from './flow-stepper'
import { FlowCTA } from './flow-cta'
import { useFlowStore, useFlowProgress, useFlowUI } from '@/lib/flow'
import type { FlowConfig, FlowState } from '@/lib/flow'
import { cn } from '@/lib/utils'

interface FlowShellProps {
  config: FlowConfig
  children: React.ReactNode
  onComplete?: (state: FlowState) => void | Promise<void>
  onExit?: () => void
  ctaLabel?: string
  ctaDisabled?: boolean
  onCTAClick?: () => void | Promise<void>
  showCTA?: boolean
  className?: string
}

// Animation variants for step transitions
const contentVariants = {
  initial: { 
    opacity: 0, 
    y: 8,
  },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.25,
      ease: [0.25, 0.1, 0.25, 1] as const,
    },
  },
  exit: {
    opacity: 0,
    y: -8,
    transition: {
      duration: 0.3,
      ease: [0.25, 0.1, 0.25, 1] as const,
    },
  },
}

export function FlowShell({
  config,
  children,
  onComplete: _onComplete,
  onExit,
  ctaLabel = 'Continue',
  ctaDisabled = false,
  onCTAClick,
  showCTA = true,
  className,
}: FlowShellProps) {
  const router = useRouter()
  const { currentStepId, stepIndex, totalSteps: _totalSteps } = useFlowProgress()
  const { isLoading, isSaving, lastSavedAt } = useFlowUI()
  const { prevStep, saveDraft } = useFlowStore()

  // Autosave on answer changes (debounced) - non-blocking
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        saveDraft().catch((err) => {
          // Silently handle save errors - draft will be in localStorage
          // eslint-disable-next-line no-console
          if (process.env.NODE_ENV === 'development') console.warn('Auto-save failed:', err)
        })
      } catch {
        // Ignore errors
      }
    }, 2000)

    return () => clearTimeout(timer)
  }, [saveDraft])

  // Handle exit
  const handleExit = useCallback(() => {
    if (onExit) {
      onExit()
    } else {
      router.push('/')
    }
  }, [onExit, router])

  // Handle back
  const handleBack = useCallback(() => {
    if (stepIndex > 0) {
      prevStep()
    } else {
      handleExit()
    }
  }, [stepIndex, prevStep, handleExit])

  return (
    <div className="min-h-[100dvh] bg-gradient-to-b from-slate-50 via-blue-50/30 to-white dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 flex flex-col">
      {/* Subtle noise texture */}
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.02] z-0"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Top bar - compact */}
      <FlowTopBar
        serviceName={config.serviceName}
        onBack={handleBack}
        onClose={handleExit}
        showBack={stepIndex > 0}
        isSaving={isSaving}
        lastSavedAt={lastSavedAt}
      />

      {/* Progress stepper - sticky, minimal height */}
      <div className="sticky top-14 z-30 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-white/40 dark:border-white/10">
        <div className="max-w-2xl mx-auto px-4 py-3">
          <FlowStepper
            steps={config.steps}
            currentStepId={currentStepId}
          />
        </div>
      </div>

      {/* Main content area */}
      <main className="flex-1 relative z-10">
        <div className={cn(
          'max-w-2xl mx-auto px-4 py-5 sm:py-6 pb-28',
          className
        )}>
          {/* Animated content wrapper */}
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStepId}
              variants={contentVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className={cn(
                'bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl rounded-2xl',
                'border border-white/40 dark:border-white/10',
                'shadow-[0_8px_30px_rgb(0,0,0,0.06)]',
                'overflow-hidden'
              )}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* Sticky bottom CTA */}
      {showCTA && (
        <FlowCTA
          label={ctaLabel}
          disabled={ctaDisabled}
          isLoading={isLoading}
          onClick={onCTAClick}
        />
      )}
    </div>
  )
}
