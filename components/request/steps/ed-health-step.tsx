"use client"

/**
 * ED Health Step — Step 3 of 4 in the ED intake flow
 *
 * Consolidated safety + medical history in 6 collapsible accordion sections.
 * Merges the old ed-safety-step (sequential questions) and medical-history-step
 * into one scrollable page. This is the biggest UX win — competitors spread
 * this across 8-12 screens, we do it in one page.
 *
 * Sections:
 * 1. Heart & blood pressure (nitrate hard block, cardiac soft blocks + GP clearance)
 * 2. Blood pressure & diabetes
 * 3. Current medications
 * 4. Allergies
 * 5. Other conditions
 * 6. Previous ED treatment
 */

import { useState, useCallback, useMemo } from "react"
import { useRouter } from "next/navigation"
import {
  HeartPulse,
  Activity,
  Pill,
  ShieldAlert,
  Stethoscope,
  AlertTriangle,
  XCircle,
  CheckCircle2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { cn } from "@/lib/utils"
import { usePostHog } from "@/components/providers/posthog-provider"
import { useRequestStore } from "../store"
import { useKeyboardNavigation } from "@/hooks/use-keyboard-navigation"
import type { UnifiedServiceType } from "@/lib/request/step-registry"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface EdHealthStepProps {
  serviceType: UnifiedServiceType
  onNext: () => void
  onBack: () => void
  onComplete: () => void
}

// ---------------------------------------------------------------------------
// Helper components
// ---------------------------------------------------------------------------

/** Toggle switch in a styled container row */
function SwitchField({
  id,
  label,
  checked,
  onChange,
  helpText,
}: {
  id: string
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
  helpText?: string
}) {
  return (
    <div className="flex items-center justify-between gap-3 p-3 rounded-xl border bg-muted/30">
      <Label htmlFor={id} className="text-sm cursor-pointer leading-snug flex-1">
        {label}
        {helpText && (
          <span className="block text-xs text-muted-foreground mt-0.5">{helpText}</span>
        )}
      </Label>
      <Switch
        id={id}
        checked={checked}
        onCheckedChange={onChange}
      />
    </div>
  )
}

/** Section completion indicator shown in accordion triggers */
function SectionComplete({ complete }: { complete: boolean }) {
  if (!complete) return null
  return (
    <CheckCircle2 className="w-4 h-4 text-success shrink-0 mr-2" />
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function EdHealthStep({ onNext, onBack }: EdHealthStepProps) {
  const router = useRouter()
  const posthog = usePostHog()
  const { answers, setAnswer } = useRequestStore()

  // Hard block state
  const [isBlocked, setIsBlocked] = useState(false)
  const [blockReason, setBlockReason] = useState("")

  // ---------------------------------------------------------------------------
  // Read answers from store
  // ---------------------------------------------------------------------------

  // Section 1: Heart & blood pressure
  const edNitrates = answers.edNitrates as boolean | undefined
  const edRecentHeartEvent = answers.edRecentHeartEvent as boolean | undefined
  const edSevereHeart = answers.edSevereHeart as boolean | undefined
  const edGpCleared = answers.edGpCleared as boolean | undefined

  // Section 2: Blood pressure & diabetes
  const edHypertension = answers.edHypertension as boolean | undefined
  const edDiabetes = answers.edDiabetes as boolean | undefined
  const edBpMedication = answers.edBpMedication as boolean | undefined

  // Section 3: Current medications
  const takesMedications = answers.takes_medications as string | undefined
  const currentMedications = (answers.current_medications as string) || ""

  // Section 4: Allergies
  const hasAllergies = answers.has_allergies as string | undefined
  const knownAllergies = (answers.known_allergies as string) || ""

  // Section 5: Other conditions
  const hasConditions = answers.has_conditions as string | undefined
  const existingConditions = (answers.existing_conditions as string) || ""

  // Section 6: Previous ED treatment
  const previousEdMeds = answers.previousEdMeds as boolean | undefined
  const edPreviousTreatment = (answers.edPreviousTreatment as string) || ""
  const edPreviousEffectiveness = answers.edPreviousEffectiveness as string | undefined

  // ---------------------------------------------------------------------------
  // Nitrate hard block handler
  // ---------------------------------------------------------------------------

  const handleNitrateChange = useCallback((checked: boolean) => {
    setAnswer("edNitrates", checked)
    if (checked) {
      setIsBlocked(true)
      setBlockReason(
        "ED medications can cause a dangerous drop in blood pressure when combined with nitrates. Please see your GP or cardiologist."
      )
    }
  }, [setAnswer])

  // ---------------------------------------------------------------------------
  // Soft block: GP clearance required
  // ---------------------------------------------------------------------------

  const softBlockActive = (edRecentHeartEvent === true || edSevereHeart === true)
  const gpClearanceRequired = softBlockActive && edGpCleared !== true

  // ---------------------------------------------------------------------------
  // Section completion checks
  // ---------------------------------------------------------------------------

  const heartComplete = useMemo(() => {
    // Nitrates must be answered
    if (edNitrates === undefined) return false
    // If nitrates are true, section is "answered" (but blocked)
    if (edNitrates === true) return true
    // Heart event & severe heart must be answered
    if (edRecentHeartEvent === undefined || edSevereHeart === undefined) return false
    // If soft block is active, GP clearance must be checked
    if ((edRecentHeartEvent || edSevereHeart) && edGpCleared !== true) return false
    return true
  }, [edNitrates, edRecentHeartEvent, edSevereHeart, edGpCleared])

  const bpComplete = useMemo(() => {
    return edHypertension !== undefined &&
      edDiabetes !== undefined &&
      edBpMedication !== undefined
  }, [edHypertension, edDiabetes, edBpMedication])

  const medicationsComplete = useMemo(() => {
    if (takesMedications === undefined) return false
    if (takesMedications === "yes" && !currentMedications.trim()) return false
    return true
  }, [takesMedications, currentMedications])

  const allergiesComplete = useMemo(() => {
    if (hasAllergies === undefined) return false
    if (hasAllergies === "yes" && !knownAllergies.trim()) return false
    return true
  }, [hasAllergies, knownAllergies])

  const conditionsComplete = useMemo(() => {
    if (hasConditions === undefined) return false
    if (hasConditions === "yes" && !existingConditions.trim()) return false
    return true
  }, [hasConditions, existingConditions])

  const previousTreatmentComplete = useMemo(() => {
    if (previousEdMeds === undefined) return false
    if (previousEdMeds === true) {
      if (!edPreviousTreatment.trim()) return false
      if (!edPreviousEffectiveness) return false
    }
    return true
  }, [previousEdMeds, edPreviousTreatment, edPreviousEffectiveness])

  // ---------------------------------------------------------------------------
  // Can continue?
  // ---------------------------------------------------------------------------

  const canContinue = useMemo(() => {
    // Hard block
    if (edNitrates === true) return false
    // Nitrates never answered
    if (edNitrates === undefined) return false
    // Soft block without GP clearance
    if (gpClearanceRequired) return false
    // All sections must be complete
    return heartComplete &&
      bpComplete &&
      medicationsComplete &&
      allergiesComplete &&
      conditionsComplete &&
      previousTreatmentComplete
  }, [
    edNitrates,
    gpClearanceRequired,
    heartComplete,
    bpComplete,
    medicationsComplete,
    allergiesComplete,
    conditionsComplete,
    previousTreatmentComplete,
  ])

  const handleNext = useCallback(() => {
    if (canContinue) onNext()
  }, [canContinue, onNext])

  // Keyboard navigation
  useKeyboardNavigation({
    onNext: canContinue ? handleNext : undefined,
    onBack,
    enabled: true,
  })

  // ---------------------------------------------------------------------------
  // Hard block screen
  // ---------------------------------------------------------------------------

  if (isBlocked) {
    return (
      <div className="space-y-6">
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
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
              <span>If cleared by your doctor, you may be able to use this service in the future</span>
            </li>
          </ul>
        </div>

        <div className="flex flex-col gap-2 pt-2">
          <Button
            variant="outline"
            onClick={() => router.push("/")}
            className="w-full"
          >
            Return home
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              setIsBlocked(false)
              setAnswer("edNitrates", false)
            }}
            className="w-full"
          >
            Go back and change answer
          </Button>
        </div>
      </div>
    )
  }

  // ---------------------------------------------------------------------------
  // Main render
  // ---------------------------------------------------------------------------

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-1.5">
        <h2 className="text-lg font-semibold tracking-tight">A quick health check</h2>
        <p className="text-sm text-muted-foreground">
          We need to make sure treatment is safe for you. Most people finish this in under 2 minutes.
        </p>
      </div>

      {/* Accordion sections */}
      <Accordion
        type="multiple"
        defaultValue={["heart"]}
        className="space-y-3"
        onValueChange={(openSections: string[]) => {
          posthog?.capture("ed_health_sections_viewed", {
            open_sections: openSections,
            section_count: openSections.length,
          })
        }}
      >
        {/* ----------------------------------------------------------------- */}
        {/* Section 1: Heart & blood pressure */}
        {/* ----------------------------------------------------------------- */}
        <AccordionItem value="heart" className="border rounded-xl overflow-hidden">
          <AccordionTrigger className="px-4 hover:no-underline">
            <div className="flex items-center gap-2 flex-1">
              <HeartPulse className="w-4 h-4 text-rose-500 shrink-0" />
              <span>Heart &amp; blood pressure</span>
            </div>
            <SectionComplete complete={heartComplete} />
          </AccordionTrigger>
          <AccordionContent className="px-4 space-y-3">
            {/* Nitrate toggle */}
            <SwitchField
              id="ed-nitrates"
              label="Do you take nitrates?"
              helpText="e.g., GTN spray, Anginine, Imdur, or any medication for chest pain"
              checked={edNitrates === true}
              onChange={handleNitrateChange}
            />

            {/* Recent cardiac event */}
            <SwitchField
              id="ed-recent-heart-event"
              label="Heart attack, stroke, or unstable angina in the last 6 months?"
              checked={edRecentHeartEvent === true}
              onChange={(checked) => setAnswer("edRecentHeartEvent", checked)}
            />

            {/* Severe heart condition */}
            <SwitchField
              id="ed-severe-heart"
              label="Severe or uncontrolled heart disease, very low blood pressure, or HOCM?"
              checked={edSevereHeart === true}
              onChange={(checked) => setAnswer("edSevereHeart", checked)}
            />

            {/* Warning when soft block is active */}
            {softBlockActive && (
              <Alert variant="default" className="border-warning/30 bg-warning/5">
                <AlertTriangle className="w-4 h-4 text-warning" />
                <AlertDescription className="text-sm">
                  This condition requires clearance from your GP before we can prescribe.
                </AlertDescription>
              </Alert>
            )}

            {/* GP clearance checkbox — shown only when soft block active */}
            {softBlockActive && (
              <div className="p-3 rounded-xl border bg-muted/30">
                <Checkbox
                  id="ed-gp-cleared"
                  checked={edGpCleared === true}
                  onCheckedChange={(checked) => setAnswer("edGpCleared", checked)}
                >
                  My GP has cleared me for ED treatment
                </Checkbox>
              </div>
            )}
          </AccordionContent>
        </AccordionItem>

        {/* ----------------------------------------------------------------- */}
        {/* Section 2: Blood pressure & diabetes */}
        {/* ----------------------------------------------------------------- */}
        <AccordionItem value="bp" className="border rounded-xl overflow-hidden">
          <AccordionTrigger className="px-4 hover:no-underline">
            <div className="flex items-center gap-2 flex-1">
              <Activity className="w-4 h-4 text-blue-500 shrink-0" />
              <span>Blood pressure &amp; diabetes</span>
            </div>
            <SectionComplete complete={bpComplete} />
          </AccordionTrigger>
          <AccordionContent className="px-4 space-y-3">
            <SwitchField
              id="ed-hypertension"
              label="Do you have high blood pressure?"
              checked={edHypertension === true}
              onChange={(checked) => setAnswer("edHypertension", checked)}
            />
            <SwitchField
              id="ed-diabetes"
              label="Do you have diabetes?"
              checked={edDiabetes === true}
              onChange={(checked) => setAnswer("edDiabetes", checked)}
            />
            <SwitchField
              id="ed-bp-medication"
              label="Currently taking blood pressure medication?"
              checked={edBpMedication === true}
              onChange={(checked) => setAnswer("edBpMedication", checked)}
            />
          </AccordionContent>
        </AccordionItem>

        {/* ----------------------------------------------------------------- */}
        {/* Section 3: Current medications */}
        {/* ----------------------------------------------------------------- */}
        <AccordionItem value="medications" className="border rounded-xl overflow-hidden">
          <AccordionTrigger className="px-4 hover:no-underline">
            <div className="flex items-center gap-2 flex-1">
              <Pill className="w-4 h-4 text-violet-500 shrink-0" />
              <span>Current medications</span>
            </div>
            <SectionComplete complete={medicationsComplete} />
          </AccordionTrigger>
          <AccordionContent className="px-4 space-y-3">
            <SwitchField
              id="ed-takes-medications"
              label="Are you taking any medications?"
              helpText="Prescriptions, over-the-counter, vitamins, supplements"
              checked={takesMedications === "yes"}
              onChange={(checked) => setAnswer("takes_medications", checked ? "yes" : "no")}
            />
            {takesMedications === "yes" && (
              <Textarea
                id="ed-current-medications"
                value={currentMedications}
                onChange={(e) => setAnswer("current_medications", e.target.value)}
                placeholder="e.g., Metformin 500mg twice daily, Vitamin D 1000IU"
                className="min-h-[80px] text-sm"
              />
            )}
          </AccordionContent>
        </AccordionItem>

        {/* ----------------------------------------------------------------- */}
        {/* Section 4: Allergies */}
        {/* ----------------------------------------------------------------- */}
        <AccordionItem value="allergies" className="border rounded-xl overflow-hidden">
          <AccordionTrigger className="px-4 hover:no-underline">
            <div className="flex items-center gap-2 flex-1">
              <ShieldAlert className="w-4 h-4 text-amber-500 shrink-0" />
              <span>Allergies</span>
            </div>
            <SectionComplete complete={allergiesComplete} />
          </AccordionTrigger>
          <AccordionContent className="px-4 space-y-3">
            <SwitchField
              id="ed-has-allergies"
              label="Do you have any known allergies?"
              helpText="Drug, food, or environmental allergies"
              checked={hasAllergies === "yes"}
              onChange={(checked) => setAnswer("has_allergies", checked ? "yes" : "no")}
            />
            {hasAllergies === "yes" && (
              <Textarea
                id="ed-known-allergies"
                value={knownAllergies}
                onChange={(e) => setAnswer("known_allergies", e.target.value)}
                placeholder="e.g., Penicillin — rash, Peanuts — anaphylaxis"
                className="min-h-[80px] text-sm"
              />
            )}
          </AccordionContent>
        </AccordionItem>

        {/* ----------------------------------------------------------------- */}
        {/* Section 5: Other conditions */}
        {/* ----------------------------------------------------------------- */}
        <AccordionItem value="conditions" className="border rounded-xl overflow-hidden">
          <AccordionTrigger className="px-4 hover:no-underline">
            <div className="flex items-center gap-2 flex-1">
              <Stethoscope className="w-4 h-4 text-teal-500 shrink-0" />
              <span>Other conditions</span>
            </div>
            <SectionComplete complete={conditionsComplete} />
          </AccordionTrigger>
          <AccordionContent className="px-4 space-y-3">
            <SwitchField
              id="ed-has-conditions"
              label="Do you have any other medical conditions?"
              helpText="Chronic illness, past surgeries, ongoing issues"
              checked={hasConditions === "yes"}
              onChange={(checked) => setAnswer("has_conditions", checked ? "yes" : "no")}
            />
            {hasConditions === "yes" && (
              <Textarea
                id="ed-existing-conditions"
                value={existingConditions}
                onChange={(e) => setAnswer("existing_conditions", e.target.value)}
                placeholder="e.g., Asthma, Type 2 Diabetes, High blood pressure"
                className="min-h-[80px] text-sm"
              />
            )}
          </AccordionContent>
        </AccordionItem>

        {/* ----------------------------------------------------------------- */}
        {/* Section 6: Previous ED treatment */}
        {/* ----------------------------------------------------------------- */}
        <AccordionItem value="previous" className="border rounded-xl overflow-hidden">
          <AccordionTrigger className="px-4 hover:no-underline">
            <div className="flex items-center gap-2 flex-1">
              <Pill className="w-4 h-4 text-indigo-500 shrink-0" />
              <span>Previous ED treatment</span>
            </div>
            <SectionComplete complete={previousTreatmentComplete} />
          </AccordionTrigger>
          <AccordionContent className="px-4 space-y-3">
            <SwitchField
              id="ed-previous-meds"
              label="Have you tried ED treatment before?"
              checked={previousEdMeds === true}
              onChange={(checked) => setAnswer("previousEdMeds", checked)}
            />
            {previousEdMeds === true && (
              <>
                <Textarea
                  id="ed-previous-treatment"
                  value={edPreviousTreatment}
                  onChange={(e) => setAnswer("edPreviousTreatment", e.target.value)}
                  placeholder="What did you try? e.g., Sildenafil 50mg, Tadalafil 10mg"
                  className="min-h-[80px] text-sm"
                />

                {/* Effectiveness selector */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">How effective was it?</Label>
                  <div className="flex gap-2">
                    {(
                      [
                        { value: "worked_well", label: "Worked well" },
                        { value: "somewhat", label: "Somewhat" },
                        { value: "didnt_work", label: "Didn\u2019t work" },
                      ] as const
                    ).map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setAnswer("edPreviousEffectiveness", option.value)}
                        className={cn(
                          "flex-1 px-3 py-2 text-sm rounded-lg border transition-colors",
                          "hover:bg-accent hover:text-accent-foreground",
                          edPreviousEffectiveness === option.value
                            ? "border-primary bg-primary/5 text-primary font-medium"
                            : "border-border text-muted-foreground"
                        )}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {/* Continue button */}
      <Button
        onClick={handleNext}
        className="w-full h-12"
        disabled={!canContinue}
      >
        Continue
      </Button>
    </div>
  )
}
