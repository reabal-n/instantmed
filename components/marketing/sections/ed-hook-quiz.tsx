"use client"

import { useMemo, useRef, useState } from "react"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import { useReducedMotion } from "@/components/ui/motion"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { usePostHog } from "@/components/providers/posthog-provider"
import { PRICING } from "@/lib/constants"
import {
  ED_HOOK_QUIZ_KEY,
  ED_HOOK_QUIZ_QUESTIONS,
  getEdHookQuizReassurance,
  scoreEdHookQuiz,
  type EdHookQuizResult,
  type EdHookQuizTier,
} from "@/lib/marketing/ed-hook-quiz"

interface EdHookQuizProps {
  className?: string
}

type Phase = "idle" | "q1" | "q2" | "q3" | "result"

const QUESTION_PHASES: ReadonlyArray<Exclude<Phase, "idle" | "result">> = [
  "q1",
  "q2",
  "q3",
]

function getTierLabel(tier: EdHookQuizTier): string {
  switch (tier) {
    case "severe":
      return "Significant pattern"
    case "moderate":
      return "Moderate pattern"
    case "mild":
      return "Mild pattern"
  }
}

function getTierPillClasses(tier: EdHookQuizTier): string {
  switch (tier) {
    case "severe":
      return "bg-warning/10 text-warning border-warning/30"
    case "moderate":
      return "bg-primary/10 text-primary border-primary/30"
    case "mild":
      return "bg-success/10 text-success border-success/30"
  }
}

export function EdHookQuiz({ className }: EdHookQuizProps) {
  const posthog = usePostHog()
  const prefersReducedMotion = useReducedMotion()
  const animate = !prefersReducedMotion

  const [phase, setPhase] = useState<Phase>("q1")
  const [answers, setAnswers] = useState<number[]>([])
  const [result, setResult] = useState<EdHookQuizResult | null>(null)
  const startedRef = useRef(false)

  const currentQuestionIndex = useMemo(() => {
    if (phase === "q1") return 0
    if (phase === "q2") return 1
    if (phase === "q3") return 2
    return -1
  }, [phase])

  const handleSelect = (score: number) => {
    if (!startedRef.current) {
      startedRef.current = true
      posthog?.capture("ed_hook_quiz_start")
    }

    const nextAnswers = [...answers, score]
    setAnswers(nextAnswers)

    const answeredIndex = currentQuestionIndex
    posthog?.capture(`ed_hook_quiz_q${answeredIndex + 1}_answered`, { score })

    if (nextAnswers.length < QUESTION_PHASES.length) {
      const nextPhase = QUESTION_PHASES[nextAnswers.length]
      setPhase(nextPhase)
      return
    }

    // Completed - score and persist
    const tuple: [number, number, number] = [
      nextAnswers[0],
      nextAnswers[1],
      nextAnswers[2],
    ]
    const scored = scoreEdHookQuiz(tuple)

    if (typeof window !== "undefined") {
      try {
        sessionStorage.setItem(ED_HOOK_QUIZ_KEY, JSON.stringify(scored))
      } catch {
        // sessionStorage can throw in private/safari modes - swallow silently
      }
    }

    posthog?.capture("ed_hook_quiz_completed", { tier: scored.tier })
    setResult(scored)
    setPhase("result")
  }

  const handleCtaClick = () => {
    posthog?.capture("ed_hook_quiz_cta_clicked", {
      tier: result?.tier,
    })
  }

  const currentQuestion =
    currentQuestionIndex >= 0
      ? ED_HOOK_QUIZ_QUESTIONS[currentQuestionIndex]
      : null

  const cardClasses = cn(
    "mx-auto w-full max-w-[640px] rounded-2xl border border-border/50 bg-white shadow-md shadow-primary/[0.06] dark:bg-card",
    "p-4 sm:p-6 lg:p-8",
    className,
  )

  const motionDuration = animate ? 0.35 : 0
  const motionOffset = animate ? 12 : 0

  return (
    <div className={cardClasses}>
      <AnimatePresence mode="wait" initial={false}>
        {phase !== "result" && currentQuestion ? (
          <motion.div
            key={`question-${currentQuestion.id}`}
            initial={{ opacity: 0, y: motionOffset }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -motionOffset }}
            transition={{ duration: motionDuration, ease: "easeOut" }}
          >
            <div className="mb-3 flex items-center justify-between">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Question {currentQuestionIndex + 1} of{" "}
                {ED_HOOK_QUIZ_QUESTIONS.length}
              </p>
              <div
                className="flex gap-1"
                aria-hidden="true"
              >
                {ED_HOOK_QUIZ_QUESTIONS.map((_, idx) => (
                  <span
                    key={idx}
                    className={cn(
                      "h-1.5 w-6 rounded-full transition-colors",
                      idx <= currentQuestionIndex
                        ? "bg-primary"
                        : "bg-muted",
                    )}
                  />
                ))}
              </div>
            </div>

            <h3 className="mb-5 text-xl font-medium leading-snug text-foreground sm:text-2xl">
              {currentQuestion.prompt}
            </h3>

            <div
              role="radiogroup"
              aria-label={currentQuestion.prompt}
              className="flex flex-col gap-2"
            >
              {currentQuestion.options.map((option) => (
                <button
                  key={option.label}
                  type="button"
                  role="radio"
                  aria-checked={false}
                  onClick={() => handleSelect(option.score)}
                  className={cn(
                    "w-full rounded-xl border border-border/70 px-4 py-3 text-left text-sm",
                    "bg-white dark:bg-card",
                    "transition-colors hover:bg-accent/50 hover:border-primary/40",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                    "active:bg-primary/10 active:border-primary",
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>

            <p className="mt-5 text-center text-xs text-muted-foreground">
              Not a clinical diagnosis. A doctor will review your full
              assessment.
            </p>
          </motion.div>
        ) : result ? (
          <motion.div
            key="result"
            initial={{ opacity: 0, y: motionOffset }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -motionOffset }}
            transition={{ duration: motionDuration, ease: "easeOut" }}
            className="text-center"
          >
            <div className="mb-4 flex justify-center">
              <span
                className={cn(
                  "inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium",
                  getTierPillClasses(result.tier),
                )}
              >
                {getTierLabel(result.tier)}
              </span>
            </div>

            <h3 className="mb-3 text-xl font-semibold text-foreground sm:text-2xl">
              Thanks - here&apos;s what you shared
            </h3>

            <p className="mx-auto mb-6 max-w-[480px] text-sm leading-relaxed text-muted-foreground sm:text-base">
              {getEdHookQuizReassurance(result.tier)}
            </p>

            <div className="flex flex-col items-center gap-3">
              <Button
                asChild
                size="lg"
                className="w-full max-w-[320px]"
                onClick={handleCtaClick}
              >
                <Link href="/request?service=consult&subtype=ed">
                  Start your discreet assessment
                </Link>
              </Button>
              <p className="text-xs text-muted-foreground">
                Completes in about 5 minutes. ${PRICING.MENS_HEALTH.toFixed(2)} flat fee.
              </p>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  )
}
