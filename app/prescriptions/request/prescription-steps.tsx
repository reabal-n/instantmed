"use client"

import Link from "next/link"
import { Button, Input, DatePickerField } from "@/components/uix"
import { Textarea } from "@/components/ui/textarea"
import {
  AlertTriangle,
  CheckCircle,
  Check,
  Pencil,
  HelpCircle,
  RefreshCw,
  Brain,
  Heart,
  Droplets,
  Wind,
  Shield,
  Bug,
  Sparkles,
  MoreHorizontal,
} from "lucide-react"
import { RX_MICROCOPY } from "@/lib/microcopy/prescription"
import { MedicationSearch, type SelectedPBSProduct } from "@/components/shared/medication-search"
import { AnimatedSelect } from "@/components/ui/animated-select"
import { CinematicSwitch } from "@/components/ui/cinematic-switch"
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"
import { InlineAuthStep } from "@/components/shared/inline-auth-step"
import { StepHeader, OptionTile, PillButton } from "./prescription-flow-ui"

// ── Constants (shared with main flow) ──────────────────────────────────

// Prescription types - only repeat scripts available
const RX_TYPES = [
  {
    id: "repeat",
    label: RX_MICROCOPY.type.repeat.label,
    description: RX_MICROCOPY.type.repeat.description,
    icon: RefreshCw,
  },
] as const

// Conditions with icons for AnimatedSelect
const CONDITIONS = [
  { id: "mental_health", label: "Mental health", icon: Brain, color: "#4f46e5" },
  { id: "cardiovascular", label: "Blood pressure / heart", icon: Heart, color: "#EF4444" },
  { id: "diabetes", label: "Diabetes", icon: Droplets, color: "#3B82F6" },
  { id: "respiratory", label: "Asthma / respiratory", icon: Wind, color: "#4f46e5" },
  { id: "contraceptive", label: "Contraception", icon: Shield, color: "#EC4899" },
  { id: "infection", label: "Infection", icon: Bug, color: "#F59E0B" },
  { id: "skin", label: "Skin condition", icon: Sparkles, color: "#10B981" },
  { id: "other", label: "Other", icon: MoreHorizontal, color: "#6B7280" },
] as const

// Duration options
const DURATIONS = [
  { id: "<3months", label: "< 3 months" },
  { id: "3-12months", label: "3–12 months" },
  { id: ">1year", label: "> 1 year" },
] as const

// Control options
const CONTROL_OPTIONS = [
  { id: "well", label: "Well controlled" },
  { id: "partial", label: "Partially" },
  { id: "poor", label: "Poorly controlled" },
] as const

// Side effects options
const SIDE_EFFECTS = [
  { id: "none", label: "None" },
  { id: "mild", label: "Mild" },
  { id: "significant", label: "Significant" },
] as const

// Safety questions
const SAFETY_QUESTIONS = [
  { id: "allergies", label: "Known allergies to this medication?", knockout: true },
  { id: "pregnant", label: "Pregnant or possibly pregnant?", knockout: false },
  { id: "breastfeeding", label: "Currently breastfeeding?", knockout: false },
  { id: "seriousSideEffects", label: "Previous serious side effects?", knockout: true },
] as const

// IRN options
const IRNS = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const

// Re-export constants needed by the main flow
export { CONDITIONS, DURATIONS, SAFETY_QUESTIONS }

// ── Step Props ──────────────────────────────────────────────────────────

export interface TypeSelectionStepProps {
  rxType: "repeat" | "new" | null
  selectType: (type: "repeat" | "new") => void
}

export interface MedicationStepProps {
  selectedMedication: SelectedPBSProduct | null
  setSelectedMedication: (med: SelectedPBSProduct | null) => void
}

export interface GatingStepProps {
  prescribedBefore: boolean | null
  setPrescribedBefore: (val: boolean) => void
  doseChanged: boolean | null
  setDoseChanged: (val: boolean) => void
  isGatingBlocked: boolean
  setIsGatingBlocked: (val: boolean) => void
}

export interface ConditionStepProps {
  rxType: "repeat" | "new" | null
  condition: string | null
  setCondition: (val: string) => void
  otherCondition: string
  setOtherCondition: (val: string) => void
}

export interface DurationStepProps {
  duration: string | null
  setDuration: (val: string) => void
  goNext: () => void
}

export interface ControlStepProps {
  control: string | null
  setControl: (val: string) => void
  goNext: () => void
}

export interface SideEffectsStepProps {
  sideEffects: string | null
  setSideEffects: (val: string) => void
  goNext: () => void
}

export interface NotesStepProps {
  notes: string
  setNotes: (val: string) => void
}

export interface SafetyStepProps {
  safetyAnswers: Record<string, boolean | null>
  setSafetyAnswers: (updater: (prev: Record<string, boolean | null>) => Record<string, boolean | null>) => void
  checkSafetyKnockout: () => boolean
}

export interface MedicareStepProps {
  medicareNumber: string
  setMedicareNumber: (val: string) => void
  irn: number | null
  setIrn: (val: number) => void
  dob: string
  setDob: (val: string) => void
  formatMedicare: (val: string) => string
  validateMedicare: (num: string) => { valid: boolean; error: string | null }
}

export interface SignupStepProps {
  goTo: (step: "medicare") => void
  onAuthComplete: (userId: string, profileId: string) => void
}

export interface ReviewStepProps {
  selectedMedication: SelectedPBSProduct | null
  condition: string | null
  otherCondition: string
  rxType: "repeat" | "new" | null
  duration: string | null
  goTo: (step: "medication" | "condition") => void
}

export interface PaymentStepProps {
  error: string | null
  isSubmitting: boolean
  handleSubmit: () => void
}

// ── Step Components ─────────────────────────────────────────────────────

export function TypeSelectionStep({ rxType, selectType }: TypeSelectionStepProps) {
  return (
    <div className="space-y-4 animate-step-enter">
      <StepHeader emoji="💊" title={RX_MICROCOPY.type.heading} subtitle={RX_MICROCOPY.type.subtitle} />
      {/* S8 Disclaimer - shown upfront */}
      <div className="p-3 rounded-xl bg-red-50 border border-red-200">
        <p className="text-xs text-red-800 leading-relaxed font-medium">
          <strong className="text-red-900">No Schedule 8 / controlled medications.</strong>
        </p>
        <p className="text-xs text-red-700 mt-1">
          Requests for these will be declined: dexamphetamine, methylphenidate, lisdexamfetamine, oxycodone, morphine, fentanyl, buprenorphine, methadone, ketamine, alprazolam.
        </p>
        <p className="text-xs text-red-700 mt-2">
          <strong>If you need a new medication or dose change →</strong>{" "}
          <Link href="/consult" className="underline hover:no-underline">General Consult</Link> required.
        </p>
      </div>
      <div className="space-y-3">
        {RX_TYPES.map((type) => (
          <OptionTile
            key={type.id}
            selected={rxType === type.id}
            onClick={() => selectType(type.id as "repeat" | "new")}
            label={type.label}
            description={type.description}
            icon={type.icon}
          />
        ))}
      </div>
      <p className="text-xs text-center text-muted-foreground">{RX_MICROCOPY.doctorReview}</p>
    </div>
  )
}

export function MedicationStep({ selectedMedication, setSelectedMedication }: MedicationStepProps) {
  return (
    <div className="space-y-4 animate-step-enter">
      <StepHeader
        emoji="🔍"
        title={RX_MICROCOPY.medication.headingRepeat}
        subtitle="Search and select your medication from the list"
      />
      {/* S8 Disclaimer */}
      <div className="p-3 rounded-xl bg-amber-50 border border-amber-200">
        <p className="text-xs text-amber-800 leading-relaxed">
          <strong className="text-amber-900">No Schedule 8 (S8) medications.</strong>{" "}
          Common examples we do not provide via repeat script: dexamphetamine, lisdexamfetamine (Vyvanse),
          methylphenidate (Ritalin/Concerta), oxycodone, morphine, fentanyl, buprenorphine, methadone, ketamine.
        </p>
      </div>
      <MedicationSearch
        value={selectedMedication}
        onChange={setSelectedMedication}
      />
    </div>
  )
}

export function GatingStep({
  prescribedBefore,
  setPrescribedBefore,
  doseChanged,
  setDoseChanged,
  isGatingBlocked,
  setIsGatingBlocked,
}: GatingStepProps) {
  return (
    <div className="space-y-6 animate-step-enter">
      <StepHeader
        emoji="📋"
        title="A few quick questions"
        subtitle="To ensure this service is right for you"
      />

      {/* Question 1: Prescribed before? */}
      <div className="space-y-3">
        <p className="text-sm font-medium">Have you been prescribed this medication before by a doctor?</p>
        <div className="flex gap-3">
          <button
            onClick={() => {
              setPrescribedBefore(true)
              if (doseChanged === true) {
                setIsGatingBlocked(true)
              } else if (doseChanged === false) {
                setIsGatingBlocked(false)
              }
            }}
            className={`flex-1 p-3 rounded-xl border text-sm font-medium transition-all ${
              prescribedBefore === true
                ? "border-green-500 bg-green-50 text-green-700"
                : "border-border/60 hover:border-border"
            }`}
          >
            Yes
          </button>
          <button
            onClick={() => {
              setPrescribedBefore(false)
              setIsGatingBlocked(true)
            }}
            className={`flex-1 p-3 rounded-xl border text-sm font-medium transition-all ${
              prescribedBefore === false
                ? "border-amber-500 bg-amber-50 text-amber-700"
                : "border-border/60 hover:border-border"
            }`}
          >
            No
          </button>
        </div>
      </div>

      {/* Question 2: Dose changes? */}
      <div className="space-y-3">
        <p className="text-sm font-medium">Any dose changes since your last prescription?</p>
        <div className="flex gap-3">
          <button
            onClick={() => {
              setDoseChanged(true)
              setIsGatingBlocked(true)
            }}
            className={`flex-1 p-3 rounded-xl border text-sm font-medium transition-all ${
              doseChanged === true
                ? "border-amber-500 bg-amber-50 text-amber-700"
                : "border-border/60 hover:border-border"
            }`}
          >
            Yes
          </button>
          <button
            onClick={() => {
              setDoseChanged(false)
              if (prescribedBefore === true) {
                setIsGatingBlocked(false)
              }
            }}
            className={`flex-1 p-3 rounded-xl border text-sm font-medium transition-all ${
              doseChanged === false
                ? "border-green-500 bg-green-50 text-green-700"
                : "border-border/60 hover:border-border"
            }`}
          >
            No
          </button>
        </div>
      </div>

      {/* Blocking message */}
      {isGatingBlocked && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 space-y-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-amber-900">This request requires a general consultation</p>
              <p className="text-sm text-amber-700 mt-1">
                {prescribedBefore === false
                  ? "New medications require a doctor consultation to assess suitability."
                  : "Dose changes require a doctor consultation to ensure safety."}
              </p>
            </div>
          </div>
          <Button asChild className="w-full rounded-lg bg-linear-to-r from-blue-600 to-sky-600 hover:from-blue-700 hover:to-sky-700 text-white">
            <Link href="/consult">
              Continue to General Consult ($49.95)
            </Link>
          </Button>
        </div>
      )}
    </div>
  )
}

export function ConditionStep({ rxType, condition, setCondition, otherCondition, setOtherCondition }: ConditionStepProps) {
  return (
    <div className="space-y-4 animate-step-enter">
      <StepHeader
        emoji="🩺"
        title={rxType === "new" ? RX_MICROCOPY.condition.headingNew : RX_MICROCOPY.condition.heading}
        subtitle={RX_MICROCOPY.condition.subtitle}
      />
      <AnimatedSelect
        options={CONDITIONS.map((c) => ({
          id: c.id,
          label: c.label,
          icon: c.icon,
          color: c.color,
        }))}
        value={condition || undefined}
        onChange={(value) => setCondition(value)}
        placeholder="Select your condition..."
      />
      {condition === "other" && (
        <Input
          value={otherCondition}
          onChange={(e) => setOtherCondition(e.target.value)}
          placeholder={RX_MICROCOPY.condition.otherPlaceholder}
          className="h-11"
          autoFocus
        />
      )}
    </div>
  )
}

export function DurationStep({ duration, setDuration, goNext }: DurationStepProps) {
  return (
    <div className="space-y-4 animate-step-enter">
      <StepHeader emoji="⏰" title={RX_MICROCOPY.duration.heading} />
      <div className="flex flex-wrap gap-2 justify-center">
        {DURATIONS.map((d) => (
          <PillButton
            key={d.id}
            selected={duration === d.id}
            onClick={() => {
              setDuration(d.id)
              setTimeout(goNext, 150)
            }}
          >
            {d.label}
          </PillButton>
        ))}
      </div>
    </div>
  )
}

export function ControlStep({ control, setControl, goNext }: ControlStepProps) {
  return (
    <div className="space-y-4 animate-step-enter">
      <StepHeader emoji="📊" title={RX_MICROCOPY.control.heading} />
      <div className="flex flex-wrap gap-2 justify-center">
        {CONTROL_OPTIONS.map((c) => (
          <PillButton
            key={c.id}
            selected={control === c.id}
            onClick={() => {
              setControl(c.id)
              setTimeout(goNext, 150)
            }}
          >
            {c.label}
          </PillButton>
        ))}
      </div>
    </div>
  )
}

export function SideEffectsStep({ sideEffects, setSideEffects, goNext }: SideEffectsStepProps) {
  return (
    <div className="space-y-4 animate-step-enter">
      <StepHeader emoji="⚠️" title={RX_MICROCOPY.sideEffects.heading} />
      <div className="flex flex-wrap gap-2 justify-center">
        {SIDE_EFFECTS.map((s) => (
          <PillButton
            key={s.id}
            selected={sideEffects === s.id}
            onClick={() => {
              setSideEffects(s.id)
              setTimeout(goNext, 150)
            }}
          >
            {s.label}
          </PillButton>
        ))}
      </div>
    </div>
  )
}

export function NotesStep({ notes, setNotes }: NotesStepProps) {
  return (
    <div className="space-y-4 animate-step-enter">
      <StepHeader
        emoji="✍️"
        title="Tell us more"
        subtitle="Describe your symptoms so the doctor can help you"
      />
      <Textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value.slice(0, 500))}
        placeholder="e.g. I've had a sore throat for 3 days, difficulty swallowing..."
        className="min-h-[120px] resize-none"
        maxLength={500}
        required
      />
      <p className="text-xs text-right text-muted-foreground">{notes.length}/500</p>
      {notes.length === 0 && (
        <p className="text-xs text-amber-600">
          This information helps the doctor assess whether this medication is appropriate for you
        </p>
      )}
    </div>
  )
}

export function SafetyStep({ safetyAnswers, setSafetyAnswers, checkSafetyKnockout }: SafetyStepProps) {
  return (
    <div className="space-y-4 animate-step-enter">
      <StepHeader emoji="🛡️" title={RX_MICROCOPY.safety.heading} subtitle={RX_MICROCOPY.safety.subtitle} />
      <div className="space-y-3">
        {SAFETY_QUESTIONS.map((q) => (
          <div key={q.id} className="flex items-center justify-between p-3 rounded-xl border border-border/60">
            <p className="text-sm pr-4 flex-1">{q.label}</p>
            <CinematicSwitch
              value={safetyAnswers[q.id] ?? undefined}
              onChange={(value) => setSafetyAnswers((prev) => ({ ...prev, [q.id]: value }))}
              onLabel="YES"
              offLabel="NO"
              variant="safety"
              className="shrink-0"
            />
          </div>
        ))}
      </div>
      {checkSafetyKnockout() && (
        <div className="p-3 rounded-xl bg-amber-50 border border-amber-200">
          <p className="text-xs text-amber-800">{RX_MICROCOPY.safety.knockoutBody}</p>
        </div>
      )}
    </div>
  )
}

export function MedicareStep({
  medicareNumber,
  setMedicareNumber,
  irn,
  setIrn,
  dob,
  setDob,
  formatMedicare,
  validateMedicare,
}: MedicareStepProps) {
  const medicareValidation = validateMedicare(medicareNumber)
  const medicareDigits = medicareNumber.replace(/\D/g, "").length

  return (
    <div className="space-y-4">
      <StepHeader title={RX_MICROCOPY.medicare.heading} subtitle={RX_MICROCOPY.medicare.subtitle} />
      <div className="p-4 rounded-2xl border border-border/60 bg-card space-y-4">
        <div className="space-y-1.5">
          <label className="text-xs font-medium">{RX_MICROCOPY.medicare.numberLabel}</label>
          <div className="relative">
            <Input
              value={medicareNumber}
              onChange={(e) => setMedicareNumber(formatMedicare(e.target.value))}
              placeholder={RX_MICROCOPY.medicare.numberPlaceholder}
              className="h-12 text-lg tracking-widest font-mono pr-10"
              inputMode="numeric"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              {medicareDigits === 10 && medicareValidation.valid ? (
                <Check className="w-5 h-5 text-green-500" />
              ) : medicareDigits > 0 ? (
                <span className="text-xs text-muted-foreground">{medicareDigits}/10</span>
              ) : null}
            </div>
          </div>
          {medicareDigits > 0 && !medicareValidation.valid && (
            <p className="text-xs text-destructive">{medicareValidation.error}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center gap-1">
            <label className="text-xs font-medium">{RX_MICROCOPY.medicare.irnLabel}</label>
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="w-3 h-3 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-[200px] text-xs">
                {RX_MICROCOPY.medicare.irnTooltip}
              </TooltipContent>
            </Tooltip>
          </div>
          <div className="flex gap-1">
            {IRNS.map((n) => (
              <button
                key={n}
                onClick={() => setIrn(n)}
                className={`w-8 h-8 rounded-lg text-sm font-medium transition-all ${
                  irn === n ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/80"
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <DatePickerField
            label="Date of birth"
            value={dob}
            onChange={(date: string | null) => setDob(date || "")}
            disableFuture
            size="md"
          />
        </div>
      </div>
    </div>
  )
}

export function SignupStep({ goTo, onAuthComplete }: SignupStepProps) {
  return (
    <div className="space-y-4 animate-step-enter">
      <InlineAuthStep
        onBack={() => goTo("medicare")}
        onAuthComplete={onAuthComplete}
        serviceName="prescription"
      />
    </div>
  )
}

export function ReviewStep({ selectedMedication, condition, otherCondition, rxType, duration, goTo }: ReviewStepProps) {
  return (
    <div className="space-y-4">
      <StepHeader title={RX_MICROCOPY.review.heading} subtitle={RX_MICROCOPY.review.subtitle} />
      <div className="p-4 rounded-2xl border border-border/60 bg-card space-y-3">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-xs text-muted-foreground">{RX_MICROCOPY.review.medication}</p>
            <p className="text-sm font-medium">{selectedMedication?.drug_name || "Not selected"}</p>
            {selectedMedication && (
              <>
                {selectedMedication.strength && (
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                    {selectedMedication.strength}
                  </p>
                )}
                {selectedMedication.form && (
                  <p className="text-xs text-muted-foreground/70">
                    {selectedMedication.form}
                  </p>
                )}
              </>
            )}
          </div>
          <button onClick={() => goTo("medication")} className="p-1 hover:bg-muted rounded">
            <Pencil className="w-3 h-3 text-muted-foreground" />
          </button>
        </div>
        <hr className="border-border/40" />
        <div className="flex justify-between items-start">
          <div>
            <p className="text-xs text-muted-foreground">{RX_MICROCOPY.review.condition}</p>
            <p className="text-sm font-medium">
              {condition === "other" ? otherCondition : CONDITIONS.find((c) => c.id === condition)?.label}
            </p>
          </div>
          <button onClick={() => goTo("condition")} className="p-1 hover:bg-muted rounded">
            <Pencil className="w-3 h-3 text-muted-foreground" />
          </button>
        </div>
        {rxType === "repeat" && (
          <>
            <hr className="border-border/40" />
            <div>
              <p className="text-xs text-muted-foreground">{RX_MICROCOPY.review.duration}</p>
              <p className="text-sm font-medium">{DURATIONS.find((d) => d.id === duration)?.label}</p>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export function PaymentStep({ error, isSubmitting: _isSubmitting, handleSubmit: _handleSubmit }: PaymentStepProps) {
  return (
    <div className="space-y-4">
      <StepHeader title={RX_MICROCOPY.payment.heading} subtitle={RX_MICROCOPY.payment.subtitle} />
      <div className="p-4 rounded-2xl border border-border/60 bg-card space-y-4">
        <div className="flex justify-between items-center">
          <span className="font-medium">Total</span>
          <span className="text-2xl font-bold">{RX_MICROCOPY.payment.price}</span>
        </div>
        <hr className="border-border/40" />
        <ul className="space-y-2">
          {RX_MICROCOPY.payment.includes.map((item, i) => (
            <li key={i} className="flex items-center gap-2 text-sm">
              <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
              {item}
            </li>
          ))}
        </ul>
      </div>
      <p className="text-xs text-muted-foreground text-center">{RX_MICROCOPY.payment.disclaimer}</p>
      {error && (
        <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
          <p className="text-xs text-destructive">{error}</p>
        </div>
      )}
    </div>
  )
}
