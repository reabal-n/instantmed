"use client"

import { CheckCircle2, Clock } from "lucide-react"
import { useEffect, useRef, useState } from "react"

import { Heading } from "@/components/ui/heading"
import { useReducedMotion } from "@/components/ui/motion"
import { Reveal } from "@/components/ui/reveal"
import { SectionPill } from "@/components/ui/section-pill"

interface TimeMetric {
  /** Headline label, e.g. "InstantMed" or "GP clinic". */
  label: string
  /** The numeric time value, e.g. 20, 45, 3. Pass without unit. */
  value: number | string
  /** Time unit suffix, e.g. "min", "hrs". */
  unit: string
  /** Optional "+" or other suffix on the value, e.g. "+" for "2+ hrs". */
  valueSuffix?: string
}

export interface TimeComparisonVizProps {
  /** Section pill label. Defaults to "Time saved". */
  pill?: string
  /** Section heading. */
  heading: string
  /** "InstantMed" / our side metric. */
  ours: TimeMetric
  /** "GP clinic" / their side metric. */
  theirs: TimeMetric
  /** Steps under each side. Both arrays should be same length for visual rhythm. */
  ourSteps: readonly string[]
  theirSteps: readonly string[]
  /**
   * Width fraction (0–100) the primary bar fills. Lower = more dramatic time gap.
   * For med-cert (20min vs 2hr+) we use 18; for prescriptions (45min vs 3hr+) we use 25.
   */
  primaryFillPercent?: number
}

/**
 * Race-track time-saved viz. Shared primitive used by /medical-certificate
 * and /prescriptions service pages. Animates the InstantMed bar fast and
 * the GP-clinic bar slow with a small offset, so the asymmetric timing
 * itself communicates "we're faster".
 *
 * Motion adheres to docs/DESIGN_SYSTEM.md §12: no spring physics, tween
 * durations only, respects useReducedMotion.
 */
export function TimeComparisonViz({
  pill = "Time saved",
  heading,
  ours,
  theirs,
  ourSteps,
  theirSteps,
  primaryFillPercent = 20,
}: TimeComparisonVizProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [inView, setInView] = useState(false)
  const prefersReducedMotion = useReducedMotion()

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true)
          observer.disconnect()
        }
      },
      { threshold: 0.3 },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const active = inView || prefersReducedMotion
  const primaryWidth = active ? `${primaryFillPercent}%` : "0%"
  const secondaryWidth = active ? "100%" : "0%"

  return (
    <section aria-label="Time comparison" className="py-10 sm:py-14">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <Reveal instant className="text-center mb-10">
          <SectionPill>{pill}</SectionPill>
          <Heading level="h2" className="mt-3">
            {heading}
          </Heading>
        </Reveal>

        <div ref={ref} className="space-y-5">
          {/* Labels + times */}
          <div className="flex items-end justify-between">
            <div>
              <p className="text-[11px] font-semibold text-primary uppercase tracking-wider mb-1.5">
                {ours.label}
              </p>
              <p className="text-4xl sm:text-5xl font-semibold tabular-nums text-foreground leading-none">
                {ours.value}
                {ours.valueSuffix}
                <span className="text-xl font-normal text-muted-foreground ml-1">{ours.unit}</span>
              </p>
            </div>
            <div className="text-right">
              <p className="text-[11px] font-semibold text-muted-foreground/50 uppercase tracking-wider mb-1.5">
                {theirs.label}
              </p>
              <p className="text-4xl sm:text-5xl font-semibold tabular-nums text-muted-foreground/60 leading-none">
                {theirs.value}
                {theirs.valueSuffix}
                <span className="text-xl font-normal ml-1">{theirs.unit}</span>
              </p>
            </div>
          </div>

          {/* Race track — secondary (GP) bar fills slowly behind primary */}
          <div className="relative h-2 rounded-full bg-muted/30 overflow-hidden">
            <div
              className={
                prefersReducedMotion
                  ? "absolute inset-y-0 left-0 bg-border/50 rounded-full"
                  : "absolute inset-y-0 left-0 bg-border/50 rounded-full transition-[width] duration-[1000ms] ease-out"
              }
              style={{
                width: secondaryWidth,
                transitionDelay: active && !prefersReducedMotion ? "300ms" : "0ms",
              }}
            />
            <div
              className={
                prefersReducedMotion
                  ? "absolute inset-y-0 left-0 bg-primary rounded-full"
                  : "absolute inset-y-0 left-0 bg-primary rounded-full transition-[width] duration-700 ease-out"
              }
              style={{
                width: primaryWidth,
                transitionDelay: active && !prefersReducedMotion ? "80ms" : "0ms",
              }}
            />
          </div>

          {/* Step breakdown */}
          <div className="grid grid-cols-2 gap-6 pt-1">
            <div className="space-y-2">
              {ourSteps.map((step) => (
                <p key={step} className="flex items-center gap-2 text-xs text-foreground">
                  <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" aria-hidden="true" />
                  {step}
                </p>
              ))}
            </div>
            <div className="space-y-2">
              {theirSteps.map((step) => (
                <p
                  key={step}
                  className="flex items-center gap-2 text-xs text-muted-foreground"
                >
                  <Clock className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
                  {step}
                </p>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
