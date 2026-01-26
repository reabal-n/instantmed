"use client"

import { Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { cn } from "@/lib/utils"
import { useRequestStore } from "../store"
import type { UnifiedServiceType } from "@/lib/request/step-registry"

interface WomensHealthTypeStepProps {
  serviceType: UnifiedServiceType
  onNext: () => void
  onBack: () => void
  onComplete: () => void
}

const WOMENS_HEALTH_OPTIONS = [
  { 
    value: 'contraception', 
    label: 'Birth control / Contraception',
    description: 'Start or continue contraceptive medication',
  },
  { 
    value: 'morning_after', 
    label: 'Morning-after pill',
    description: 'Emergency contraception',
  },
  { 
    value: 'uti', 
    label: 'UTI treatment',
    description: 'Urinary tract infection symptoms',
  },
  { 
    value: 'period_pain', 
    label: 'Period pain / Menstrual issues',
    description: 'Pain relief or cycle concerns',
  },
  { 
    value: 'other', 
    label: 'Other women\'s health concern',
    description: 'Something else not listed above',
  },
]

export default function WomensHealthTypeStep({ onNext }: WomensHealthTypeStepProps) {
  const { answers, setAnswer } = useRequestStore()
  
  const womensHealthOption = answers.womensHealthOption as string | undefined

  const handleSelect = (value: string) => {
    setAnswer("womensHealthOption", value)
  }

  const handleNext = () => {
    if (womensHealthOption) {
      onNext()
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in">
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
              onClick={() => handleSelect(option.value)}
              className={cn(
                "w-full text-left p-4 rounded-xl border transition-all",
                womensHealthOption === option.value
                  ? "border-primary bg-primary/5 ring-1 ring-primary"
                  : "border-border hover:border-primary/50"
              )}
            >
              <span className="text-sm font-medium block">{option.label}</span>
              <span className="text-xs text-muted-foreground">{option.description}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Continue button */}
      <Button
        onClick={handleNext}
        disabled={!womensHealthOption}
        className="w-full h-12 text-base font-medium"
      >
        Continue
      </Button>
    </div>
  )
}
