"use client"

import { useState, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ArrowRight, ArrowLeft, Loader2, Phone } from "lucide-react"
import { TooltipProvider } from "@/components/ui/tooltip"
import { MED_CERT_COPY } from "@/lib/microcopy/med-cert-v2"
import { SYMPTOM_OPTIONS } from "@/types/med-cert"
import { createIntakeAndCheckoutAction } from "@/lib/stripe/checkout"
import type {
  MedCertStep,
  CertificateType,
  SymptomId,
  MedCertIntakeData,
} from "@/types/med-cert"
import { cn } from "@/lib/utils"

// Step components
import { MedCertHeader } from "@/components/med-cert/med-cert-header"
import { TrustStrip } from "@/components/med-cert/med-cert-shared"
import { SafetyStep } from "@/components/med-cert/steps/safety-step"
import { TypeAndDatesStep } from "@/components/med-cert/steps/type-and-dates-step"
import { SymptomsStep } from "@/components/med-cert/steps/symptoms-step"
import { ReviewStep } from "@/components/med-cert/steps/review-step"
import { PaymentStep } from "@/components/med-cert/steps/payment-step"
import { ConfirmationStep } from "@/components/med-cert/steps/confirmation-step"

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
        <MedCertHeader currentStep={currentStep} onBack={goBack} />

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
            <div className="mb-4 p-4 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/40 text-sm text-red-600 dark:text-red-400">
              {error}
            </div>
          )}

          {/* Step: Safety */}
          {currentStep === "safety" && (
            <SafetyStep
              emergencyDisclaimerConfirmed={formData.emergencyDisclaimerConfirmed || false}
              emergencyDisclaimerTimestamp={formData.emergencyDisclaimerTimestamp}
              onEmergencyConfirm={handleEmergencyConfirm}
            />
          )}

          {/* Step: Type + Dates */}
          {currentStep === "type_and_dates" && (
            <TypeAndDatesStep
              certificateType={formData.certificateType}
              durationDays={formData.durationDays}
              startDate={formData.startDate}
              onTypeSelect={handleTypeSelect}
              onDurationSelect={handleDurationSelect}
              onLongerDurationRedirect={handleLongerDurationRedirect}
              onStartDateChange={(date) => setFormData(prev => ({ ...prev, startDate: date }))}
            />
          )}

          {/* Step: Symptoms */}
          {currentStep === "symptoms" && (
            <SymptomsStep
              isCarer={isCarer}
              symptoms={formData.symptoms || []}
              carerPersonName={formData.carerPersonName}
              carerRelationship={formData.carerRelationship}
              otherSymptomDetails={formData.otherSymptomDetails}
              onSymptomToggle={handleSymptomToggle}
              onCarerNameChange={(name) => setFormData(prev => ({ ...prev, carerPersonName: name }))}
              onCarerRelationshipChange={(rel) => setFormData(prev => ({ ...prev, carerRelationship: rel }))}
              onOtherDetailsChange={(details) => setFormData(prev => ({ ...prev, otherSymptomDetails: details }))}
            />
          )}

          {/* Step: Review */}
          {currentStep === "review" && (
            <ReviewStep
              certTypeLabel={getCertTypeLabel()}
              formattedDateRange={`${formatDate(formData.startDate || new Date().toISOString().split("T")[0])} – ${formatDate(getEndDate())}`}
              durationLabel={MED_CERT_COPY.review.durationDays(
                typeof formData.durationDays === "number" ? formData.durationDays : 1
              )}
              symptomLabels={getSymptomLabels()}
              isCarer={isCarer}
              carerPersonName={formData.carerPersonName}
              carerRelationship={formData.carerRelationship}
              patientConfirmedAccurate={patientConfirmedAccurate}
              onConfirmedChange={setPatientConfirmedAccurate}
              goToStep={goToStep}
            />
          )}

          {/* Step: Payment */}
          {currentStep === "payment" && (
            <PaymentStep requiresCall={requiresCall} />
          )}

          {/* Step: Confirmation */}
          {currentStep === "confirmation" && (
            <ConfirmationStep requiresCall={requiresCall} />
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
