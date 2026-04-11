"use client"

/**
 * Certificate Step - type + duration + start date
 *
 * Date model: two-question layout.
 * 1. How many days? (1/2/3 chips with prices)
 * 2. Starting from? (4 chips: day before yesterday, yesterday, today, tomorrow)
 * Certificates capped at 3 days max.
 */

import { useState, useEffect, useCallback, useRef } from "react"
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
type Duration = 1 | 2 | 3

const DURATION_OPTIONS: Duration[] = [1, 2, 3]

// ─── Date helpers ─────────────────────────────────────────────────────────

const WIN_MIN = -2
const WIN_MAX = 1

const START_OFFSETS = [-2, -1, 0, 1] as const

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
  const [selectedDays, setSelectedDays] = useState<Duration | null>(null)
  const [startOffset, setStartOffset] = useState<number | null>(null)

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [touched, setTouched] = useState<Record<string, boolean>>({})

  const durationRef = useRef<HTMLDivElement>(null)
  const startDateRef = useRef<HTMLDivElement>(null)

  // Restore from store on mount (user navigating back)
  useEffect(() => {
    if (answers.startDate && answers.duration) {
      const offset = isoToOffset(answers.startDate as string)
      const dur = Number(answers.duration) as Duration
      if (offset !== null && [1, 2, 3].includes(dur)) {
        setStartOffset(offset)
        setSelectedDays(dur)
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

  // Sync to store on every selection change
  useEffect(() => {
    if (startOffset !== null && selectedDays !== null) {
      setAnswer("startDate", offsetToISO(startOffset))
      setAnswer("duration", String(selectedDays))
    }
  }, [startOffset, selectedDays, setAnswer])

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
    [startOffset]
  )

  // ── Start date click ──────────────────────────────────────────────────

  const handleStartOffsetClick = useCallback((offset: number) => {
    setStartOffset(offset)
    setErrors((prev) => {
      const e = { ...prev }
      delete e.startDate
      return e
    })
  }, [])

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

      {/* How many days? */}
      <div ref={durationRef}>
        <FormField
          label="How many days?"
          required
          error={touched.duration ? errors.duration : undefined}
          helpContent={{
            title: "Which duration do I need?",
            content:
              "Select the number of days you were unable to work or study. Certificates are capped at 3 days - for longer periods, please see your GP.",
          }}
        >
          <div className="flex gap-2 mt-2">
            {DURATION_OPTIONS.map((days) => {
              const p = MED_CERT_DURATIONS.prices[days]
              const isSelected = selectedDays === days
              return (
                <button
                  key={days}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => handleDaysClick(days)}
                  className={cn(
                    "flex-1 flex flex-col items-center gap-0.5 py-3 rounded-xl text-sm font-medium border transition-all duration-150 touch-manipulation",
                    isSelected
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background text-foreground border-border/60 hover:border-primary/50 hover:bg-primary/5"
                  )}
                >
                  <span>
                    {days} {days === 1 ? "day" : "days"}
                  </span>
                  <span
                    className={cn(
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
      </div>

      {/* Starting from? */}
      <div ref={startDateRef}>
        <FormField
          label="Starting from?"
          required
          error={touched.startDate ? errors.startDate : undefined}
          helpContent={{
            title: "Can I include future dates?",
            content:
              "Yes - if you're already unwell but need to cover tomorrow too, select today as the start date. A doctor reviews your dates based on your symptoms.",
          }}
        >
          <div className="flex gap-1.5 mt-2">
            {START_OFFSETS.map((offset) => {
              const isSelected = startOffset === offset
              return (
                <button
                  key={offset}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => handleStartOffsetClick(offset)}
                  className={cn(
                    "flex-1 py-2.5 text-xs font-medium rounded-xl border transition-all duration-150 touch-manipulation",
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
      </div>

      {/* Live summary card */}
      {selectedDays !== null && startOffset !== null && endOffset !== null && price && (
        <div className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-primary/5 border border-primary/15">
          <div>
            <p className="text-xs font-medium text-foreground">
              {selectedDays === 1
                ? `${summaryLabel(startOffset)} · 1 day`
                : `${summaryLabel(startOffset)} → ${summaryLabel(endOffset)} · ${selectedDays} days`}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              No waiting rooms · reviewed within ~1 hour
            </p>
          </div>
          <span className="text-base font-semibold text-primary shrink-0 ml-3">${price}</span>
        </div>
      )}

      {/* GP note - longer absences */}
      <p className="text-xs text-muted-foreground">
        Need more than 3 days off? Please visit your GP for an extended certificate.
      </p>

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
