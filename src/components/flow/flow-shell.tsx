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
  initial: (direction: number) => ({
    x: direction > 0 ? 100 : -100,
    opacity: 0,
  }),
  animate: {
    x: 0,
    opacity: 1,
    transition: {
      type: 'spring',
      stiffness: 300,
      damping: 30,
    },
  },
  exit: (direction: number) => ({
    x: direction > 0 ? -100 : 100,
    opacity: 0,
    transition: {
      type: 'spring',
      stiffness: 300,
      damping: 30,
    },
  }),
}

export function FlowShell({
  config,
  children,
  onComplete,
  onExit,
  ctaLabel = 'Continue',
  ctaDisabled = false,
  onCTAClick,
  showCTA = true,
  className,
}: FlowShellProps) {
  const router = useRouter()
  const { currentStepId, stepIndex, totalSteps } = useFlowProgress()
  const { isLoading, isSaving, lastSavedAt } = useFlowUI()
  const { prevStep, saveDraft } = useFlowStore()

  // Autosave on answer changes (debounced)
  useEffect(() => {
    const timer = setTimeout(() => {
      saveDraft()
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

  // Current step for animation direction
  const direction = 1 // Forward by default

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50/30 flex flex-col">
      {/* Noise texture overlay */}
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.015] z-0"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Top bar */}
      <FlowTopBar
        serviceName={config.serviceName}
        onBack={handleBack}
        onClose={handleExit}
        showBack={stepIndex > 0}
        isSaving={isSaving}
        lastSavedAt={lastSavedAt}
      />

      {/* Progress stepper */}
      <div className="sticky top-16 z-30 bg-white/80 backdrop-blur-sm border-b border-slate-100">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <FlowStepper
            steps={config.steps}
            currentStepId={currentStepId}
          />
        </div>
      </div>

      {/* Main content area */}
      <main className="flex-1 relative z-10">
        <div className={cn('max-w-2xl mx-auto px-4 py-8 pb-32', className)}>
          {/* Animated content wrapper */}
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={currentStepId}
              custom={direction}
              variants={contentVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden"
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
