"use client"

/**
 * Certificate Step - type + duration + start date
 *
 * Date model: two-question layout.
 * 1. How many days? (1/2/3 chips with prices)
 * 2. Starting from? (3 chips: day before yesterday, yesterday, today)
 * Certificates capped at 3 days max.
 */

import { ArrowRight, Briefcase, GraduationCap, Heart } from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"

import { RequestButton } from "@/components/request/request-button"
import { requestCx } from "@/components/request/request-cx"
import { IntakeStepIntro, QuestionCard } from "@/components/request/shared/intake-step-primitives"
import { usePostHog } from "@/lib/analytics/posthog-context"
import { MED_CERT_DURATIONS } from "@/lib/constants"
import { useKeyboardNavigation } from "@/lib/hooks/use-keyboard-navigation"
import { getSmartDefaults, recordStepCompletion, savePreferences } from "@/lib/request/preferences"
import type { UnifiedServiceType } from "@/lib/request/step-registry"

import { FormField } from "../form-field"
import { useRequestStore } from "../store"

interface CertificateStepProps {
  serviceType: UnifiedServiceType
  onNext: () => void
  onBack: () => void
  onComplete: () => void
  initialDuration?: string
}

const CERT_TYPES = [
  { id: "work", label: "Work", icon: Briefcase },
  { id: "study", label: "Study", icon: GraduationCap },
  { id: "carer", label: "Carer's leave", icon: Heart },
] as const

type CertType = "work" | "study" | "carer"
type Duration = 1 | 2 | 3

const DURATION_OPTIONS: Duration[] = [1, 2, 3]

function parseDuration(value: unknown): Duration | null {
  const numericValue = typeof value === "number" ? value : Number(value)
  if (DURATION_OPTIONS.includes(numericValue as Duration)) {
    return numericValue as Duration
  }
  return null
}

// ─── Date helpers ─────────────────────────────────────────────────────────

const WIN_MIN = -2
const WIN_MAX = 0

const START_OFFSETS = [-2, -1, 0] as const

function offsetToDate(offset: number): Date {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() + offset)
  return d
}

function offsetToISO(offset: number): string {
  const d = offsetToDate(offset)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
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
  const d = offsetToDate(offset)
  return d.toLocaleDateString("en-AU", { weekday: "short", day: "numeric" })
}

function summaryLabel(offset: number): string {
  if (offset === -1) return "Yesterday"
  if (offset === 0) return "Today"
  const d = offsetToDate(offset)
  return d.toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short" })
}

// ─── Component ────────────────────────────────────────────────────────────

export default function CertificateStep({ onNext, initialDuration }: CertificateStepProps) {
  const { answers, setAnswer } = useRequestStore()
  const posthog = usePostHog()
  const initialUrlDurationRef = useRef<Duration | null>(parseDuration(initialDuration))
  const urlDurationAppliedRef = useRef(false)
  const storedDurationAppliedRef = useRef(false)

  const certType = answers.certType as CertType | undefined
  // Default to 2 days - most common selection, pre-checked per UX intent.
  // URL/store duration is applied after hydration to avoid SSR/client drift.
  const [selectedDays, setSelectedDays] = useState<Duration | null>(2)
  const [canSyncSelection, setCanSyncSelection] = useState(false)
  // Default start offset to 0 (today). Most patients start the same day.
  // Restore effect overrides for users navigating back to this step.
  const [startOffset, setStartOffset] = useState<number | null>(0)

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [touched, setTouched] = useState<Record<string, boolean>>({})

  const durationRef = useRef<HTMLDivElement>(null)
  const startDateRef = useRef<HTMLDivElement>(null)

  // Apply a landing-page duration prefill after hydration. The user can still
  // change this inside the form after the initial price-specific handoff.
  useEffect(() => {
    const urlDuration = initialUrlDurationRef.current
    if (urlDuration && !urlDurationAppliedRef.current) {
      urlDurationAppliedRef.current = true
      setSelectedDays(urlDuration)
      setAnswer("duration", String(urlDuration))
    }
    setCanSyncSelection(true)
  }, [setAnswer])

  // Restore persisted duration after store hydration when there is no explicit
  // URL duration. Price-specific CTA params should win the initial handoff.
  useEffect(() => {
    if (!canSyncSelection || initialUrlDurationRef.current || storedDurationAppliedRef.current) {
      return
    }

    const storedDuration = parseDuration(answers.duration)
    if (!storedDuration) {
      return
    }

    storedDurationAppliedRef.current = true
    if (storedDuration && storedDuration !== selectedDays) {
      setSelectedDays(storedDuration)
    }
  }, [answers.duration, canSyncSelection, selectedDays])

  useEffect(() => {
    if (answers.startDate) {
      const offset = isoToOffset(answers.startDate as string)
      if (offset !== null) {
        setStartOffset(offset)
      }
    }
  }, [answers.startDate])

  // Load smart defaults for certType
  useEffect(() => {
    const defaults = getSmartDefaults("certificate")
    if (defaults.certType && !answers.certType) {
      setAnswer("certType", defaults.certType as string)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Sync to store on every selection change
  useEffect(() => {
    if (!canSyncSelection) return
    if (startOffset !== null && selectedDays !== null) {
      const nextStartDate = offsetToISO(startOffset)
      const nextDuration = String(selectedDays)
      if (answers.startDate !== nextStartDate) {
        setAnswer("startDate", nextStartDate)
      }
      if (answers.duration !== nextDuration) {
        setAnswer("duration", nextDuration)
      }
    }
  }, [answers.duration, answers.startDate, canSyncSelection, startOffset, selectedDays, setAnswer])

  // Derived
  const price = selectedDays ? MED_CERT_DURATIONS.prices[selectedDays] : null
  const endOffset =
    startOffset !== null && selectedDays !== null ? startOffset + selectedDays - 1 : null

  // ── Cert type click ───────────────────────────────────────────────────

  const handleCertTypeClick = useCallback(
    (typeId: string) => {
      setAnswer("certType", typeId)
      setErrors((prev) => {
        const e = { ...prev }
        delete e.certType
        return e
      })
      setTimeout(() => {
        durationRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" })
      }, 300)
    },
    [setAnswer]
  )

  // ── Duration click ────────────────────────────────────────────────────

  const handleDaysClick = useCallback(
    (days: Duration) => {
      setSelectedDays(days)
      setAnswer("duration", String(days))
      setErrors((prev) => {
        const e = { ...prev }
        delete e.duration
        return e
      })
      if (startOffset === null) {
        setTimeout(() => {
          startDateRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" })
        }, 300)
      }
    },
    [setAnswer, startOffset]
  )

  // ── Start date click ──────────────────────────────────────────────────

  const handleStartOffsetClick = useCallback((offset: number) => {
    setStartOffset(offset)
    setAnswer("startDate", offsetToISO(offset))
    setErrors((prev) => {
      const e = { ...prev }
      delete e.startDate
      return e
    })
  }, [setAnswer])

  // ── Validation + submit ───────────────────────────────────────────────

  const validate = useCallback(() => {
    const newErrors: Record<string, string> = {}
    if (!certType) newErrors.certType = "Please select certificate type"
    if (!selectedDays) newErrors.duration = "Please select how many days"
    if (startOffset === null) newErrors.startDate = "Please select a start date"
    setErrors(newErrors)
    setTouched({ certType: true, duration: true, startDate: true })
    return Object.keys(newErrors).length === 0
  }, [certType, selectedDays, startOffset])

  const handleNext = useCallback(() => {
    if (validate()) {
      savePreferences({ preferredCertType: certType })
      recordStepCompletion("certificate", { certType, duration: String(selectedDays) })
      posthog?.capture("step_completed", {
        step: "certificate",
        cert_type: certType,
        duration: selectedDays,
      })
      onNext()
    }
  }, [validate, certType, selectedDays, posthog, onNext])

  const canContinue =
    !!certType &&
    selectedDays !== null &&
    startOffset !== null &&
    Object.keys(errors).length === 0

  useKeyboardNavigation({
    onNext: canContinue ? handleNext : undefined,
    enabled: Boolean(canContinue),
  })

  // ── Render ────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      <IntakeStepIntro
        title="What do you need covered?"
        description="Pick the certificate type, dates, and duration."
      />

      {/* Certificate type */}
      <QuestionCard compact>
        <FormField
          id="certificate-type"
          label="Certificate type"
          required
          error={touched.certType ? errors.certType : undefined}
          hint="Choose the type that matches your situation"
        >
          <div
            className="relative mt-2 grid grid-cols-3 gap-2"
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
                  className={requestCx(
                    "relative flex min-h-16 flex-col items-center justify-center gap-1 rounded-xl border px-2 py-3 text-sm font-medium transition-[background-color,border-color,color] duration-150 touch-manipulation",
                    "outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
                    isSelected
                      ? "border-primary bg-primary/5 text-foreground ring-1 ring-primary/30"
                      : "border-border/60 bg-background text-muted-foreground hover:border-primary/50 hover:text-foreground"
                  )}
                >
                  <Icon
                    className={requestCx(
                      "w-4 h-4 transition-colors duration-150",
                      isSelected ? "text-primary" : "text-muted-foreground/60"
                    )}
                  />
                  <span>{type.label}</span>
                </button>
              )
            })}
          </div>
        </FormField>
      </QuestionCard>

      {/* How many days? */}
      <div ref={durationRef}>
        <QuestionCard compact>
          <FormField
            id="certificate-duration"
            label="How many days?"
            required
            error={touched.duration ? errors.duration : undefined}
          >
            <div
              className="mt-2 grid grid-cols-3 gap-2"
              role="radiogroup"
              aria-label="Certificate duration in days"
            >
              {DURATION_OPTIONS.map((days) => {
                const p = MED_CERT_DURATIONS.prices[days]
                const isSelected = selectedDays === days
                return (
                  <button
                    key={days}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    onClick={() => handleDaysClick(days)}
                    className={requestCx(
                      "flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-xl border px-2 py-2 text-sm font-medium transition-[background-color,border-color,color] duration-150 touch-manipulation",
                      isSelected
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background text-foreground border-border/60 hover:border-primary/50 hover:bg-primary/5"
                    )}
                  >
                    <span>
                      {days} {days === 1 ? "day" : "days"}
                    </span>
                    <span
                      className={requestCx(
                        "text-xs",
                        isSelected ? "text-primary-foreground/80" : "text-muted-foreground"
                      )}
                    >
                      ${p}
                    </span>
                  </button>
                )
              })}
            </div>
          </FormField>
        </QuestionCard>
      </div>

      {/* Starting from? */}
      <div ref={startDateRef}>
        <QuestionCard compact>
          <FormField
            id="certificate-start-date"
            label="Starting from?"
            required
            error={touched.startDate ? errors.startDate : undefined}
          >
            <div
              className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4"
              role="radiogroup"
              aria-label="Certificate start date"
            >
              {START_OFFSETS.map((offset) => {
                const isSelected = startOffset === offset
                return (
                  <button
                    key={offset}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    onClick={() => handleStartOffsetClick(offset)}
                    className={requestCx(
                      "min-h-12 rounded-xl border px-2 py-2.5 text-sm font-medium transition-[background-color,border-color,color] duration-150 touch-manipulation",
                      isSelected
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background text-foreground border-border/60 hover:border-primary/50 hover:bg-primary/5"
                    )}
                  >
                    {chipLabel(offset)}
                  </button>
                )
              })}
            </div>
          </FormField>
        </QuestionCard>
      </div>

      {/* Live summary card */}
      {selectedDays !== null && startOffset !== null && endOffset !== null && price && (
        <div className="hidden items-center justify-between px-3 py-2.5 rounded-2xl border border-border/50 bg-white dark:bg-card shadow-md shadow-primary/[0.06] sm:flex">
          <div>
            <p className="text-xs font-medium text-foreground">
              {selectedDays === 1
                ? `${summaryLabel(startOffset)} · 1 day`
                : `${summaryLabel(startOffset)} → ${summaryLabel(endOffset)} · ${selectedDays} days`}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              No waiting rooms · doctor review when available
            </p>
          </div>
          <span className="text-base font-semibold text-primary shrink-0 ml-3">${price}</span>
        </div>
      )}

      {/* GP note - longer absences */}
      <p className="hidden px-1 text-xs text-muted-foreground sm:block">
        Need more than 3 days off? Please visit your GP for an extended certificate.
      </p>

      {/* Continue */}
      <RequestButton data-intake-primary-action="true" data-intake-primary-label="Continue" onClick={handleNext} className="w-full h-12 max-sm:hidden" disabled={!canContinue}>
        {canContinue ? (
          <>
            Continue
            <ArrowRight className="w-4 h-4" />
          </>
        ) : (
          "Continue"
        )}
      </RequestButton>
      {canContinue && (
        <p className="text-[11px] text-muted-foreground text-center hidden sm:block">
          Press Enter to continue
        </p>
      )}
    </div>
  )
}
