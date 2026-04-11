"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import { useReducedMotion } from "@/components/ui/motion"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { usePostHog } from "@/components/providers/posthog-provider"
import {
  getDecadeLabel,
  getPrevalenceForAge,
} from "@/lib/marketing/ed-prevalence-data"

interface EdPrevalenceCalculatorProps {
  className?: string
}

const DEFAULT_AGE = 40
const MIN_AGE = 18
const MAX_AGE = 80
const DEBOUNCE_MS = 400

export function EdPrevalenceCalculator({
  className,
}: EdPrevalenceCalculatorProps) {
  const posthog = usePostHog()
  const prefersReducedMotion = useReducedMotion()

  const [age, setAge] = useState<number>(DEFAULT_AGE)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const { decade, rate } = getPrevalenceForAge(age)
  const decadeLabel = getDecadeLabel(decade)

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [])

  const handleAgeChange = (nextAge: number) => {
    setAge(nextAge)

    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }
    debounceRef.current = setTimeout(() => {
      posthog?.capture("ed_prevalence_age_changed", { age: nextAge })
    }, DEBOUNCE_MS)
  }

  const handleCtaClick = () => {
    posthog?.capture("ed_prevalence_cta_clicked", { age, rate })
  }

  const barTransition = prefersReducedMotion
    ? { duration: 0 }
    : { type: "spring" as const, stiffness: 140, damping: 20 }

  return (
    <section
      aria-label="How common is ED"
      className={cn("py-12 lg:py-16", className)}
    >
      <div className="mx-auto w-full max-w-[820px] px-4 sm:px-6 lg:px-8">
        <div className="mb-6 text-center">
          <h2 className="text-2xl font-semibold text-foreground sm:text-3xl">
            How common is this?
          </h2>
        </div>

        {/* Main calculator card */}
        <div
          className={cn(
            "rounded-2xl border border-border/50 bg-white shadow-md shadow-primary/[0.06] dark:bg-card",
            "p-5 sm:p-7 lg:p-8",
          )}
        >
          <div className="mb-5 flex items-center justify-between gap-3">
            <label
              htmlFor="ed-prevalence-age"
              className="text-sm font-medium text-foreground"
            >
              Your age
            </label>
            <span className="text-sm text-muted-foreground">
              Age:{" "}
              <strong className="text-foreground">{age}</strong>
            </span>
          </div>

          <input
            id="ed-prevalence-age"
            type="range"
            min={MIN_AGE}
            max={MAX_AGE}
            step={1}
            value={age}
            onChange={(e) => handleAgeChange(Number(e.target.value))}
            aria-label="Your age"
            className="h-2 w-full cursor-pointer appearance-none rounded-full bg-muted accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          />

          <div className="mt-2 flex justify-between text-xs text-muted-foreground">
            <span>{MIN_AGE}</span>
            <span>{MAX_AGE}</span>
          </div>

          <div className="mx-auto mt-8 max-w-[720px] text-center">
            <h3 className="text-xl font-medium leading-snug text-foreground sm:text-2xl">
              ~{rate}% of {decadeLabel} experience ED at least sometimes
            </h3>
          </div>

          <div className="mt-6">
            <div
              className="h-3 w-full overflow-hidden rounded-full bg-muted"
              role="img"
              aria-label={`${rate} percent prevalence bar`}
            >
              <motion.div
                className="h-3 rounded-full bg-primary"
                initial={false}
                animate={{ width: `${rate}%` }}
                transition={barTransition}
              />
            </div>
            <div className="mt-2 flex justify-between text-xs text-muted-foreground">
              <span>0%</span>
              <span>100%</span>
            </div>
          </div>

          <p className="mx-auto mt-6 max-w-[560px] text-center text-sm leading-relaxed text-muted-foreground">
            You&apos;re not alone - it&apos;s more common than most men
            think, and it&apos;s treatable.
          </p>
        </div>

        {/* Cardiovascular context callout */}
        <div
          className={cn(
            "mt-5 rounded-2xl border border-border/50 bg-white shadow-md shadow-primary/[0.06] dark:bg-card",
            "p-4 sm:p-5",
          )}
        >
          <p className="text-sm leading-relaxed text-foreground">
            <strong className="font-semibold">
              ED can be an early signal of heart or circulation issues.
            </strong>{" "}
            <span className="text-muted-foreground">
              If this is new and you&apos;re over 40, worth mentioning to
              the doctor during your assessment.
            </span>
          </p>
        </div>

        {/* CTA + footnote */}
        <div className="mt-7 flex flex-col items-center gap-4">
          <Button asChild size="lg" onClick={handleCtaClick}>
            <Link href="/request?service=consult&subtype=ed">
              Start a discreet assessment
            </Link>
          </Button>
          <p className="max-w-[640px] text-center text-xs text-muted-foreground">
            Rates from the Men in Australia Telephone Survey (MATeS,
            Holden et al., 2005) and published international community
            surveys. Illustrative only.
          </p>
        </div>
      </div>
    </section>
  )
}
