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

import type { StepComponentProps } from "./step-loaders"

const loadingCopy: Partial<Record<string, { eyebrow?: string; title: string; description: string }>> = {
  "certificate-step": {
    title: "What do you need covered?",
    description: "Pick the certificate type, dates, and duration.",
  },
  "symptoms-step": {
    title: "What is stopping you today?",
    description: "A short, specific sentence is enough for the doctor to review.",
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

const loadingControlLabels: Partial<Record<string, readonly string[]>> = {
  "certificate-step": ["Certificate type", "How many days?", "Starting from?"],
  "symptoms-step": ["What symptoms are you having?", "How long have you felt unwell?"],
  "medication-step": [
    "Medication",
    "Prescription history",
    "Dose and frequency",
    "Reason for taking it",
    "Current regimen",
    "Side effects",
  ],
  "ed-goals-step": [
    "How long has this been a concern?",
    "How often does this happen?",
  ],
  "hair-loss-goals-step": [
    "What's your main goal?",
    "When did you first notice changes?",
  ],
  "womens-health-type-step": ["Select one"],
}

interface LoadingCardGeometry {
  columns: 1 | 2 | 3 | 4 | 5
  heightClass: string
  optionCount: number
}

interface StepLoadingGeometry {
  cardGeometry: readonly LoadingCardGeometry[]
  minHeightClass: string
}

/**
 * Measured against the settled first steps at 390px and 1440px.
 *
 * The first-step HTML is already server rendered, but next/dynamic briefly
 * swaps to its loading component while the client chunk attaches. The old
 * loading component rendered no controls for 150ms, collapsing a full form
 * to its intro before expanding again. These geometry shells keep the same
 * card count and approximately the same occupied height during that handoff.
 */
const stepLoadingGeometry: Partial<Record<string, StepLoadingGeometry>> = {
  "certificate-step": {
    minHeightClass: "min-h-[525px] sm:min-h-[598px]",
    cardGeometry: [
      { columns: 3, heightClass: "h-[141px] sm:h-[131px]", optionCount: 3 },
      { columns: 3, heightClass: "h-[122px]", optionCount: 3 },
      { columns: 4, heightClass: "h-[105px]", optionCount: 4 },
    ],
  },
  "medication-step": {
    minHeightClass: "min-h-[1457px] sm:min-h-[1348px]",
    cardGeometry: [
      { columns: 1, heightClass: "h-[212px] sm:h-[181px]", optionCount: 1 },
      { columns: 2, heightClass: "h-[221px] sm:h-[215px]", optionCount: 4 },
      { columns: 1, heightClass: "h-[371px] sm:h-[321px]", optionCount: 3 },
      { columns: 2, heightClass: "h-[166px] sm:h-[146px]", optionCount: 2 },
      { columns: 2, heightClass: "h-[162px] sm:h-[118px]", optionCount: 2 },
      { columns: 2, heightClass: "h-[127px]", optionCount: 2 },
    ],
  },
  "ed-goals-step": {
    minHeightClass: "min-h-[472px] sm:min-h-[490px]",
    cardGeometry: [
      { columns: 2, heightClass: "h-[161px]", optionCount: 4 },
      { columns: 5, heightClass: "h-[144px] sm:h-[121px]", optionCount: 5 },
    ],
  },
  "hair-loss-goals-step": {
    minHeightClass: "min-h-[459px] sm:min-h-[480px]",
    cardGeometry: [
      { columns: 2, heightClass: "h-[186px] sm:h-[165px]", optionCount: 4 },
      { columns: 2, heightClass: "h-[161px]", optionCount: 4 },
    ],
  },
  "womens-health-type-step": {
    minHeightClass: "min-h-[409px] sm:min-h-[451px]",
    cardGeometry: [
      { columns: 1, heightClass: "h-[292px]", optionCount: 3 },
    ],
  },
}

const defaultLoadingGeometry: StepLoadingGeometry = {
  minHeightClass: "min-h-96",
  cardGeometry: [
    { columns: 3, heightClass: "h-24", optionCount: 3 },
  ],
}

const loadingGridColumns: Record<LoadingCardGeometry["columns"], string> = {
  1: "grid-cols-1",
  2: "grid-cols-2",
  3: "grid-cols-3",
  4: "grid-cols-4",
  5: "grid-cols-5",
}

/**
 * StepLoading — perceived-speed first.
 *
 * Render the real step intro and its measured card geometry immediately.
 * Neutral controls avoid implying selectable defaults, while reserving the
 * destination's space prevents the hydration fallback from collapsing and
 * rebuilding the form.
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

export function StepLoading({
  componentPath,
  showIntro = true,
}: {
  componentPath: string
  showIntro?: boolean
}) {
  const controlLabels = loadingControlLabels[componentPath]
  const geometry = stepLoadingGeometry[componentPath] ?? defaultLoadingGeometry

  return (
    <div
      className={`space-y-4 ${geometry.minHeightClass}`}
      aria-live="polite"
      aria-busy="true"
      data-intake-loading-geometry={componentPath}
    >
      <span className="sr-only">Loading this step</span>
      {showIntro && <StepIntroShell componentPath={componentPath} />}
      <div className="space-y-3" aria-hidden="true">
        {geometry.cardGeometry.map((card, index) => {
          const label = controlLabels?.[index] ?? "Preparing your form"

          return (
            <div
              key={`${label}-${index}`}
              data-intake-loading-card={index}
              className={`rounded-2xl border border-border/40 bg-white p-4 shadow-sm shadow-primary/[0.03] dark:bg-card dark:shadow-none ${card.heightClass}`}
            >
              <p className="text-xs font-medium text-muted-foreground">{label}</p>
              <div className={`mt-3 grid gap-2 ${loadingGridColumns[card.columns]}`}>
                {Array.from({ length: card.optionCount }, (_, optionIndex) => (
                  <div
                    key={optionIndex}
                    className="h-11 rounded-xl border border-border/30 bg-muted/15"
                  />
                ))}
              </div>
            </div>
          )
        })}
      </div>
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
