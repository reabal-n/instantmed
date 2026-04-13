"use client"

import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  ClipboardList,
  CreditCard,
  Pill,
  RefreshCw,
} from "lucide-react"
import type React from "react"

import { ShakeAnimation } from "@/components/effects/shake-animation"
import { MedicationSearch } from "@/components/shared"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { ButtonSpinner } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"

import { MultiPillButton, PillButton } from "./pill-button"
import type { PrescriptionFlowState } from "./types"
import {
  chronicConditionOptions,
  chronicControlOptions,
  chronicRequestOptions,
  chronicReviewOptions,
  redFlags,
  repeatControlOptions,
  repeatDurationOptions,
  repeatReasonOptions,
  repeatSideEffectsOptions,
} from "./types"

interface PrescriptionFormStepProps {
  subtype: string
  title: string
  flow: PrescriptionFlowState
}

function getIcon(subtype: string) {
  switch (subtype) {
    case "repeat":
      return <RefreshCw className="h-5 w-5 text-primary-foreground" />
    case "chronic":
      return <ClipboardList className="h-5 w-5 text-primary-foreground" />
    default:
      return <Pill className="h-5 w-5 text-primary-foreground" />
  }
}

function getFormTitle(subtype: string) {
  switch (subtype) {
    case "repeat":
      return "Repeat Prescription Details"
    case "chronic":
      return "Medication Review Details"
    default:
      return "Prescription Details"
  }
}

export function PrescriptionFormStep({ subtype, title, flow }: PrescriptionFormStepProps) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div
        className="flex items-center gap-4 animate-fade-in-up opacity-0"
        style={{ animationDelay: "0.1s", animationFillMode: "forwards" }}
      >
        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10 rounded-xl hover:bg-muted/50"
          onClick={() => flow.setStep("intro")}
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="sr-only">Back</span>
        </Button>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">Quick, async assessment</p>
        </div>
      </div>

      {/* Red Flags Warning Banner */}
      {flow.hasRedFlags && (
        <div
          className="rounded-2xl border-2 border-red-300 bg-red-50 dark:bg-red-500/10 p-5 animate-fade-in-up"
          style={{ animationFillMode: "forwards" }}
        >
          <div className="flex gap-3">
            <AlertTriangle className="h-6 w-6 text-red-600 shrink-0" />
            <div>
              <h3 className="text-base font-semibold text-red-800">Immediate attention required</h3>
              <p className="mt-1 text-sm text-red-700 leading-relaxed">
                Based on your responses, we strongly recommend seeking immediate in-person medical care. Please visit
                your nearest emergency department or call emergency services.
              </p>
              <p className="mt-2 text-sm text-red-700 font-medium">
                This online service is not suitable for urgent medical concerns.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Error message */}
      {flow.error && (
        <ShakeAnimation trigger={!!flow.error} intensity="light" duration={0.4}>
          <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-600 animate-fade-in-up">
            {flow.error}
          </div>
        </ShakeAnimation>
      )}

      {/* Main Form */}
      <div
        className="glass-card rounded-2xl p-6 space-y-6 animate-fade-in-up opacity-0"
        style={{ animationDelay: "0.15s", animationFillMode: "forwards" }}
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-linear-to-br from-primary to-primary/80 shadow-lg shadow-primary/20">
            {getIcon(subtype)}
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">{getFormTitle(subtype)}</h2>
            <p className="text-sm text-muted-foreground">Select the options that apply to you</p>
          </div>
        </div>

        {/* Medication name - common for all subtypes */}
        <div className="space-y-3">
          <MedicationSearch
            value={flow.selectedMedication}
            onChange={flow.setSelectedMedication}
          />
        </div>

        {/* REPEAT PRESCRIPTION FORM */}
        {subtype === "repeat" && (
          <>
            <div className="space-y-3">
              <Label className="text-sm font-medium">
                What is this repeat for? <span className="text-red-500">*</span>
              </Label>
              <div className="flex flex-wrap gap-2">
                {repeatReasonOptions.map((option) => (
                  <PillButton
                    key={option.id}
                    selected={flow.repeatReason === option.id}
                    onClick={() => flow.setRepeatReason(option.id)}
                  >
                    {option.label}
                  </PillButton>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <Label className="text-sm font-medium">
                How long have you been on this medication? <span className="text-red-500">*</span>
              </Label>
              <div className="flex flex-wrap gap-2">
                {repeatDurationOptions.map((option) => (
                  <PillButton
                    key={option.id}
                    selected={flow.repeatDuration === option.id}
                    onClick={() => flow.setRepeatDuration(option.id)}
                  >
                    {option.label}
                  </PillButton>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <Label className="text-sm font-medium">
                How are your symptoms on this current medication? <span className="text-red-500">*</span>
              </Label>
              <div className="flex flex-wrap gap-2">
                {repeatControlOptions.map((option) => (
                  <PillButton
                    key={option.id}
                    selected={flow.repeatControl === option.id}
                    onClick={() => flow.setRepeatControl(option.id)}
                  >
                    {option.label}
                  </PillButton>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <Label className="text-sm font-medium">
                Any recent changes or side effects? <span className="text-red-500">*</span>
              </Label>
              <div className="flex flex-wrap gap-2">
                {repeatSideEffectsOptions.map((option) => (
                  <PillButton
                    key={option.id}
                    selected={flow.repeatSideEffects === option.id}
                    onClick={() => flow.setRepeatSideEffects(option.id)}
                  >
                    {option.label}
                  </PillButton>
                ))}
              </div>
            </div>
          </>
        )}

        {/* CHRONIC MEDICATION REVIEW FORM */}
        {subtype === "chronic" && (
          <>
            <div className="space-y-3">
              <Label className="text-sm font-medium">
                What do you need? (select all that apply) <span className="text-red-500">*</span>
              </Label>
              <div className="flex flex-wrap gap-2">
                {chronicRequestOptions.map((option) => (
                  <MultiPillButton
                    key={option.id}
                    selected={flow.chronicRequests.includes(option.id)}
                    onClick={() => flow.toggleChronicRequest(option.id)}
                  >
                    {option.label}
                  </MultiPillButton>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <Label className="text-sm font-medium">
                Primary condition being treated <span className="text-red-500">*</span>
              </Label>
              <div className="flex flex-wrap gap-2">
                {chronicConditionOptions.map((option) => (
                  <PillButton
                    key={option.id}
                    selected={flow.chronicCondition === option.id}
                    onClick={() => flow.setChronicCondition(option.id)}
                  >
                    {option.label}
                  </PillButton>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <Label className="text-sm font-medium">
                When was your last medication review? <span className="text-red-500">*</span>
              </Label>
              <div className="flex flex-wrap gap-2">
                {chronicReviewOptions.map((option) => (
                  <PillButton
                    key={option.id}
                    selected={flow.chronicReview === option.id}
                    onClick={() => flow.setChronicReview(option.id)}
                  >
                    {option.label}
                  </PillButton>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <Label className="text-sm font-medium">
                Current symptom control <span className="text-red-500">*</span>
              </Label>
              <div className="flex flex-wrap gap-2">
                {chronicControlOptions.map((option) => (
                  <PillButton
                    key={option.id}
                    selected={flow.chronicControl === option.id}
                    onClick={() => flow.setChronicControl(option.id)}
                  >
                    {option.label}
                  </PillButton>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Additional notes */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Additional notes (optional)</Label>
          <Textarea
            value={flow.additionalNotes}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => flow.setAdditionalNotes(e.target.value)}
            placeholder="Any other relevant information for the doctor..."
            className="rounded-xl bg-white dark:bg-card border-border/50 focus:border-primary/40 min-h-20 resize-none"
          />
        </div>
      </div>

      {/* Safety screening */}
      <div
        className="glass-card rounded-2xl p-6 border-amber-200/50 bg-amber-50/30 animate-fade-in-up opacity-0"
        style={{ animationDelay: "0.2s", animationFillMode: "forwards" }}
      >
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle className="h-5 w-5 text-amber-600" />
          <h3 className="font-semibold text-foreground">Safety screening</h3>
        </div>
        <p className="text-sm text-muted-foreground mb-4">Please answer honestly - this helps us ensure your safety.</p>

        <div className="space-y-3">
          {redFlags.map((rf) => (
            <div
              key={rf.id}
              className="flex items-center justify-between py-2 border-b border-border/20 last:border-b-0"
            >
              <span className="text-sm text-foreground pr-4">{rf.label}</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => flow.handleRedFlagChange(rf.id, false)}
                  className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    flow.redFlagValues[rf.id] === false
                      ? "bg-emerald-500 text-white shadow-md"
                      : "bg-muted text-muted-foreground hover:bg-muted/50"
                  }`}
                >
                  No
                </button>
                <button
                  type="button"
                  onClick={() => flow.handleRedFlagChange(rf.id, true)}
                  className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    flow.redFlagValues[rf.id] === true
                      ? "bg-red-500 text-white shadow-md"
                      : "bg-muted text-muted-foreground hover:bg-muted/50"
                  }`}
                >
                  Yes
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Submit buttons */}
      <div
        className="flex flex-col sm:flex-row gap-3 animate-fade-in-up opacity-0"
        style={{ animationDelay: "0.25s", animationFillMode: "forwards" }}
      >
        <Button
          variant="outline"
          onClick={() => flow.setStep("intro")}
          className="rounded-xl border-border/50 bg-white dark:bg-card hover:bg-muted/50"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <Button
          onClick={flow.handleFormComplete}
          disabled={!flow.isFormValid || flow.isSubmitting || flow.hasSubmitted}
          className="w-full rounded-xl btn-glow py-6 text-base"
        >
          {flow.isSubmitting ? (
            <>
              <ButtonSpinner className="mr-2" />
              Processing...
            </>
          ) : !flow.isAuthenticated ? (
            <>
              Continue to sign up
              <ArrowRight className="ml-2 h-4 w-4" />
            </>
          ) : flow.needsOnboarding ? (
            <>
              Continue to details
              <ArrowRight className="ml-2 h-4 w-4" />
            </>
          ) : (
            <>
              <CreditCard className="mr-2 h-4 w-4" />
              Pay & Submit - $29.95
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
