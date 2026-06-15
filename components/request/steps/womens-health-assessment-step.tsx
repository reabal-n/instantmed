"use client"

import { AlertCircle, ShieldCheck, Sparkles, XCircle } from "lucide-react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"

import { ChipToggleGroup, IntakeStepIntro, QuestionCard, QuestionPrompt, SegmentedChoiceGroup, StringBinaryChoice } from "@/components/request/shared/intake-step-primitives"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import type { UnifiedServiceType } from "@/lib/request/step-registry"
import { cn } from "@/lib/utils"

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

export default function WomensHealthAssessmentStep({ onNext, onBack }: WomensHealthAssessmentStepProps) {
  const router = useRouter()
  const { answers, setAnswer } = useRequestStore()
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isBlocked, setIsBlocked] = useState(false)
  const [blockReason, setBlockReason] = useState("")

  const womensHealthOption = answers.womensHealthOption as string | undefined

  // Render different assessments based on option
  switch (womensHealthOption) {
    case 'contraception':
    case 'ocp_new':
    case 'ocp_repeat':
      return <ContraceptionAssessment onNext={onNext} answers={answers} setAnswer={setAnswer} errors={errors} setErrors={setErrors} ocpType={womensHealthOption === 'ocp_repeat' ? 'repeat' : womensHealthOption === 'ocp_new' ? 'new' : undefined} />
    case 'morning_after':
      return <MorningAfterAssessment onNext={onNext} onBack={onBack} answers={answers} setAnswer={setAnswer} errors={errors} setErrors={setErrors} isBlocked={isBlocked} setIsBlocked={setIsBlocked} blockReason={blockReason} setBlockReason={setBlockReason} router={router} />
    case 'uti':
      return <UTIAssessment onNext={onNext} onBack={onBack} answers={answers} setAnswer={setAnswer} errors={errors} setErrors={setErrors} isBlocked={isBlocked} setIsBlocked={setIsBlocked} blockReason={blockReason} setBlockReason={setBlockReason} router={router} />
    case 'period_pain':
      return <PeriodPainAssessment onNext={onNext} answers={answers} setAnswer={setAnswer} errors={errors} setErrors={setErrors} />
    case 'other':
    default:
      return <GeneralWomensAssessment onNext={onNext} answers={answers} setAnswer={setAnswer} errors={errors} setErrors={setErrors} />
  }
}

// Contraception assessment
function ContraceptionAssessment({ onNext, answers, setAnswer, errors, setErrors, ocpType }: {
  onNext: () => void
  answers: Record<string, unknown>
  setAnswer: (key: string, value: unknown) => void
  errors: Record<string, string>
  setErrors: (errors: Record<string, string>) => void
  ocpType?: 'new' | 'repeat'
}) {
  // Auto-set contraception type from OCP selection if not already set
  const resolvedType = ocpType === 'repeat' ? 'continue' : undefined
  useEffect(() => {
    if (resolvedType && !answers.contraceptionType) {
      setAnswer("contraceptionType", resolvedType)
    }
  }, [resolvedType, answers.contraceptionType, setAnswer])
  const contraceptionType = (answers.contraceptionType as string | undefined) || resolvedType
  const contraceptionCurrent = (answers.contraceptionCurrent as string) || ""
  const pregnancyStatus = (answers.pregnancyStatus as string) || ""
  const lastPeriod = (answers.lastPeriod as string) || ""
  const contraceptionDetails = (answers.contraceptionDetails as string) || ""
  // Combined-pill safety screen (new/switch pill only). Drives the REQUIRES_CALL
  // contraindication rules; doctor steers to a progestogen-only option if needed.
  const migraineAura = (answers.womens_migraine_aura as string) || ""
  const bloodClotHistory = (answers.womens_blood_clot_history as string) || ""
  const smoker = (answers.womens_smoker as string) || ""
  const needsPillSafetyScreen = ocpType === "new"

  // If pregnant, flag for doctor call
  const handlePregnancyChange = (value: string) => {
    setAnswer("pregnancyStatus", value)
    if (value === 'yes') {
      setAnswer("requiresCall", true)
    } else if (answers.requiresCall) {
      // Only clear if we were the ones who set it
      setAnswer("requiresCall", false)
    }
  }

  const validate = () => {
    const newErrors: Record<string, string> = {}
    if (!contraceptionType) newErrors.contraceptionType = "Please select an option"
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
    if (validate()) onNext()
  }

  const isComplete = contraceptionType && contraceptionCurrent && pregnancyStatus
    && (!needsPillSafetyScreen || (migraineAura && bloodClotHistory && smoker))

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
              { value: "continue", label: "Continue" },
            ]}
            value={contraceptionType}
            onChange={(value) => setAnswer("contraceptionType", value)}
            ariaLabel="What would you like?"
            columns="three"
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
              { value: "none", label: "No" },
            ]}
            value={contraceptionCurrent}
            onChange={(value) => setAnswer("contraceptionCurrent", value)}
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
                onChange={(value) => setAnswer(q.key, value)}
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

      <Button data-intake-primary-action="true" data-intake-primary-label="Continue" onClick={handleNext} disabled={!isComplete} className="w-full h-12 text-base font-medium max-sm:hidden">Continue</Button>
    </div>
  )
}

// Morning-after pill assessment
function MorningAfterAssessment({ onNext, onBack, answers, setAnswer, errors, setErrors, isBlocked, setIsBlocked, blockReason, setBlockReason, router }: {
  onNext: () => void
  onBack: () => void
  answers: Record<string, unknown>
  setAnswer: (key: string, value: unknown) => void
  errors: Record<string, string>
  setErrors: (errors: Record<string, string>) => void
  isBlocked: boolean
  setIsBlocked: (blocked: boolean) => void
  blockReason: string
  setBlockReason: (reason: string) => void
  router: ReturnType<typeof useRouter>
}) {
  const hoursSinceIntercourse = (answers.hoursSinceIntercourse as string) || ""
  const mapDetails = (answers.mapDetails as string) || ""

  const handleHoursChange = (value: string) => {
    setAnswer("hoursSinceIntercourse", value)
    
    // Hard block if >120h
    if (value === 'over_120') {
      setIsBlocked(true)
      setBlockReason("Emergency contraception is not effective after 120 hours (5 days). Please consult your GP or sexual health clinic for advice.")
    }
  }

  const validate = () => {
    const newErrors: Record<string, string> = {}
    if (!hoursSinceIntercourse) newErrors.hoursSinceIntercourse = "Please select an option"
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleNext = () => {
    if (validate()) onNext()
  }

  if (isBlocked) {
    return (
      <div className="space-y-6">
        <Alert variant="destructive" className="border-destructive/50">
          <XCircle className="w-5 h-5" />
          <AlertTitle className="font-semibold">This service is not suitable</AlertTitle>
          <AlertDescription className="mt-2 text-sm">{blockReason}</AlertDescription>
        </Alert>
        <div className="flex flex-col gap-2 pt-2">
          <Button variant="outline" onClick={() => router.push('/')} className="w-full">Return home</Button>
          <Button variant="ghost" onClick={onBack} className="w-full">Go back</Button>
        </div>
      </div>
    )
  }

  const isComplete = hoursSinceIntercourse && hoursSinceIntercourse !== 'over_120'

  return (
    <div className="space-y-6">
      <Alert variant="default" className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30">
        <Sparkles className="w-4 h-4 text-warning" />
        <AlertDescription className="text-xs text-warning">
          Emergency contraception is most effective when taken as soon as possible.
        </AlertDescription>
      </Alert>

      <div className="space-y-3">
        <Label className="text-sm font-medium">
          How long ago was the unprotected intercourse?<span className="text-destructive ml-0.5">*</span>
        </Label>
        <RadioGroup value={hoursSinceIntercourse} onValueChange={handleHoursChange} className="space-y-2" aria-label="How long ago was the unprotected intercourse">
          {[
            { value: 'under_24', label: 'Less than 24 hours' },
            { value: '24_to_72', label: '24-72 hours (1-3 days)' },
            { value: '72_to_120', label: '72-120 hours (3-5 days)', note: 'Ulipristal (EllaOne) may still be effective' },
            { value: 'over_120', label: 'More than 120 hours (5+ days)' },
          ].map((opt) => (
            <label key={opt.value} className={cn("flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-[background-color,border-color]", hoursSinceIntercourse === opt.value ? "border-primary bg-primary/5" : "border-border hover:border-primary/50")}>
              <RadioGroupItem value={opt.value} />
              <div>
                <span className="text-sm">{opt.label}</span>
                {opt.note && <span className="text-xs text-muted-foreground block">{opt.note}</span>}
              </div>
            </label>
          ))}
        </RadioGroup>
        {errors.hoursSinceIntercourse && <p className="text-xs text-destructive flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.hoursSinceIntercourse}</p>}
      </div>

      <div className="space-y-2">
        <Label className="text-sm font-medium">Anything else relevant?</Label>
        <Textarea value={mapDetails} onChange={(e) => setAnswer("mapDetails", e.target.value)} placeholder="Optional: contraception normally used, any concerns..." className="min-h-[80px] resize-none" />
      </div>

      <Button data-intake-primary-action="true" data-intake-primary-label="Continue" onClick={handleNext} disabled={!isComplete} className="w-full h-12 text-base font-medium max-sm:hidden">Continue</Button>
    </div>
  )
}

// UTI assessment
function UTIAssessment({ onNext, onBack, answers, setAnswer, errors, setErrors, isBlocked, setIsBlocked, blockReason, setBlockReason, router }: {
  onNext: () => void
  onBack: () => void
  answers: Record<string, unknown>
  setAnswer: (key: string, value: unknown) => void
  errors: Record<string, string>
  setErrors: (errors: Record<string, string>) => void
  isBlocked: boolean
  setIsBlocked: (blocked: boolean) => void
  blockReason: string
  setBlockReason: (reason: string) => void
  router: ReturnType<typeof useRouter>
}) {
  const utiSymptoms = answers.utiSymptoms as string[] | undefined
  const utiRedFlags = (answers.utiRedFlags as string) || ""
  const utiPregnant = (answers.utiPregnant as string) || ""
  const utiDetails = (answers.utiDetails as string) || ""

  const handlePregnancyChange = (value: string) => {
    setAnswer("utiPregnant", value)
    if (value === 'yes' || value === 'not_sure') {
      setIsBlocked(true)
      setBlockReason("UTIs during pregnancy need in-person assessment. Please see your GP or visit a clinic for safe treatment.")
    }
  }

  const handleRedFlagsChange = (value: string) => {
    setAnswer("utiRedFlags", value)
    
    if (value === 'yes') {
      setIsBlocked(true)
      setBlockReason("Symptoms like fever, back/flank pain, or feeling very unwell may indicate a kidney infection which requires urgent in-person medical care. Please see a GP or visit urgent care today.")
    }
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
    if (validate()) onNext()
  }

  const toggleSymptom = (symptom: string) => {
    const current = utiSymptoms || []
    if (current.includes(symptom)) {
      setAnswer("utiSymptoms", current.filter(s => s !== symptom))
    } else {
      setAnswer("utiSymptoms", [...current, symptom])
    }
  }

  if (isBlocked) {
    return (
      <div className="space-y-6">
        <Alert variant="destructive" className="border-destructive/50">
          <XCircle className="w-5 h-5" />
          <AlertTitle className="font-semibold">Please seek urgent care</AlertTitle>
          <AlertDescription className="mt-2 text-sm">{blockReason}</AlertDescription>
        </Alert>
        <div className="flex flex-col gap-2 pt-2">
          <Button variant="outline" onClick={() => router.push('/')} className="w-full">Return home</Button>
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

  const isComplete = utiSymptoms && utiSymptoms.length > 0 && utiRedFlags === 'no' && utiPregnant === 'no'

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
            value={utiRedFlags as "no" | "yes" | undefined}
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

      <Button data-intake-primary-action="true" data-intake-primary-label="Continue" onClick={handleNext} disabled={!isComplete} className="w-full h-12 text-base font-medium max-sm:hidden">Continue</Button>
    </div>
  )
}

// Period pain assessment
function PeriodPainAssessment({ onNext, answers, setAnswer, errors, setErrors }: {
  onNext: () => void
  answers: Record<string, unknown>
  setAnswer: (key: string, value: unknown) => void
  errors: Record<string, string>
  setErrors: (errors: Record<string, string>) => void
}) {
  const periodPainSeverity = (answers.periodPainSeverity as string) || ""
  const periodPainTiming = (answers.periodPainTiming as string) || ""
  const periodPainTreated = answers.periodPainTreated as string[] | undefined
  const periodPainImpact = (answers.periodPainImpact as string) || ""
  const periodPainDetails = (answers.periodPainDetails as string) || ""

  const validate = () => {
    const newErrors: Record<string, string> = {}
    if (!periodPainSeverity) newErrors.periodPainSeverity = "Please select pain severity"
    if (!periodPainTiming) newErrors.periodPainTiming = "Please select when pain starts"
    if (!periodPainImpact) newErrors.periodPainImpact = "Please select impact on daily activities"
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleNext = () => {
    if (validate()) onNext()
  }

  const toggleTreatment = (treatment: string) => {
    const current = periodPainTreated || []
    if (current.includes(treatment)) {
      setAnswer("periodPainTreated", current.filter(t => t !== treatment))
    } else {
      setAnswer("periodPainTreated", [...current, treatment])
    }
  }

  const isComplete = periodPainSeverity && periodPainTiming && periodPainImpact

  const TREATMENTS = [
    { key: 'ibuprofen', label: 'Ibuprofen / Nurofen' },
    { key: 'naproxen', label: 'Naproxen / Ponstan (mefenamic acid)' },
    { key: 'paracetamol', label: 'Paracetamol' },
    { key: 'ocp', label: 'Oral contraceptive pill' },
    { key: 'heat', label: 'Heat pad / hot water bottle' },
    { key: 'none', label: 'Nothing tried yet' },
  ]

  return (
    <div className="space-y-6">
      <Alert variant="default" className="border-primary/20 bg-primary/5">
        <Sparkles className="w-4 h-4" />
        <AlertDescription className="text-xs">
          Tell us about your period pain so the doctor can recommend appropriate treatment.
        </AlertDescription>
      </Alert>

      {/* Severity */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">
          How would you describe the pain severity?<span className="text-destructive ml-0.5">*</span>
        </Label>
        <RadioGroup value={periodPainSeverity} onValueChange={(v) => setAnswer("periodPainSeverity", v)} className="space-y-2" aria-label="Period pain severity">
          {[
            { value: 'mild', label: 'Mild', description: 'Noticeable but manageable without medication' },
            { value: 'moderate', label: 'Moderate', description: 'Needs pain relief, limits some activities' },
            { value: 'severe', label: 'Severe', description: 'Strong medication needed, significant limitation' },
            { value: 'debilitating', label: 'Debilitating', description: 'Unable to function normally, may miss work or school' },
          ].map((opt) => (
            <label key={opt.value} className={cn("flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-[background-color,border-color]", periodPainSeverity === opt.value ? "border-primary bg-primary/5" : "border-border hover:border-primary/50")}>
              <RadioGroupItem value={opt.value} className="mt-0.5" />
              <div>
                <span className="text-sm font-medium">{opt.label}</span>
                <span className="text-xs text-muted-foreground block">{opt.description}</span>
              </div>
            </label>
          ))}
        </RadioGroup>
        {errors.periodPainSeverity && <p className="text-xs text-destructive flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.periodPainSeverity}</p>}
      </div>

      {/* Timing */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">
          When does the pain typically start?<span className="text-destructive ml-0.5">*</span>
        </Label>
        <RadioGroup value={periodPainTiming} onValueChange={(v) => setAnswer("periodPainTiming", v)} className="space-y-2" aria-label="When does period pain start">
          {[
            { value: 'before', label: 'Before my period starts (1–2 days before)' },
            { value: 'day1', label: 'On day 1 of my period' },
            { value: 'day2_3', label: 'Day 2–3 of my period' },
            { value: 'throughout', label: 'Throughout most of my period' },
          ].map((opt) => (
            <label key={opt.value} className={cn("flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-[background-color,border-color]", periodPainTiming === opt.value ? "border-primary bg-primary/5" : "border-border hover:border-primary/50")}>
              <RadioGroupItem value={opt.value} />
              <span className="text-sm">{opt.label}</span>
            </label>
          ))}
        </RadioGroup>
        {errors.periodPainTiming && <p className="text-xs text-destructive flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.periodPainTiming}</p>}
      </div>

      {/* Treatments tried */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">What have you tried for pain relief?</Label>
        <p className="text-xs text-muted-foreground -mt-1">Toggle on anything you&apos;ve used.</p>
        <div className="space-y-2">
          {TREATMENTS.map((t) => (
            <div key={t.key} className="flex items-center justify-between gap-3 p-3 rounded-xl border bg-muted/30">
              <Label htmlFor={`pp-${t.key}`} className="text-sm cursor-pointer leading-snug flex-1">{t.label}</Label>
              <Switch
                id={`pp-${t.key}`}
                checked={periodPainTreated?.includes(t.key) ?? false}
                onCheckedChange={() => toggleTreatment(t.key)}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Impact */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">
          How does it affect your daily activities?<span className="text-destructive ml-0.5">*</span>
        </Label>
        <RadioGroup value={periodPainImpact} onValueChange={(v) => setAnswer("periodPainImpact", v)} className="space-y-2" aria-label="Impact on daily activities">
          {[
            { value: 'none', label: 'Minimal impact - I can carry on as normal' },
            { value: 'reduced', label: 'Reduced capacity - I slow down but manage' },
            { value: 'stops_activities', label: 'Stops some activities - rest or light duties only' },
            { value: 'cannot_function', label: 'I can\'t function - miss work, school, or social plans' },
          ].map((opt) => (
            <label key={opt.value} className={cn("flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-[background-color,border-color]", periodPainImpact === opt.value ? "border-primary bg-primary/5" : "border-border hover:border-primary/50")}>
              <RadioGroupItem value={opt.value} />
              <span className="text-sm">{opt.label}</span>
            </label>
          ))}
        </RadioGroup>
        {errors.periodPainImpact && <p className="text-xs text-destructive flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.periodPainImpact}</p>}
      </div>

      {/* Additional info */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Anything else relevant?</Label>
        <Textarea value={periodPainDetails} onChange={(e) => setAnswer("periodPainDetails", e.target.value)} placeholder="Optional: associated symptoms (nausea, bloating), suspected endometriosis, cycle regularity..." className="min-h-[80px] resize-none" />
      </div>

      <Button data-intake-primary-action="true" data-intake-primary-label="Continue" onClick={handleNext} disabled={!isComplete} className="w-full h-12 text-base font-medium max-sm:hidden">Continue</Button>
    </div>
  )
}

// General women's health assessment
function GeneralWomensAssessment({ onNext, answers, setAnswer, errors, setErrors }: {
  onNext: () => void
  answers: Record<string, unknown>
  setAnswer: (key: string, value: unknown) => void
  errors: Record<string, string>
  setErrors: (errors: Record<string, string>) => void
}) {
  const womensDetails = (answers.womensDetails as string) || ""

  const validate = () => {
    const newErrors: Record<string, string> = {}
    if (!womensDetails || womensDetails.length < 20) {
      newErrors.womensDetails = "Please provide more detail (at least 20 characters)"
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleNext = () => {
    if (validate()) onNext()
  }

  const isComplete = womensDetails.length >= 20

  return (
    <div className="space-y-6">
      <Alert variant="default" className="border-primary/20 bg-primary/5">
        <Sparkles className="w-4 h-4" />
        <AlertDescription className="text-xs">
          Please describe your concern and our doctor will review your request.
        </AlertDescription>
      </Alert>

      <div className="space-y-2">
        <Label className="text-sm font-medium">
          Please describe your concern<span className="text-destructive ml-0.5">*</span>
        </Label>
        <Textarea value={womensDetails} onChange={(e) => setAnswer("womensDetails", e.target.value)} placeholder="Describe your symptoms, how long you've had them, and any relevant history..." className="min-h-[120px] resize-none" />
        {errors.womensDetails && <p className="text-xs text-destructive flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.womensDetails}</p>}
        <p className="text-xs text-muted-foreground">{womensDetails.length}/20 characters minimum</p>
      </div>

      <Button data-intake-primary-action="true" data-intake-primary-label="Continue" onClick={handleNext} disabled={!isComplete} className="w-full h-12 text-base font-medium max-sm:hidden">Continue</Button>
    </div>
  )
}
