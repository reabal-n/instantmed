"use client"

import { useState, useCallback, useMemo, useEffect } from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import confetti from "canvas-confetti"
import {
  ArrowRight,
  ArrowLeft,
  Loader2,
  Clock,
  CheckCircle,
  AlertTriangle,
  Briefcase,
  GraduationCap,
  Heart,
  Check,
  FileText,
  Shield,
  Pill,
  Stethoscope,
  PhoneOff,
  Star,
  Phone,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { logger } from "@/lib/logger"
import {
  SymptomChecker,
  checkSymptoms,
} from "@/components/intake/symptom-checker"
import { TrustBadgeStrip } from "@/components/shared/doctor-credentials"
import { createGuestCheckoutAction } from "@/lib/stripe/guest-checkout"
import { createRequestAndCheckoutAction } from "@/lib/stripe/checkout"
import type { ServiceCategory } from "@/lib/stripe/client"

// ============================================
// TYPES
// ============================================

type ServiceType = "med-cert" | "repeat-script" | "new-script" | "consult"

type IntakeStep =
  | "service"      // Step 1: What do you need?
  | "details"      // Step 2: Service-specific details (combined)
  | "safety"       // Step 3: Quick safety check (integrated with symptom checker)
  | "account"      // Step 4: Your details
  | "review"       // Step 5: Review & pay

interface IntakeState {
  // Service selection
  service: ServiceType | null
  
  // Med cert specific
  certType: "work" | "study" | "carer" | null
  duration: "1" | "2" | "3" | null
  startDate: string
  symptoms: string[]
  symptomDetails: string
  employerName: string
  
  // Prescription specific
  medicationType: "repeat" | "new" | null
  medicationName: string
  medicationDosage: string
  lastPrescribed: string
  pharmacyPreference: string
  
  // Consult specific
  consultReason: string
  
  // Safety
  safetyConfirmed: boolean
  hasEmergencySymptoms: boolean
  
  // Account
  firstName: string
  lastName: string
  email: string
  phone: string
  dob: string
  
  // Meta
  agreedToTerms: boolean
}

interface EnhancedIntakeFlowProps {
  initialService?: ServiceType
  patientId?: string | null
  isAuthenticated?: boolean
  userEmail?: string
  userName?: string
  onComplete?: (state: IntakeState) => Promise<void>
}

// ============================================
// CONSTANTS
// ============================================

const SERVICES: Array<{
  id: ServiceType
  title: string
  subtitle: string
  icon: React.ElementType
  price: string
  time: string
  noCall: boolean
  popular?: boolean
}> = [
  {
    id: "med-cert",
    title: "Medical Certificate",
    subtitle: "Sick leave, carer's leave, study",
    icon: FileText,
    price: "$29.95",
    time: "~15 mins",
    noCall: true,
    popular: true,
  },
  {
    id: "repeat-script",
    title: "Repeat Prescription",
    subtitle: "Medication you already take",
    icon: Pill,
    price: "$19.95",
    time: "~15 mins",
    noCall: true,
  },
  {
    id: "new-script",
    title: "New Prescription",
    subtitle: "First-time medication",
    icon: Stethoscope,
    price: "$29.95",
    time: "2 min call",
    noCall: false,
  },
]

const CERT_TYPES = [
  { id: "work", label: "Work", icon: Briefcase, description: "For your employer" },
  { id: "study", label: "Study", icon: GraduationCap, description: "For uni or school" },
  { id: "carer", label: "Carer's leave", icon: Heart, description: "To care for someone" },
] as const

const SYMPTOMS_LIST = [
  "Cold/Flu",
  "Fever",
  "Headache",
  "Nausea",
  "Gastro",
  "Fatigue",
  "Pain",
  "Migraine",
  "Anxiety",
  "Other",
] as const

// ============================================
// ANIMATION VARIANTS
// ============================================

const stepVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 30 : -30,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: direction < 0 ? 30 : -30,
    opacity: 0,
  }),
}

const cardVariants = {
  initial: { scale: 0.96, opacity: 0 },
  animate: { scale: 1, opacity: 1 },
  tap: { scale: 0.98 },
}

// ============================================
// SUB-COMPONENTS
// ============================================

function ProgressIndicator({
  steps,
  currentStep,
  className,
}: {
  steps: string[]
  currentStep: number
  className?: string
}) {
  return (
    <div className={cn("flex items-center justify-center gap-2", className)}>
      {steps.map((_, index) => (
        <div
          key={index}
          className={cn(
            "h-1.5 rounded-full transition-all duration-300",
            index === currentStep
              ? "w-8 bg-primary"
              : index < currentStep
              ? "w-2 bg-primary/60"
              : "w-2 bg-muted"
          )}
        />
      ))}
    </div>
  )
}

function ServiceCard({
  service,
  selected,
  onClick,
}: {
  service: (typeof SERVICES)[number]
  selected: boolean
  onClick: () => void
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      variants={cardVariants}
      initial="initial"
      animate="animate"
      whileTap="tap"
      transition={{ duration: 0.2 }}
      className={cn(
        "relative w-full p-5 rounded-2xl border-2 text-left transition-all",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
        selected
          ? "border-primary bg-primary/5 shadow-lg shadow-primary/10"
          : "border-border bg-white hover:border-primary/40 hover:shadow-md"
      )}
    >
      {/* Popular badge */}
      {service.popular && (
        <Badge className="absolute -top-2.5 right-3 bg-green-500 text-white text-[10px]">
          Most Popular
        </Badge>
      )}

      <div className="flex items-start gap-4">
        <div
          className={cn(
            "w-12 h-12 rounded-xl flex items-center justify-center transition-colors",
            selected ? "bg-primary text-white" : "bg-primary/10 text-primary"
          )}
        >
          <service.icon className="w-6 h-6" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-foreground">{service.title}</h3>
            {service.noCall && (
              <span className="inline-flex items-center gap-1 text-[10px] text-green-700 bg-green-100 px-1.5 py-0.5 rounded-full">
                <PhoneOff className="w-2.5 h-2.5" />
                No call
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground">{service.subtitle}</p>

          <div className="flex items-center gap-3 mt-3 text-xs">
            <span className="font-semibold text-primary">{service.price}</span>
            <span className="text-muted-foreground flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {service.time}
            </span>
          </div>
        </div>

        {selected && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="w-6 h-6 rounded-full bg-primary flex items-center justify-center"
          >
            <Check className="w-4 h-4 text-white" />
          </motion.div>
        )}
      </div>
    </motion.button>
  )
}

function SelectableChip({
  selected,
  onClick,
  children,
  className,
}: {
  selected: boolean
  onClick: () => void
  children: React.ReactNode
  className?: string
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileTap={{ scale: 0.95 }}
      className={cn(
        "px-4 py-2.5 rounded-xl text-sm font-medium transition-all",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
        selected
          ? "bg-primary text-white shadow-md"
          : "bg-white border border-border hover:border-primary/40 hover:shadow-sm",
        className
      )}
    >
      {children}
    </motion.button>
  )
}

function OptionCard({
  selected,
  onClick,
  icon: Icon,
  label,
  description,
}: {
  selected: boolean
  onClick: () => void
  icon: React.ElementType
  label: string
  description?: string
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileTap={{ scale: 0.98 }}
      className={cn(
        "w-full p-4 rounded-xl border-2 flex items-center gap-4 text-left transition-all",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
        selected
          ? "border-primary bg-primary/5 shadow-sm"
          : "border-border bg-white hover:border-primary/40"
      )}
    >
      <div
        className={cn(
          "w-11 h-11 rounded-lg flex items-center justify-center transition-colors",
          selected ? "bg-primary text-white" : "bg-muted text-muted-foreground"
        )}
      >
        <Icon className="w-5 h-5" />
      </div>
      <div className="flex-1">
        <span className="font-medium text-sm block">{label}</span>
        {description && (
          <span className="text-xs text-muted-foreground">{description}</span>
        )}
      </div>
      {selected && <Check className="w-5 h-5 text-primary" />}
    </motion.button>
  )
}

function FormField({
  label,
  required,
  error,
  children,
  className,
}: {
  label: string
  required?: boolean
  error?: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label className="text-sm font-medium">
        {label}
        {required && <span className="text-destructive ml-0.5">*</span>}
      </Label>
      {children}
      {error && (
        <p className="text-xs text-destructive flex items-center gap-1">
          <AlertTriangle className="w-3 h-3" />
          {error}
        </p>
      )}
    </div>
  )
}

// ============================================
// MAIN COMPONENT
// ============================================

export function EnhancedIntakeFlow({
  initialService,
  isAuthenticated = false,
  userEmail,
  userName,
}: EnhancedIntakeFlowProps) {
  const router = useRouter()
  const [[step, direction], setStep] = useState<[IntakeStep, number]>([
    initialService ? "details" : "service",
    0,
  ])

  // Form state
  const [state, setState] = useState<IntakeState>({
    service: initialService || null,
    certType: null,
    duration: null,
    startDate: new Date().toISOString().split("T")[0],
    symptoms: [],
    symptomDetails: "",
    employerName: "",
    medicationType: null,
    medicationName: "",
    medicationDosage: "",
    lastPrescribed: "",
    pharmacyPreference: "",
    consultReason: "",
    safetyConfirmed: false,
    hasEmergencySymptoms: false,
    firstName: userName?.split(" ")[0] || "",
    lastName: userName?.split(" ").slice(1).join(" ") || "",
    email: userEmail || "",
    phone: "",
    dob: "",
    agreedToTerms: false,
  })

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<Partial<Record<keyof IntakeState, string>>>({})

  // Determine steps based on service
  const steps = useMemo(() => {
    const baseSteps: IntakeStep[] = ["service", "details", "safety"]
    if (!isAuthenticated) {
      baseSteps.push("account")
    }
    baseSteps.push("review")
    return baseSteps
  }, [isAuthenticated])

  const stepIndex = steps.indexOf(step)
  const isFirstStep = stepIndex === 0
  const isLastStep = stepIndex === steps.length - 1

  // Update field
  const updateField = useCallback(
    <K extends keyof IntakeState>(field: K, value: IntakeState[K]) => {
      setState((prev) => ({ ...prev, [field]: value }))
      setErrors((prev) => ({ ...prev, [field]: undefined }))
    },
    []
  )

  // Toggle symptom
  const toggleSymptom = useCallback((symptom: string) => {
    setState((prev) => ({
      ...prev,
      symptoms: prev.symptoms.includes(symptom)
        ? prev.symptoms.filter((s) => s !== symptom)
        : [...prev.symptoms, symptom],
    }))
  }, [])

  // Auto-advance when service is selected on first step
  useEffect(() => {
    if (step === "service" && state.service) {
      const timer = setTimeout(() => {
        const nextStep = steps[steps.indexOf("service") + 1]
        if (nextStep) {
          setStep([nextStep, 1])
        }
      }, 300)
      return () => clearTimeout(timer)
    }
  }, [step, state.service, steps])

  // Check red flags
  const symptomCheckResult = useMemo(() => {
    return checkSymptoms(state.symptoms, state.symptomDetails)
  }, [state.symptoms, state.symptomDetails])

  // Validate current step
  const validateStep = useCallback((): boolean => {
    const newErrors: Partial<Record<keyof IntakeState, string>> = {}

    switch (step) {
      case "service":
        if (!state.service) {
          newErrors.service = "Please select a service"
        }
        break

      case "details":
        if (state.service === "med-cert") {
          if (!state.certType) newErrors.certType = "Please select certificate type"
          if (!state.duration) newErrors.duration = "Please select duration"
          if (state.symptoms.length === 0)
            newErrors.symptoms = "Please select at least one symptom"
        } else if (state.service === "repeat-script" || state.service === "new-script") {
          if (!state.medicationName)
            newErrors.medicationName = "Please enter medication name"
        }
        break

      case "safety":
        if (symptomCheckResult.severity === "critical") {
          return false // Block progression
        }
        break

      case "account":
        if (!state.firstName) newErrors.firstName = "First name is required"
        if (!state.lastName) newErrors.lastName = "Last name is required"
        if (!state.email) newErrors.email = "Email is required"
        if (!state.phone) newErrors.phone = "Phone number is required"
        if (!state.dob) newErrors.dob = "Date of birth is required"
        break

      case "review":
        if (!state.agreedToTerms) {
          newErrors.agreedToTerms = "Please agree to terms"
        }
        break
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }, [step, state, symptomCheckResult])

  // Navigate
  const goNext = useCallback(() => {
    if (!validateStep()) return

    if (isLastStep) {
      handleSubmit()
    } else {
      const nextStep = steps[stepIndex + 1]
      setStep([nextStep, 1])
    }
  }, [validateStep, isLastStep, stepIndex, steps])

  const goBack = useCallback(() => {
    if (isFirstStep) {
      router.push("/")
    } else {
      const prevStep = steps[stepIndex - 1]
      setStep([prevStep, -1])
    }
  }, [isFirstStep, stepIndex, steps, router])

  // Map service type to Stripe category
  const getStripeCategory = (): ServiceCategory => {
    switch (state.service) {
      case "med-cert":
        return "medical_certificate"
      case "repeat-script":
      case "new-script":
        return "prescription"
      default:
        return "consult"
    }
  }

  // Build answers payload for Stripe
  const buildAnswersPayload = () => {
    const answers: Record<string, unknown> = {}

    if (state.service === "med-cert") {
      answers.certificate_type = state.certType
      answers.duration = state.duration
      answers.start_date = state.startDate
      answers.symptoms = state.symptoms
      answers.symptom_details = state.symptomDetails
      answers.employer_name = state.employerName
    } else {
      answers.medication_name = state.medicationName
      answers.medication_dosage = state.medicationDosage
      answers.last_prescribed = state.lastPrescribed
      answers.pharmacy_preference = state.pharmacyPreference
      answers.is_repeat = state.service === "repeat-script"
    }

    // Patient details
    answers.patient_name = `${state.firstName} ${state.lastName}`
    answers.patient_email = state.email
    answers.patient_phone = state.phone
    answers.patient_dob = state.dob

    return answers
  }

  // Submit to Stripe
  const handleSubmit = async () => {
    if (isSubmitting) return
    setIsSubmitting(true)

    try {
      const category = getStripeCategory()
      const subtype = state.service === "med-cert" 
        ? (state.certType || "sick_leave")
        : state.service === "repeat-script" 
          ? "repeat" 
          : "new"
      const answers = buildAnswersPayload()

      let result

      if (isAuthenticated) {
        // Authenticated user checkout
        result = await createRequestAndCheckoutAction({
          category,
          subtype,
          type: state.service || "consult",
          answers,
        })
      } else {
        // Guest checkout
        result = await createGuestCheckoutAction({
          category,
          subtype,
          type: state.service || "consult",
          answers,
          guestEmail: state.email,
          guestName: `${state.firstName} ${state.lastName}`,
          guestDateOfBirth: state.dob,
        })
      }

      if (result.success && result.checkoutUrl) {
        // Trigger confetti before redirect
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
        })

        // Small delay for confetti to show
        await new Promise((resolve) => setTimeout(resolve, 500))

        // Redirect to Stripe checkout
        window.location.href = result.checkoutUrl
      } else {
        // Show error
        setErrors({ agreedToTerms: result.error || "Something went wrong. Please try again." })
      }
    } catch (error) {
      logger.error("Submit error:", { error })
      setErrors({ agreedToTerms: "Something went wrong. Please try again." })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Get step title
  const getStepTitle = () => {
    switch (step) {
      case "service":
        return { title: "What do you need?", subtitle: "Select a service to get started" }
      case "details":
        return {
          title:
            state.service === "med-cert"
              ? "Tell us about your absence"
              : "Your medication",
          subtitle: "This helps our doctors help you faster",
        }
      case "safety":
        return { title: "Quick health check", subtitle: "Just a few safety questions" }
      case "account":
        return { title: "Your details", subtitle: "So we can send you the result" }
      case "review":
        return { title: "Review & pay", subtitle: "Check everything looks right." }
    }
  }

  const { title, subtitle } = getStepTitle()

  // ==========================================
  // RENDER STEPS
  // ==========================================

  const renderStep = () => {
    switch (step) {
      // ======= SERVICE SELECTION =======
      case "service":
        return (
          <motion.div className="space-y-4">
            {SERVICES.map((service) => (
              <ServiceCard
                key={service.id}
                service={service}
                selected={state.service === service.id}
                onClick={() => updateField("service", service.id)}
              />
            ))}

            {/* Trust badges */}
            <div className="pt-4">
              <TrustBadgeStrip />
            </div>
          </motion.div>
        )

      // ======= DETAILS STEP =======
      case "details":
        if (state.service === "med-cert") {
          return (
            <motion.div className="space-y-6">
              {/* Certificate type */}
              <div>
                <Label className="text-sm font-medium mb-3 block">
                  Certificate type
                </Label>
                <div className="grid grid-cols-3 gap-2">
                  {CERT_TYPES.map((type) => (
                    <OptionCard
                      key={type.id}
                      selected={state.certType === type.id}
                      onClick={() => updateField("certType", type.id as "work" | "study" | "carer")}
                      icon={type.icon}
                      label={type.label}
                    />
                  ))}
                </div>
                {errors.certType && (
                  <p className="text-xs text-destructive mt-1">{errors.certType}</p>
                )}
              </div>

              {/* Duration */}
              <div>
                <Label className="text-sm font-medium mb-3 block">
                  How many days?
                </Label>
                <div className="flex gap-2">
                  {["1", "2", "3"].map((d) => (
                    <SelectableChip
                      key={d}
                      selected={state.duration === d}
                      onClick={() => updateField("duration", d as "1" | "2" | "3")}
                      className="flex-1"
                    >
                      {d} day{d !== "1" ? "s" : ""}
                    </SelectableChip>
                  ))}
                </div>
                {errors.duration && (
                  <p className="text-xs text-destructive mt-1">{errors.duration}</p>
                )}
              </div>

              {/* Start date */}
              <FormField label="Start date" required>
                <Input
                  type="date"
                  value={state.startDate}
                  onChange={(e) => updateField("startDate", e.target.value)}
                  className="h-11"
                />
              </FormField>

              {/* Symptoms - Multi-select chips */}
              <div>
                <Label className="text-sm font-medium mb-3 block">
                  What symptoms do you have?
                </Label>
                <div className="flex flex-wrap gap-2">
                  {SYMPTOMS_LIST.map((symptom) => (
                    <SelectableChip
                      key={symptom}
                      selected={state.symptoms.includes(symptom)}
                      onClick={() => toggleSymptom(symptom)}
                    >
                      {symptom}
                    </SelectableChip>
                  ))}
                </div>
                {errors.symptoms && (
                  <p className="text-xs text-destructive mt-1">{errors.symptoms}</p>
                )}
              </div>

              {/* Brief details */}
              <FormField label="Anything else? (optional)">
                <Textarea
                  value={state.symptomDetails}
                  onChange={(e) => updateField("symptomDetails", e.target.value)}
                  placeholder="Additional details for the doctor..."
                  rows={2}
                  className="resize-none"
                />
              </FormField>
            </motion.div>
          )
        }

        // Prescription details
        return (
          <motion.div className="space-y-6">
            {/* Repeat vs New */}
            {state.service === "repeat-script" ? (
              <div className="p-4 bg-green-50 border border-green-200 rounded-xl">
                <div className="flex items-center gap-2 text-green-800">
                  <PhoneOff className="w-4 h-4" />
                  <span className="text-sm font-medium">
                    No phone call needed for repeats
                  </span>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
                <div className="flex items-center gap-2 text-blue-800">
                  <Phone className="w-4 h-4" />
                  <span className="text-sm font-medium">
                    Quick 2-minute phone consult required
                  </span>
                </div>
                <p className="text-xs text-blue-700 mt-1">
                  Our doctor will call you to discuss your needs
                </p>
              </div>
            )}

            {/* Medication name */}
            <FormField
              label="Medication name"
              required
              error={errors.medicationName}
            >
              <Input
                value={state.medicationName}
                onChange={(e) => updateField("medicationName", e.target.value)}
                placeholder="e.g., Metformin 500mg"
                className="h-11"
              />
            </FormField>

            {/* Dosage */}
            <FormField label="Dosage & strength (if known)">
              <Input
                value={state.medicationDosage}
                onChange={(e) => updateField("medicationDosage", e.target.value)}
                placeholder="e.g., 500mg twice daily"
                className="h-11"
              />
            </FormField>

            {/* When last prescribed */}
            <div>
              <Label className="text-sm font-medium mb-3 block">
                When was this last prescribed?
              </Label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: "within_3mo", label: "Within 3 months" },
                  { value: "3_6mo", label: "3-6 months" },
                  { value: "6_12mo", label: "6-12 months" },
                  { value: "over_1yr", label: "Over a year" },
                ].map((opt) => (
                  <SelectableChip
                    key={opt.value}
                    selected={state.lastPrescribed === opt.value}
                    onClick={() => updateField("lastPrescribed", opt.value)}
                  >
                    {opt.label}
                  </SelectableChip>
                ))}
              </div>
            </div>

            {/* Pharmacy preference */}
            <FormField label="Preferred pharmacy (optional)">
              <Input
                value={state.pharmacyPreference}
                onChange={(e) => updateField("pharmacyPreference", e.target.value)}
                placeholder="e.g., Chemist Warehouse Sydney CBD"
                className="h-11"
              />
            </FormField>
          </motion.div>
        )

      // ======= SAFETY CHECK =======
      case "safety":
        return (
          <motion.div className="space-y-6">
            {/* Emergency warning */}
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
              <div className="flex gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                <div className="text-sm">
                  <p className="font-medium text-amber-800">Important</p>
                  <p className="text-amber-700">
                    If you&apos;re experiencing a medical emergency, call 000.
                  </p>
                </div>
              </div>
            </div>

            {/* Integrated symptom checker */}
            <SymptomChecker
              selectedSymptoms={state.symptoms}
              symptomDetails={state.symptomDetails}
              onContinue={() => {}}
              onEmergency={() => updateField("hasEmergencySymptoms", true)}
            />

            {/* Safety confirmation */}
            {symptomCheckResult.severity !== "critical" && (
              <div className="space-y-4">
                <div className="p-4 bg-green-50 border border-green-200 rounded-xl">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={state.safetyConfirmed}
                      onChange={(e) =>
                        updateField("safetyConfirmed", e.target.checked)
                      }
                      className="mt-1 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                    />
                    <div className="text-sm">
                      <p className="font-medium text-green-800">
                        I confirm this is not a medical emergency
                      </p>
                      <p className="text-green-700">
                        I understand this is a non-urgent telehealth service
                      </p>
                    </div>
                  </label>
                </div>

                {state.safetyConfirmed && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-2 text-green-600"
                  >
                    <CheckCircle className="w-5 h-5" />
                    <span className="text-sm font-medium">
                      Great! You&apos;re ready to continue
                    </span>
                  </motion.div>
                )}
              </div>
            )}
          </motion.div>
        )

      // ======= ACCOUNT DETAILS =======
      case "account":
        return (
          <motion.div className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                label="First name"
                required
                error={errors.firstName}
              >
                <Input
                  value={state.firstName}
                  onChange={(e) => updateField("firstName", e.target.value)}
                  className="h-11"
                />
              </FormField>
              <FormField label="Last name" required error={errors.lastName}>
                <Input
                  value={state.lastName}
                  onChange={(e) => updateField("lastName", e.target.value)}
                  className="h-11"
                />
              </FormField>
            </div>

            <FormField label="Email" required error={errors.email}>
              <Input
                type="email"
                value={state.email}
                onChange={(e) => updateField("email", e.target.value)}
                placeholder="you@example.com"
                className="h-11"
              />
            </FormField>

            <FormField label="Mobile number" required error={errors.phone}>
              <Input
                type="tel"
                value={state.phone}
                onChange={(e) => updateField("phone", e.target.value)}
                placeholder="04XX XXX XXX"
                className="h-11"
              />
            </FormField>

            <FormField label="Date of birth" required error={errors.dob}>
              <Input
                type="date"
                value={state.dob}
                onChange={(e) => updateField("dob", e.target.value)}
                className="h-11"
              />
            </FormField>
          </motion.div>
        )

      // ======= REVIEW =======
      case "review":
        const selectedService = SERVICES.find((s) => s.id === state.service)
        return (
          <motion.div className="space-y-6">
            {/* Summary card */}
            <div className="p-5 bg-slate-50 rounded-2xl space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {selectedService && (
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <selectedService.icon className="w-5 h-5 text-primary" />
                    </div>
                  )}
                  <div>
                    <p className="font-semibold">{selectedService?.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {state.service === "med-cert" && state.certType
                        ? `${state.duration} day${state.duration !== "1" ? "s" : ""} • ${CERT_TYPES.find((t) => t.id === state.certType)?.label}`
                        : state.medicationName}
                    </p>
                  </div>
                </div>
                <span className="text-lg font-bold text-primary">
                  {selectedService?.price}
                </span>
              </div>

              {/* ETA */}
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="w-4 h-4" />
                <span>
                  Estimated time:{" "}
                  <strong className="text-foreground">
                    {selectedService?.time}
                  </strong>
                </span>
              </div>

              {/* No call badge */}
              {selectedService?.noCall && (
                <div className="flex items-center gap-2 text-sm text-green-700">
                  <PhoneOff className="w-4 h-4" />
                  <span>No phone call required</span>
                </div>
              )}
            </div>

            {/* Patient info */}
            <div className="p-4 bg-white border rounded-xl space-y-2">
              <p className="text-sm font-medium">Sending to:</p>
              <p className="text-sm text-muted-foreground">
                {state.firstName} {state.lastName}
              </p>
              <p className="text-sm text-muted-foreground">{state.email}</p>
              <p className="text-sm text-muted-foreground">{state.phone}</p>
            </div>

            {/* Terms */}
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={state.agreedToTerms}
                onChange={(e) => updateField("agreedToTerms", e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
              />
              <span className="text-sm text-muted-foreground">
                I agree to the{" "}
                <a href="/terms" className="text-primary underline">
                  Terms of Service
                </a>{" "}
                and{" "}
                <a href="/privacy" className="text-primary underline">
                  Privacy Policy
                </a>
              </span>
            </label>
            {errors.agreedToTerms && (
              <p className="text-xs text-destructive">{errors.agreedToTerms}</p>
            )}

            {/* Trust badges */}
            <div className="flex flex-wrap gap-2 justify-center text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Shield className="w-3.5 h-3.5" />
                AHPRA Verified
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Star className="w-3.5 h-3.5" />
                4.9/5 Rating
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <CheckCircle className="w-3.5 h-3.5" />
                98% Approval
              </span>
            </div>
          </motion.div>
        )
    }
  }

  // ==========================================
  // MAIN RENDER
  // ==========================================

  return (
    <div className="min-h-screen bg-linear-to-b from-slate-50 to-white flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-lg border-b">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <button
            onClick={goBack}
            className="p-2 -ml-2 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <ProgressIndicator steps={steps} currentStep={stepIndex} />

          <div className="w-9" /> {/* Spacer */}
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 max-w-lg mx-auto w-full px-4 py-6 pb-24">
        {/* Step title */}
        <motion.div
          key={step + "-title"}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-6"
        >
          <h1 className="text-xl font-semibold text-foreground">{title}</h1>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        </motion.div>

        {/* Step content */}
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={step}
            custom={direction}
            variants={stepVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.25, ease: "easeInOut" }}
          >
            {renderStep()}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Footer CTA */}
      <footer className="sticky bottom-0 z-40 bg-background/95 backdrop-blur-sm border-t border-border px-4 py-3 safe-area-pb">
        <div className="max-w-lg mx-auto flex gap-3">
          {/* Back button */}
          {stepIndex > 0 && (
            <Button
              variant="ghost"
              onClick={goBack}
              className="h-12 px-4 rounded-xl"
              aria-label="Go back"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
          )}
          
          {/* Step-specific CTAs */}
          {step === "service" ? (
            <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
              <span>Tap a service to continue</span>
            </div>
          ) : (
            <Button
              onClick={goNext}
              disabled={
                isSubmitting ||
                (step === "safety" && symptomCheckResult.severity === "critical")
              }
              className="flex-1 h-12 text-base font-medium rounded-xl"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : isLastStep ? (
                <>
                  Pay {SERVICES.find((s) => s.id === state.service)?.price}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              ) : (
                <>
                  Continue
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          )}
        </div>

        {step === "service" && (
          <p className="text-center text-xs text-muted-foreground mt-3">
            🔒 Secure • No payment until review complete
          </p>
        )}
      </footer>
    </div>
  )
}
