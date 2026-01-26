"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Sparkles, AlertCircle, XCircle } from "lucide-react"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { cn } from "@/lib/utils"
import { useRequestStore } from "../store"
import type { UnifiedServiceType } from "@/lib/request/step-registry"

interface WomensHealthAssessmentStepProps {
  serviceType: UnifiedServiceType
  onNext: () => void
  onBack: () => void
  onComplete: () => void
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
      return <ContraceptionAssessment onNext={onNext} answers={answers} setAnswer={setAnswer} errors={errors} setErrors={setErrors} />
    case 'morning_after':
      return <MorningAfterAssessment onNext={onNext} onBack={onBack} answers={answers} setAnswer={setAnswer} errors={errors} setErrors={setErrors} isBlocked={isBlocked} setIsBlocked={setIsBlocked} blockReason={blockReason} setBlockReason={setBlockReason} router={router} />
    case 'uti':
      return <UTIAssessment onNext={onNext} onBack={onBack} answers={answers} setAnswer={setAnswer} errors={errors} setErrors={setErrors} isBlocked={isBlocked} setIsBlocked={setIsBlocked} blockReason={blockReason} setBlockReason={setBlockReason} router={router} />
    case 'period_pain':
    case 'other':
    default:
      return <GeneralWomensAssessment onNext={onNext} answers={answers} setAnswer={setAnswer} errors={errors} setErrors={setErrors} />
  }
}

// Contraception assessment
function ContraceptionAssessment({ onNext, answers, setAnswer, errors, setErrors }: {
  onNext: () => void
  answers: Record<string, unknown>
  setAnswer: (key: string, value: unknown) => void
  errors: Record<string, string>
  setErrors: (errors: Record<string, string>) => void
}) {
  const contraceptionType = answers.contraceptionType as string | undefined
  const contraceptionCurrent = answers.contraceptionCurrent as string | undefined
  const lastPeriod = (answers.lastPeriod as string) || ""
  const contraceptionDetails = (answers.contraceptionDetails as string) || ""

  const validate = () => {
    const newErrors: Record<string, string> = {}
    if (!contraceptionType) newErrors.contraceptionType = "Please select an option"
    if (!contraceptionCurrent) newErrors.contraceptionCurrent = "Please select an option"
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleNext = () => {
    if (validate()) onNext()
  }

  const isComplete = contraceptionType && contraceptionCurrent

  return (
    <div className="space-y-6 animate-in fade-in">
      <Alert variant="default" className="border-primary/20 bg-primary/5">
        <Sparkles className="w-4 h-4" />
        <AlertDescription className="text-xs">
          We&apos;ll ask a few questions to ensure contraception is safe and suitable for you.
        </AlertDescription>
      </Alert>

      <div className="space-y-3">
        <Label className="text-sm font-medium">
          What would you like?<span className="text-destructive ml-0.5">*</span>
        </Label>
        <RadioGroup value={contraceptionType} onValueChange={(v) => setAnswer("contraceptionType", v)} className="space-y-2">
          {[
            { value: 'start', label: 'Start contraception for the first time' },
            { value: 'continue', label: 'Continue / repeat my current contraception' },
            { value: 'switch', label: 'Switch to a different type' },
          ].map((opt) => (
            <label key={opt.value} className={cn("flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all", contraceptionType === opt.value ? "border-primary bg-primary/5" : "border-border hover:border-primary/50")}>
              <RadioGroupItem value={opt.value} />
              <span className="text-sm">{opt.label}</span>
            </label>
          ))}
        </RadioGroup>
        {errors.contraceptionType && <p className="text-xs text-destructive flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.contraceptionType}</p>}
      </div>

      <div className="space-y-3">
        <Label className="text-sm font-medium">
          Are you currently using any contraception?<span className="text-destructive ml-0.5">*</span>
        </Label>
        <RadioGroup value={contraceptionCurrent} onValueChange={(v) => setAnswer("contraceptionCurrent", v)} className="space-y-2">
          {[
            { value: 'pill', label: 'Yes, the pill' },
            { value: 'iud', label: 'Yes, IUD / implant' },
            { value: 'other', label: 'Yes, other method' },
            { value: 'none', label: 'No' },
          ].map((opt) => (
            <label key={opt.value} className={cn("flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all", contraceptionCurrent === opt.value ? "border-primary bg-primary/5" : "border-border hover:border-primary/50")}>
              <RadioGroupItem value={opt.value} />
              <span className="text-sm">{opt.label}</span>
            </label>
          ))}
        </RadioGroup>
        {errors.contraceptionCurrent && <p className="text-xs text-destructive flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.contraceptionCurrent}</p>}
      </div>

      <div className="space-y-2">
        <Label className="text-sm font-medium">When was your last period? (approximate)</Label>
        <Input value={lastPeriod} onChange={(e) => setAnswer("lastPeriod", e.target.value)} placeholder="e.g., 2 weeks ago" className="h-11" />
      </div>

      <div className="space-y-2">
        <Label className="text-sm font-medium">Anything else relevant?</Label>
        <Textarea value={contraceptionDetails} onChange={(e) => setAnswer("contraceptionDetails", e.target.value)} placeholder="Optional: specific concerns, brand preferences..." className="min-h-[80px] resize-none" />
      </div>

      <Button onClick={handleNext} disabled={!isComplete} className="w-full h-12 text-base font-medium">Continue</Button>
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
  const hoursSinceIntercourse = answers.hoursSinceIntercourse as string | undefined
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
      <div className="space-y-6 animate-in fade-in">
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
    <div className="space-y-6 animate-in fade-in">
      <Alert variant="default" className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30">
        <Sparkles className="w-4 h-4 text-amber-600" />
        <AlertDescription className="text-xs text-amber-700 dark:text-amber-300">
          Emergency contraception is most effective when taken as soon as possible.
        </AlertDescription>
      </Alert>

      <div className="space-y-3">
        <Label className="text-sm font-medium">
          How long ago was the unprotected intercourse?<span className="text-destructive ml-0.5">*</span>
        </Label>
        <RadioGroup value={hoursSinceIntercourse} onValueChange={handleHoursChange} className="space-y-2">
          {[
            { value: 'under_24', label: 'Less than 24 hours' },
            { value: '24_to_72', label: '24-72 hours (1-3 days)' },
            { value: '72_to_120', label: '72-120 hours (3-5 days)', note: 'Ulipristal (EllaOne) may still be effective' },
            { value: 'over_120', label: 'More than 120 hours (5+ days)' },
          ].map((opt) => (
            <label key={opt.value} className={cn("flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all", hoursSinceIntercourse === opt.value ? "border-primary bg-primary/5" : "border-border hover:border-primary/50")}>
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

      <Button onClick={handleNext} disabled={!isComplete} className="w-full h-12 text-base font-medium">Continue</Button>
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
  const utiRedFlags = answers.utiRedFlags as string | undefined
  const utiDetails = (answers.utiDetails as string) || ""

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
      <div className="space-y-6 animate-in fade-in">
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
    { value: 'burning', label: 'Burning or stinging when urinating' },
    { value: 'frequency', label: 'Needing to urinate more often' },
    { value: 'urgency', label: 'Urgent need to urinate' },
    { value: 'incomplete', label: 'Feeling like bladder isn\'t empty' },
    { value: 'blood', label: 'Blood in urine' },
    { value: 'cloudy', label: 'Cloudy or smelly urine' },
  ]

  const isComplete = utiSymptoms && utiSymptoms.length > 0 && utiRedFlags === 'no'

  return (
    <div className="space-y-6 animate-in fade-in">
      <Alert variant="default" className="border-primary/20 bg-primary/5">
        <Sparkles className="w-4 h-4" />
        <AlertDescription className="text-xs">
          UTI treatment is available without a call for uncomplicated cases.
        </AlertDescription>
      </Alert>

      <div className="space-y-3">
        <Label className="text-sm font-medium">
          Which symptoms are you experiencing?<span className="text-destructive ml-0.5">*</span>
        </Label>
        <div className="space-y-2">
          {SYMPTOMS.map((symptom) => (
            <button key={symptom.value} type="button" onClick={() => toggleSymptom(symptom.value)} className={cn("w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all", utiSymptoms?.includes(symptom.value) ? "border-primary bg-primary/5" : "border-border hover:border-primary/50")}>
              <div className={cn("w-5 h-5 rounded border-2 flex items-center justify-center shrink-0", utiSymptoms?.includes(symptom.value) ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground")}>
                {utiSymptoms?.includes(symptom.value) && <span className="text-xs">✓</span>}
              </div>
              <span className="text-sm">{symptom.label}</span>
            </button>
          ))}
        </div>
        {errors.utiSymptoms && <p className="text-xs text-destructive flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.utiSymptoms}</p>}
      </div>

      <div className="space-y-3">
        <Label className="text-sm font-medium">
          Do you have any of these symptoms: fever, back/flank pain, feeling very unwell, vomiting?<span className="text-destructive ml-0.5">*</span>
        </Label>
        <RadioGroup value={utiRedFlags} onValueChange={handleRedFlagsChange} className="space-y-2">
          <label className={cn("flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all", utiRedFlags === 'yes' ? "border-primary bg-primary/5" : "border-border hover:border-primary/50")}>
            <RadioGroupItem value="yes" />
            <span className="text-sm">Yes</span>
          </label>
          <label className={cn("flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all", utiRedFlags === 'no' ? "border-primary bg-primary/5" : "border-border hover:border-primary/50")}>
            <RadioGroupItem value="no" />
            <span className="text-sm">No</span>
          </label>
        </RadioGroup>
        {errors.utiRedFlags && <p className="text-xs text-destructive flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.utiRedFlags}</p>}
      </div>

      <div className="space-y-2">
        <Label className="text-sm font-medium">Anything else relevant?</Label>
        <Textarea value={utiDetails} onChange={(e) => setAnswer("utiDetails", e.target.value)} placeholder="Optional: how long symptoms, previous UTIs..." className="min-h-[80px] resize-none" />
      </div>

      <Button onClick={handleNext} disabled={!isComplete} className="w-full h-12 text-base font-medium">Continue</Button>
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
    <div className="space-y-6 animate-in fade-in">
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

      <Button onClick={handleNext} disabled={!isComplete} className="w-full h-12 text-base font-medium">Continue</Button>
    </div>
  )
}
