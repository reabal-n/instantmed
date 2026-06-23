"use client"

/**
 * Certificate Step - type + duration + start date
 *
 * Date model: two-question layout.
 * 1. How many days? (1/2/3 chips with prices)
 * 2. Starting from? (4 chips: yesterday, today, tomorrow, day after).
 *    Med certs commonly cover a sick day the patient knows is coming up
 *    (e.g. day-after-tomorrow procedure), not just backdates. Window is
 *    -1..+14 days; chips show the 4 most common picks.
 * Certificates capped at 3 days max.
 */

import { ArrowRight, Briefcase, ChevronDown, GraduationCap, Heart } from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"

import { RequestButton } from "@/components/request/request-button"
import { requestCx } from "@/components/request/request-cx"
import { EarlyRecoveryEmailCard } from "@/components/request/shared/early-recovery-email-card"
import { ChoiceCardGroup, IntakeStepIntro, QuestionCard, useRovingRadio } from "@/components/request/shared/intake-step-primitives"
import { StepBlockedSummary } from "@/components/request/shared/step-blocked-summary"
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
  hideIntro?: boolean
}

const CERT_TYPES = [
  { value: "work", label: "Work", icon: Briefcase },
  { value: "study", label: "Study", icon: GraduationCap },
  { value: "carer", label: "Carer's leave", icon: Heart },
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

// Window: 1 day backdate (yesterday) through 14 days forward. The validator
// in lib/medical-certificates/date-policy.ts enforces this same window
// server-side. Chips below show the 4 most common picks; the wider window
// supports URL-prefilled and future-extensible flows.
const WIN_MIN = -1
const WIN_MAX = 14

const START_OFFSETS = [-1, 0, 1, 2] as const

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
  if (offset === 1) return "Tomorrow"
  if (offset === 2) return "Day after"
  const d = offsetToDate(offset)
  return d.toLocaleDateString("en-AU", { weekday: "short", day: "numeric" })
}

// Pure, exported so the cert-step-revenue contract test can pin the chip
// range behaviour without needing to render the component. Returns the
// visual state for a given chip:
//   "start"      — the chip the user picked; primary selected style
//   "in_range"   — covered by the duration but not the start; soft style
//   "unselected" — outside the duration window
//
// Today's bug (2026-05-24): only "start" was computed; in-range chips
// rendered as unselected. Patients saw "2 days starting tomorrow" but
// only the Tomorrow chip lit up, reading as a 1-day cert. The fix made
// in-range chips visually distinct. This function is the single source
// of truth for that behaviour — change it and the contract test fires.
export type CertChipState = "start" | "in_range" | "unselected"
export function getCertChipRangeState(
  offset: number,
  startOffset: number | null,
  selectedDays: number | null,
): CertChipState {
  if (startOffset === null || selectedDays === null) return "unselected"
  if (offset === startOffset) return "start"
  if (offset > startOffset && offset <= startOffset + selectedDays - 1) {
    return "in_range"
  }
  return "unselected"
}

function summaryLabel(offset: number): string {
  if (offset === -1) return "Yesterday"
  if (offset === 0) return "Today"
  if (offset === 1) return "Tomorrow"
  if (offset === 2) return "Day after"
  const d = offsetToDate(offset)
  return d.toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short" })
}

// ─── Component ────────────────────────────────────────────────────────────

export default function CertificateStep({ serviceType, onNext, initialDuration, hideIntro = false }: CertificateStepProps) {
  const { answers, setAnswer } = useRequestStore()
  const posthog = usePostHog()
  const initialUrlDurationRef = useRef<Duration | null>(parseDuration(initialDuration))
  const urlDurationAppliedRef = useRef(false)
  const storedDurationAppliedRef = useRef(false)
  const userSelectedTypeRef = useRef(false)
  const prefillReportedRef = useRef(false)

  const certType = answers.certType as CertType | undefined
  // Default to 1 day. Tier 1 review 2026-05-26 (/medical-certificate #5)
  // retired the pre-form day-selector from the landing page, so the
  // wizard is now the sole place to set duration. 1 day is the lowest-
  // commitment default and the cheapest option, so any drift goes
  // toward intentionally choosing more rather than over-issuing.
  // URL/store duration is applied after hydration to avoid SSR/client drift.
  const [selectedDays, setSelectedDays] = useState<Duration | null>(1)
  const [canSyncSelection, setCanSyncSelection] = useState(false)
  // Default start offset to 0 (today). Most patients start the same day.
  // Restore effect overrides for users navigating back to this step.
  const [startOffset, setStartOffset] = useState<number | null>(0)

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const [blockedReasons, setBlockedReasons] = useState<string[]>([])
  // Length + start date collapse to a confirmable summary by default so the
  // first screen is a single decision (certificate type). Opens automatically
  // when a non-default duration/start is restored or prefilled (effect below),
  // or when the patient taps the summary to change it.
  const [expanded, setExpanded] = useState(false)
  const expandLatchedRef = useRef(false)

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

  // Measure the prefill: when the cert type arrives pre-selected (intent-page
  // URL handoff or saved prefs) the user didn't pick it cold. Latch only once
  // posthog is ready so we don't lose the event to the lazy-init race (the
  // same bug that left heard_about_us at 0 answers).
  useEffect(() => {
    if (prefillReportedRef.current || userSelectedTypeRef.current) return
    if (certType && posthog) {
      prefillReportedRef.current = true
      posthog.capture("certificate_prefilled", { cert_type: certType })
    }
  }, [certType, posthog])

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

  // Auto-open the length/date detail when a non-default selection is restored
  // (back-nav) or prefilled from a landing-page handoff, so the patient always
  // sees their actual choice instead of a collapsed default that hides it.
  useEffect(() => {
    if (expandLatchedRef.current || !canSyncSelection) return
    if ((selectedDays !== null && selectedDays !== 1) || (startOffset !== null && startOffset !== 0)) {
      expandLatchedRef.current = true
      setExpanded(true)
    }
  }, [canSyncSelection, selectedDays, startOffset])

  // Derived
  const price = selectedDays ? MED_CERT_DURATIONS.prices[selectedDays] : null
  const endOffset =
    startOffset !== null && selectedDays !== null ? startOffset + selectedDays - 1 : null

  // ── Cert type click ───────────────────────────────────────────────────

  const handleCertTypeClick = useCallback(
    (typeId: string) => {
      userSelectedTypeRef.current = true
      setAnswer("certType", typeId)
      // Previously dark: the wizard never emitted a type-selection event, so
      // step-1 selection was invisible in PostHog. location distinguishes it
      // from the landing-page selector's certificate_type_selected.
      posthog?.capture("certificate_type_selected", { category: typeId, location: "wizard" })
      setErrors((prev) => {
        const e = { ...prev }
        delete e.certType
        return e
      })
      // No auto-scroll: length + start collapse to a summary by default, so
      // picking a type leaves the patient on a single-decision screen with
      // Continue already actionable rather than jumping the viewport.
    },
    [setAnswer, posthog]
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
    setBlockedReasons(Object.values(newErrors))
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

  // Live-computed from the selections, NOT the `errors` object (which would stay
  // stale after the patient fixes a field, leaving the button looking not-ready).
  const canContinue = !!certType && selectedDays !== null && startOffset !== null

  // Clear the blocking summary the moment the step becomes valid.
  useEffect(() => {
    if (canContinue && blockedReasons.length > 0) setBlockedReasons([])
  }, [canContinue, blockedReasons.length])

  useKeyboardNavigation({
    onNext: canContinue ? handleNext : undefined,
    enabled: Boolean(canContinue),
  })

  // Roving tabindex + arrow-key navigation for the date range group. The
  // generic type/duration groups use ChoiceCardGroup, which owns the same radio
  // keyboard pattern for normal option cards.
  const startOffsetRoving = useRovingRadio(
    START_OFFSETS.length,
    START_OFFSETS.findIndex((offset) => offset === startOffset),
    (index) => handleStartOffsetClick(START_OFFSETS[index]),
  )

  // ── Render ────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {!hideIntro && (
        <IntakeStepIntro
          title="What do you need covered?"
          description="Pick the certificate type, dates, and duration."
        />
      )}

      <StepBlockedSummary reasons={blockedReasons} />

      {/* Certificate type */}
      <QuestionCard compact>
        <FormField
          id="certificate-type"
          label="Certificate type"
          required
          error={touched.certType ? errors.certType : undefined}
          hint="Choose the type that matches your situation"
        >
          <ChoiceCardGroup
            options={CERT_TYPES}
            value={certType}
            onChange={handleCertTypeClick}
            ariaLabel="Certificate type"
            columns="three"
            mobileColumns="three"
            compact
            className="mt-2"
          />
        </FormField>
      </QuestionCard>

      {/* Length & start date. Collapsed to a confirmable summary by default so
          the default mobile screen is a single decision (certificate type);
          expands to the full duration + start-date controls on tap. Every
          clinical default (1 day, today), the 3-day cap, the forward-date
          chips, and the in-range chip rendering are preserved unchanged. */}
      {!expanded ? (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          aria-expanded={false}
          aria-controls="certificate-dates-detail"
          className="w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-2xl border border-border/50 bg-white dark:bg-card shadow-md shadow-primary/[0.06] text-left transition-colors hover:border-primary/40"
        >
          <span className="min-w-0">
            <span className="block text-sm font-semibold text-foreground">
              {selectedDays === 1
                ? `${summaryLabel(startOffset ?? 0)} · 1 day`
                : `${summaryLabel(startOffset ?? 0)} to ${summaryLabel(endOffset ?? 0)} · ${selectedDays} days`}
            </span>
            <span className="block text-xs text-muted-foreground mt-0.5">
              Change length or start date
            </span>
          </span>
          <span className="flex items-center gap-1.5 shrink-0 text-primary">
            {price !== null && <span className="text-base font-semibold">${price}</span>}
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          </span>
        </button>
      ) : (
        <div id="certificate-dates-detail" className="space-y-4">
          {/* How many days? */}
          <div ref={durationRef}>
            <QuestionCard compact>
              <FormField
                id="certificate-duration"
                label="How many days?"
                required
                error={touched.duration ? errors.duration : undefined}
              >
                <ChoiceCardGroup
                  options={DURATION_OPTIONS.map((days) => ({
                    value: String(days),
                    label: `${days} ${days === 1 ? "day" : "days"}`,
                    description: `$${MED_CERT_DURATIONS.prices[days]}`,
                  }))}
                  value={selectedDays ? String(selectedDays) : ""}
                  onChange={(value) => handleDaysClick(Number(value) as Duration)}
                  ariaLabel="Certificate duration in days"
                  columns="three"
                  mobileColumns="three"
                  compact
                  className="mt-2"
                />
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
                  {START_OFFSETS.map((offset, index) => {
                    // Multi-day certs visually span the whole range. See
                    // getCertChipRangeState comment for the why. The state
                    // function is pinned by the cert-step-revenue contract
                    // test so a future refactor cannot silently drop the
                    // in-range rendering.
                    const chipState = getCertChipRangeState(offset, startOffset, selectedDays)
                    const isStart = chipState === "start"
                    const isInRange = chipState === "in_range"
                    const isSelected = isStart || isInRange
                    return (
                      <button
                        key={offset}
                        ref={startOffsetRoving.registerRef(index)}
                        type="button"
                        role="radio"
                        aria-checked={isStart}
                        tabIndex={startOffsetRoving.tabIndexFor(index)}
                        aria-label={
                          isInRange
                            ? `${chipLabel(offset)} (also covered by this certificate)`
                            : chipLabel(offset)
                        }
                        onClick={() => handleStartOffsetClick(offset)}
                        onKeyDown={(event) => startOffsetRoving.onKeyDown(event, index)}
                        className={requestCx(
                          "min-h-12 rounded-xl border px-2 py-2.5 text-sm font-medium transition-[background-color,border-color,color] duration-150 touch-manipulation",
                          isStart && "bg-primary text-primary-foreground border-primary",
                          isInRange && !isStart && "bg-primary/15 text-primary border-primary/40",
                          // Unselected: explicit white + full-opacity border so chips
                          // read as actionable. Prior `bg-background border-border/60`
                          // looked greyed-out next to selected chips, making
                          // "Yesterday" (and other unpicked dates) read as disabled.
                          // See paid-funnel review 2026-05-25 fix #1.
                          !isSelected && "bg-white dark:bg-card text-foreground border-border hover:border-primary/60 hover:bg-primary/5"
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

          {/* Live summary card — enumerates the exact covered dates while the
              patient is editing the range, so multi-day selections are never
              ambiguous. */}
          {selectedDays !== null && startOffset !== null && endOffset !== null && price && (
            <div className="flex items-center justify-between px-3 py-2.5 rounded-2xl border border-border/50 bg-white dark:bg-card shadow-md shadow-primary/[0.06]">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">
                  {selectedDays === 1
                    ? `${summaryLabel(startOffset)} · 1 day`
                    : `${summaryLabel(startOffset)} to ${summaryLabel(endOffset)} · ${selectedDays} days`}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  No waiting rooms · doctor review when available
                </p>
              </div>
              <span className="text-base font-semibold text-primary shrink-0 ml-3">${price}</span>
            </div>
          )}
        </div>
      )}

      {/* GP note - longer absences. Visible on every viewport so a patient
          on mobile understands the 3-day cap without scrolling laterally. */}
      <p className="px-1 text-xs text-muted-foreground">
        Need more than 3 days off? Please visit your GP for an extended certificate.
      </p>

      {/* Continue */}
      {/* Always clickable so a tap runs validate() and surfaces the blocking
          reason (StepBlockedSummary), instead of a silently greyed button that
          dead-ends the mobile sticky CTA. */}
      <RequestButton
        data-intake-primary-action="true"
        data-intake-primary-label="Continue"
        data-intake-primary-ready={canContinue ? "true" : "false"}
        onClick={handleNext}
        variant={canContinue ? "default" : "secondary"}
        className="w-full h-12 max-sm:hidden"
      >
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

      {/* Early-recovery email capture sits below the primary action so it never
          interrupts the type → Continue path (paid-funnel review 2026-06-23). */}
      <EarlyRecoveryEmailCard serviceType={serviceType} stepId="certificate" />
    </div>
  )
}
