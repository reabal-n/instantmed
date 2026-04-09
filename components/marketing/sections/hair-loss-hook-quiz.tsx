"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { motion, AnimatePresence } from "framer-motion"
import { useReducedMotion } from "@/components/ui/motion"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { usePostHog } from "@/components/providers/posthog-provider"
import {
  NORWOOD_STAGES,
  DURATION_BUCKETS,
  HAIR_LOSS_HOOK_QUIZ_KEY,
  buildHairLossHookQuizResult,
  getHairLossHookQuizReassurance,
  type NorwoodStage,
  type DurationBucket,
  type HairLossHookQuizResult,
} from "@/lib/marketing/hair-loss-hook-quiz"

interface HairLossHookQuizProps {
  className?: string
}

type Phase = "picking" | "result"

export function HairLossHookQuiz({ className }: HairLossHookQuizProps) {
  const posthog = usePostHog()
  const prefersReducedMotion = useReducedMotion()
  const animate = !prefersReducedMotion

  const [phase, setPhase] = useState<Phase>("picking")
  const [selectedStage, setSelectedStage] = useState<NorwoodStage | null>(null)
  const [selectedDuration, setSelectedDuration] =
    useState<DurationBucket | null>(null)
  const [result, setResult] = useState<HairLossHookQuizResult | null>(null)

  const handleNorwoodSelect = (stage: NorwoodStage) => {
    setSelectedStage(stage)
    posthog?.capture("hair_loss_hook_quiz_norwood_selected", { stage })

    // If duration already picked, immediately complete
    if (selectedDuration) {
      completeQuiz(stage, selectedDuration)
    }
  }

  const handleDurationSelect = (duration: DurationBucket) => {
    setSelectedDuration(duration)
    posthog?.capture("hair_loss_hook_quiz_duration_selected", { duration })

    // If stage already picked, immediately complete
    if (selectedStage) {
      completeQuiz(selectedStage, duration)
    }
  }

  const completeQuiz = (stage: NorwoodStage, duration: DurationBucket) => {
    const built = buildHairLossHookQuizResult(stage, duration)

    if (typeof window !== "undefined") {
      try {
        sessionStorage.setItem(HAIR_LOSS_HOOK_QUIZ_KEY, JSON.stringify(built))
      } catch {
        // Safari private mode — silently ignore
      }
    }

    posthog?.capture("hair_loss_hook_quiz_completed", {
      stage,
      duration,
    })
    setResult(built)
    setPhase("result")
  }

  const handleCtaClick = () => {
    posthog?.capture("hair_loss_hook_quiz_cta_clicked", {
      stage: result?.norwood,
      duration: result?.durationBucket,
    })
  }

  const cardClasses = cn(
    "mx-auto w-full max-w-[820px] rounded-2xl border border-border/50 bg-white shadow-md shadow-primary/[0.06] dark:bg-card",
    "p-6 lg:p-8",
    className,
  )

  const motionDuration = animate ? 0.35 : 0
  const motionOffset = animate ? 12 : 0

  const selectedDurationLabel =
    DURATION_BUCKETS.find((b) => b.id === result?.durationBucket)?.label ?? ""

  return (
    <div className={cardClasses}>
      <AnimatePresence mode="wait" initial={false}>
        {phase === "picking" ? (
          <motion.div
            key="picking"
            initial={{ opacity: 0, y: motionOffset }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -motionOffset }}
            transition={{ duration: motionDuration, ease: "easeOut" }}
          >
            <div className="mb-5">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Step 1 of 2
              </p>
              <h3 className="mt-1 text-xl font-medium leading-snug text-foreground sm:text-2xl">
                Which pattern looks most like yours?
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Top-down view. Pick the closest match — a doctor will confirm
                during your assessment.
              </p>
            </div>

            <div
              role="radiogroup"
              aria-label="Select your closest Norwood stage"
              className={cn(
                "-mx-2 mb-8 flex gap-3 overflow-x-auto px-2 pb-2",
                "lg:mx-0 lg:grid lg:grid-cols-7 lg:gap-3 lg:overflow-visible lg:px-0 lg:pb-0",
              )}
            >
              {NORWOOD_STAGES.map((stageInfo) => {
                const isSelected = selectedStage === stageInfo.stage
                return (
                  <button
                    key={stageInfo.stage}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    onClick={() => handleNorwoodSelect(stageInfo.stage)}
                    className={cn(
                      "flex min-w-[96px] flex-shrink-0 flex-col items-center gap-2 rounded-xl border p-3 transition-colors",
                      "bg-white dark:bg-card",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                      isSelected
                        ? "border-primary bg-primary/5 ring-2 ring-primary"
                        : "border-border/70 hover:border-primary/40 hover:bg-accent/50",
                    )}
                  >
                    <Image
                      src={`/images/norwood/stage-${stageInfo.stage}.svg`}
                      alt={`Norwood stage ${stageInfo.stage} silhouette`}
                      width={72}
                      height={72}
                      className="h-[72px] w-[72px]"
                    />
                    <span className="text-xs font-medium text-foreground">
                      {stageInfo.label}
                    </span>
                  </button>
                )
              })}
            </div>

            <div className="mb-3">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Step 2 of 2
              </p>
              <h3 className="mt-1 text-xl font-medium leading-snug text-foreground sm:text-2xl">
                How long have you been noticing it?
              </h3>
            </div>

            <div
              role="radiogroup"
              aria-label="How long have you been noticing hair loss"
              className="flex flex-wrap gap-2"
            >
              {DURATION_BUCKETS.map((bucket) => {
                const isSelected = selectedDuration === bucket.id
                return (
                  <button
                    key={bucket.id}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    onClick={() => handleDurationSelect(bucket.id)}
                    className={cn(
                      "rounded-full border px-4 py-2 text-sm transition-colors",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                      isSelected
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border/70 text-foreground hover:border-primary/40 hover:bg-accent/50",
                    )}
                  >
                    {bucket.label}
                  </button>
                )
              })}
            </div>

            <p className="mt-6 text-center text-xs text-muted-foreground">
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
              <Image
                src={`/images/norwood/stage-${result.norwood}.svg`}
                alt={`Norwood stage ${result.norwood} silhouette`}
                width={96}
                height={96}
                className="h-[96px] w-[96px]"
              />
            </div>

            <h3 className="mb-3 text-xl font-semibold text-foreground sm:text-2xl">
              Stage {result.norwood} at {selectedDurationLabel.toLowerCase()}
            </h3>

            <p className="mx-auto mb-6 max-w-[560px] text-sm leading-relaxed text-muted-foreground sm:text-base">
              {getHairLossHookQuizReassurance(
                result.norwood,
                result.durationBucket,
              )}
            </p>

            <div className="flex flex-col items-center gap-3">
              <Button
                asChild
                size="lg"
                className="w-full max-w-[320px]"
                onClick={handleCtaClick}
              >
                <Link href="/request?service=consult&subtype=hair_loss">
                  Start your assessment
                </Link>
              </Button>
              <p className="text-xs text-muted-foreground">
                Completes in about 5 minutes. $49.95 flat fee.
              </p>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  )
}
