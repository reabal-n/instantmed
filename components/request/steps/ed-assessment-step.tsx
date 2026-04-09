"use client"

import { useMemo, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { TrendingUp, Info } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useReducedMotion } from "@/components/ui/motion"
import { stagger, fadeUp } from "@/lib/motion"
import { useRequestStore } from "../store"
import { useKeyboardNavigation } from "@/hooks/use-keyboard-navigation"
import type { UnifiedServiceType } from "@/lib/request/step-registry"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface EdAssessmentStepProps {
  serviceType: UnifiedServiceType
  onNext: () => void
  onBack: () => void
  onComplete: () => void
}

interface IIEFQuestion {
  id: "iief1" | "iief2" | "iief3" | "iief4" | "iief5"
  question: string
  lowLabel: string
  highLabel: string
}

interface ScoreInterpretation {
  label: string
  description: string
  colorClass: string
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const IIEF_QUESTIONS: IIEFQuestion[] = [
  {
    id: "iief1",
    question:
      "How confident are you that you can get and keep an erection?",
    lowLabel: "Not at all",
    highLabel: "Very confident",
  },
  {
    id: "iief2",
    question:
      "When you had erections, how often were they hard enough for penetration?",
    lowLabel: "Almost never",
    highLabel: "Almost always",
  },
  {
    id: "iief3",
    question:
      "During intercourse, how often were you able to maintain your erection?",
    lowLabel: "Almost never",
    highLabel: "Almost always",
  },
  {
    id: "iief4",
    question:
      "How difficult was it to maintain your erection to completion?",
    lowLabel: "Extremely difficult",
    highLabel: "Not difficult",
  },
  {
    id: "iief5",
    question:
      "When you attempted intercourse, how often was it satisfactory?",
    lowLabel: "Almost never",
    highLabel: "Almost always",
  },
]

const SCALE_VALUES = [1, 2, 3, 4, 5] as const

function getInterpretation(total: number): ScoreInterpretation {
  if (total >= 22) {
    return {
      label: "Mild",
      description:
        "Your responses suggest mild difficulty. A doctor can still help.",
      colorClass: "text-success",
    }
  }
  if (total >= 17) {
    return {
      label: "Mild\u2013moderate",
      description:
        "Moderate symptoms like these respond well to treatment.",
      colorClass: "text-primary",
    }
  }
  if (total >= 12) {
    return {
      label: "Moderate",
      description: "Treatment is very effective at this level.",
      colorClass: "text-primary",
    }
  }
  return {
    label: "Significant",
    description:
      "Our doctors regularly help patients in your situation.",
    colorClass: "text-warning",
  }
}

// ---------------------------------------------------------------------------
// ScalePicker
// ---------------------------------------------------------------------------

function ScalePicker({
  value,
  onChange,
  lowLabel,
  highLabel,
  questionId,
}: {
  value: number | null
  onChange: (v: number) => void
  lowLabel: string
  highLabel: string
  questionId: string
}) {
  return (
    <div className="space-y-2">
      {/* Scale circles */}
      <div
        className="flex items-center justify-between gap-0"
        role="radiogroup"
        aria-label={questionId}
      >
        {SCALE_VALUES.map((n, idx) => {
          const isSelected = value === n
          const isLast = idx === SCALE_VALUES.length - 1
          return (
            <div key={n} className="flex items-center flex-1 last:flex-none">
              {/* Circle */}
              <button
                type="button"
                role="radio"
                aria-checked={isSelected}
                aria-label={`${n} out of 5`}
                onClick={() => onChange(n)}
                className={cn(
                  "w-11 h-11 rounded-full border-2 flex items-center justify-center text-sm font-semibold transition-all shrink-0",
                  isSelected
                    ? "border-primary bg-primary text-primary-foreground scale-110"
                    : "border-border/50 bg-white dark:bg-card text-muted-foreground hover:border-primary/40"
                )}
              >
                {n}
              </button>

              {/* Connector line */}
              {!isLast && (
                <div className="h-0.5 flex-1 bg-border/30 mx-0.5" />
              )}
            </div>
          )
        })}
      </div>

      {/* Labels */}
      <div className="flex justify-between">
        <span className="text-[11px] text-muted-foreground">{lowLabel}</span>
        <span className="text-[11px] text-muted-foreground">{highLabel}</span>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function EdAssessmentStep({ onNext, onBack }: EdAssessmentStepProps) {
  const { answers, setAnswer } = useRequestStore()
  const prefersReducedMotion = useReducedMotion()

  // Read IIEF values from store
  const iief1 = (answers.iief1 as number | undefined) ?? null
  const iief2 = (answers.iief2 as number | undefined) ?? null
  const iief3 = (answers.iief3 as number | undefined) ?? null
  const iief4 = (answers.iief4 as number | undefined) ?? null
  const iief5 = (answers.iief5 as number | undefined) ?? null

  const allAnswered =
    iief1 !== null &&
    iief2 !== null &&
    iief3 !== null &&
    iief4 !== null &&
    iief5 !== null

  const iiefTotal = useMemo(() => {
    if (!allAnswered) return null
    return iief1 + iief2 + iief3 + iief4 + iief5
  }, [allAnswered, iief1, iief2, iief3, iief4, iief5])

  // Persist total to store when computed
  useEffect(() => {
    if (iiefTotal !== null) {
      setAnswer("iiefTotal", iiefTotal)
    }
  }, [iiefTotal, setAnswer])

  const interpretation = iiefTotal !== null ? getInterpretation(iiefTotal) : null

  const handleNext = useCallback(() => {
    if (allAnswered) {
      onNext()
    }
  }, [allAnswered, onNext])

  useKeyboardNavigation({
    onNext: allAnswered ? handleNext : undefined,
    onBack,
    enabled: true,
  })

  // Motion helpers
  const containerVariants = prefersReducedMotion ? {} : stagger.container
  const itemVariants = prefersReducedMotion ? {} : stagger.item
  const fadeUpVariants = prefersReducedMotion ? {} : fadeUp

  return (
    <motion.div
      className="space-y-5"
      variants={containerVariants}
      initial="initial"
      animate="animate"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="space-y-1.5">
        <h2 className="text-lg font-semibold tracking-tight">
          A few questions about your experience
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          These are standard questions doctors use worldwide. There are no wrong
          answers.
        </p>
      </motion.div>

      {/* IIEF-5 Questions */}
      {IIEF_QUESTIONS.map((q) => {
        const currentValue =
          (answers[q.id] as number | undefined) ?? null
        return (
          <motion.div
            key={q.id}
            variants={itemVariants}
            className="bg-white dark:bg-card border border-border/50 shadow-sm shadow-primary/[0.04] rounded-xl p-4 space-y-3"
          >
            <p className="text-[15px] font-medium leading-snug">
              {q.question}
            </p>
            <ScalePicker
              value={currentValue}
              onChange={(v) => setAnswer(q.id, v)}
              lowLabel={q.lowLabel}
              highLabel={q.highLabel}
              questionId={q.id}
            />
          </motion.div>
        )
      })}

      {/* Score interpretation */}
      <AnimatePresence>
        {interpretation && iiefTotal !== null && (
          <motion.div
            variants={fadeUpVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className={cn(
              "bg-white dark:bg-card border border-border/50 shadow-sm shadow-primary/[0.04] rounded-xl p-4",
              "flex items-start gap-3"
            )}
          >
            <div
              className={cn(
                "flex items-center justify-center w-10 h-10 rounded-lg shrink-0",
                "bg-muted"
              )}
            >
              <TrendingUp className={cn("w-5 h-5", interpretation.colorClass)} />
            </div>
            <div className="space-y-1 min-w-0">
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "text-sm font-semibold",
                    interpretation.colorClass
                  )}
                >
                  {interpretation.label}
                </span>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {iiefTotal}/25
                </span>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {interpretation.description}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Info note */}
      <motion.div
        variants={itemVariants}
        className="flex items-start gap-2 px-1"
      >
        <Info className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />
        <p className="text-xs text-muted-foreground leading-relaxed">
          This is the IIEF-5, a validated clinical questionnaire used by doctors
          worldwide to assess erectile function.
        </p>
      </motion.div>

      {/* Continue button */}
      <motion.div variants={itemVariants}>
        <Button
          onClick={handleNext}
          disabled={!allAnswered}
          className="w-full h-12 text-base font-medium"
        >
          Continue
        </Button>
      </motion.div>
    </motion.div>
  )
}
