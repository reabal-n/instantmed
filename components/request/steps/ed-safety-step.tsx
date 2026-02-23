"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ShieldAlert, AlertTriangle, XCircle } from "lucide-react"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
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
    absoluteBlock: true, // No follow-up — drug interaction is dangerous regardless
    blockReason: 'ED medications can cause a dangerous drop in blood pressure when combined with nitrates. Please see your GP or cardiologist.',
  },
  {
    id: 'recentHeartEvent',
    question: 'Have you had a heart attack, stroke, or unstable angina in the last 6 months?',
    hardBlock: true,
    absoluteBlock: false,
    blockReason: 'For your safety, ED medications are not suitable within 6 months of a major cardiac event. Please consult your cardiologist.',
  },
  {
    id: 'severeHeartCondition',
    question: 'Do you have severe or uncontrolled heart disease, very low blood pressure, or a condition called "HOCM"?',
    hardBlock: true,
    absoluteBlock: false,
    blockReason: 'ED medications may not be safe for your condition. Please discuss with your cardiologist or GP.',
  },
  {
    id: 'previousEdMeds',
    question: 'Have you tried ED medication before?',
    hardBlock: false,
    absoluteBlock: false,
  },
]

export default function EdSafetyStep({ onNext, onBack }: EdSafetyStepProps) {
  const router = useRouter()
  const { answers, setAnswer } = useRequestStore()
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [isBlocked, setIsBlocked] = useState(false)
  const [blockReason, setBlockReason] = useState("")
  const [showFollowUp, setShowFollowUp] = useState(false)

  const advanceToNext = () => {
    if (currentQuestion < SAFETY_QUESTIONS.length - 1) {
      setCurrentQuestion(currentQuestion + 1)
      setShowFollowUp(false)
    } else {
      onNext()
    }
  }

  const handleAnswer = (questionId: string, value: string) => {
    setAnswer(`edSafety_${questionId}`, value)

    const question = SAFETY_QUESTIONS[currentQuestion]

    if (question.hardBlock && value === 'yes') {
      if (question.absoluteBlock) {
        // Nitrates: immediate hard-block, no follow-up
        setIsBlocked(true)
        setBlockReason(question.blockReason || '')
        return
      }
      // Cardiac/BP soft-block: show follow-up question
      setShowFollowUp(true)
      return
    }

    // If answering "no", clear any follow-up state and proceed
    setShowFollowUp(false)
    advanceToNext()
  }

  const handleFollowUp = (managed: boolean) => {
    if (managed) {
      // Condition is managed by a doctor — allow to proceed with warning flag
      setAnswer('edSafety_managedCondition', true)
      setShowFollowUp(false)
      advanceToNext()
    } else {
      // Condition is NOT managed — block
      const question = SAFETY_QUESTIONS[currentQuestion]
      setIsBlocked(true)
      setBlockReason(question.blockReason || '')
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

      {/* Current question — toggle switch */}
      <div className="space-y-4">
        <div className="flex items-center justify-between p-4 rounded-xl border">
          <Label htmlFor={currentQ.id} className="text-sm font-medium leading-relaxed flex-1 pr-4">
            {currentQ.question}
          </Label>
          <Switch
            id={currentQ.id}
            checked={currentAnswer === 'yes'}
            onCheckedChange={(checked) => handleAnswer(currentQ.id, checked ? 'yes' : 'no')}
          />
        </div>
      </div>

      {/* Follow-up for soft-block cardiac/BP questions */}
      {showFollowUp && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
          <Alert variant="default" className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <AlertDescription className="text-sm text-amber-700 dark:text-amber-300">
              This condition may affect your eligibility. We need a bit more information.
            </AlertDescription>
          </Alert>

          <div className="flex items-center justify-between p-4 rounded-xl border">
            <Label htmlFor="managedCondition" className="text-sm font-medium leading-relaxed flex-1 pr-4">
              Is this condition currently being managed by a doctor?
            </Label>
            <Switch
              id="managedCondition"
              checked={false}
              onCheckedChange={(checked) => handleFollowUp(checked)}
            />
          </div>

          <p className="text-xs text-muted-foreground px-1">
            If your condition is being actively managed, you may still be eligible. The reviewing doctor will take this into account.
          </p>
        </div>
      )}

      {/* Warning for hard-block questions */}
      {currentQ.hardBlock && !showFollowUp && (
        <div className="flex items-start gap-2 text-xs text-muted-foreground">
          <AlertTriangle className="w-3.5 h-3.5 mt-0.5 text-amber-500 shrink-0" />
          <span>Answering &quot;Yes&quot; may mean this service is not suitable for you.</span>
        </div>
      )}
    </div>
  )
}
