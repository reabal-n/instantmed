"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ShieldAlert, AlertTriangle, XCircle } from "lucide-react"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { cn } from "@/lib/utils"
import { useRequestStore } from "../store"
import type { UnifiedServiceType } from "@/lib/request/step-registry"

interface EdSafetyStepProps {
  serviceType: UnifiedServiceType
  onNext: () => void
  onBack: () => void
  onComplete: () => void
}

const SAFETY_QUESTIONS = [
  {
    id: 'nitrates',
    question: 'Do you take nitrates (e.g., GTN spray, Anginine, Imdur) or any medication for chest pain?',
    hardBlock: true,
    blockReason: 'ED medications can cause a dangerous drop in blood pressure when combined with nitrates. Please see your GP or cardiologist.',
  },
  {
    id: 'recentHeartEvent',
    question: 'Have you had a heart attack, stroke, or unstable angina in the last 6 months?',
    hardBlock: true,
    blockReason: 'For your safety, ED medications are not suitable within 6 months of a major cardiac event. Please consult your cardiologist.',
  },
  {
    id: 'severeHeartCondition',
    question: 'Do you have severe or uncontrolled heart disease, very low blood pressure, or a condition called "HOCM"?',
    hardBlock: true,
    blockReason: 'ED medications may not be safe for your condition. Please discuss with your cardiologist or GP.',
  },
  {
    id: 'previousEdMeds',
    question: 'Have you tried ED medication before?',
    hardBlock: false,
  },
]

export default function EdSafetyStep({ onNext, onBack }: EdSafetyStepProps) {
  const router = useRouter()
  const { answers, setAnswer } = useRequestStore()
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [isBlocked, setIsBlocked] = useState(false)
  const [blockReason, setBlockReason] = useState("")

  const handleAnswer = (questionId: string, value: string) => {
    setAnswer(`edSafety_${questionId}`, value)
    
    const question = SAFETY_QUESTIONS[currentQuestion]
    
    // Check for hard block
    if (question.hardBlock && value === 'yes') {
      setIsBlocked(true)
      setBlockReason(question.blockReason || '')
      return
    }
    
    // Move to next question or complete
    if (currentQuestion < SAFETY_QUESTIONS.length - 1) {
      setCurrentQuestion(currentQuestion + 1)
    } else {
      onNext()
    }
  }

  const currentQ = SAFETY_QUESTIONS[currentQuestion]
  const currentAnswer = answers[`edSafety_${currentQ.id}`] as string | undefined

  // Hard block screen
  if (isBlocked) {
    return (
      <div className="space-y-6 animate-in fade-in">
        <Alert variant="destructive" className="border-destructive/50">
          <XCircle className="w-5 h-5" />
          <AlertTitle className="font-semibold">
            This service is not suitable for you
          </AlertTitle>
          <AlertDescription className="mt-2 text-sm">
            {blockReason}
          </AlertDescription>
        </Alert>

        <div className="p-4 rounded-xl border bg-muted/30 space-y-3">
          <h4 className="text-sm font-medium">What you can do</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
              <span>Book an appointment with your GP or cardiologist</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
              <span>They can assess your situation in person and discuss safe options</span>
            </li>
          </ul>
        </div>

        <div className="flex flex-col gap-2 pt-2">
          <Button
            variant="outline"
            onClick={() => router.push('/')}
            className="w-full"
          >
            Return home
          </Button>
          <Button
            variant="ghost"
            onClick={onBack}
            className="w-full"
          >
            Go back
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Progress indicator */}
      <div className="flex gap-1.5">
        {SAFETY_QUESTIONS.map((_, i) => (
          <div
            key={i}
            className={cn(
              "h-1 flex-1 rounded-full transition-colors",
              i < currentQuestion ? "bg-primary" :
              i === currentQuestion ? "bg-primary/50" : "bg-muted"
            )}
          />
        ))}
      </div>

      {/* Safety notice */}
      <Alert variant="default" className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30">
        <ShieldAlert className="w-4 h-4 text-amber-600" />
        <AlertDescription className="text-xs text-amber-700 dark:text-amber-300">
          These questions help ensure ED medication is safe for you. Please answer honestly.
        </AlertDescription>
      </Alert>

      {/* Current question */}
      <div className="space-y-4">
        <Label className="text-base font-medium leading-relaxed">
          {currentQ.question}
          <span className="text-destructive ml-0.5">*</span>
        </Label>

        <RadioGroup
          value={currentAnswer}
          onValueChange={(value) => handleAnswer(currentQ.id, value)}
          className="space-y-2"
        >
          <label
            className={cn(
              "flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all",
              currentAnswer === 'yes'
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/50"
            )}
          >
            <RadioGroupItem value="yes" />
            <span className="text-sm font-medium">Yes</span>
          </label>
          <label
            className={cn(
              "flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all",
              currentAnswer === 'no'
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/50"
            )}
          >
            <RadioGroupItem value="no" />
            <span className="text-sm font-medium">No</span>
          </label>
        </RadioGroup>
      </div>

      {/* Warning for hard-block questions */}
      {currentQ.hardBlock && (
        <div className="flex items-start gap-2 text-xs text-muted-foreground">
          <AlertTriangle className="w-3.5 h-3.5 mt-0.5 text-amber-500 shrink-0" />
          <span>Answering &quot;Yes&quot; may mean this service is not suitable for you.</span>
        </div>
      )}
    </div>
  )
}
