"use client"

import { useState, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import {
  ArrowRight,
  ArrowLeft,
  Loader2,
  CheckCircle,
  X,
  Check,
  Clock,
  Phone,
  Shield,
  Lock,
  BadgeCheck,
  ChevronRight,
  FileText,
} from "lucide-react"
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"
import { MED_CERT_COPY } from "@/lib/microcopy/med-cert-v2"
import { SYMPTOM_OPTIONS, CARER_RELATIONSHIPS } from "@/types/med-cert"
import { createIntakeAndCheckoutAction } from "@/lib/stripe/checkout"
import type { 
  MedCertStep, 
  CertificateType, 
  SymptomId, 
  MedCertIntakeData,
} from "@/types/med-cert"
import { cn } from "@/lib/utils"

// ============================================================================
// CONSTANTS
// ============================================================================

const STEPS: MedCertStep[] = [
  "type_and_dates",
  "symptoms",
  "safety",
  "review",
  "payment",
  "confirmation",
]

// Progress steps for display (excluding confirmation)
const PROGRESS_STEPS = ["Details", "Review", "Pay"]

// Max days without call escalation (used in validation logic)
const _MAX_ASYNC_DAYS = 3

// Storage key for draft persistence (for future implementation)
const _STORAGE_KEY = "instantmed_medcert_v2_draft"
const _DRAFT_EXPIRY_HOURS = 24

// ============================================================================
// TYPES
// ============================================================================

interface MedCertFlowV2Props {
  patientId: string | null
  isAuthenticated: boolean
  needsOnboarding: boolean
  userEmail?: string
  userName?: string
  userPhone?: string
  userDob?: string
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

function ProgressIndicator({
  currentStep,
}: {
  currentStep: MedCertStep
}) {
  // Map flow step to progress index
  const getProgressIndex = () => {
    switch (currentStep) {
      case "type_and_dates":
      case "symptoms":
      case "safety":
        return 0 // Details
      case "review":
        return 1 // Review
      case "payment":
        return 2 // Pay
      case "confirmation":
        return 3 // Done
      default:
        return 0
    }
  }

  const currentIndex = getProgressIndex()

  if (currentStep === "confirmation") return null

  return (
    <nav aria-label="Request progress" className="w-full">
      <div className="flex items-center justify-center gap-1.5">
        {PROGRESS_STEPS.map((label, i) => (
          <div
            key={label}
            className={cn(
              "h-1 rounded-full transition-all duration-300",
              i < currentIndex
                ? "bg-primary w-8"
                : i === currentIndex
                ? "bg-primary/80 w-10"
                : "bg-muted-foreground/20 w-6"
            )}
          />
        ))}
      </div>
      <p className="text-center text-xs text-muted-foreground mt-2">
        {PROGRESS_STEPS[currentIndex] || ""}
      </p>
    </nav>
  )
}

function TrustStrip() {
  return (
    <div className="flex items-center justify-center gap-4 py-2 text-xs text-muted-foreground">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1.5 cursor-help">
              <BadgeCheck className="w-3.5 h-3.5 text-green-600" />
              <span>{MED_CERT_COPY.trust.ahpra}</span>
            </div>
          </TooltipTrigger>
          <TooltipContent>All doctors are AHPRA-registered</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1.5 cursor-help">
              <Lock className="w-3.5 h-3.5 text-primary" />
              <span>{MED_CERT_COPY.trust.encrypted}</span>
            </div>
          </TooltipTrigger>
          <TooltipContent>Bank-level encryption protects your data</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1.5 cursor-help">
              <Shield className="w-3.5 h-3.5 text-blue-600" />
              <span>{MED_CERT_COPY.trust.refund}</span>
            </div>
          </TooltipTrigger>
          <TooltipContent>Full refund if your request cannot be approved</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  )
}

function StepHeader({
  title,
  subtitle,
  emoji,
}: {
  title: string
  subtitle?: string
  emoji?: string
}) {
  return (
    <div className="text-center space-y-1">
      {emoji && <div className="text-3xl mb-2">{emoji}</div>}
      <h1 className="text-xl font-semibold">{title}</h1>
      {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
    </div>
  )
}

function TypeCard({
  selected,
  onClick,
  label,
  description,
  emoji,
}: {
  selected: boolean
  onClick: () => void
  label: string
  description: string
  emoji: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full p-4 rounded-xl border-2 text-left transition-all duration-200",
        "hover:scale-[1.01] active:scale-[0.99]",
        selected
          ? "border-primary bg-primary/5 shadow-sm"
          : "border-border/60 bg-white/50 hover:border-primary/40"
      )}
    >
      <div className="flex items-center gap-3">
        <div className={cn(
          "w-12 h-12 rounded-xl flex items-center justify-center text-xl",
          selected ? "bg-primary/10" : "bg-muted"
        )}>
          {emoji}
        </div>
        <div className="flex-1">
          <p className={cn(
            "font-medium transition-colors",
            selected ? "text-primary" : "text-foreground"
          )}>
            {label}
          </p>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        {selected && (
          <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
            <Check className="w-4 h-4 text-primary-foreground" />
          </div>
        )}
      </div>
    </button>
  )
}

function DurationChip({
  selected,
  onClick,
  children,
}: {
  selected: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "px-5 py-3 rounded-full text-sm font-medium transition-all duration-200",
        "hover:scale-105 active:scale-95",
        selected
          ? "bg-primary text-primary-foreground shadow-md"
          : "bg-muted hover:bg-muted/80 border border-border/40"
      )}
    >
      {children}
    </button>
  )
}

function SymptomChip({
  selected,
  onClick,
  emoji,
  label,
}: {
  selected: boolean
  onClick: () => void
  emoji: string
  label: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium transition-all duration-200",
        "hover:scale-105 active:scale-95",
        selected
          ? "bg-primary text-primary-foreground shadow-md"
          : "bg-muted hover:bg-muted/80 border border-border/40"
      )}
    >
      <span>{emoji}</span>
      <span>{label}</span>
    </button>
  )
}

function EmergencyBanner({
  accepted,
  onAccept,
  timestamp,
}: {
  accepted: boolean
  onAccept: (accepted: boolean) => void
  timestamp: string | null
}) {
  return (
    <div className="rounded-2xl border border-red-200 bg-red-50/80 p-5 space-y-4">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
          <Phone className="w-5 h-5 text-red-600" />
        </div>
        <div className="space-y-1 flex-1">
          <h3 className="font-semibold text-red-900">
            {MED_CERT_COPY.emergency.heading}
          </h3>
          <p className="text-sm text-red-800 leading-relaxed">
            {MED_CERT_COPY.emergency.body}
          </p>
        </div>
      </div>

      <label className="flex items-center justify-between gap-4 p-4 rounded-xl bg-white border border-red-200 cursor-pointer hover:bg-red-50/50 transition-colors">
        <span className="text-sm text-red-900 font-medium flex-1">
          {MED_CERT_COPY.emergency.checkbox}
        </span>
        <Switch
          checked={accepted}
          onCheckedChange={(checked) => onAccept(checked)}
        />
      </label>

      {accepted && timestamp && (
        <p className="text-xs text-red-600/70 text-right">
          Confirmed at {new Date(timestamp).toLocaleTimeString()}
        </p>
      )}
    </div>
  )
}

function ReviewRow({
  label,
  value,
  onEdit,
}: {
  label: string
  value: React.ReactNode
  onEdit?: () => void
}) {
  return (
    <div className="flex items-start justify-between py-3 border-b border-border/50 last:border-0">
      <div>
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="font-medium">{value}</p>
      </div>
      {onEdit && (
        <button
          type="button"
          onClick={onEdit}
          className="text-xs text-primary hover:underline"
        >
          {MED_CERT_COPY.review.editButton}
        </button>
      )}
    </div>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function MedCertFlowV2({
  patientId: initialPatientId,
  isAuthenticated: initialIsAuthenticated,
  needsOnboarding: _initialNeedsOnboarding,
  userEmail: _userEmail,
  userName: _userName,
  userPhone: _userPhone,
  userDob: _userDob,
}: MedCertFlowV2Props) {
  const router = useRouter()
  const mainRef = useRef<HTMLElement>(null)

  // ============================================================================
  // STATE
  // ============================================================================

  // Auth state (stored for future use)
  const [_patientId] = useState<string | null>(initialPatientId)
  const [_isAuthenticated] = useState(initialIsAuthenticated)

  // Flow state
  const [currentStep, setCurrentStep] = useState<MedCertStep>("safety") // Start with safety
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form data
  const [formData, setFormData] = useState<Partial<MedCertIntakeData>>({
    certificateType: undefined,
    startDate: new Date().toISOString().split("T")[0], // Default to today
    durationDays: 1, // Default to 1 day
    symptoms: [],
    emergencyDisclaimerConfirmed: false,
  })

  // Attestation
  const [patientConfirmedAccurate, setPatientConfirmedAccurate] = useState(false)

  // Escalation
  const [showEscalationModal, setShowEscalationModal] = useState(false)

  // Computed
  const isCarer = formData.certificateType === "carer"
  const isExtended = formData.durationDays === "extended"
  const requiresCall = isExtended

  // ============================================================================
  // NAVIGATION
  // ============================================================================

  const goToStep = useCallback((step: MedCertStep) => {
    setIsTransitioning(true)
    setTimeout(() => {
      setCurrentStep(step)
      setIsTransitioning(false)
    }, 150)
  }, [])

  const goBack = useCallback(() => {
    const currentIndex = STEPS.indexOf(currentStep)
    if (currentIndex > 0) {
      goToStep(STEPS[currentIndex - 1])
    }
  }, [currentStep, goToStep])

  const goNext = useCallback(() => {
    const currentIndex = STEPS.indexOf(currentStep)
    if (currentIndex < STEPS.length - 1) {
      // Check for escalation before proceeding to review
      if (currentStep === "symptoms" && isExtended) {
        setShowEscalationModal(true)
        return
      }
      goToStep(STEPS[currentIndex + 1])
    }
  }, [currentStep, goToStep, isExtended])

  // ============================================================================
  // VALIDATION
  // ============================================================================

  const canContinue = useCallback(() => {
    switch (currentStep) {
      case "safety":
        return formData.emergencyDisclaimerConfirmed === true

      case "type_and_dates":
        return (
          formData.certificateType !== undefined &&
          formData.durationDays !== undefined &&
          formData.startDate !== undefined
        )

      case "symptoms":
        if (isCarer) {
          return (
            formData.symptoms && formData.symptoms.length > 0 &&
            formData.carerPersonName?.trim() &&
            formData.carerRelationship !== undefined
          )
        }
        // Check if "other" is selected and requires details
        if (formData.symptoms?.includes("other") && !formData.otherSymptomDetails?.trim()) {
          return false
        }
        return formData.symptoms && formData.symptoms.length > 0

      case "review":
        return patientConfirmedAccurate

      case "payment":
        return true

      default:
        return false
    }
  }, [currentStep, formData, isCarer, patientConfirmedAccurate])

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const handleEmergencyConfirm = (confirmed: boolean) => {
    setFormData(prev => ({
      ...prev,
      emergencyDisclaimerConfirmed: confirmed,
      emergencyDisclaimerTimestamp: confirmed ? new Date().toISOString() : undefined,
    }))
    
    // Auto-advance when confirmed
    if (confirmed) {
      setTimeout(() => goToStep("type_and_dates"), 300)
    }
  }

  const handleTypeSelect = (type: CertificateType) => {
    setFormData(prev => ({ ...prev, certificateType: type }))
  }

  const handleDurationSelect = (days: 1 | 2) => {
    setFormData(prev => ({ ...prev, durationDays: days }))
  }

  const handleLongerDurationRedirect = () => {
    // Route to general consultation with context
    const params = new URLSearchParams({
      source: 'med_cert',
      reason: 'extended_duration',
      intended_duration: 'more_than_2_days',
    })
    router.push(`/consult?${params.toString()}`)
  }

  const handleSymptomToggle = (symptomId: SymptomId) => {
    setFormData(prev => {
      const current = prev.symptoms || []
      const updated = current.includes(symptomId)
        ? current.filter(s => s !== symptomId)
        : [...current, symptomId]
      return { ...prev, symptoms: updated }
    })
  }

  const handleSubmit = async () => {
    setIsSubmitting(true)
    setError(null)

    try {
      // Save draft to localStorage before checkout (ensures data isn't lost)
      try {
        const draft = {
          formData,
          patientConfirmedAccurate,
          savedAt: new Date().toISOString(),
        }
        localStorage.setItem('instantmed_medcert_checkout_draft', JSON.stringify(draft))
      } catch {
        // Non-blocking - continue with checkout even if save fails
      }

      // Calculate end date
      const startDate = new Date(formData.startDate!)
      const durationDays = typeof formData.durationDays === "number" ? formData.durationDays : 1
      const endDate = new Date(startDate)
      endDate.setDate(endDate.getDate() + durationDays - 1)

      // Build answers payload for intake_answers table
      const answers = {
        // Certificate details
        certificate_type: formData.certificateType,
        start_date: formData.startDate,
        end_date: endDate.toISOString().split("T")[0],
        duration_days: durationDays,
        
        // Symptoms
        symptoms: formData.symptoms,
        other_symptom_details: formData.otherSymptomDetails || null,
        
        // Carer details (if applicable)
        carer_person_name: formData.carerPersonName || null,
        carer_relationship: formData.carerRelationship || null,
        
        // Compliance / safety confirmation
        emergency_disclaimer_confirmed: formData.emergencyDisclaimerConfirmed,
        emergency_disclaimer_timestamp: formData.emergencyDisclaimerTimestamp,
        patient_confirmed_accurate: patientConfirmedAccurate,
        patient_confirmed_timestamp: new Date().toISOString(),
        
        // Audit metadata
        template_version: "2.0.0",
        submitted_at: new Date().toISOString(),
      }

      // Determine service slug based on certificate type
      const serviceSlug = formData.certificateType === "carer" 
        ? "med-cert-carer" 
        : "med-cert-sick"

      // Create intake and redirect to Stripe checkout
      const idempotencyKey = crypto.randomUUID()
      const result = await createIntakeAndCheckoutAction({
        category: "medical_certificate",
        subtype: formData.certificateType || "work",
        type: `med-cert-${formData.certificateType || "work"}`,
        answers,
        serviceSlug,
        idempotencyKey,
      })

      if (!result.success) {
        setError(result.error || MED_CERT_COPY.errors.generic)
        return
      }

      if (result.checkoutUrl) {
        // Redirect to Stripe checkout
        window.location.href = result.checkoutUrl
      } else {
        // Fallback - should not happen but handle gracefully
        setError("Unable to create checkout session. Please try again.")
      }
    } catch {
      setError(MED_CERT_COPY.errors.generic)
    } finally {
      setIsSubmitting(false)
    }
  }

  // ============================================================================
  // COMPUTED VALUES
  // ============================================================================

  const getEndDate = (): string => {
    if (!formData.startDate || !formData.durationDays) return formData.startDate || new Date().toISOString().split("T")[0]
    const start = new Date(formData.startDate)
    const days = typeof formData.durationDays === "number" ? formData.durationDays : 1
    start.setDate(start.getDate() + days - 1)
    return start.toISOString().split("T")[0]
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-AU", {
      weekday: "short",
      day: "numeric",
      month: "short",
    })
  }

  const getCertTypeLabel = () => {
    const types = MED_CERT_COPY.typeAndDates.types
    return types[formData.certificateType as keyof typeof types]?.label || ""
  }

  const getSymptomLabels = () => {
    return formData.symptoms?.map(id => {
      const opt = SYMPTOM_OPTIONS.find(o => o.id === id)
      return opt?.label || id
    }).join(", ") || ""
  }

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-linear-to-b from-background to-muted/30">
        {/* Header */}
        {currentStep !== "confirmation" && (
          <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-lg border-b">
            <div className="max-w-lg mx-auto px-4 py-3">
              <div className="flex items-center gap-3 mb-3">
                {currentStep !== "safety" && (
                  <button
                    onClick={goBack}
                    className="p-2 -ml-2 rounded-lg hover:bg-muted transition-colors"
                    aria-label="Go back"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                )}
                <div className="flex-1 flex items-center justify-center gap-2">
                  <FileText className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium">Medical Certificate</span>
                </div>
                <Link href="/" className="p-2 -mr-2 rounded-lg hover:bg-muted transition-colors">
                  <X className="w-5 h-5" />
                </Link>
              </div>
              <ProgressIndicator currentStep={currentStep} />
            </div>
          </header>
        )}

        {/* Content */}
        <main
          ref={mainRef}
          className={cn(
            "max-w-lg mx-auto px-4 py-6 pb-32 transition-opacity duration-150",
            isTransitioning ? "opacity-0" : "opacity-100"
          )}
        >
          {/* Error banner */}
          {error && (
            <div className="mb-4 p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-600">
              {error}
            </div>
          )}

          {/* Step: Safety (shown FIRST and ONCE) */}
          {currentStep === "safety" && (
            <div className="space-y-6 animate-step-enter">
              <StepHeader
                emoji="🩺"
                title="Medical Certificate"
                subtitle="A GP will review your request"
              />

              <EmergencyBanner
                accepted={formData.emergencyDisclaimerConfirmed || false}
                onAccept={handleEmergencyConfirm}
                timestamp={formData.emergencyDisclaimerTimestamp || null}
              />

              {formData.emergencyDisclaimerConfirmed && (
                <div className="animate-fade-in">
                  <p className="text-sm text-center text-muted-foreground">
                    {MED_CERT_COPY.global.turnaround}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Step: Type + Dates (COMBINED) */}
          {currentStep === "type_and_dates" && (
            <div className="space-y-6 animate-step-enter">
              <StepHeader
                title={MED_CERT_COPY.typeAndDates.heading}
                subtitle={MED_CERT_COPY.typeAndDates.subtitle}
              />

              {/* Certificate type */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">
                  {MED_CERT_COPY.typeAndDates.typeLabel}
                </Label>
                <div className="space-y-2">
                  <TypeCard
                    selected={formData.certificateType === "work"}
                    onClick={() => handleTypeSelect("work")}
                    label={MED_CERT_COPY.typeAndDates.types.work.label}
                    description={MED_CERT_COPY.typeAndDates.types.work.description}
                    emoji={MED_CERT_COPY.typeAndDates.types.work.emoji}
                  />
                  <TypeCard
                    selected={formData.certificateType === "study"}
                    onClick={() => handleTypeSelect("study")}
                    label={MED_CERT_COPY.typeAndDates.types.study.label}
                    description={MED_CERT_COPY.typeAndDates.types.study.description}
                    emoji={MED_CERT_COPY.typeAndDates.types.study.emoji}
                  />
                  <TypeCard
                    selected={formData.certificateType === "carer"}
                    onClick={() => handleTypeSelect("carer")}
                    label={MED_CERT_COPY.typeAndDates.types.carer.label}
                    description={MED_CERT_COPY.typeAndDates.types.carer.description}
                    emoji={MED_CERT_COPY.typeAndDates.types.carer.emoji}
                  />
                </div>
              </div>

              {/* Duration */}
              {formData.certificateType && (
                <div className="space-y-3 animate-fade-in">
                  <Label className="text-sm font-medium">
                    {MED_CERT_COPY.typeAndDates.durationLabel}
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    <DurationChip
                      selected={formData.durationDays === 1}
                      onClick={() => handleDurationSelect(1)}
                    >
                      {MED_CERT_COPY.typeAndDates.durationOptions[1]}
                    </DurationChip>
                    <DurationChip
                      selected={formData.durationDays === 2}
                      onClick={() => handleDurationSelect(2)}
                    >
                      {MED_CERT_COPY.typeAndDates.durationOptions[2]}
                    </DurationChip>
                  </div>
                  {/* Discreet link for longer durations - routes to general consultation */}
                  <button
                    type="button"
                    onClick={handleLongerDurationRedirect}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors underline-offset-2 hover:underline"
                  >
                    {MED_CERT_COPY.typeAndDates.longerDurationLink}
                  </button>
                </div>
              )}

              {/* Start date */}
              {formData.certificateType && formData.durationDays && (
                <div className="space-y-2 animate-fade-in">
                  <Label htmlFor="start-date" className="text-sm font-medium">
                    {MED_CERT_COPY.typeAndDates.startDateLabel}
                  </Label>
                  <Input
                    id="start-date"
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                    min={new Date().toISOString().split("T")[0]}
                    className="h-12 rounded-xl"
                  />
                  <p className="text-xs text-muted-foreground">
                    {MED_CERT_COPY.typeAndDates.startDateHint}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Step: Symptoms (combined with carer details) */}
          {currentStep === "symptoms" && (
            <div className="space-y-6 animate-step-enter">
              <StepHeader
                emoji={isCarer ? "❤️" : "🤒"}
                title={isCarer ? MED_CERT_COPY.symptoms.headingCarer : MED_CERT_COPY.symptoms.heading}
                subtitle={MED_CERT_COPY.symptoms.subtitle}
              />

              {/* Carer details first */}
              {isCarer && (
                <div className="space-y-4 p-4 rounded-xl bg-muted/30 border border-border animate-fade-in">
                  <p className="font-medium text-sm">{MED_CERT_COPY.symptoms.carerSection.heading}</p>
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label htmlFor="carer-name" className="text-sm">
                        {MED_CERT_COPY.symptoms.carerSection.nameLabel}
                      </Label>
                      <Input
                        id="carer-name"
                        value={formData.carerPersonName || ""}
                        onChange={(e) => setFormData(prev => ({ ...prev, carerPersonName: e.target.value }))}
                        placeholder={MED_CERT_COPY.symptoms.carerSection.namePlaceholder}
                        className="h-11 rounded-xl"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm">
                        {MED_CERT_COPY.symptoms.carerSection.relationshipLabel}
                      </Label>
                      <div className="flex flex-wrap gap-2">
                        {CARER_RELATIONSHIPS.map((rel) => (
                          <DurationChip
                            key={rel.id}
                            selected={formData.carerRelationship === rel.id}
                            onClick={() => setFormData(prev => ({ ...prev, carerRelationship: rel.id }))}
                          >
                            {rel.label}
                          </DurationChip>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Symptom chips */}
              <div className="flex flex-wrap gap-2">
                {SYMPTOM_OPTIONS.map((symptom) => (
                  <SymptomChip
                    key={symptom.id}
                    selected={formData.symptoms?.includes(symptom.id) || false}
                    onClick={() => handleSymptomToggle(symptom.id)}
                    emoji={symptom.emoji}
                    label={symptom.label}
                  />
                ))}
              </div>

              {/* Other details */}
              {formData.symptoms?.includes("other") && (
                <div className="space-y-2 animate-fade-in">
                  <Label htmlFor="other-details" className="text-sm font-medium">
                    {MED_CERT_COPY.symptoms.otherLabel}
                  </Label>
                  <Input
                    id="other-details"
                    value={formData.otherSymptomDetails || ""}
                    onChange={(e) => setFormData(prev => ({ ...prev, otherSymptomDetails: e.target.value }))}
                    placeholder={MED_CERT_COPY.symptoms.otherPlaceholder}
                    className="h-11 rounded-xl"
                  />
                  <p className="text-xs text-muted-foreground">
                    {MED_CERT_COPY.symptoms.otherHint}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Step: Review (READ-ONLY) */}
          {currentStep === "review" && (
            <div className="space-y-6 animate-step-enter">
              <StepHeader
                emoji="👀"
                title={MED_CERT_COPY.review.heading}
                subtitle={MED_CERT_COPY.review.subtitle}
              />

              <div className="rounded-xl border border-border bg-card overflow-hidden">
                <div className="p-4 space-y-0">
                  <ReviewRow
                    label={MED_CERT_COPY.review.labels.certificateType}
                    value={getCertTypeLabel()}
                    onEdit={() => goToStep("type_and_dates")}
                  />
                  <ReviewRow
                    label={MED_CERT_COPY.review.labels.dates}
                    value={`${formatDate(formData.startDate || new Date().toISOString().split("T")[0])} – ${formatDate(getEndDate())}`}
                    onEdit={() => goToStep("type_and_dates")}
                  />
                  <ReviewRow
                    label={MED_CERT_COPY.review.labels.duration}
                    value={MED_CERT_COPY.review.durationDays(
                      typeof formData.durationDays === "number" ? formData.durationDays : 1
                    )}
                  />
                  <ReviewRow
                    label={MED_CERT_COPY.review.labels.symptoms}
                    value={getSymptomLabels()}
                    onEdit={() => goToStep("symptoms")}
                  />
                  {isCarer && formData.carerPersonName && (
                    <ReviewRow
                      label={MED_CERT_COPY.review.labels.carerFor}
                      value={`${formData.carerPersonName} (${formData.carerRelationship})`}
                    />
                  )}
                </div>
              </div>

              {/* Attestation toggle */}
              <label className="flex items-center justify-between gap-4 p-4 rounded-xl border border-border bg-card cursor-pointer hover:bg-muted/50 transition-colors">
                <span className="text-sm flex-1">{MED_CERT_COPY.review.attestation.label}</span>
                <Switch
                  checked={patientConfirmedAccurate}
                  onCheckedChange={(checked) => setPatientConfirmedAccurate(checked)}
                />
              </label>

              <p className="text-xs text-center text-muted-foreground">
                {MED_CERT_COPY.review.note}
              </p>
            </div>
          )}

          {/* Step: Payment */}
          {currentStep === "payment" && (
            <div className="space-y-6 animate-step-enter">
              <StepHeader
                emoji="💳"
                title={MED_CERT_COPY.payment.heading}
                subtitle={MED_CERT_COPY.payment.subtitle}
              />

              <div className="p-5 rounded-2xl border border-border bg-card space-y-4">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Total</span>
                  <span className="text-2xl font-bold text-primary">
                    {requiresCall ? MED_CERT_COPY.payment.priceExtended : MED_CERT_COPY.payment.price}
                  </span>
                </div>

                <hr className="border-border" />

                <ul className="space-y-2">
                  {MED_CERT_COPY.payment.includes.map((item, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm">
                      <CheckCircle className="w-4 h-4 text-green-600 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              <p className="text-xs text-center text-muted-foreground">
                {MED_CERT_COPY.payment.disclaimer}
              </p>
            </div>
          )}

          {/* Step: Confirmation */}
          {currentStep === "confirmation" && (
            <div className="space-y-6 animate-step-enter">
              <div className="text-center space-y-4">
                <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto">
                  <CheckCircle className="w-10 h-10 text-green-600" />
                </div>
                <h1 className="text-2xl font-semibold">{MED_CERT_COPY.confirmation.heading}</h1>
                <p className="text-muted-foreground">{MED_CERT_COPY.confirmation.subtitle}</p>
              </div>

              {/* Timeline */}
              <div className="p-5 rounded-2xl border border-border bg-card">
                <div className="space-y-4">
                  {MED_CERT_COPY.confirmation.timeline.map((item, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center",
                        item.status === "complete" ? "bg-green-100" :
                        item.status === "current" ? "bg-primary/20" :
                        "bg-muted"
                      )}>
                        {item.status === "complete" ? (
                          <Check className="w-4 h-4 text-green-600" />
                        ) : item.status === "current" ? (
                          <Loader2 className="w-4 h-4 text-primary animate-spin" />
                        ) : (
                          <Clock className="w-4 h-4 text-muted-foreground" />
                        )}
                      </div>
                      <span className={cn(
                        "text-sm font-medium",
                        item.status === "pending" ? "text-muted-foreground" : ""
                      )}>
                        {item.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Escalation message */}
              {requiresCall && (
                <div className="p-4 rounded-xl bg-dawn-50 border border-dawn-200">
                  <div className="flex items-start gap-3">
                    <Phone className="w-5 h-5 text-dawn-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-dawn-900">
                        {MED_CERT_COPY.confirmation.escalationMessage.heading}
                      </p>
                      <p className="text-sm text-dawn-800">
                        {MED_CERT_COPY.confirmation.escalationMessage.body}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* What next */}
              <div className="p-4 rounded-xl bg-muted/50 space-y-3">
                <p className="font-medium text-sm">{MED_CERT_COPY.confirmation.whatNext.heading}</p>
                <ol className="space-y-2">
                  {MED_CERT_COPY.confirmation.whatNext.steps.map((step, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <span className="font-medium text-primary">{i + 1}.</span>
                      {step}
                    </li>
                  ))}
                </ol>
              </div>

              <Button
                onClick={() => router.push("/patient/intakes")}
                className="w-full h-12 rounded-xl"
              >
                {MED_CERT_COPY.confirmation.trackStatus}
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          )}
        </main>

        {/* Footer */}
        {currentStep !== "confirmation" && (
          <footer className="fixed bottom-0 inset-x-0 z-40 bg-background/95 backdrop-blur-sm border-t border-border px-4 py-4 safe-area-pb">
            <div className="max-w-lg mx-auto space-y-3">
              <TrustStrip />

              <div className="flex gap-3">
                {currentStep !== "safety" && (
                  <Button
                    variant="ghost"
                    onClick={goBack}
                    className="h-12 px-4 rounded-xl"
                    aria-label="Go back"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </Button>
                )}

                {currentStep === "payment" ? (
                  <Button
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    className="flex-1 h-12 rounded-xl"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        {MED_CERT_COPY.payment.processing}
                      </>
                    ) : (
                      <>
                        {MED_CERT_COPY.payment.cta}
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </>
                    )}
                  </Button>
                ) : currentStep === "safety" ? (
                  <Button
                    onClick={() => goToStep("type_and_dates")}
                    disabled={!canContinue()}
                    className="flex-1 h-12 rounded-xl"
                  >
                    {MED_CERT_COPY.nav.continue}
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                ) : (
                  <Button
                    onClick={goNext}
                    disabled={!canContinue()}
                    className="flex-1 h-12 rounded-xl"
                  >
                    {MED_CERT_COPY.nav.continue}
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                )}
              </div>
            </div>
          </footer>
        )}

        {/* Escalation Modal */}
        {showEscalationModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-background rounded-2xl p-6 max-w-sm w-full space-y-4 animate-slide-up">
              <div className="text-center">
                <div className="w-12 h-12 rounded-full bg-dawn-100 flex items-center justify-center mx-auto mb-3">
                  <Phone className="w-6 h-6 text-dawn-600" />
                </div>
                <h2 className="text-lg font-semibold">
                  {MED_CERT_COPY.escalation.extendedDuration.heading}
                </h2>
                <p className="text-sm text-muted-foreground mt-2">
                  {MED_CERT_COPY.escalation.extendedDuration.body}
                </p>
              </div>

              <div className="space-y-2">
                <Button
                  onClick={() => {
                    setFormData(prev => ({ ...prev, escalatedToCall: true }))
                    setShowEscalationModal(false)
                    goToStep("review")
                  }}
                  className="w-full h-12 rounded-xl"
                >
                  {MED_CERT_COPY.escalation.extendedDuration.cta}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setFormData(prev => ({ ...prev, durationDays: 3 }))
                    setShowEscalationModal(false)
                  }}
                  className="w-full h-12 rounded-xl"
                >
                  {MED_CERT_COPY.escalation.extendedDuration.alternativeCta}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </TooltipProvider>
  )
}

export default MedCertFlowV2
