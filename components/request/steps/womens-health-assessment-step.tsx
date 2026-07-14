"use client"

import { AlertCircle, ArrowRight, ShieldCheck, XCircle } from "lucide-react"
import { useRouter } from "next/navigation"
import { useCallback, useState } from "react"

import { ChipToggleGroup, IntakeStepIntro, QuestionCard, QuestionPrompt, SegmentedChoiceGroup, StringBinaryChoice } from "@/components/request/shared/intake-step-primitives"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { usePostHog } from "@/lib/analytics/posthog-context"
import { useStepValidationSummary } from "@/lib/hooks/use-step-validation-summary"
import type { UnifiedServiceType } from "@/lib/request/step-registry"
import {
  buildUtiTerminalBlockCorrection,
  deriveUtiTerminalBlock,
} from "@/lib/request/terminal-safety-blocks"

import { useRequestStore } from "../store"

interface WomensHealthAssessmentStepProps {
  serviceType: UnifiedServiceType
  onNext: () => void
  onBack: () => void
  onComplete: () => void
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null

  return (
    <p className="flex items-center gap-1 text-xs text-destructive">
      <AlertCircle className="h-3 w-3" aria-hidden="true" />
      {message}
    </p>
  )
}

export default function WomensHealthAssessmentStep({ serviceType, onNext, onBack }: WomensHealthAssessmentStepProps) {
  const router = useRouter()
  const { answers, setAnswer, setAnswers } = useRequestStore()
  const [errors, setErrors] = useState<Record<string, string>>({})

  const womensHealthOption = answers.womensHealthOption as string | undefined

  // Render the assessment for the live option. Only uti + ocp_new are live
  // (LIVE_WOMENS_HEALTH_OPTIONS): the type step routes ocp_repeat to the
  // repeat-script flow, and morning-after / period-pain / other are gated and
  // rejected server-side by validateWomensHealthAssessmentStep. Anything else
  // renders nothing rather than a half-built assessment.
  switch (womensHealthOption) {
    case 'ocp_new':
      return (
        <ContraceptionAssessment
          serviceType={serviceType}
          onNext={onNext}
          answers={answers}
          setAnswer={setAnswer}
          errors={errors}
          setErrors={setErrors}
        />
      )
    case 'uti':
      return (
        <UTIAssessment
          serviceType={serviceType}
          onNext={onNext}
          onBack={onBack}
          answers={answers}
          setAnswer={setAnswer}
          setAnswers={setAnswers}
          errors={errors}
          setErrors={setErrors}
          router={router}
        />
      )
    default:
      return null
  }
}

// Contraception assessment
function ContraceptionAssessment({ serviceType, onNext, answers, setAnswer, errors, setErrors }: {
  serviceType: UnifiedServiceType
  onNext: () => void
  answers: Record<string, unknown>
  setAnswer: (key: string, value: unknown) => void
  errors: Record<string, string>
  setErrors: (errors: Record<string, string>) => void
}) {
  const posthog = usePostHog()
  // This component now serves only the live new/switch pill (ocp_new).
  const contraceptionType = answers.contraceptionType as string | undefined
  const contraceptionCurrent = (answers.contraceptionCurrent as string) || ""
  const pregnancyStatus = (answers.pregnancyStatus as string) || ""
  const lastPeriod = (answers.lastPeriod as string) || ""
  const contraceptionDetails = (answers.contraceptionDetails as string) || ""
  // Combined-pill safety screen (new/switch pill only). Drives the REQUIRES_CALL
  // contraindication rules; doctor steers to a progestogen-only option if needed.
  const migraineAura = (answers.womens_migraine_aura as string) || ""
  const bloodClotHistory = (answers.womens_blood_clot_history as string) || ""
  const smoker = (answers.womens_smoker as string) || ""
  // Always shown — this component only serves the new/switch combined pill now.
  const needsPillSafetyScreen = true
  const isComplete = Boolean(
    contraceptionType && contraceptionCurrent && pregnancyStatus
      && (!needsPillSafetyScreen || (migraineAura && bloodClotHistory && smoker)),
  )

  const clearError = (key: string) => {
    if (!errors[key]) return
    const nextErrors = { ...errors }
    delete nextErrors[key]
    setErrors(nextErrors)
  }

  // If pregnant, flag for doctor call
  const handlePregnancyChange = (value: string) => {
    setAnswer("pregnancyStatus", value)
    clearError("pregnancyStatus")
    if (value === 'yes') {
      setAnswer("requiresCall", true)
    } else if (answers.requiresCall) {
      // Only clear if we were the ones who set it
      setAnswer("requiresCall", false)
    }
  }

  const validate = () => {
    const newErrors: Record<string, string> = {}
    if (!contraceptionType) {
      newErrors.contraceptionType = "Please select an option"
    } else if (!["start", "switch"].includes(contraceptionType)) {
      newErrors.contraceptionType = "Current-pill repeats go through repeat prescriptions."
    }
    if (!contraceptionCurrent) newErrors.contraceptionCurrent = "Please select an option"
    if (!pregnancyStatus) newErrors.pregnancyStatus = "Please answer this question"
    if (needsPillSafetyScreen) {
      if (!migraineAura) newErrors.womens_migraine_aura = "Please answer this question"
      if (!bloodClotHistory) newErrors.womens_blood_clot_history = "Please answer this question"
      if (!smoker) newErrors.womens_smoker = "Please answer this question"
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleNext = () => {
    if (!validate()) {
      showBlockingReasons()
      return
    }
    onNext()
  }

  const { validationSummary, showBlockingReasons } = useStepValidationSummary(
    isComplete,
    useCallback(() => {
      const reasons: string[] = []
      if (!contraceptionType || !["start", "switch"].includes(contraceptionType)) reasons.push("start or switch")
      if (!contraceptionCurrent) reasons.push("current contraception")
      if (!pregnancyStatus) reasons.push("pregnancy status")
      if (needsPillSafetyScreen) {
        if (!migraineAura) reasons.push("migraine with aura")
        if (!bloodClotHistory) reasons.push("blood clot history")
        if (!smoker) reasons.push("smoking status")
      }
      return reasons
    }, [bloodClotHistory, contraceptionCurrent, contraceptionType, migraineAura, needsPillSafetyScreen, pregnancyStatus, smoker]),
    { posthog, serviceType, subtype: answers.consultSubtype as string | undefined, stepId: "womens-health-assessment" },
  )

  return (
    <div className="space-y-4">
      <IntakeStepIntro
        eyebrow="Contraception"
        title="A few safety checks"
        description="These answers help the doctor choose a safe option. If anything needs more context, the doctor will contact you."
      />

      <QuestionCard compact>
        <div className="space-y-2.5">
          <QuestionPrompt
            label="What would you like?"
            hint="Choose the closest match for this request."
            required
          />
          <SegmentedChoiceGroup
            options={[
              { value: "start", label: "Start" },
              { value: "switch", label: "Switch" },
            ]}
            value={contraceptionType}
            onChange={(value) => {
              setAnswer("contraceptionType", value)
              clearError("contraceptionType")
            }}
            ariaLabel="What would you like?"
            columns="two"
          />
          <FieldError message={errors.contraceptionType} />
        </div>
      </QuestionCard>

      <QuestionCard compact>
        <div className="space-y-2.5">
          <QuestionPrompt
            label="Are you currently using contraception?"
            hint="This gives the doctor context for starting or switching safely."
            required
          />
          <SegmentedChoiceGroup
            options={[
              { value: "pill", label: "The pill" },
              { value: "iud", label: "IUD or implant" },
              { value: "other", label: "Other" },
              { value: "none", label: "None" },
            ]}
            value={contraceptionCurrent}
            onChange={(value) => {
              setAnswer("contraceptionCurrent", value)
              clearError("contraceptionCurrent")
            }}
            ariaLabel="Are you currently using contraception?"
            columns="auto"
          />
          <FieldError message={errors.contraceptionCurrent} />
        </div>
      </QuestionCard>

      <QuestionCard compact>
        <div className="space-y-2.5">
          <QuestionPrompt
            label="Are you pregnant or could you be pregnant?"
            hint="Some options are not suitable during pregnancy."
            required
          />
          <SegmentedChoiceGroup
            options={[
              { value: "no", label: "No" },
              { value: "not_sure", label: "Not sure" },
              { value: "yes", label: "Yes" },
            ]}
            value={pregnancyStatus}
            onChange={handlePregnancyChange}
            ariaLabel="Are you pregnant or could you be pregnant?"
            columns="three"
          />
          <FieldError message={errors.pregnancyStatus} />
          {pregnancyStatus === "yes" && (
            <Alert variant="default" className="border-warning-border bg-warning-light/50 dark:bg-warning/10">
              <AlertCircle className="h-4 w-4 text-warning" aria-hidden="true" />
              <AlertDescription className="text-xs text-warning">
                Some contraception is not suitable during pregnancy. The doctor will discuss safe options with you.
              </AlertDescription>
            </Alert>
          )}
          {pregnancyStatus === "not_sure" && (
            <p className="text-xs leading-relaxed text-muted-foreground">
              Consider taking a pregnancy test before starting contraception.
            </p>
          )}
        </div>
      </QuestionCard>

      {needsPillSafetyScreen && (
        <QuestionCard compact className="space-y-4">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
            <div className="space-y-1">
              <p className="text-sm font-medium">Combined pill safety</p>
              <p className="text-xs leading-relaxed text-muted-foreground">
                If any of these apply, the doctor will check whether the combined pill is right for you or suggest a safer option.
              </p>
            </div>
          </div>
          {[
            { key: "womens_migraine_aura", value: migraineAura, label: "Do you get migraines with aura (visual disturbances, flashing lights, or blind spots)?" },
            { key: "womens_blood_clot_history", value: bloodClotHistory, label: "Have you, or a close family member, ever had a blood clot (DVT or pulmonary embolism)?" },
            { key: "womens_smoker", value: smoker, label: "Do you smoke?" },
          ].map((q) => (
            <div key={q.key} className="space-y-2.5">
              <QuestionPrompt label={q.label} required />
              <StringBinaryChoice
                value={q.value as "no" | "yes" | undefined}
                noValue="no"
                yesValue="yes"
                onChange={(value) => {
                  setAnswer(q.key, value)
                  clearError(q.key)
                }}
                ariaLabel={q.label}
              />
              <FieldError message={errors[q.key]} />
            </div>
          ))}
        </QuestionCard>
      )}

      <QuestionCard compact className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="womens-last-period" className="text-sm font-medium">
            When was your last period? (approximate)
          </Label>
          <Input
            id="womens-last-period"
            value={lastPeriod}
            onChange={(e) => setAnswer("lastPeriod", e.target.value)}
            placeholder="e.g., 2 weeks ago"
            className="h-11"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="womens-contraception-details" className="text-sm font-medium">
            Anything else the doctor should know?
          </Label>
          <Textarea
            id="womens-contraception-details"
            value={contraceptionDetails}
            onChange={(e) => setAnswer("contraceptionDetails", e.target.value)}
            placeholder="Optional: specific concerns, brand preferences, or past side effects"
            className="min-h-[84px] resize-none"
          />
        </div>
      </QuestionCard>

      {validationSummary.length > 0 && (
        <Alert variant="destructive" role="alert" aria-live="assertive">
          <AlertDescription>
            {validationSummary.length === 1 ? "Add this to continue: " : "Add these to continue: "}
            {validationSummary.join(", ")}.
          </AlertDescription>
        </Alert>
      )}

      <Button
        data-intake-primary-action="true"
        data-intake-primary-label="Continue"
        data-intake-primary-ready={isComplete ? "true" : "false"}
        onClick={handleNext}
        variant={isComplete ? "default" : "secondary"}
        className="w-full h-12 text-base font-medium max-sm:hidden"
      >
        {isComplete ? (
          <>
            Continue
            <ArrowRight className="w-4 h-4" />
          </>
        ) : (
          "Continue"
        )}
      </Button>
    </div>
  )
}

// UTI assessment
function UTIAssessment({ serviceType, onNext, onBack, answers, setAnswer, setAnswers, errors, setErrors, router }: {
  serviceType: UnifiedServiceType
  onNext: () => void
  onBack: () => void
  answers: Record<string, unknown>
  setAnswer: (key: string, value: unknown) => void
  setAnswers: (answers: Record<string, unknown>) => void
  errors: Record<string, string>
  setErrors: (errors: Record<string, string>) => void
  router: ReturnType<typeof useRouter>
}) {
  const posthog = usePostHog()
  const utiSymptoms = answers.utiSymptoms as string[] | undefined
  const utiRedFlags = answers.utiRedFlags as "no" | "yes" | undefined
  const utiPregnant = (answers.utiPregnant as string) || ""
  const utiDetails = (answers.utiDetails as string) || ""
  const isComplete = Boolean(utiSymptoms && utiSymptoms.length > 0 && utiRedFlags === 'no' && utiPregnant === 'no')
  const terminalBlock = deriveUtiTerminalBlock(answers)

  const clearError = (key: string) => {
    if (!errors[key]) return
    const nextErrors = { ...errors }
    delete nextErrors[key]
    setErrors(nextErrors)
  }

  const handlePregnancyChange = (value: string) => {
    setAnswer("utiPregnant", value)
    clearError("utiPregnant")
  }

  const handleRedFlagsChange = (value: string) => {
    setAnswer("utiRedFlags", value)
    clearError("utiRedFlags")
  }

  const validate = () => {
    const newErrors: Record<string, string> = {}
    if (!utiSymptoms || utiSymptoms.length === 0) newErrors.utiSymptoms = "Please select your symptoms"
    if (!utiRedFlags) newErrors.utiRedFlags = "Please answer this question"
    if (!utiPregnant) newErrors.utiPregnant = "Please answer this question"
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleNext = () => {
    if (!validate()) {
      showBlockingReasons()
      return
    }
    onNext()
  }

  const toggleSymptom = (symptom: string) => {
    const current = utiSymptoms || []
    clearError("utiSymptoms")
    if (current.includes(symptom)) {
      setAnswer("utiSymptoms", current.filter(s => s !== symptom))
    } else {
      setAnswer("utiSymptoms", [...current, symptom])
    }
  }

  const { validationSummary, showBlockingReasons } = useStepValidationSummary(
    isComplete,
    useCallback(() => {
      const reasons: string[] = []
      if (!utiSymptoms || utiSymptoms.length === 0) reasons.push("UTI symptoms")
      if (!utiRedFlags) reasons.push("red-flag safety check")
      if (!utiPregnant) reasons.push("pregnancy check")
      return reasons
    }, [utiPregnant, utiRedFlags, utiSymptoms]),
    { posthog, serviceType, subtype: answers.consultSubtype as string | undefined, stepId: "womens-health-assessment" },
  )

  if (terminalBlock) {
    return (
      <div className="space-y-6">
        <Alert variant="destructive" className="border-destructive/50">
          <XCircle className="w-5 h-5" />
          <AlertTitle className="font-semibold">{terminalBlock.title}</AlertTitle>
          <AlertDescription className="mt-2 text-sm">{terminalBlock.reason}</AlertDescription>
        </Alert>
        <div className="flex flex-col gap-2 pt-2">
          <Button variant="outline" onClick={() => router.push('/')} className="w-full">Return home</Button>
          <Button
            variant="ghost"
            onClick={() => {
              setAnswers(buildUtiTerminalBlockCorrection(terminalBlock))
              const nextErrors = { ...errors }
              terminalBlock.answerKeysToClear.forEach((key) => delete nextErrors[key])
              setErrors(nextErrors)
            }}
            className="w-full"
          >
            {terminalBlock.answerKeysToClear.length === 1
              ? "I need to correct this answer"
              : "I need to correct these answers"}
          </Button>
          <Button variant="ghost" onClick={onBack} className="w-full">Go back</Button>
        </div>
      </div>
    )
  }

  const SYMPTOMS = [
    { key: 'burning', label: 'Burning or stinging' },
    { key: 'frequency', label: 'Urinating more often' },
    { key: 'urgency', label: 'Urgent need to go' },
    { key: 'incomplete', label: 'Not emptying fully' },
    { key: 'blood', label: 'Blood in urine' },
    { key: 'cloudy', label: 'Cloudy or smelly' },
  ]
  const symptomValues = Object.fromEntries(
    SYMPTOMS.map((symptom) => [symptom.key, utiSymptoms?.includes(symptom.key) ?? false]),
  )

  return (
    <div className="space-y-4">
      <IntakeStepIntro
        eyebrow="UTI treatment"
        title="Check this is safe for telehealth"
        description="These questions check for signs that need in-person care."
      />

      <QuestionCard compact>
        <QuestionPrompt
          label="Which symptoms do you have?"
          hint="Select every symptom that applies."
          required
        />
        <ChipToggleGroup
          options={SYMPTOMS}
          values={symptomValues}
          onChange={(key) => toggleSymptom(key)}
          ariaLabel="UTI symptoms"
        />
        <FieldError message={errors.utiSymptoms} />
      </QuestionCard>

      <QuestionCard compact className="space-y-3">
        <div className="space-y-1">
          <p className="text-sm font-medium leading-snug text-foreground">UTI safety checks</p>
        </div>
        <div className="space-y-2">
          <QuestionPrompt
            label="Fever, flank or back pain, vomiting, or very unwell?"
            hint="These can suggest a kidney infection."
            required
          />
          <StringBinaryChoice
            value={utiRedFlags}
            noValue="no"
            yesValue="yes"
            onChange={handleRedFlagsChange}
            ariaLabel="Fever, flank or back pain, vomiting, or very unwell?"
          />
          <FieldError message={errors.utiRedFlags} />
        </div>

        <div className="space-y-2">
          <QuestionPrompt
            label="Pregnant or possibly pregnant?"
            hint="Pregnancy needs in-person UTI care."
            required
          />
          <SegmentedChoiceGroup
            options={[
              { value: "no", label: "No" },
              { value: "not_sure", label: "Not sure" },
              { value: "yes", label: "Yes" },
            ]}
            value={utiPregnant}
            onChange={handlePregnancyChange}
            ariaLabel="Pregnant or possibly pregnant?"
            columns="three"
          />
          <FieldError message={errors.utiPregnant} />
        </div>
      </QuestionCard>

      <QuestionCard compact>
        <div className="space-y-2">
          <Label htmlFor="uti-details" className="text-sm font-medium">
            Anything else the doctor should know?
          </Label>
          <Textarea
            id="uti-details"
            value={utiDetails}
            onChange={(e) => setAnswer("utiDetails", e.target.value)}
            placeholder="Optional: how long symptoms have been present, previous UTIs, or recent treatment"
            className="min-h-[84px] resize-none"
          />
        </div>
      </QuestionCard>

      {validationSummary.length > 0 && (
        <Alert variant="destructive" role="alert" aria-live="assertive">
          <AlertDescription>
            {validationSummary.length === 1 ? "Add this to continue: " : "Add these to continue: "}
            {validationSummary.join(", ")}.
          </AlertDescription>
        </Alert>
      )}

      <Button
        data-intake-primary-action="true"
        data-intake-primary-label="Continue"
        data-intake-primary-ready={isComplete ? "true" : "false"}
        onClick={handleNext}
        variant={isComplete ? "default" : "secondary"}
        className="w-full h-12 text-base font-medium max-sm:hidden"
      >
        {isComplete ? (
          <>
            Continue
            <ArrowRight className="w-4 h-4" />
          </>
        ) : (
          "Continue"
        )}
      </Button>
    </div>
  )
}
