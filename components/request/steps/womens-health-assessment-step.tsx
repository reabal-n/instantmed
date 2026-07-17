"use client"

import { ArrowRight, ShieldCheck, XCircle } from "lucide-react"
import { useRouter } from "next/navigation"
import { useCallback } from "react"

import { ChipToggleGroup, IntakeStepIntro, QuestionCard, QuestionPrompt, SegmentedChoiceGroup, StringBinaryChoice } from "@/components/request/shared/intake-step-primitives"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { usePostHog } from "@/lib/analytics/posthog-context"
import {
  exactStringValue,
  PILL_CONTRACEPTION_TYPE_VALUES,
  PILL_CURRENT_CONTRACEPTION_VALUES,
  PILL_PREGNANCY_STATUS_VALUES,
  PILL_YES_NO_VALUES,
} from "@/lib/clinical/womens-health-pill"
import { useStepValidationSummary } from "@/lib/hooks/use-step-validation-summary"
import type { UnifiedServiceType } from "@/lib/request/step-registry"
import {
  buildPillTerminalBlockCorrection,
  buildUtiTerminalBlockCorrection,
  derivePillTerminalBlock,
  deriveUtiTerminalBlock,
} from "@/lib/request/terminal-safety-blocks"

import { useRequestStore } from "../store"

interface WomensHealthAssessmentStepProps {
  serviceType: UnifiedServiceType
  onNext: () => void
  onBack: () => void
  onComplete: () => void
}

export default function WomensHealthAssessmentStep({ serviceType, onNext, onBack }: WomensHealthAssessmentStepProps) {
  const router = useRouter()
  const { answers, setAnswer, setAnswers } = useRequestStore()

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
          onBack={onBack}
          answers={answers}
          setAnswer={setAnswer}
          setAnswers={setAnswers}
          router={router}
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
          router={router}
        />
      )
    default:
      return null
  }
}

// Contraception assessment
function ContraceptionAssessment({ serviceType, onNext, onBack, answers, setAnswer, setAnswers, router }: {
  serviceType: UnifiedServiceType
  onNext: () => void
  onBack: () => void
  answers: Record<string, unknown>
  setAnswer: (key: string, value: unknown) => void
  setAnswers: (answers: Record<string, unknown>) => void
  router: ReturnType<typeof useRouter>
}) {
  const posthog = usePostHog()
  // This component now serves only the live new/switch pill (ocp_new).
  const contraceptionType = exactStringValue(answers.contraceptionType, PILL_CONTRACEPTION_TYPE_VALUES)
  const contraceptionCurrent = exactStringValue(answers.contraceptionCurrent, PILL_CURRENT_CONTRACEPTION_VALUES)
  const pregnancyStatus = exactStringValue(answers.pregnancyStatus, PILL_PREGNANCY_STATUS_VALUES)
  const lastPeriod = (answers.lastPeriod as string) || ""
  const contraceptionDetails = (answers.contraceptionDetails as string) || ""
  // Combined-pill safety screen (new/switch pill only). These answers can stop
  // an unsuitable paid pathway before checkout and direct the patient elsewhere.
  const migraineAura = exactStringValue(answers.womens_migraine_aura, PILL_YES_NO_VALUES)
  const bloodClotHistory = exactStringValue(answers.womens_blood_clot_history, PILL_YES_NO_VALUES)
  const smoker = exactStringValue(answers.womens_smoker, PILL_YES_NO_VALUES)
  // Always shown — this component only serves the new/switch combined pill now.
  const needsPillSafetyScreen = true
  const isComplete = Boolean(
    contraceptionType && contraceptionCurrent && pregnancyStatus
      && (!needsPillSafetyScreen || (migraineAura && bloodClotHistory && smoker)),
  )
  const terminalBlock = derivePillTerminalBlock(answers)

  const handleNext = () => {
    if (!isComplete) {
      showBlockingReasons()
      return
    }
    onNext()
  }

  const { validationSummary, showBlockingReasons } = useStepValidationSummary(
    isComplete,
    useCallback(() => {
      const reasons: string[] = []
      // exactStringValue already narrows contraceptionType to "start" | "switch"
      // | undefined, so a truthy value is always a live option.
      if (!contraceptionType) reasons.push("start or switch")
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

  if (terminalBlock) {
    return (
      <div className="space-y-6">
        <Alert variant="destructive" className="border-destructive/50">
          <XCircle className="h-5 w-5" aria-hidden="true" />
          <AlertTitle className="font-semibold">{terminalBlock.title}</AlertTitle>
          <AlertDescription className="mt-2 text-base">{terminalBlock.reason}</AlertDescription>
        </Alert>
        <div className="flex flex-col gap-2 pt-2">
          <Button variant="outline" onClick={() => router.push('/')} className="h-12 w-full">
            Return home
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              setAnswers(buildPillTerminalBlockCorrection(terminalBlock))
            }}
            className="h-12 w-full"
          >
            {terminalBlock.answerKeysToClear.length === 1
              ? "I need to correct this answer"
              : "I need to correct these answers"}
          </Button>
          <Button variant="ghost" onClick={onBack} className="h-12 w-full">
            Go back
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <IntakeStepIntro
        eyebrow="Contraception"
        title="A few safety checks"
        description="These answers help check whether this online pathway is suitable. If it is not, we will explain the next safe step before payment."
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
            onChange={(value) => setAnswer("contraceptionType", value)}
            ariaLabel="What would you like?"
            columns="two"
          />
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
            onChange={(value) => setAnswer("contraceptionCurrent", value)}
            ariaLabel="Are you currently using contraception?"
            columns="auto"
          />
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
            onChange={(value) => setAnswer("pregnancyStatus", value)}
            ariaLabel="Are you pregnant or could you be pregnant?"
            columns="three"
          />
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
                Some contraceptive pills may not be safe when these apply. We will explain the next safe step before payment.
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
                onChange={(value) => setAnswer(q.key, value)}
                ariaLabel={q.label}
              />
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
function UTIAssessment({ serviceType, onNext, onBack, answers, setAnswer, setAnswers, router }: {
  serviceType: UnifiedServiceType
  onNext: () => void
  onBack: () => void
  answers: Record<string, unknown>
  setAnswer: (key: string, value: unknown) => void
  setAnswers: (answers: Record<string, unknown>) => void
  router: ReturnType<typeof useRouter>
}) {
  const posthog = usePostHog()
  const utiSymptoms = answers.utiSymptoms as string[] | undefined
  const utiRedFlags = answers.utiRedFlags as "no" | "yes" | undefined
  const utiPregnant = (answers.utiPregnant as string) || ""
  const utiDetails = (answers.utiDetails as string) || ""
  const isComplete = Boolean(utiSymptoms && utiSymptoms.length > 0 && utiRedFlags === 'no' && utiPregnant === 'no')
  const terminalBlock = deriveUtiTerminalBlock(answers)

  const handlePregnancyChange = (value: string) => setAnswer("utiPregnant", value)

  const handleRedFlagsChange = (value: string) => setAnswer("utiRedFlags", value)

  // Gates on isComplete, which (unlike the removed validate()) requires an
  // explicit "no" to the red-flag and pregnancy checks rather than merely an
  // answer. deriveUtiTerminalBlock already intercepts a "yes" before this
  // button renders; keying the gate to the same value the terminal block reads
  // means the two can no longer disagree.
  const handleNext = () => {
    if (!isComplete) {
      showBlockingReasons()
      return
    }
    onNext()
  }

  const toggleSymptom = (symptom: string) => {
    const current = utiSymptoms || []
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
          <XCircle className="h-5 w-5" aria-hidden="true" />
          <AlertTitle className="font-semibold">{terminalBlock.title}</AlertTitle>
          <AlertDescription className="mt-2 text-base">{terminalBlock.reason}</AlertDescription>
        </Alert>
        <div className="flex flex-col gap-2 pt-2">
          <Button variant="outline" onClick={() => router.push('/')} className="h-12 w-full">Return home</Button>
          <Button
            variant="ghost"
            onClick={() => {
              setAnswers(buildUtiTerminalBlockCorrection(terminalBlock))
            }}
            className="h-12 w-full"
          >
            {terminalBlock.answerKeysToClear.length === 1
              ? "I need to correct this answer"
              : "I need to correct these answers"}
          </Button>
          <Button variant="ghost" onClick={onBack} className="h-12 w-full">Go back</Button>
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
