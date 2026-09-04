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
 * Do not add next/dynamic's `loading` option here. On Next 15 it opts the
 * server-rendered step into a streamed Suspense boundary. A cold production
 * navigation can begin hydration before Next reveals that boundary, causing
 * React hydration recovery (#418). The active step SSRs directly instead;
 * later chunks are already warmed by the prefetch path above.
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

import { getApprovedClaim } from "@/lib/marketing/approved-claims"

import type { StepComponentProps } from "./step-loaders"

const MED_CERT_DOCUMENT_SCOPE = getApprovedClaim("med_cert_document_scope")

const stepIntroCopy: Partial<Record<string, { eyebrow?: string; title: string; description: string }>> = {
  "certificate-step": {
    title: "What do you need covered?",
    description: "Pick the certificate type, dates, and duration.",
  },
  "symptoms-step": {
    title: "What is stopping you today?",
    description: `Tell the doctor what is happening. ${MED_CERT_DOCUMENT_SCOPE}`,
  },
  "medication-step": {
    title: "Your medication",
    description: "Request one regular medicine at a time. Type the name, or describe it if you're not sure.",
  },
  "ed-goals-step": {
    title: "Tell us what's going on",
    description: "Two quick questions. Only the doctor reviewing your request sees your answers.",
  },
  "hair-loss-goals-step": {
    title: "What matters most right now?",
    description: "A few discreet answers help the doctor understand your pattern.",
  },
  "womens-health-type-step": {
    eyebrow: "Women's health",
    title: "What do you need today?",
    description: "Choose one. Current-pill repeats go through repeat prescriptions.",
  },
}

export function StepIntroShell({
  componentPath,
  titleOverride,
}: {
  componentPath: string
  titleOverride?: string
}) {
  const copy = stepIntroCopy[componentPath]

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
      {copy.eyebrow && (
        <p className="text-xs font-medium text-muted-foreground">{copy.eyebrow}</p>
      )}
      <h2 className="text-lg font-semibold tracking-tight text-foreground">
        {titleOverride ?? copy.title}
      </h2>
      <p className="text-sm leading-relaxed text-muted-foreground">{copy.description}</p>
    </div>
  )
}

// Each entry needs a LITERAL import() inside dynamic() — Next's SWC
// transform statically extracts the module reference to emit the <head>
// chunk preload + SSR module registration. Do NOT refactor these to loop
// over step-loaders' map; the indirection breaks the transform.
export const stepComponents: Record<string, ComponentType<StepComponentProps>> = {
  "certificate-step": dynamic<StepComponentProps>(() => import("./steps/certificate-step")),
  "symptoms-step": dynamic<StepComponentProps>(() => import("./steps/symptoms-step")),
  "medication-step": dynamic<StepComponentProps>(() => import("./steps/medication-step")),
  "medical-history-step": dynamic<StepComponentProps>(() => import("./steps/medical-history-step")),
  "patient-details-step": dynamic<StepComponentProps>(() => import("./steps/patient-details-step")),
  "review-step": dynamic<StepComponentProps>(() => import("./steps/review-step")),
  "ed-goals-step": dynamic<StepComponentProps>(() => import("./steps/ed-goals-step")),
  "ed-health-step": dynamic<StepComponentProps>(() => import("./steps/ed-health-step")),
  "ed-preferences-step": dynamic<StepComponentProps>(() => import("./steps/ed-preferences-step")),
  "hair-loss-goals-step": dynamic<StepComponentProps>(() => import("./steps/hair-loss-goals-step")),
  "hair-loss-assessment-step": dynamic<StepComponentProps>(() => import("./steps/hair-loss-assessment-step")),
  "hair-loss-health-step": dynamic<StepComponentProps>(() => import("./steps/hair-loss-health-step")),
  "hair-loss-preferences-step": dynamic<StepComponentProps>(() => import("./steps/hair-loss-preferences-step")),
  "womens-health-type-step": dynamic<StepComponentProps>(() => import("./steps/womens-health-type-step")),
  "womens-health-assessment-step": dynamic<StepComponentProps>(() => import("./steps/womens-health-assessment-step")),
  "weight-loss-assessment-step": dynamic<StepComponentProps>(() => import("./steps/weight-loss-assessment-step")),
}
