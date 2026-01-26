"use client"

import { useState } from "react"
import { Phone, AlertCircle, Calendar } from "lucide-react"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { cn } from "@/lib/utils"
import { useRequestStore } from "../store"
import type { UnifiedServiceType } from "@/lib/request/step-registry"

interface WeightLossCallStepProps {
  serviceType: UnifiedServiceType
  onNext: () => void
  onBack: () => void
  onComplete: () => void
}

const TIME_SLOTS = [
  { value: 'morning', label: 'Morning (9am - 12pm)' },
  { value: 'afternoon', label: 'Afternoon (12pm - 5pm)' },
  { value: 'evening', label: 'Evening (5pm - 8pm)' },
]

const DAY_OPTIONS = [
  { value: 'weekday', label: 'Weekdays' },
  { value: 'weekend', label: 'Weekends' },
  { value: 'any', label: 'Any day' },
]

export default function WeightLossCallStep({ onNext }: WeightLossCallStepProps) {
  const { answers, setAnswer } = useRequestStore()
  const [errors, setErrors] = useState<Record<string, string>>({})

  const preferredTimeSlot = answers.preferredTimeSlot as string | undefined
  const preferredDays = answers.preferredDays as string | undefined
  const callbackPhone = (answers.callbackPhone as string) || ""
  const callNotes = (answers.callNotes as string) || ""

  const validate = () => {
    const newErrors: Record<string, string> = {}
    
    if (!preferredTimeSlot) {
      newErrors.preferredTimeSlot = "Please select a preferred time"
    }
    if (!preferredDays) {
      newErrors.preferredDays = "Please select preferred days"
    }
    if (!callbackPhone || callbackPhone.length < 10) {
      newErrors.callbackPhone = "Please enter a valid phone number"
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleNext = () => {
    if (validate()) {
      onNext()
    }
  }

  const isComplete = preferredTimeSlot && preferredDays && callbackPhone.length >= 10

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Info alert */}
      <Alert variant="default" className="border-primary/20 bg-primary/5">
        <Phone className="w-4 h-4" />
        <AlertDescription className="text-xs">
          A doctor will call you for a brief consultation (usually 5-10 minutes) to discuss your weight loss goals and ensure any treatment is right for you.
        </AlertDescription>
      </Alert>

      {/* Preferred time slot */}
      <div className="space-y-3">
        <Label className="text-sm font-medium flex items-center gap-2">
          <Calendar className="w-4 h-4" />
          When is the best time to call you?<span className="text-destructive ml-0.5">*</span>
        </Label>
        <div className="space-y-2">
          {TIME_SLOTS.map((slot) => (
            <button
              key={slot.value}
              type="button"
              onClick={() => setAnswer("preferredTimeSlot", slot.value)}
              className={cn(
                "w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all",
                preferredTimeSlot === slot.value
                  ? "border-primary bg-primary/5 ring-1 ring-primary"
                  : "border-border hover:border-primary/50"
              )}
            >
              <div className={cn(
                "w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0",
                preferredTimeSlot === slot.value
                  ? "border-primary bg-primary"
                  : "border-muted-foreground"
              )}>
                {preferredTimeSlot === slot.value && (
                  <div className="w-2 h-2 rounded-full bg-primary-foreground" />
                )}
              </div>
              <span className="text-sm">{slot.label}</span>
            </button>
          ))}
        </div>
        {errors.preferredTimeSlot && (
          <p className="text-xs text-destructive flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            {errors.preferredTimeSlot}
          </p>
        )}
      </div>

      {/* Preferred days */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">
          Which days work best?<span className="text-destructive ml-0.5">*</span>
        </Label>
        <div className="flex gap-2">
          {DAY_OPTIONS.map((day) => (
            <button
              key={day.value}
              type="button"
              onClick={() => setAnswer("preferredDays", day.value)}
              className={cn(
                "flex-1 p-3 rounded-xl border text-center transition-all text-sm",
                preferredDays === day.value
                  ? "border-primary bg-primary/5 ring-1 ring-primary font-medium"
                  : "border-border hover:border-primary/50"
              )}
            >
              {day.label}
            </button>
          ))}
        </div>
        {errors.preferredDays && (
          <p className="text-xs text-destructive flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            {errors.preferredDays}
          </p>
        )}
      </div>

      {/* Callback phone */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">
          Best phone number to reach you<span className="text-destructive ml-0.5">*</span>
        </Label>
        <Input
          type="tel"
          value={callbackPhone}
          onChange={(e) => setAnswer("callbackPhone", e.target.value)}
          placeholder="0412 345 678"
          className="h-11"
        />
        {errors.callbackPhone && (
          <p className="text-xs text-destructive flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            {errors.callbackPhone}
          </p>
        )}
        <p className="text-xs text-muted-foreground">
          We&apos;ll call from a private number. Please ensure you can answer unknown calls.
        </p>
      </div>

      {/* Additional notes */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">
          Any notes for the doctor?
        </Label>
        <Input
          value={callNotes}
          onChange={(e) => setAnswer("callNotes", e.target.value)}
          placeholder="Optional: specific times to avoid, etc."
          className="h-11"
        />
      </div>

      {/* What to expect */}
      <div className="p-4 rounded-xl border bg-muted/30 space-y-2">
        <h4 className="text-sm font-medium">What to expect</h4>
        <ul className="space-y-1.5 text-xs text-muted-foreground">
          <li className="flex items-start gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
            <span>A doctor will call within 1-2 business days</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
            <span>The call typically lasts 5-10 minutes</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
            <span>They&apos;ll review your health info and discuss treatment options</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
            <span>If suitable, a prescription can be sent same day</span>
          </li>
        </ul>
      </div>

      {/* Continue button */}
      <Button
        onClick={handleNext}
        disabled={!isComplete}
        className="w-full h-12 text-base font-medium"
      >
        Continue
      </Button>
    </div>
  )
}
