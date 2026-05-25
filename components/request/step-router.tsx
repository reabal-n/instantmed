"use client"

/**
 * Step Router - Dynamically renders the current step component
 *
 * This component handles:
 * - Lazy loading step components
 * - Error boundaries for step failures
 *
 * Note: Transitions are owned by request-flow.tsx's AnimatePresence.
 * Do NOT add a second AnimatePresence here - it causes ghost renders.
 */

import type { ComponentType } from "react"
import { useEffect, useState } from "react"

import type { UnifiedStepId } from "@/lib/request/step-registry"

import { StepErrorBoundary } from "./step-error-boundary"
import {
  loadStepComponent,
  preloadStepComponent,
  type StepComponentProps,
} from "./step-loaders"

const loadingCopy: Partial<Record<string, { title: string; description: string }>> = {
  "certificate-step": {
    title: "Pick the certificate type",
    description: "Pick the certificate type, dates, and duration.",
  },
}

/**
 * StepLoading — perceived-speed first.
 *
 * Most step chunks resolve in well under 150ms, so flashing a pulsing grey
 * skeleton in the meantime makes a fast form feel slow. The product is
 * called InstantMed — the loading state IS the brand promise.
 *
 * Strategy (paid-funnel review 2026-05-25 fix #3):
 *   1. Render nothing for the first 150ms — if the chunk lands quickly the
 *      user never sees a placeholder at all.
 *   2. After 150ms, fade in a calm low-opacity ghost (no pulse, no hard greys).
 *      Keep per-step copy when we have it so the title doesn't flicker.
 */
function StepLoading({ componentPath }: { componentPath: string }) {
  const copy = loadingCopy[componentPath]
  const [revealed, setRevealed] = useState(false)

  useEffect(() => {
    const handle = setTimeout(() => setRevealed(true), 150)
    return () => clearTimeout(handle)
  }, [])

  return (
    <div
      className="space-y-4 transition-opacity duration-200 ease-out"
      style={{ opacity: revealed ? 1 : 0 }}
      aria-live="polite"
      aria-busy="true"
    >
      <div className="space-y-2">
        {copy ? (
          <>
            <p className="text-lg font-semibold text-foreground">{copy.title}</p>
            <p className="text-sm text-muted-foreground">{copy.description}</p>
          </>
        ) : (
          <>
            <div className="h-5 w-2/3 rounded-full bg-muted/30" />
            <div className="h-4 w-full rounded-full bg-muted/20" />
          </>
        )}
      </div>
      <div className="rounded-2xl border border-border/40 bg-white p-5 shadow-sm shadow-primary/[0.03] dark:bg-card">
        <div className="space-y-3">
          <div className="h-11 rounded-xl border border-border/30 bg-muted/20" />
          <div className="h-11 rounded-xl border border-border/30 bg-muted/15" />
          <div className="h-11 rounded-xl border border-border/30 bg-muted/10" />
        </div>
      </div>
    </div>
  )
}

export interface StepRouterProps {
  serviceType: StepComponentProps["serviceType"]
  currentStepId: UnifiedStepId
  componentPath: string
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
  onNext,
  onBack,
  onComplete,
  initialDuration,
}: StepRouterProps) {
  const [loadedStep, setLoadedStep] = useState<{
    componentPath: string
    Component: ComponentType<StepComponentProps>
  } | null>(null)
  const [loadFailed, setLoadFailed] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoadFailed(false)
    setLoadedStep((current) => current?.componentPath === componentPath ? current : null)

    void preloadStepComponent(componentPath)
    loadStepComponent(componentPath)
      .then((Component) => {
        if (!Component) {
          if (!cancelled) {
            setLoadedStep(null)
            setLoadFailed(true)
          }
          return
        }
        if (!cancelled) {
          setLoadedStep({ componentPath, Component })
        }
      })
      .catch(() => {
        if (!cancelled) {
          setLoadedStep(null)
          setLoadFailed(true)
        }
      })

    return () => {
      cancelled = true
    }
  }, [componentPath])

  if (loadFailed) {
    return <StepNotFound componentPath={componentPath} />
  }

  if (!loadedStep || loadedStep.componentPath !== componentPath) {
    return (
      <StepErrorBoundary stepId={currentStepId}>
        <StepLoading componentPath={componentPath} />
      </StepErrorBoundary>
    )
  }

  const { Component: StepComponent } = loadedStep

  return (
    <StepErrorBoundary stepId={currentStepId}>
      <StepComponent
        serviceType={serviceType}
        onNext={onNext}
        onBack={onBack}
        onComplete={onComplete}
        initialDuration={initialDuration}
      />
    </StepErrorBoundary>
  )
}
