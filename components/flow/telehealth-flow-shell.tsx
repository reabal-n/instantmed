"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import {
  Clock,
  CheckCircle,
  Shield,
  Lock,
  BadgeCheck,
  Phone,
  RotateCcw,
} from "lucide-react"
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

// =============================================================================
// TYPES
// =============================================================================

interface TelehealthFlowShellProps {
  /** Service name for branding */
  serviceName: string
  /** Storage key for draft persistence */
  storageKey: string
  /** Steps for progress indicator */
  steps: readonly string[]
  /** Current step index */
  currentStepIndex: number
  /** Turnaround time display */
  turnaroundTime?: string
  /** Children content */
  children: React.ReactNode
  /** Footer content */
  footer: React.ReactNode
  /** Error message to display */
  error?: string | null
  /** Dismiss error callback */
  onDismissError?: () => void
  /** Last saved timestamp */
  lastSaved?: Date | null
  /** Show draft recovery prompt */
  showRecoveryPrompt?: boolean
  /** Restore draft callback */
  onRestoreDraft?: () => void
  /** Start fresh callback */
  onStartFresh?: () => void
}

// =============================================================================
// TRUST INDICATORS
// =============================================================================

export function TrustStrip({ className }: { className?: string }) {
  return (
    <TooltipProvider>
      <div className={cn("flex items-center justify-center gap-4 py-2 text-xs text-muted-foreground", className)} role="region" aria-label="Trust indicators">
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1 cursor-help">
              <BadgeCheck className="w-3.5 h-3.5 text-green-600" aria-hidden="true" />
              <span>AHPRA Doctors</span>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p className="text-xs">All our doctors are registered with AHPRA</p>
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1 cursor-help">
              <Lock className="w-3.5 h-3.5 text-primary" aria-hidden="true" />
              <span>256-bit encrypted</span>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p className="text-xs">Your data is protected with bank-grade encryption</p>
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1 cursor-help">
              <Shield className="w-3.5 h-3.5 text-purple-600" aria-hidden="true" />
              <span>Privacy compliant</span>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p className="text-xs">We follow strict Australian healthcare privacy standards</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  )
}

// =============================================================================
// PROGRESS INDICATOR
// =============================================================================

export function FlowProgressIndicator({
  steps,
  currentIndex,
}: {
  steps: readonly string[]
  currentIndex: number
}) {
  const stepsRemaining = steps.length - currentIndex
  const estimatedMinutes = Math.max(1, stepsRemaining)

  return (
    <nav aria-label="Request progress" className="w-full">
      <div className="flex flex-col items-center gap-2">
        {/* Animated dots */}
        <div className="flex items-center gap-3 relative">
          {steps.map((label, i) => {
            const isComplete = i < currentIndex
            const isCurrent = i === currentIndex
            return (
              <div
                key={label}
                className={cn(
                  "w-2.5 h-2.5 rounded-full relative z-10 transition-all duration-300",
                  isComplete ? "bg-primary scale-100" : isCurrent ? "bg-primary/80 scale-110" : "bg-muted-foreground/30"
                )}
                role="progressbar"
                aria-valuenow={isComplete ? 100 : isCurrent ? 50 : 0}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`${label}: ${isComplete ? "Complete" : isCurrent ? "In progress" : "Not started"}`}
              />
            )
          })}
          {/* Animated progress line */}
          <div 
            className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-primary/20 rounded-full transition-all duration-500 ease-out"
            style={{ 
              width: `${Math.max(10, (currentIndex / (steps.length - 1)) * 100)}%`,
            }}
          />
        </div>
        {/* Step label with time estimate */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>Step {currentIndex + 1} of {steps.length}</span>
          <span className="text-muted-foreground/50">•</span>
          <span className="text-primary/70">~{estimatedMinutes} min left</span>
        </div>
      </div>
    </nav>
  )
}

// =============================================================================
// DRAFT RECOVERY MODAL
// =============================================================================

export function DraftRecoveryModal({
  isOpen,
  serviceName,
  onRestore,
  onStartFresh,
}: {
  isOpen: boolean
  serviceName: string
  onRestore: () => void
  onStartFresh: () => void
}) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl animate-in fade-in zoom-in-95">
        <div className="text-center">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <RotateCcw className="w-6 h-6 text-primary" />
          </div>
          <h2 className="text-lg font-semibold mb-2">Welcome back!</h2>
          <p className="text-sm text-muted-foreground mb-6">
            You have an unfinished {serviceName} request. Would you like to continue where you left off?
          </p>
          <div className="space-y-2">
            <Button onClick={onRestore} className="w-full h-12 rounded-xl">
              Continue my request
            </Button>
            <Button onClick={onStartFresh} variant="outline" className="w-full h-12 rounded-xl">
              Start fresh
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

// =============================================================================
// FOOTER COMPONENTS
// =============================================================================

export function FlowFooterMeta({ lastSaved }: { lastSaved?: Date | null }) {
  return (
    <div className="max-w-md mx-auto flex items-center justify-between mt-2 text-[10px] text-muted-foreground/60">
      <div className="flex items-center gap-1">
        {lastSaved && (
          <>
            <CheckCircle className="w-3 h-3 text-green-500" />
            <span>Draft saved</span>
          </>
        )}
      </div>
      <div className="flex items-center gap-1">
        <Phone className="w-3 h-3" />
        <span>Emergency? Call 000</span>
      </div>
    </div>
  )
}

// =============================================================================
// DRAFT PERSISTENCE HOOK
// =============================================================================

interface DraftState<T> {
  formData: T
  step: string
  savedAt: number
}

export function useDraftPersistence<T extends Record<string, unknown>>(
  storageKey: string,
  initialFormData: T,
  initialStep: string,
  expiryHours = 24
) {
  const [showRecoveryPrompt, setShowRecoveryPrompt] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [formData, setFormData] = useState<T>(initialFormData)
  const [step, setStep] = useState(initialStep)

  // Check for existing draft on mount
  useEffect(() => {
    // Use setTimeout to avoid synchronous setState in effect
    const timer = setTimeout(() => {
      try {
        const saved = localStorage.getItem(storageKey)
        if (saved) {
          const draft: DraftState<T> = JSON.parse(saved)
          const hoursSinceSave = (Date.now() - draft.savedAt) / (1000 * 60 * 60)
          if (hoursSinceSave < expiryHours && Object.keys(draft.formData).length > 0) {
            setShowRecoveryPrompt(true)
          } else {
            localStorage.removeItem(storageKey)
          }
        }
      } catch {
        localStorage.removeItem(storageKey)
      }
    }, 0)
    
    return () => clearTimeout(timer)
  }, [storageKey, expiryHours])

  // Auto-save draft (debounced)
  useEffect(() => {
    const timer = setTimeout(() => {
      const hasData = Object.values(formData).some(v => 
        v !== null && v !== "" && !(Array.isArray(v) && v.length === 0)
      )
      if (hasData) {
        const draft: DraftState<T> = {
          formData,
          step,
          savedAt: Date.now(),
        }
        try {
          localStorage.setItem(storageKey, JSON.stringify(draft))
          setLastSaved(new Date())
        } catch {
          // localStorage might be full or disabled
        }
      }
    }, 1000)

    return () => clearTimeout(timer)
  }, [formData, step, storageKey])

  // Restore draft handler
  const restoreDraft = useCallback(() => {
    try {
      const saved = localStorage.getItem(storageKey)
      if (saved) {
        const draft: DraftState<T> = JSON.parse(saved)
        setFormData(draft.formData)
        setStep(draft.step)
      }
    } catch {
      // Ignore errors
    }
    setShowRecoveryPrompt(false)
  }, [storageKey])

  // Clear draft and start fresh
  const clearDraft = useCallback(() => {
    localStorage.removeItem(storageKey)
    setShowRecoveryPrompt(false)
  }, [storageKey])

  // Clear draft on successful submission
  const clearOnSuccess = useCallback(() => {
    localStorage.removeItem(storageKey)
    setLastSaved(null)
  }, [storageKey])

  return {
    formData,
    setFormData,
    step,
    setStep,
    showRecoveryPrompt,
    lastSaved,
    restoreDraft,
    clearDraft,
    clearOnSuccess,
  }
}

// =============================================================================
// MAIN SHELL COMPONENT
// =============================================================================

export function TelehealthFlowShell({
  serviceName,
  storageKey: _storageKey,
  steps,
  currentStepIndex,
  turnaroundTime = "~15 min",
  children,
  footer,
  error,
  onDismissError,
  lastSaved,
  showRecoveryPrompt,
  onRestoreDraft,
  onStartFresh,
}: TelehealthFlowShellProps) {
  return (
    <TooltipProvider>
      {/* Draft Recovery Prompt */}
      {showRecoveryPrompt && onRestoreDraft && onStartFresh && (
        <DraftRecoveryModal
          isOpen={showRecoveryPrompt}
          serviceName={serviceName}
          onRestore={onRestoreDraft}
          onStartFresh={onStartFresh}
        />
      )}

      <div className="min-h-screen bg-background flex flex-col">
        {/* Header */}
        <header className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border px-4 py-2">
          <div className="max-w-md mx-auto space-y-2">
            <div className="flex items-center justify-between">
              <Link href="/" className="text-sm font-semibold text-primary">
                Lumen Health
              </Link>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Clock className="w-3.5 h-3.5" aria-hidden="true" />
                <span>{turnaroundTime}</span>
              </div>
            </div>
            <FlowProgressIndicator steps={steps} currentIndex={currentStepIndex} />
            <TrustStrip />
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 px-4 py-5 pb-24">
          <div className="max-w-md mx-auto">
            {error && (
              <div className="mb-4 flex items-start gap-3 p-3 rounded-xl bg-destructive/10 border border-destructive/20" role="alert" aria-live="assertive">
                <p className="text-sm text-destructive flex-1">{error}</p>
                {onDismissError && (
                  <button
                    type="button"
                    onClick={onDismissError}
                    className="p-1 rounded hover:bg-destructive/10 transition-colors text-destructive"
                    aria-label="Dismiss error"
                  >
                    ✕
                  </button>
                )}
              </div>
            )}
            {children}
          </div>
        </main>

        {/* Footer */}
        <footer className="sticky bottom-0 z-40 bg-background/95 backdrop-blur-sm border-t border-border px-4 py-3 safe-area-pb">
          {footer}
          <FlowFooterMeta lastSaved={lastSaved} />
        </footer>
      </div>
    </TooltipProvider>
  )
}

export default TelehealthFlowShell
