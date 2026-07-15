"use client"

/**
 * Step Router - renders the current step component
 *
 * Step components come from the next/dynamic registry in step-components.tsx
 * (SSR on), so the FIRST step of a service server-renders into the initial
 * HTML and its chunk preloads from <head> — the old manual load-state
 * waterfall here kept the form client-only and cost a full extra network
 * round-trip after hydration on the paid mobile entry.
 *
 * This component still owns:
 * - Persistent intro composition for steps that keep their intro mounted
 * - Idle prefetch of the NEXT step's chunk
 * - Error boundaries for step failures (chunk load failures included)
 *
 * Note: Transitions are owned by request-flow.tsx's AnimatePresence.
 * Do NOT add a second AnimatePresence here - it causes ghost renders.
 */

import { useEffect } from "react"

import type { UnifiedStepId } from "@/lib/request/step-registry"

import { stepComponents, StepIntroShell } from "./step-components"
import { StepErrorBoundary } from "./step-error-boundary"
import { preloadStepComponent, type StepComponentProps } from "./step-loaders"
import { useRequestStore } from "./store"

const persistentIntroSteps = new Set(["certificate-step", "symptoms-step"])

export interface StepRouterProps {
  serviceType: StepComponentProps["serviceType"]
  currentStepId: UnifiedStepId
  componentPath: string
  /** The following step's component, prefetched at idle so Continue never
   * pays a fresh chunk round-trip (and its 150ms loading gate) mid-funnel. */
  nextComponentPath?: string
  onNext: () => void
  onBack: () => void
  onComplete: () => void
  initialDuration?: string
}

function StepNotFound({ componentPath }: { componentPath: string }) {
  return (
    <div className="text-center py-12">
      <p className="text-muted-foreground">
        Step component not found: {componentPath}
      </p>
    </div>
  )
}

export function StepRouter({
  serviceType,
  currentStepId,
  componentPath,
  nextComponentPath,
  onNext,
  onBack,
  onComplete,
  initialDuration,
}: StepRouterProps) {
  const hasPersistentIntro = persistentIntroSteps.has(componentPath)
  const isCarerCertificate = useRequestStore((state) => state.answers.certType === "carer")
  const persistentIntroTitle = componentPath === "symptoms-step" && isCarerCertificate
    ? "What is happening?"
    : undefined

  // Once the current step's chunk is in, prefetch the NEXT step's chunk at
  // during the next idle window so tapping Continue swaps steps instantly
  // instead of gating the flow behind a fresh network round-trip. The timeout
  // bounds that wait on busy devices, where requestIdleCallback may otherwise
  // never run before the patient taps Continue. The loader cache makes
  // double-loads free (webpack shares the chunk with the dynamic registry).
  useEffect(() => {
    if (!nextComponentPath) return

    let cancelled = false
    let cancelScheduled: (() => void) | undefined

    void preloadStepComponent(componentPath)
      .catch(() => null)
      .then(() => {
        if (cancelled) return
        const kick = () => {
          if (!cancelled) void preloadStepComponent(nextComponentPath)
        }

        if (typeof window.requestIdleCallback === "function") {
          const handle = window.requestIdleCallback(kick, { timeout: 1500 })
          cancelScheduled = () => window.cancelIdleCallback?.(handle)
          return
        }

        const timeout = window.setTimeout(kick, 200)
        cancelScheduled = () => window.clearTimeout(timeout)
      })

    return () => {
      cancelled = true
      cancelScheduled?.()
    }
  }, [componentPath, nextComponentPath])

  const StepComponent = stepComponents[componentPath]

  if (!StepComponent) {
    return <StepNotFound componentPath={componentPath} />
  }

  return (
    <StepErrorBoundary stepId={currentStepId}>
      {hasPersistentIntro ? (
        <div className="space-y-4">
          <StepIntroShell componentPath={componentPath} titleOverride={persistentIntroTitle} />
          <StepComponent
            serviceType={serviceType}
            onNext={onNext}
            onBack={onBack}
            onComplete={onComplete}
            initialDuration={initialDuration}
            hideIntro
          />
        </div>
      ) : (
        <StepComponent
          serviceType={serviceType}
          onNext={onNext}
          onBack={onBack}
          onComplete={onComplete}
          initialDuration={initialDuration}
        />
      )}
    </StepErrorBoundary>
  )
}
