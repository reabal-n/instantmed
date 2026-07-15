"use client"

/**
 * Step Components — next/dynamic registry for intake step chunks.
 *
 * Why next/dynamic (SSR on) instead of the old client-only import() map:
 * the active first step server-renders into the initial HTML and Next emits
 * its chunk preloads in <head>. Measured on the throttled mobile profile
 * (Slow 4G, 4x CPU) the certificate form's chunk fetch moved from ~3.2s
 * (post-hydration effect) into the first network wave, and the form markup
 * paints when the render-blocking CSS lands instead of ~1.3s later. Client
 * side step transitions still lazy-load per step — later steps are never in
 * the first wave, and step-loaders.ts still owns the prefetch cache that
 * request-flow (module-scope first-step preload) and step-router (idle
 * next-step prefetch) share.
 *
 * SSR safety contract for FIRST steps of each service (the only ones that
 * ever render on the server — draft restoration moves to a later step only
 * after client hydration): no window/document/localStorage access during
 * render, and no date-dependent markup in the default state. Certificate
 * step's date chips render static labels ("Yesterday"/"Today"/...) for the
 * default offsets, so UTC-server vs AEST-client never disagree in the HTML.
 */

import dynamic from "next/dynamic"
import type { ComponentType } from "react"
import { useEffect, useState } from "react"

import type { StepComponentProps } from "./step-loaders"

const loadingCopy: Partial<Record<string, { title: string; description: string }>> = {
  "certificate-step": {
    title: "What do you need covered?",
    description: "Pick the certificate type, dates, and duration.",
  },
  "symptoms-step": {
    title: "What is stopping you today?",
    description: "A short, specific sentence is enough for the doctor to review.",
  },
}

const loadingControlLabels: Partial<Record<string, readonly string[]>> = {
  "certificate-step": ["Certificate type", "How many days?", "Starting from?"],
  "symptoms-step": ["What symptoms are you having?", "How long have you felt unwell?"],
}

/**
 * StepLoading — perceived-speed first.
 *
 * Most step chunks resolve in well under 150ms, so flashing a pulsing grey
 * skeleton in the meantime makes a fast form feel slow. The product is
 * called InstantMed — the loading state IS the brand promise.
 *
 * Strategy:
 *   1. Render the step intro immediately. On mobile Lighthouse, hiding this
 *      copy behind opacity made the real step intro a late LCP candidate.
 *   2. Delay only the lower placeholder controls for 150ms. Fast chunk loads
 *      avoid the skeleton flash, while the above-fold copy still paints early.
 */
export function StepIntroShell({
  componentPath,
  titleOverride,
}: {
  componentPath: string
  titleOverride?: string
}) {
  const copy = loadingCopy[componentPath]

  if (!copy) {
    return (
      <div className="space-y-2">
        <div className="h-5 w-2/3 rounded-full bg-muted/30" />
        <div className="h-4 w-full rounded-full bg-muted/20" />
      </div>
    )
  }

  return (
    <div className="space-y-1.5" data-intake-step-intro="true">
      <h2 className="text-lg font-semibold tracking-tight text-foreground">
        {titleOverride ?? copy.title}
      </h2>
      <p className="text-sm leading-relaxed text-muted-foreground">{copy.description}</p>
    </div>
  )
}

export function StepLoading({
  componentPath,
  showIntro = true,
}: {
  componentPath: string
  showIntro?: boolean
}) {
  const [showControls, setShowControls] = useState(false)
  const controlLabels = loadingControlLabels[componentPath]

  useEffect(() => {
    const handle = setTimeout(() => setShowControls(true), 150)
    return () => clearTimeout(handle)
  }, [])

  return (
    <div
      className="space-y-4"
      aria-live="polite"
      aria-busy="true"
    >
      <span className="sr-only">Loading this step</span>
      {showIntro && <StepIntroShell componentPath={componentPath} />}
      {showControls && (
        <div className="space-y-3" aria-hidden="true">
          {(controlLabels ?? ["Preparing your form"]).map((label, index) => (
            <div
              key={label}
              className="rounded-2xl border border-border/40 bg-white p-4 shadow-sm shadow-primary/[0.03] dark:bg-card"
            >
              <p className="text-xs font-medium text-muted-foreground">{label}</p>
              <div className="mt-2 grid grid-cols-3 gap-2">
                <div className="h-9 rounded-xl border border-border/30 bg-muted/20" />
                <div className="h-9 rounded-xl border border-border/30 bg-muted/15" />
                <div
                  className={`h-9 rounded-xl border border-border/30 bg-muted/10 ${
                    index === (controlLabels?.length ?? 1) - 1 ? "max-sm:hidden" : ""
                  }`}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// The loading fallback only renders on CLIENT transitions to a step whose
// chunk hasn't arrived yet (the idle prefetch usually wins that race). The
// server render awaits the real module, so first paint is the real form.
// certificate-step and symptoms-step hide their intros because step-router
// owns a persistent shell above the swap area.
function stepLoadingFallback(componentPath: string, showIntro: boolean) {
  const Fallback = () => <StepLoading componentPath={componentPath} showIntro={showIntro} />
  Fallback.displayName = `StepLoading(${componentPath})`
  return Fallback
}

// Each entry needs a LITERAL import() inside dynamic() — Next's SWC
// transform statically extracts the module reference to emit the <head>
// chunk preload + SSR module registration. Do NOT refactor these to loop
// over step-loaders' map; the indirection breaks the transform.
export const stepComponents: Record<string, ComponentType<StepComponentProps>> = {
  "certificate-step": dynamic<StepComponentProps>(() => import("./steps/certificate-step"), {
    loading: stepLoadingFallback("certificate-step", false),
  }),
  "symptoms-step": dynamic<StepComponentProps>(() => import("./steps/symptoms-step"), {
    loading: stepLoadingFallback("symptoms-step", false),
  }),
  "medication-step": dynamic<StepComponentProps>(() => import("./steps/medication-step"), {
    loading: stepLoadingFallback("medication-step", true),
  }),
  "medication-history-step": dynamic<StepComponentProps>(() => import("./steps/medication-history-step"), {
    loading: stepLoadingFallback("medication-history-step", true),
  }),
  "medical-history-step": dynamic<StepComponentProps>(() => import("./steps/medical-history-step"), {
    loading: stepLoadingFallback("medical-history-step", true),
  }),
  "patient-details-step": dynamic<StepComponentProps>(() => import("./steps/patient-details-step"), {
    loading: stepLoadingFallback("patient-details-step", true),
  }),
  "review-step": dynamic<StepComponentProps>(() => import("./steps/review-step"), {
    loading: stepLoadingFallback("review-step", true),
  }),
  "ed-goals-step": dynamic<StepComponentProps>(() => import("./steps/ed-goals-step"), {
    loading: stepLoadingFallback("ed-goals-step", true),
  }),
  "ed-assessment-step": dynamic<StepComponentProps>(() => import("./steps/ed-assessment-step"), {
    loading: stepLoadingFallback("ed-assessment-step", true),
  }),
  "ed-health-step": dynamic<StepComponentProps>(() => import("./steps/ed-health-step"), {
    loading: stepLoadingFallback("ed-health-step", true),
  }),
  "ed-preferences-step": dynamic<StepComponentProps>(() => import("./steps/ed-preferences-step"), {
    loading: stepLoadingFallback("ed-preferences-step", true),
  }),
  "hair-loss-goals-step": dynamic<StepComponentProps>(() => import("./steps/hair-loss-goals-step"), {
    loading: stepLoadingFallback("hair-loss-goals-step", true),
  }),
  "hair-loss-assessment-step": dynamic<StepComponentProps>(() => import("./steps/hair-loss-assessment-step"), {
    loading: stepLoadingFallback("hair-loss-assessment-step", true),
  }),
  "hair-loss-health-step": dynamic<StepComponentProps>(() => import("./steps/hair-loss-health-step"), {
    loading: stepLoadingFallback("hair-loss-health-step", true),
  }),
  "hair-loss-preferences-step": dynamic<StepComponentProps>(() => import("./steps/hair-loss-preferences-step"), {
    loading: stepLoadingFallback("hair-loss-preferences-step", true),
  }),
  "womens-health-type-step": dynamic<StepComponentProps>(() => import("./steps/womens-health-type-step"), {
    loading: stepLoadingFallback("womens-health-type-step", true),
  }),
  "womens-health-assessment-step": dynamic<StepComponentProps>(() => import("./steps/womens-health-assessment-step"), {
    loading: stepLoadingFallback("womens-health-assessment-step", true),
  }),
  "weight-loss-assessment-step": dynamic<StepComponentProps>(() => import("./steps/weight-loss-assessment-step"), {
    loading: stepLoadingFallback("weight-loss-assessment-step", true),
  }),
  "weight-loss-call-step": dynamic<StepComponentProps>(() => import("./steps/weight-loss-call-step"), {
    loading: stepLoadingFallback("weight-loss-call-step", true),
  }),
}
