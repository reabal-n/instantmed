"use client"

import { motion, useReducedMotion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { ChevronRight, ChevronLeft } from "lucide-react"
import { SafetyQuestion } from "@/components/intake/prescription-shared"

// Animation variants
const fadeSlide = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
}

// Safety questions
export const SAFETY_QUESTIONS = [
  { id: "allergies", question: "Do you have any known drug allergies?" },
  { id: "pregnant", question: "Are you pregnant or breastfeeding?" },
  { id: "otherMeds", question: "Are you taking any other medications?" },
  { id: "conditions", question: "Do you have any chronic health conditions?" },
]

interface SafetyStepProps {
  safetyAnswers: Record<string, boolean>
  error?: string
  onAnswerChange: (id: string, value: boolean) => void
  onNext: () => void
  onBack: () => void
}

export function PrescriptionSafetyStep({
  safetyAnswers,
  error,
  onAnswerChange,
  onNext,
  onBack,
}: SafetyStepProps) {
  const prefersReducedMotion = useReducedMotion()

  return (
    <motion.div
      key="safety"
      variants={prefersReducedMotion ? undefined : fadeSlide}
      initial={prefersReducedMotion ? {} : "initial"}
      animate="animate"
      exit={prefersReducedMotion ? undefined : "exit"}
      className="space-y-6"
    >
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold text-foreground">
          Safety check
        </h1>
        <p className="text-muted-foreground">
          Please answer these questions for your safety
        </p>
      </div>

      <div className="space-y-3">
        {SAFETY_QUESTIONS.map((q) => (
          <SafetyQuestion
            key={q.id}
            question={q.question}
            value={safetyAnswers[q.id]}
            onChange={(val) => onAnswerChange(q.id, val)}
          />
        ))}
      </div>

      {error && (
        <p className="text-sm text-destructive text-center">{error}</p>
      )}

      {/* Navigation */}
      <div className="flex gap-3 pt-2">
        <Button variant="outline" onClick={onBack} className="h-12 rounded-xl px-6">
          <ChevronLeft className="w-5 h-5 mr-1" />
          Back
        </Button>
        <Button onClick={onNext} className="flex-1 h-12 rounded-xl text-base font-medium">
          Continue
          <ChevronRight className="w-5 h-5 ml-1" />
        </Button>
      </div>
    </motion.div>
  )
}
