"use client"

import { Sparkles } from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import type { UnifiedServiceType } from "@/lib/request/step-registry"
import { cn } from "@/lib/utils"

import { useRequestStore } from "../store"

interface WomensHealthTypeStepProps {
  serviceType: UnifiedServiceType
  onNext: () => void
  onBack: () => void
  onComplete: () => void
}

// Attribution params preserved when we hand "continue my pill" off to the
// cheaper repeat-script flow.
const ATTRIBUTION_PARAMS = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "ref", "gclid", "gbraid", "wbraid"]

const WOMENS_HEALTH_OPTIONS = [
  {
    value: 'uti',
    label: 'UTI symptoms',
    description: 'Burning, frequency, or urgency when urinating',
  },
  {
    value: 'ocp_new',
    label: 'Start or switch the contraceptive pill',
    description: 'Start the pill for the first time, or change to a different one',
  },
  {
    // Continuing the same pill is a repeat prescription ($29.95) — we hand this
    // off to the repeat-script flow rather than a pricier consult.
    value: 'ocp_repeat',
    label: 'Continue / renew my current pill',
    description: 'You already take it and just need a repeat ($29.95)',
  },
  {
    value: 'morning_after',
    label: 'Emergency contraception (morning-after pill)',
    description: 'Time-sensitive - most effective when taken early',
    comingSoon: true,
  },
  {
    value: 'period_pain',
    label: 'Period pain / menstrual issues',
    description: 'Pain relief or cycle concerns',
    comingSoon: true,
  },
]

export default function WomensHealthTypeStep({ onNext }: WomensHealthTypeStepProps) {
  const { answers, setAnswer } = useRequestStore()
  const router = useRouter()
  const searchParams = useSearchParams()

  const womensHealthOption = answers.womensHealthOption as string | undefined

  const handleSelect = (value: string) => {
    setAnswer("womensHealthOption", value)
  }

  const handleNext = () => {
    if (!womensHealthOption) return
    if (womensHealthOption === "ocp_repeat") {
      // Branch-by-intent: a continuation is a repeat prescription, not a consult.
      const params = new URLSearchParams()
      for (const key of ATTRIBUTION_PARAMS) {
        const value = searchParams.get(key)
        if (value) params.set(key, value)
      }
      params.set("service", "repeat-script")
      router.push(`/request?${params.toString()}`)
      return
    }
    onNext()
  }

  return (
    <div className="space-y-6">
      {/* Info alert */}
      <Alert variant="default" className="border-primary/20 bg-primary/5">
        <Sparkles className="w-4 h-4" />
        <AlertDescription className="text-xs">
          Select the option that best describes what you need help with.
        </AlertDescription>
      </Alert>

      {/* Options */}
      <div className="space-y-3">
        <p className="text-sm font-medium">
          What do you need help with?
          <span className="text-destructive ml-0.5">*</span>
        </p>
        
        <div className="space-y-2">
          {WOMENS_HEALTH_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              disabled={option.comingSoon}
              onClick={() => !option.comingSoon && handleSelect(option.value)}
              className={cn(
                "w-full text-left p-4 rounded-xl border transition-[background-color,border-color] duration-150",
                option.comingSoon
                  ? "cursor-not-allowed border-dashed border-border opacity-60"
                  : womensHealthOption === option.value
                    ? "border-primary bg-primary/5 ring-1 ring-primary"
                    : "border-border hover:border-primary/50"
              )}
            >
              <span className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium">{option.label}</span>
                {option.comingSoon && (
                  <span className="shrink-0 text-[10px] uppercase tracking-wide text-muted-foreground">Coming soon</span>
                )}
              </span>
              <span className="text-xs text-muted-foreground">{option.description}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Continue button */}
      <Button
        data-intake-primary-action="true"
        data-intake-primary-label="Continue"
        onClick={handleNext}
        disabled={!womensHealthOption}
        className="w-full h-12 text-base font-medium max-sm:hidden"
      >
        Continue
      </Button>
    </div>
  )
}
