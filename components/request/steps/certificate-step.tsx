"use client"

/**
 * Certificate Step — type + date range selection
 *
 * Date model: 5-chip range selector (-2 to +2 days from today).
 * Any contiguous range of 1–3 chips. No forced anchor on today.
 * Duration is derived from the selected range — no separate duration control.
 */

import { useState, useEffect, useCallback, useMemo, useRef } from "react"
import { usePostHog } from "@/components/providers/posthog-provider"
import { Briefcase, GraduationCap, Heart, Shield, ArrowRight } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { useRequestStore } from "../store"
import { FormField } from "../form-field"
import { getSmartDefaults, recordStepCompletion, savePreferences } from "@/lib/request/preferences"
import { useKeyboardNavigation } from "@/hooks/use-keyboard-navigation"
import { MED_CERT_DURATIONS } from "@/lib/constants"
import { cn } from "@/lib/utils"
import type { UnifiedServiceType } from "@/lib/request/step-registry"

interface CertificateStepProps {
  serviceType: UnifiedServiceType
  onNext: () => void
  onBack: () => void
  onComplete: () => void
}

const CERT_TYPES = [
  { id: "work", label: "Work", icon: Briefcase },
  { id: "study", label: "Study", icon: GraduationCap },
  { id: "carer", label: "Carer's leave", icon: Heart },
] as const

type CertType = "work" | "study" | "carer"

// ─── Date range helpers ───────────────────────────────────────────────────

/** Chips span -2 (2 days ago) → +2 (day after tomorrow) */
const WIN_MIN = -2
const WIN_MAX = 2

function offsetToDate(offset: number): Date {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() + offset)
  return d
}

function offsetToISO(offset: number): string {
  return offsetToDate(offset).toISOString().split("T")[0]
}

function isoToOffset(iso: string): number | null {
  for (let o = WIN_MIN; o <= WIN_MAX; o++) {
    if (offsetToISO(o) === iso) return o
  }
  return null
}

function chipLabel(offset: number): string {
  if (offset === -1) return "Yesterday"
  if (offset === 0) return "Today"
  if (offset === 1) return "Tomorrow"
  const d = offsetToDate(offset)
  return d.toLocaleDateString("en-AU", { weekday: "short", day: "numeric" })
}

function summaryLabel(offset: number): string {
  if (offset === -1) return "Yesterday"
  if (offset === 0) return "Today"
  if (offset === 1) return "Tomorrow"
  const d = offsetToDate(offset)
  return d.toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short" })
}

// ─── Component ────────────────────────────────────────────────────────────

export default function CertificateStep({ onNext }: CertificateStepProps) {
  const { answers, setAnswer } = useRequestStore()
  const posthog = usePostHog()

  const certType = answers.certType as CertType | undefined

  // Offsets from today. null = nothing selected yet.
  const [rangeStart, setRangeStart] = useState<number | null>(null)
  const [rangeEnd, setRangeEnd] = useState<number | null>(null)

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [touched, setTouched] = useState<Record<string, boolean>>({})

  const dateRef = useRef<HTMLDivElement>(null)

  // Restore range from store on mount (user navigating back)
  useEffect(() => {
    if (answers.startDate && answers.duration) {
      const startOffset = isoToOffset(answers.startDate as string)
      if (startOffset !== null) {
        const dur = Number(answers.duration)
        setRangeStart(startOffset)
        setRangeEnd(Math.min(startOffset + dur - 1, WIN_MAX))
      }
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Load smart defaults for certType
  useEffect(() => {
    const defaults = getSmartDefaults("certificate")
    if (defaults.certType && !answers.certType) {
      setAnswer("certType", defaults.certType as string)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Derived
  const duration =
    rangeStart !== null && rangeEnd !== null ? rangeEnd - rangeStart + 1 : null
  const price = duration
    ? MED_CERT_DURATIONS.prices[duration as 1 | 2 | 3]
    : null

  // Sync to store on every range change
  useEffect(() => {
    if (rangeStart !== null && rangeEnd !== null) {
      setAnswer("startDate", offsetToISO(rangeStart))
      setAnswer("duration", String(rangeEnd - rangeStart + 1))
    }
  }, [rangeStart, rangeEnd, setAnswer])

  // ── Chip interaction ──────────────────────────────────────────────────

  const handleChipClick = useCallback(
    (offset: number) => {
      setErrors((prev) => {
        const e = { ...prev }
        delete e.dateRange
        return e
      })

      if (rangeStart === null || rangeEnd === null) {
        setRangeStart(offset)
        setRangeEnd(offset)
        return
      }

      if (offset < rangeStart) {
        if (rangeEnd - offset + 1 <= 3) {
          setRangeStart(offset) // extend left
        } else {
          setRangeStart(offset) // start fresh
          setRangeEnd(offset)
        }
      } else if (offset > rangeEnd) {
        if (offset - rangeStart + 1 <= 3) {
          setRangeEnd(offset) // extend right
        } else {
          setRangeStart(offset) // start fresh
          setRangeEnd(offset)
        }
      } else {
        // Within current range
        if (rangeStart === rangeEnd) return // single chip — no-op
        if (offset === rangeStart) {
          setRangeStart(rangeStart + 1) // contract left
        } else if (offset === rangeEnd) {
          setRangeEnd(rangeEnd - 1) // contract right
        } else {
          setRangeStart(offset) // reset to single
          setRangeEnd(offset)
        }
      }
    },
    [rangeStart, rangeEnd]
  )

  // ── Extend-your-cover nudge ───────────────────────────────────────────

  const nudge = useMemo(() => {
    if (rangeStart === null || rangeEnd === null || duration !== 1) return null

    // Future-only selection → offer to add the day before (toward today)
    if (rangeStart > 0 && rangeStart > WIN_MIN) {
      return {
        text: `Add ${summaryLabel(rangeStart - 1).toLowerCase()} for $10 more`,
        onApply: () => setRangeStart((s) => (s !== null ? s - 1 : s)),
      }
    }

    // Today or past → offer to add tomorrow
    if (rangeEnd < WIN_MAX) {
      const nextLabel = summaryLabel(rangeEnd + 1).toLowerCase()
      return {
        text:
          rangeStart === 0
            ? `Add tomorrow for $10 more — covers your recovery period`
            : `Add ${nextLabel} for $10 more`,
        onApply: () => setRangeEnd((e) => (e !== null ? e + 1 : e)),
      }
    }

    // At right edge, try extending left
    if (rangeStart > WIN_MIN) {
      return {
        text: `Add ${summaryLabel(rangeStart - 1).toLowerCase()} for $10 more`,
        onApply: () => setRangeStart((s) => (s !== null ? s - 1 : s)),
      }
    }

    return null
  }, [rangeStart, rangeEnd, duration])

  // ── Cert type click (with auto-advance) ──────────────────────────────

  const handleCertTypeClick = useCallback(
    (typeId: string) => {
      setAnswer("certType", typeId)
      setErrors((prev) => {
        const e = { ...prev }
        delete e.certType
        return e
      })
      setTimeout(() => {
        dateRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" })
      }, 300)
    },
    [setAnswer]
  )

  // ── Validation + submit ───────────────────────────────────────────────

  const validate = useCallback(() => {
    const newErrors: Record<string, string> = {}
    if (!certType) newErrors.certType = "Please select certificate type"
    if (rangeStart === null || rangeEnd === null)
      newErrors.dateRange = "Please select your absence dates"
    setErrors(newErrors)
    setTouched({ certType: true, dateRange: true })
    return Object.keys(newErrors).length === 0
  }, [certType, rangeStart, rangeEnd])

  const handleNext = useCallback(() => {
    if (validate()) {
      savePreferences({ preferredCertType: certType })
      recordStepCompletion("certificate", {
        certType,
        duration: String(duration),
      })
      posthog?.capture('step_completed', { step: 'certificate', cert_type: certType, duration })
      onNext()
    }
  }, [validate, certType, duration, posthog, onNext])

  const canContinue =
    !!certType &&
    rangeStart !== null &&
    rangeEnd !== null &&
    Object.keys(errors).length === 0

  useKeyboardNavigation({
    onNext: canContinue ? handleNext : undefined,
    enabled: Boolean(canContinue),
  })

  const chips = useMemo(
    () => Array.from({ length: WIN_MAX - WIN_MIN + 1 }, (_, i) => WIN_MIN + i),
    []
  )

  // ── Render ────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">
      {/* Trust indicator */}
      <Alert variant="default" className="border-primary/20 bg-primary/5">
        <Shield className="w-4 h-4" />
        <AlertDescription className="text-xs">
          All certificates are reviewed by AHPRA-registered Australian doctors
        </AlertDescription>
      </Alert>

      {/* Certificate type */}
      <FormField
        label="Certificate type"
        required
        error={touched.certType ? errors.certType : undefined}
        hint="Choose the type that matches your situation"
        helpContent={{
          title: "Which type should I choose?",
          content:
            "Work: for your employer. Study: for university or school. Carer's leave: when caring for a family member.",
        }}
      >
        <div
          className="relative flex rounded-xl bg-muted dark:bg-white/5 p-1 gap-1 mt-2"
          role="radiogroup"
          aria-label="Certificate type"
        >
          {CERT_TYPES.map((type) => {
            const isSelected = certType === type.id
            const Icon = type.icon
            return (
              <button
                key={type.id}
                type="button"
                role="radio"
                aria-checked={isSelected}
                onClick={() => handleCertTypeClick(type.id)}
                className={cn(
                  "relative flex-1 flex flex-col items-center gap-1 py-3 rounded-lg text-sm font-medium transition-all duration-200 touch-manipulation",
                  isSelected
                    ? "bg-white dark:bg-white/10 text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon
                  className={cn(
                    "w-4 h-4 transition-colors duration-200",
                    isSelected ? "text-primary" : "text-muted-foreground/60"
                  )}
                />
                <span>{type.label}</span>
              </button>
            )
          })}
        </div>
      </FormField>

      {/* Date range picker */}
      <div ref={dateRef}>
        <FormField
          label="Which days do you need covered?"
          required
          error={touched.dateRange ? errors.dateRange : undefined}
          hint={
            rangeStart === null
              ? "Tap a day to select it. Tap adjacent days to extend the range — up to 3 days."
              : undefined
          }
          helpContent={{
            title: "Can I include future dates?",
            content:
              "Yes — if you're unwell now but worked today, you can select just tomorrow or the day after. A doctor reviews your dates and approves based on your symptoms.",
          }}
        >
          <div className="mt-2 space-y-3">
            {/* 5-chip range row */}
            <div className="flex gap-1.5" role="group" aria-label="Certificate dates">
              {chips.map((offset) => {
                const inRange =
                  rangeStart !== null &&
                  rangeEnd !== null &&
                  offset >= rangeStart &&
                  offset <= rangeEnd
                const isStart = offset === rangeStart
                const isEnd = offset === rangeEnd
                const isSingle = isStart && isEnd && inRange

                return (
                  <button
                    key={offset}
                    type="button"
                    aria-pressed={inRange}
                    onClick={() => handleChipClick(offset)}
                    className={cn(
                      "flex-1 py-2.5 text-xs font-medium transition-all duration-150 touch-manipulation min-w-0",
                      inRange
                        ? "bg-primary text-primary-foreground"
                        : "bg-background text-foreground border border-border/60 hover:border-primary/50 hover:bg-primary/5 rounded-xl",
                      inRange &&
                        (isSingle
                          ? "rounded-xl"
                          : isStart
                          ? "rounded-l-xl rounded-r-sm"
                          : isEnd
                          ? "rounded-r-xl rounded-l-sm"
                          : "rounded-sm")
                    )}
                  >
                    {chipLabel(offset)}
                  </button>
                )
              })}
            </div>

            {/* Live summary card */}
            {rangeStart !== null && rangeEnd !== null && duration && price && (
              <div className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-primary/5 border border-primary/15">
                <div>
                  <p className="text-xs font-medium text-foreground">
                    {rangeStart === rangeEnd
                      ? `${summaryLabel(rangeStart)} · 1 day`
                      : `${summaryLabel(rangeStart)} → ${summaryLabel(rangeEnd)} · ${duration} days`}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    No waiting rooms · reviewed within ~1 hour
                  </p>
                </div>
                <span className="text-base font-semibold text-primary shrink-0 ml-3">
                  ${price}
                </span>
              </div>
            )}

            {/* Extend-your-cover nudge */}
            {nudge && (
              <div className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-800/40">
                <p className="text-xs text-amber-800 dark:text-amber-300 leading-snug">
                  {nudge.text}
                </p>
                <button
                  type="button"
                  onClick={nudge.onApply}
                  className="shrink-0 text-xs font-semibold text-amber-700 dark:text-amber-300 underline underline-offset-2 hover:text-amber-900 dark:hover:text-amber-100 transition-colors whitespace-nowrap"
                >
                  Add →
                </button>
              </div>
            )}

            <p className="text-xs text-muted-foreground">
              Need more than 3 days?{" "}
              <a
                href="/request"
                className="text-primary underline underline-offset-2 hover:text-primary/80"
              >
                Book a consultation
              </a>
              .
            </p>
          </div>
        </FormField>
      </div>

      {/* Continue */}
      <Button onClick={handleNext} className="w-full h-12" disabled={!canContinue}>
        {canContinue ? (
          <>
            Review my certificate
            <ArrowRight className="w-4 h-4" />
          </>
        ) : (
          "Continue"
        )}
      </Button>
    </div>
  )
}
