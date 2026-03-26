"use client"

import { motion } from "framer-motion"
import { useReducedMotion } from "@/components/ui/motion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ChevronRight, ChevronLeft, AlertTriangle, Search, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { FormField } from "@/components/intake/prescription-shared"

// Animation variants
const fadeSlide = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
}

interface MedicationStepProps {
  medication: string
  isControlled: boolean
  medicationSuggestions: string[]
  error?: string
  onMedicationChange: (value: string) => void
  onSuggestionSelect: (med: string) => void
  onNext: () => void
  onBack: () => void
}

export function MedicationStep({
  medication,
  isControlled,
  medicationSuggestions,
  error,
  onMedicationChange,
  onSuggestionSelect,
  onNext,
  onBack,
}: MedicationStepProps) {
  const prefersReducedMotion = useReducedMotion()

  return (
    <motion.div
      key="medication"
      variants={prefersReducedMotion ? undefined : fadeSlide}
      initial={prefersReducedMotion ? {} : "initial"}
      animate="animate"
      exit={prefersReducedMotion ? undefined : "exit"}
      className="space-y-6"
    >
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold text-foreground">
          Which medication?
        </h1>
        <p className="text-muted-foreground">
          Enter the name of the medication you need
        </p>
      </div>

      <div className="space-y-3">
        <FormField label="Medication name" required error={error}>
          <Input
            placeholder="Start typing medication name..."
            value={medication}
            onChange={(e) => onMedicationChange(e.target.value)}
            className={cn(
              "h-12",
              isControlled && "border-amber-500 focus-visible:ring-amber-500"
            )}
            startContent={<Search className="w-5 h-5 text-muted-foreground" />}
            endContent={
              medication ? (
                <button
                  type="button"
                  onClick={() => onMedicationChange("")}
                  className="p-1 hover:bg-muted rounded"
                >
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              ) : null
            }
          />
        </FormField>

        {/* Autocomplete suggestions */}
        {medicationSuggestions.length > 0 && !isControlled && (
          <div className="bg-white dark:bg-card border border-border/50 rounded-2xl shadow-lg overflow-hidden">
            {medicationSuggestions.map((med) => (
              <button
                key={med}
                type="button"
                onClick={() => onSuggestionSelect(med)}
                className="w-full px-4 py-3 text-left hover:bg-muted transition-colors text-sm"
              >
                {med}
              </button>
            ))}
          </div>
        )}

        {isControlled && (
          <div className="p-3 rounded-2xl bg-amber-50/80 dark:bg-amber-500/20 border border-amber-200/50 dark:border-amber-800/30 shadow-[0_4px_16px_rgb(245,158,11,0.15)] text-sm text-amber-800">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>This medication cannot be prescribed online. Please visit your GP.</span>
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex gap-3 pt-2">
        <Button variant="outline" onClick={onBack} className="h-12 rounded-xl px-6">
          <ChevronLeft className="w-5 h-5 mr-1" />
          Back
        </Button>
        <Button
          onClick={onNext}
          disabled={!medication.trim() || isControlled}
          className="flex-1 h-12 rounded-xl text-base font-medium"
        >
          Continue
          <ChevronRight className="w-5 h-5 ml-1" />
        </Button>
      </div>
    </motion.div>
  )
}
