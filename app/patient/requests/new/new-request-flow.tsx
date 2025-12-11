"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import Link from "next/link"
import {
  ArrowLeft,
  ArrowRight,
  FileText,
  ClipboardList,
  FileCheck,
  Sparkles,
  Pill,
  Activity,
  Shield,
  Users,
  AlertTriangle,
  Check,
  Loader2,
} from "lucide-react"
import type { RequestType } from "@/types/db"
import { createRequestAction } from "./actions"

interface RequestTypeOption {
  id: RequestType
  title: string
  description: string
  icon: React.ElementType
}

const requestTypes: RequestTypeOption[] = [
  {
    id: "script",
    title: "Prescription",
    description: "Request a new or repeat prescription",
    icon: FileText,
  },
  {
    id: "med_cert",
    title: "Medical Certificate",
    description: "Quick certificate for work or study",
    icon: ClipboardList,
  },
  {
    id: "referral",
    title: "Referral",
    description: "Get a specialist referral letter",
    icon: FileCheck,
  },
  {
    id: "hair_loss",
    title: "Hair Loss",
    description: "Treatment options for hair loss",
    icon: Sparkles,
  },
  {
    id: "ed",
    title: "ED Treatment",
    description: "Discreet erectile dysfunction support",
    icon: Shield,
  },
  {
    id: "acne",
    title: "Acne Treatment",
    description: "Prescription acne treatment options",
    icon: Activity,
  },
  {
    id: "hsv",
    title: "HSV Treatment",
    description: "Herpes simplex virus management",
    icon: Pill,
  },
  {
    id: "bv_partner",
    title: "BV Partner",
    description: "Partner treatment for bacterial vaginosis",
    icon: Users,
  },
]

interface RedFlag {
  id: string
  label: string
  description: string
}

const redFlags: RedFlag[] = [
  {
    id: "chest_pain",
    label: "Chest pain",
    description: "New or worsening chest pain or pressure",
  },
  {
    id: "shortness_of_breath",
    label: "Shortness of breath",
    description: "Difficulty breathing at rest or with minimal activity",
  },
  {
    id: "severe_headache",
    label: "Severe headache or neurological symptoms",
    description: "Sudden severe headache, vision changes, weakness, or numbness",
  },
  {
    id: "pregnancy",
    label: "Pregnancy or possible pregnancy",
    description: "Currently pregnant or possibility of pregnancy",
  },
  {
    id: "suicidal_thoughts",
    label: "Suicidal thoughts or self-harm",
    description: "Recent thoughts of suicide or self-harm",
  },
]

interface FormData {
  main_concern: string
  symptom_duration: string
  current_medications: string
  allergies: string
  // Type-specific fields
  hair_loss_pattern?: string
  ed_frequency?: string
  [key: string]: string | boolean | undefined
}

export function NewRequestFlow({ patientId }: { patientId: string }) {
  const router = useRouter()
  const [step, setStep] = useState<1 | 2>(1)
  const [selectedType, setSelectedType] = useState<RequestType | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState<FormData>({
    main_concern: "",
    symptom_duration: "",
    current_medications: "",
    allergies: "",
  })
  const [redFlagValues, setRedFlagValues] = useState<Record<string, boolean>>(
    Object.fromEntries(redFlags.map((rf) => [rf.id, false])),
  )

  const hasRedFlags = Object.values(redFlagValues).some((v) => v)

  const handleTypeSelect = (type: RequestType) => {
    setSelectedType(type)
    setStep(2)
    setError(null)
  }

  const handleBack = () => {
    if (step === 2) {
      setStep(1)
      setError(null)
    }
  }

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleRedFlagChange = (id: string, value: boolean) => {
    setRedFlagValues((prev) => ({ ...prev, [id]: value }))
  }

  const handleSubmit = async () => {
    if (!selectedType || hasRedFlags) return

    setIsSubmitting(true)
    setError(null)

    try {
      const answers = {
        ...formData,
        red_flags: redFlagValues,
      }

      const result = await createRequestAction(patientId, selectedType, answers)

      if (result.success) {
        router.push("/patient/requests?success=true")
      } else {
        setError(result.error || "Failed to submit request. Please try again.")
      }
    } catch {
      setError("An unexpected error occurred. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const selectedTypeInfo = requestTypes.find((t) => t.id === selectedType)

  return (
    <div className="space-y-6">
      {/* Header with back button */}
      <div
        className="flex items-center gap-4 animate-fade-in-up opacity-0"
        style={{ animationDelay: "0.1s", animationFillMode: "forwards" }}
      >
        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10 rounded-xl hover:bg-white/60"
          onClick={step === 2 ? handleBack : undefined}
          asChild={step === 1}
        >
          {step === 1 ? (
            <Link href="/patient/requests">
              <ArrowLeft className="h-4 w-4" />
              <span className="sr-only">Back to requests</span>
            </Link>
          ) : (
            <>
              <ArrowLeft className="h-4 w-4" />
              <span className="sr-only">Back to type selection</span>
            </>
          )}
        </Button>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">New request</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {step === 1 ? "Choose the type of request" : `${selectedTypeInfo?.title} request`}
          </p>
        </div>
      </div>

      {/* Stepper */}
      <div
        className="glass-card rounded-2xl p-4 animate-fade-in-up opacity-0"
        style={{ animationDelay: "0.15s", animationFillMode: "forwards" }}
      >
        <div className="flex items-center justify-center gap-2 sm:gap-4">
          <div className="flex items-center gap-2">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition-colors ${
                step >= 1 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              }`}
            >
              {step > 1 ? <Check className="h-4 w-4" /> : "1"}
            </div>
            <span className={`text-sm font-medium ${step >= 1 ? "text-foreground" : "text-muted-foreground"}`}>
              Type
            </span>
          </div>
          <div className="h-px w-8 sm:w-16 bg-border" />
          <div className="flex items-center gap-2">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition-colors ${
                step >= 2 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              }`}
            >
              2
            </div>
            <span className={`text-sm font-medium ${step >= 2 ? "text-foreground" : "text-muted-foreground"}`}>
              Details
            </span>
          </div>
        </div>
      </div>

      {/* Step 1: Type Selection */}
      {step === 1 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {requestTypes.map((type, index) => (
            <button
              key={type.id}
              onClick={() => handleTypeSelect(type.id)}
              className="glass-card rounded-2xl p-5 text-left cursor-pointer group hover-lift animate-fade-in-up opacity-0 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary/50"
              style={{ animationDelay: `${0.2 + index * 0.05}s`, animationFillMode: "forwards" }}
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/80 shadow-lg shadow-primary/20 transition-transform duration-200 group-hover:scale-110">
                <type.icon className="h-5 w-5 text-primary-foreground" />
              </div>
              <h3 className="mt-4 text-sm font-semibold text-foreground">{type.title}</h3>
              <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{type.description}</p>
              <span className="mt-3 inline-flex items-center text-xs font-medium text-primary group-hover:underline">
                Select
                <ArrowRight className="ml-1 h-3 w-3 transition-transform group-hover:translate-x-1" />
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Step 2: Questionnaire */}
      {step === 2 && (
        <div className="space-y-6">
          {/* Red Flags Warning Banner */}
          {hasRedFlags && (
            <div
              className="rounded-2xl border-2 border-red-300 bg-red-50/80 backdrop-blur-sm p-5 animate-fade-in-up"
              style={{ animationFillMode: "forwards" }}
            >
              <div className="flex gap-3">
                <AlertTriangle className="h-6 w-6 text-red-600 flex-shrink-0" />
                <div>
                  <h3 className="text-base font-semibold text-red-800">Immediate attention required</h3>
                  <p className="mt-1 text-sm text-red-700 leading-relaxed">
                    Based on your responses, we strongly recommend seeking immediate in-person medical care. Please
                    visit your nearest emergency department or call emergency services if you are experiencing any of
                    the symptoms indicated above.
                  </p>
                  <p className="mt-2 text-sm text-red-700 font-medium">
                    This online service is not suitable for urgent medical concerns.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Main Form */}
          <div
            className="glass-card rounded-2xl p-6 space-y-6 animate-fade-in-up opacity-0"
            style={{ animationDelay: "0.2s", animationFillMode: "forwards" }}
          >
            <div>
              <h2 className="text-lg font-semibold text-foreground">Tell us about your concern</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Please provide as much detail as possible to help our doctors assist you.
              </p>
            </div>

            <div className="space-y-5">
              {/* Main concern */}
              <div className="space-y-2">
                <Label htmlFor="main_concern" className="text-sm font-medium">
                  Main reason / concern <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  id="main_concern"
                  placeholder="Describe your main health concern or reason for this request..."
                  value={formData.main_concern}
                  onChange={(e) => handleInputChange("main_concern", e.target.value)}
                  className="min-h-[100px] rounded-xl border-white/30 bg-white/50 focus:bg-white/70 transition-colors resize-none"
                  required
                />
              </div>

              {/* Symptom duration */}
              <div className="space-y-2">
                <Label htmlFor="symptom_duration" className="text-sm font-medium">
                  How long have you had these symptoms?
                </Label>
                <Input
                  id="symptom_duration"
                  placeholder="e.g., 2 days, 1 week, 3 months"
                  value={formData.symptom_duration}
                  onChange={(e) => handleInputChange("symptom_duration", e.target.value)}
                  className="rounded-xl border-white/30 bg-white/50 focus:bg-white/70 transition-colors"
                />
              </div>

              {/* Current medications */}
              <div className="space-y-2">
                <Label htmlFor="current_medications" className="text-sm font-medium">
                  Current medications
                </Label>
                <Textarea
                  id="current_medications"
                  placeholder="List any medications you are currently taking..."
                  value={formData.current_medications}
                  onChange={(e) => handleInputChange("current_medications", e.target.value)}
                  className="min-h-[80px] rounded-xl border-white/30 bg-white/50 focus:bg-white/70 transition-colors resize-none"
                />
              </div>

              {/* Allergies */}
              <div className="space-y-2">
                <Label htmlFor="allergies" className="text-sm font-medium">
                  Allergies
                </Label>
                <Textarea
                  id="allergies"
                  placeholder="List any known allergies (medications, foods, etc.)..."
                  value={formData.allergies}
                  onChange={(e) => handleInputChange("allergies", e.target.value)}
                  className="min-h-[80px] rounded-xl border-white/30 bg-white/50 focus:bg-white/70 transition-colors resize-none"
                />
              </div>

              {/* Type-specific questions */}
              {selectedType === "hair_loss" && (
                <div className="space-y-2">
                  <Label htmlFor="hair_loss_pattern" className="text-sm font-medium">
                    Pattern of hair loss
                  </Label>
                  <Input
                    id="hair_loss_pattern"
                    placeholder="e.g., receding hairline, crown thinning, diffuse thinning"
                    value={formData.hair_loss_pattern || ""}
                    onChange={(e) => handleInputChange("hair_loss_pattern", e.target.value)}
                    className="rounded-xl border-white/30 bg-white/50 focus:bg-white/70 transition-colors"
                  />
                </div>
              )}

              {selectedType === "ed" && (
                <div className="space-y-2">
                  <Label htmlFor="ed_frequency" className="text-sm font-medium">
                    How often do you experience this issue?
                  </Label>
                  <Input
                    id="ed_frequency"
                    placeholder="e.g., occasionally, frequently, always"
                    value={formData.ed_frequency || ""}
                    onChange={(e) => handleInputChange("ed_frequency", e.target.value)}
                    className="rounded-xl border-white/30 bg-white/50 focus:bg-white/70 transition-colors"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Red Flags Section */}
          <div
            className="glass-card rounded-2xl p-6 space-y-5 animate-fade-in-up opacity-0"
            style={{ animationDelay: "0.25s", animationFillMode: "forwards" }}
          >
            <div>
              <h2 className="text-lg font-semibold text-foreground">Safety screening</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Please answer honestly. These questions help us ensure your safety.
              </p>
            </div>

            <div className="space-y-4">
              {redFlags.map((flag) => (
                <div
                  key={flag.id}
                  className={`flex items-start justify-between gap-4 p-4 rounded-xl transition-colors ${
                    redFlagValues[flag.id]
                      ? "bg-red-50/80 border border-red-200"
                      : "bg-white/30 border border-transparent"
                  }`}
                >
                  <div className="space-y-0.5">
                    <Label htmlFor={flag.id} className="text-sm font-medium cursor-pointer">
                      {flag.label}
                    </Label>
                    <p className="text-xs text-muted-foreground">{flag.description}</p>
                  </div>
                  <Switch
                    id={flag.id}
                    checked={redFlagValues[flag.id]}
                    onCheckedChange={(checked) => handleRedFlagChange(flag.id, checked)}
                    className="flex-shrink-0"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Error message */}
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50/80 p-4">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Submit Button */}
          <div
            className="flex flex-col sm:flex-row gap-3 animate-fade-in-up opacity-0"
            style={{ animationDelay: "0.3s", animationFillMode: "forwards" }}
          >
            <Button
              variant="outline"
              onClick={handleBack}
              className="rounded-xl border-white/40 bg-white/50 hover:bg-white/70"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || hasRedFlags || !formData.main_concern.trim()}
              className="flex-1 rounded-xl bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : hasRedFlags ? (
                "Cannot submit with red flags"
              ) : (
                <>
                  Submit request
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
