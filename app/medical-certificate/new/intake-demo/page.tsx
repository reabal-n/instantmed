"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import { 
  MedCertIntakeFlow, 
  StepContent, 
  type IntakeStep 
} from "@/components/intake"
import { PaymentRedirectOverlay } from "@/components/intake/payment-skeleton"
import { useRouter } from "next/navigation"
import { useAuth } from "@/components/providers/supabase-auth-provider"
import { 
  Briefcase, 
  GraduationCap, 
  Heart, 
  Calendar as CalendarIcon, 
  Thermometer, 
  Pill,
  User,
  Users,
  Stethoscope,
  Clock,
  Shield,
  Sparkles,
  CalendarDays,
  Pencil,
  ChevronRight,
  Lock,
  CheckCircle2,
  Loader2,
  Mail,
  AlertCircle,
  RotateCcw
} from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { format, addDays } from "date-fns"
import { createIntakeAndCheckoutAction } from "@/lib/stripe/checkout"
import { createGuestCheckoutAction } from "@/lib/stripe/guest-checkout"
import { toast } from "sonner"
import { useIntakeAnalytics } from "@/lib/hooks/use-intake-analytics"

// Google icon component
function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  )
}

// Define the steps for the medical certificate flow
const STEPS: IntakeStep[] = [
  { id: "intro", title: "Welcome" },
  { id: "who", title: "Who's it for" },
  { id: "purpose", title: "The reason" },
  { id: "details", title: "The details" },
  { id: "safety", title: "Safety check" },
  { id: "review", title: "Review" },
  { id: "auth", title: "Account" },
  { id: "payment", title: "Payment" },
]

// Common symptoms with emojis for friendly feel
const SYMPTOM_TAGS = [
  { id: "headache", label: "Headache/Migraine", emoji: "🤕" },
  { id: "flu", label: "Flu Symptoms", emoji: "🤒" },
  { id: "stomach", label: "Stomach Bug", emoji: "🤢" },
  { id: "back", label: "Back Pain", emoji: "😣" },
  { id: "stress", label: "Stress/Burnout", emoji: "😫" },
  { id: "period", label: "Period Pain", emoji: "💫" },
  { id: "cold", label: "Cold/Sore Throat", emoji: "🤧" },
  { id: "fatigue", label: "Fatigue/Exhaustion", emoji: "😴" },
  { id: "anxiety", label: "Anxiety", emoji: "😰" },
  { id: "other", label: "Something Else", emoji: "🩹" },
]

// ============================================
// DEMO PAGE
// ============================================

// Storage key for form persistence
const STORAGE_KEY = "medcert_intake_draft"

export default function IntakeDemoPage() {
  const router = useRouter()
  const { isSignedIn, user, profile, signInWithGoogle, isLoading: authLoading } = useAuth()
  const [currentStep, setCurrentStep] = useState(0)
  const [isRestored, setIsRestored] = useState(false)
  const [showDraftBanner, setShowDraftBanner] = useState(false)
  const hasTrackedStart = useRef(false)
  
  // Analytics tracking
  const analytics = useIntakeAnalytics({
    flowType: "medical_certificate",
    steps: STEPS,
  })
  
  // Demo state
  const [patientType, setPatientType] = useState<"self" | "other" | null>(null)
  const [selectedPurpose, setSelectedPurpose] = useState<string | null>(null)
  
  // Medical details state (Step 3)
  const [startDate, setStartDate] = useState<Date | undefined>(new Date())
  const [selectedDuration, setSelectedDuration] = useState<string | null>(null)
  const [customEndDate, setCustomEndDate] = useState<Date | undefined>(undefined)
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([])
  const [additionalNotes, setAdditionalNotes] = useState("")
  
  // Calendar popover states
  const [startDateOpen, setStartDateOpen] = useState(false)
  const [endDateOpen, setEndDateOpen] = useState(false)
  
  // Safety check state (Step 4)
  const [hasEmergencySymptoms, setHasEmergencySymptoms] = useState(false)
  const [isPregnant, setIsPregnant] = useState(false)
  const [isWorkCover, setIsWorkCover] = useState(false)
  const [declarationAccepted, setDeclarationAccepted] = useState(false)
  
  // Review state (Step 5)
  const [termsAccepted, setTermsAccepted] = useState(false)
  
  // Auth state (Step 6)
  const [guestEmail, setGuestEmail] = useState("")
  const [authError, setAuthError] = useState<string | null>(null)
  const [isAuthenticating, setIsAuthenticating] = useState(false)
  
  // Payment state (Step 7)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [showPaymentOverlay, setShowPaymentOverlay] = useState(false)
  
  // Load saved draft on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const data = JSON.parse(saved)
        // Check if draft is less than 24 hours old
        if (data.timestamp && Date.now() - data.timestamp < 24 * 60 * 60 * 1000) {
          setPatientType(data.patientType || null)
          setSelectedPurpose(data.selectedPurpose || null)
          setStartDate(data.startDate ? new Date(data.startDate) : new Date())
          setSelectedDuration(data.selectedDuration || null)
          setCustomEndDate(data.customEndDate ? new Date(data.customEndDate) : undefined)
          setSelectedSymptoms(data.selectedSymptoms || [])
          setAdditionalNotes(data.additionalNotes || "")
          setCurrentStep(data.currentStep || 0)
          setShowDraftBanner(data.currentStep > 0)
          analytics.trackDraftRestored()
        } else {
          localStorage.removeItem(STORAGE_KEY)
        }
      }
    } catch {
      // Ignore errors
    }
    setIsRestored(true)
  }, [analytics])
  
  // Save draft on state changes (debounced)
  useEffect(() => {
    if (!isRestored) return
    
    const timeoutId = setTimeout(() => {
      const data = {
        patientType,
        selectedPurpose,
        startDate: startDate?.toISOString(),
        selectedDuration,
        customEndDate: customEndDate?.toISOString(),
        selectedSymptoms,
        additionalNotes,
        currentStep,
        timestamp: Date.now(),
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    }, 500)
    
    return () => clearTimeout(timeoutId)
  }, [isRestored, patientType, selectedPurpose, startDate, selectedDuration, customEndDate, selectedSymptoms, additionalNotes, currentStep])
  
  // Clear draft helper
  const clearDraft = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY)
    setShowDraftBanner(false)
    analytics.trackDraftDiscarded()
    toast.success("Draft cleared")
  }, [analytics])
  
  // Track flow start
  useEffect(() => {
    if (!hasTrackedStart.current && isRestored) {
      hasTrackedStart.current = true
      analytics.trackFlowStart()
    }
  }, [isRestored, analytics])
  
  // Track step changes
  useEffect(() => {
    if (isRestored) {
      analytics.trackStepEnter(currentStep)
    }
  }, [currentStep, isRestored, analytics])
  
  // Simple email validation
  const isValidEmail = (emailStr: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailStr)
  }
  
  // Auto-skip auth step if already signed in
  useEffect(() => {
    if (currentStep === 6 && isSignedIn && user && !authLoading) {
      // User is authenticated, auto-advance to payment
      setTimeout(() => setCurrentStep(7), 500)
    }
  }, [currentStep, isSignedIn, user, authLoading])

  // Advance to next step
  const advanceStep = useCallback(() => {
    // Track step completion before advancing
    analytics.trackStepComplete(currentStep)
    setCurrentStep(prev => Math.min(prev + 1, STEPS.length - 1))
  }, [currentStep, analytics])

  const handleStepChange = (step: number, _direction: "forward" | "back") => {
    setCurrentStep(step)
  }

  const handleComplete = async () => {
    // Submit to Stripe checkout
    setIsSubmitting(true)
    setSubmitError(null)
    
    // Track payment initiation
    analytics.trackPaymentInitiated(29.95, !isSignedIn)
    
    try {
      // Build the answers object for the request
      const answers = {
        patient_type: patientType,
        purpose: selectedPurpose,
        start_date: startDate?.toISOString(),
        end_date: getEndDate()?.toISOString(),
        duration: getDurationText(),
        symptoms: selectedSymptoms.map(id => SYMPTOM_TAGS.find(s => s.id === id)?.label).filter(Boolean),
        additional_notes: additionalNotes,
        has_emergency_symptoms: hasEmergencySymptoms,
        is_pregnant: isPregnant,
        is_workcover: isWorkCover,
      }
      
      let result
      
      if (isSignedIn && profile) {
        // Authenticated checkout
        result = await createIntakeAndCheckoutAction({
          category: "medical_certificate",
          subtype: selectedPurpose || "work",
          type: "medical_certificate",
          answers,
        })
      } else {
        // Guest checkout with email
        result = await createGuestCheckoutAction({
          category: "medical_certificate",
          subtype: selectedPurpose || "work",
          type: "medical_certificate",
          answers,
          guestEmail: guestEmail,
        })
      }
      
      if (result.success && result.checkoutUrl) {
        // Show payment overlay
        setShowPaymentOverlay(true)
        
        // Clear draft on successful checkout initiation
        localStorage.removeItem(STORAGE_KEY)
        
        // Track flow completion
        analytics.trackFlowComplete({ checkout_initiated: true })
        
        // Small delay for visual feedback, then redirect
        setTimeout(() => {
          window.location.href = result.checkoutUrl!
        }, 1000)
      } else {
        const errorMessage = result.error || "Something went wrong. Please try again."
        setSubmitError(errorMessage)
        toast.error("Payment Error", {
          description: errorMessage,
        })
        analytics.trackValidationError(currentStep, "checkout_error", errorMessage)
      }
    } catch (_err) {
      const errorMessage = "Failed to create checkout session. Please try again."
      setSubmitError(errorMessage)
      toast.error("Connection Error", {
        description: errorMessage,
      })
      analytics.trackValidationError(currentStep, "network_error", errorMessage)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleExit = () => {
    router.push("/medical-certificate")
  }

  const handleClose = () => {
    // Track flow abandonment
    analytics.trackFlowAbandoned(currentStep, "user_closed")
    router.push("/")
  }
  
  // Handle Google sign in
  const handleGoogleSignIn = async () => {
    try {
      setIsAuthenticating(true)
      setAuthError(null)
      await signInWithGoogle(window.location.pathname + window.location.search)
    } catch (_err) {
      const errorMessage = "Failed to sign in with Google. Please try again."
      setAuthError(errorMessage)
      toast.error("Sign In Error", { description: errorMessage })
      setIsAuthenticating(false)
    }
  }
  
  // Handle email sign in redirect
  const handleEmailSignIn = () => {
    const returnUrl = encodeURIComponent(window.location.pathname + window.location.search)
    router.push(`/auth/login?redirect=${returnUrl}&flow=intake`)
  }

  // Handle patient type selection (auto-advance)
  const handlePatientTypeSelect = (type: "self" | "other") => {
    setPatientType(type)
    // Small delay for visual feedback before advancing
    setTimeout(() => {
      advanceStep()
    }, 300)
  }
  
  // Jump to a specific step (for edit buttons)
  const jumpToStep = (stepIndex: number) => {
    setCurrentStep(stepIndex)
  }

  // Determine if user can continue based on current step
  const canContinue = (() => {
    switch (currentStep) {
      case 0: return true // Intro - always can continue
      case 1: return !!patientType // Who step
      case 2: return !!selectedPurpose
      case 3: return !!startDate && (!!selectedDuration || !!customEndDate) && selectedSymptoms.length > 0
      case 4: return !hasEmergencySymptoms && declarationAccepted // Safety check - no emergencies, must accept declaration
      case 5: return termsAccepted // Review step - must accept terms
      case 6: return isSignedIn || isValidEmail(guestEmail) // Auth step - signed in or valid guest email
      case 7: return true // Payment step
      default: return true
    }
  })()

  // Hide navigation on certain steps (intro, "who", review, auth, and payment steps)
  const hideNavigation = currentStep === 0 || currentStep === 1 || currentStep === 5 || currentStep === 6 || currentStep === 7
  
  // Hide progress bar on the intro step for a cleaner first impression
  const hideProgress = currentStep === 0

  // Toggle symptom selection
  const toggleSymptom = (symptomId: string) => {
    setSelectedSymptoms(prev =>
      prev.includes(symptomId)
        ? prev.filter(s => s !== symptomId)
        : [...prev, symptomId]
    )
  }
  
  // Calculate end date based on selection
  const getEndDate = () => {
    if (customEndDate) return customEndDate
    if (startDate && selectedDuration) {
      return addDays(startDate, parseInt(selectedDuration) - 1)
    }
    return undefined
  }
  
  // Get duration display text
  const getDurationText = () => {
    if (customEndDate && startDate) {
      const days = Math.ceil((customEndDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1
      return `${days} day${days > 1 ? 's' : ''}`
    }
    if (selectedDuration) {
      return `${selectedDuration} day${selectedDuration !== "1" ? 's' : ''}`
    }
    return null
  }
  
  // Get selected symptom labels (used in summary)
  const _selectedSymptomLabels = selectedSymptoms
    .map(id => SYMPTOM_TAGS.find(s => s.id === id)?.label)
    .filter(Boolean)
    .join(", ")

  return (
    <>
      {/* Payment redirect overlay */}
      {showPaymentOverlay && <PaymentRedirectOverlay />}
      
      {/* Draft restoration banner */}
      <AnimatePresence>
        {showDraftBanner && currentStep > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className="fixed top-0 left-0 right-0 z-40 bg-gradient-to-r from-dawn-50 to-orange-50 dark:from-dawn-900/20 dark:to-orange-900/20 border-b border-amber-200 dark:border-amber-800"
          >
            <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm">
                <AlertCircle className="w-4 h-4 text-dawn-600 dark:text-dawn-400" />
                <span className="text-amber-800 dark:text-amber-200">
                  We found your saved progress
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearDraft}
                  className="h-8 text-xs text-amber-700 dark:text-amber-300 hover:text-amber-900"
                >
                  <RotateCcw className="w-3 h-3 mr-1" />
                  Start Fresh
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowDraftBanner(false)}
                  className="h-8 text-xs"
                >
                  Continue
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      <MedCertIntakeFlow
        steps={STEPS}
        currentStep={currentStep}
        onStepChange={handleStepChange}
        onComplete={handleComplete}
        onExit={handleExit}
        onClose={handleClose}
        canContinue={canContinue}
        continueLabel={currentStep === 7 ? "Pay $29.95" : undefined}
        hideNavigation={hideNavigation}
        hideProgress={hideProgress}
      >
      {(step) => {
        switch (step) {
          // ======= STEP 0: THE HOOK (Introduction) =======
          case 0:
            return (
              <div className="flex flex-col items-center justify-center text-center py-8 sm:py-12">
                {/* Emoji/Icon header */}
                <motion.div
                  initial={{ scale: 0, rotate: -10 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.1 }}
                  className="mb-6"
                >
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/20 to-blue-500/20 flex items-center justify-center">
                    <Stethoscope className="w-10 h-10 text-primary" />
                  </div>
                </motion.div>

                {/* Friendly greeting */}
                <motion.h1
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2, duration: 0.4 }}
                  className="text-2xl sm:text-3xl font-semibold text-foreground tracking-tight mb-3"
                >
                  Let&apos;s get this sorted quickly. 🩺
                </motion.h1>

                {/* Subtext */}
                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3, duration: 0.4 }}
                  className="text-muted-foreground text-base sm:text-lg max-w-md leading-relaxed mb-8"
                >
                  We just need a few details to connect you with a doctor. 
                  Take your time, but this usually takes less than 3 minutes.
                </motion.p>

                {/* Trust indicators */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4, duration: 0.4 }}
                  className="flex flex-wrap items-center justify-center gap-4 mb-10 text-sm text-muted-foreground"
                >
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-primary" />
                    ~3 min
                  </span>
                  <span className="text-slate-300 dark:text-slate-600">•</span>
                  <span className="flex items-center gap-1.5">
                    <Shield className="w-4 h-4 text-green-500" />
                    AHPRA Verified
                  </span>
                  <span className="text-slate-300 dark:text-slate-600">•</span>
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-dawn-500" />
                    No phone call
                  </span>
                </motion.div>

                {/* Start button */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.5, duration: 0.4, type: "spring", stiffness: 200 }}
                >
                  <Button
                    onClick={advanceStep}
                    size="lg"
                    className={cn(
                      "px-10 py-6 text-lg font-semibold",
                      "bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500",
                      "hover:from-emerald-600 hover:via-teal-600 hover:to-cyan-600",
                      "shadow-[0_8px_32px_rgba(16,185,129,0.35)]",
                      "hover:shadow-[0_12px_40px_rgba(16,185,129,0.45)]",
                      "hover:scale-[1.02] active:scale-[0.98]",
                      "transition-all duration-200"
                    )}
                  >
                    Start Intake
                  </Button>
                </motion.div>
              </div>
            )

          // ======= STEP 1: THE "WHO" (Patient Context) =======
          case 1:
            return (
              <div className="py-4 sm:py-8">
                {/* Header */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className="text-center mb-8"
                >
                  <h2 className="text-xl sm:text-2xl font-semibold text-foreground tracking-tight mb-2">
                    First things first:
                  </h2>
                  <p className="text-lg sm:text-xl text-muted-foreground">
                    Who is this certificate for?
                  </p>
                </motion.div>

                {/* Tactile Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Card 1: For Me */}
                  <motion.button
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1, duration: 0.3 }}
                    whileHover={{ scale: 1.02, y: -4 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handlePatientTypeSelect("self")}
                    className={cn(
                      "relative group p-6 sm:p-8 rounded-2xl border-2 text-center",
                      "transition-all duration-300 cursor-pointer",
                      "hover:border-emerald-300 dark:hover:border-emerald-700 hover:shadow-[0_8px_32px_rgba(16,185,129,0.15)]",
                      patientType === "self"
                        ? "border-emerald-300 dark:border-emerald-700 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 shadow-[0_8px_32px_rgba(16,185,129,0.2)]"
                        : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                    )}
                  >
                    {/* Selection indicator */}
                    {patientType === "self" && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute top-4 right-4 w-6 h-6 rounded-full bg-gradient-to-br from-emerald-400 to-teal-400 flex items-center justify-center"
                      >
                        <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </motion.div>
                    )}

                    {/* Icon */}
                    <div className={cn(
                      "w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4 rounded-2xl flex items-center justify-center",
                      "transition-all duration-300",
                      patientType === "self"
                        ? "bg-gradient-to-br from-emerald-400 to-teal-400 text-white"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 group-hover:bg-emerald-50 group-hover:text-emerald-500"
                    )}>
                      <User className="w-8 h-8 sm:w-10 sm:h-10" />
                    </div>

                    {/* Title */}
                    <h3 className={cn(
                      "text-lg sm:text-xl font-semibold mb-1 transition-colors",
                      patientType === "self" ? "text-emerald-700 dark:text-emerald-400" : "text-foreground"
                    )}>
                      For Me
                    </h3>

                    {/* Subtext */}
                    <p className="text-sm text-muted-foreground">
                      I&apos;m the patient.
                    </p>
                  </motion.button>

                  {/* Card 2: For Someone Else */}
                  <motion.button
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2, duration: 0.3 }}
                    whileHover={{ scale: 1.02, y: -4 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handlePatientTypeSelect("other")}
                    className={cn(
                      "relative group p-6 sm:p-8 rounded-2xl border-2 text-center",
                      "transition-all duration-300 cursor-pointer",
                      "hover:border-violet-300 dark:hover:border-violet-700 hover:shadow-[0_8px_32px_rgba(139,92,246,0.15)]",
                      patientType === "other"
                        ? "border-violet-300 dark:border-violet-700 bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-900/20 dark:to-purple-900/20 shadow-[0_8px_32px_rgba(139,92,246,0.2)]"
                        : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                    )}
                  >
                    {/* Selection indicator */}
                    {patientType === "other" && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute top-4 right-4 w-6 h-6 rounded-full bg-gradient-to-br from-violet-400 to-purple-400 flex items-center justify-center"
                      >
                        <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </motion.div>
                    )}

                    {/* Icon */}
                    <div className={cn(
                      "w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4 rounded-2xl flex items-center justify-center",
                      "transition-all duration-300",
                      patientType === "other"
                        ? "bg-gradient-to-br from-violet-400 to-purple-400 text-white"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 group-hover:bg-violet-50 group-hover:text-violet-500"
                    )}>
                      <Users className="w-8 h-8 sm:w-10 sm:h-10" />
                    </div>

                    {/* Title */}
                    <h3 className={cn(
                      "text-lg sm:text-xl font-semibold mb-1 transition-colors",
                      patientType === "other" ? "text-violet-700 dark:text-violet-400" : "text-foreground"
                    )}>
                      For Someone Else
                    </h3>

                    {/* Subtext */}
                    <p className="text-sm text-muted-foreground">
                      I&apos;m requesting as a carer/guardian.
                    </p>
                  </motion.button>
                </div>

                {/* Helper text */}
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4, duration: 0.3 }}
                  className="text-center text-xs text-muted-foreground mt-6"
                >
                  Tap to select and continue
                </motion.p>
              </div>
            )

          // ======= STEP 2: PURPOSE =======
          case 2:
            return (
              <StepContent
                title="What's the certificate for?"
                description="Select the type that matches your situation."
              >
                <div className="grid gap-3">
                  {[
                    { id: "work", label: "Work", icon: Briefcase, description: "For your employer", colors: { bg: "from-sky-50 to-cyan-50", border: "border-sky-200 dark:border-sky-700", icon: "from-sky-400 to-cyan-400", text: "text-sky-700 dark:text-sky-400" } },
                    { id: "study", label: "Study", icon: GraduationCap, description: "For uni or school", colors: { bg: "from-violet-50 to-purple-50", border: "border-violet-200 dark:border-violet-700", icon: "from-violet-400 to-purple-400", text: "text-violet-700 dark:text-violet-400" } },
                    { id: "carer", label: "Carer's leave", icon: Heart, description: "To care for someone", colors: { bg: "from-rose-50 to-pink-50", border: "border-rose-200 dark:border-rose-700", icon: "from-rose-400 to-pink-400", text: "text-rose-700 dark:text-rose-400" } },
                  ].map((option) => (
                    <button
                      key={option.id}
                      onClick={() => setSelectedPurpose(option.id)}
                      className={cn(
                        "flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-all duration-200",
                        selectedPurpose === option.id
                          ? `bg-gradient-to-br ${option.colors.bg} ${option.colors.border} shadow-md`
                          : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 hover:shadow-sm"
                      )}
                    >
                      <div className={cn(
                        "w-12 h-12 rounded-xl flex items-center justify-center transition-colors",
                        selectedPurpose === option.id
                          ? `bg-gradient-to-br ${option.colors.icon} text-white shadow-sm`
                          : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                      )}>
                        <option.icon className="w-5 h-5" />
                      </div>
                      <div>
                        <p className={cn("font-semibold", selectedPurpose === option.id ? option.colors.text : "text-foreground")}>{option.label}</p>
                        <p className="text-sm text-muted-foreground">{option.description}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </StepContent>
            )

          // ======= STEP 3: THE NITTY-GRITTY (Medical Details) =======
          case 3:
            return (
              <div className="space-y-8">
                {/* Main Header */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className="text-center"
                >
                  <h2 className="text-xl sm:text-2xl font-semibold text-foreground tracking-tight mb-2">
                    The Nitty-Gritty. What&apos;s going on? 🤔
                  </h2>
                </motion.div>

                {/* ===== PART A: THE TIMING ===== */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1, duration: 0.3 }}
                  className="space-y-4"
                >
                  {/* Section header */}
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <CalendarDays className="w-4 h-4 text-primary" />
                    </div>
                    <h3 className="font-semibold text-foreground">The Timing</h3>
                  </div>

                  <div className="pl-10 space-y-4">
                    {/* Start date picker */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">
                        When did you start feeling unwell?
                      </label>
                      <Popover open={startDateOpen} onOpenChange={setStartDateOpen}>
                        <PopoverTrigger asChild>
                          <button
                            className={cn(
                              "w-full flex items-center justify-between gap-2 px-4 py-3 rounded-xl border-2 text-left transition-all duration-200",
                              "hover:border-primary/50 hover:bg-primary/5",
                              startDateOpen
                                ? "border-primary bg-primary/5"
                                : "border-slate-200 dark:border-slate-700"
                            )}
                          >
                            <div className="flex items-center gap-3">
                              <CalendarIcon className="w-5 h-5 text-muted-foreground" />
                              <span className={cn(
                                startDate ? "text-foreground" : "text-muted-foreground"
                              )}>
                                {startDate 
                                  ? format(startDate, "EEEE, d MMMM yyyy")
                                  : "Select a date"
                                }
                              </span>
                            </div>
                          </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" side="bottom">
                          <Calendar
                            mode="single"
                            selected={startDate}
                            onSelect={(date) => {
                              setStartDate(date)
                              setStartDateOpen(false)
                            }}
                            disabled={(date) => date > new Date()}
                            defaultMonth={startDate}
                          />
                        </PopoverContent>
                      </Popover>
                    </div>

                    {/* Duration selection */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">
                        How many days do you think you need off?
                      </label>
                      <div className="grid grid-cols-4 gap-2">
                        {["1", "2", "3"].map((days, index) => {
                          const colors = [
                            { bg: "from-emerald-50 to-teal-50", border: "border-emerald-300 dark:border-emerald-700", text: "text-emerald-700 dark:text-emerald-400" },
                            { bg: "from-sky-50 to-cyan-50", border: "border-sky-300 dark:border-sky-700", text: "text-sky-700 dark:text-sky-400" },
                            { bg: "from-violet-50 to-purple-50", border: "border-violet-300 dark:border-violet-700", text: "text-violet-700 dark:text-violet-400" },
                          ]
                          const color = colors[index]
                          const isSelected = selectedDuration === days && !customEndDate
                          
                          return (
                            <motion.button
                              key={days}
                              whileHover={{ scale: 1.02, y: -2 }}
                              whileTap={{ scale: 0.98 }}
                              onClick={() => {
                                setSelectedDuration(days)
                                setCustomEndDate(undefined)
                              }}
                              className={cn(
                                "py-3 px-4 rounded-xl border font-semibold text-sm transition-all duration-200",
                                isSelected
                                  ? `bg-gradient-to-br ${color.bg} ${color.border} ${color.text} shadow-md`
                                  : "bg-gradient-to-br from-slate-50 to-white dark:from-slate-800 dark:to-slate-900 border-slate-200 dark:border-slate-700 text-foreground hover:border-slate-300 hover:shadow-sm"
                              )}
                            >
                              {days} Day{days !== "1" ? "s" : ""}
                            </motion.button>
                          )
                        })}
                        
                        {/* Custom date option */}
                        <Popover open={endDateOpen} onOpenChange={setEndDateOpen}>
                          <PopoverTrigger asChild>
                            <motion.button
                              whileHover={{ scale: 1.02, y: -2 }}
                              whileTap={{ scale: 0.98 }}
                              className={cn(
                                "py-3 px-4 rounded-xl border font-semibold text-sm transition-all duration-200",
                                customEndDate
                                  ? "bg-gradient-to-br from-dawn-50 to-orange-50 border-amber-300 dark:border-amber-700 text-amber-700 dark:text-dawn-400 shadow-md"
                                  : "bg-gradient-to-br from-slate-50 to-white dark:from-slate-800 dark:to-slate-900 border-slate-200 dark:border-slate-700 text-foreground hover:border-slate-300 hover:shadow-sm"
                              )}
                            >
                              {customEndDate ? format(customEndDate, "d MMM") : "Custom"}
                            </motion.button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" side="bottom">
                            <Calendar
                              mode="single"
                              selected={customEndDate}
                              onSelect={(date) => {
                                setCustomEndDate(date)
                                setSelectedDuration(null)
                                setEndDateOpen(false)
                              }}
                              disabled={(date) => 
                                !startDate || 
                                date < startDate || 
                                date > addDays(startDate, 14)
                              }
                              defaultMonth={startDate}
                            />
                          </PopoverContent>
                        </Popover>
                      </div>

                      {/* Date range summary */}
                      <AnimatePresence mode="wait">
                        {startDate && (selectedDuration || customEndDate) && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl"
                          >
                            <CalendarIcon className="w-4 h-4 text-green-600 dark:text-green-400" />
                            <p className="text-sm text-green-700 dark:text-green-300">
                              <span className="font-medium">{format(startDate, "d MMM")}</span>
                              <span className="mx-1">→</span>
                              <span className="font-medium">{getEndDate() && format(getEndDate()!, "d MMM")}</span>
                              <span className="text-green-600 dark:text-green-400 ml-2">
                                ({getDurationText()})
                              </span>
                            </p>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </motion.div>

                {/* Divider */}
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-200 dark:border-slate-700" />
                  </div>
                </div>

                {/* ===== PART B: THE SYMPTOMS ===== */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2, duration: 0.3 }}
                  className="space-y-4"
                >
                  {/* Section header */}
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <Thermometer className="w-4 h-4 text-primary" />
                    </div>
                    <h3 className="font-semibold text-foreground">The Symptoms</h3>
                  </div>

                  <div className="pl-10 space-y-4">
                    {/* Symptom tags */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">
                        What&apos;s been bothering you? <span className="text-muted-foreground font-normal">(Select all that apply)</span>
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {SYMPTOM_TAGS.map((symptom, index) => {
                          // Unique pastel gradient for each symptom
                          const colors = [
                            { bg: "from-rose-50 to-pink-50", border: "border-rose-200/60", text: "text-rose-700 dark:text-rose-400" },
                            { bg: "from-dawn-50 to-orange-50", border: "border-amber-200/60", text: "text-amber-700 dark:text-dawn-400" },
                            { bg: "from-emerald-50 to-teal-50", border: "border-emerald-200/60", text: "text-emerald-700 dark:text-emerald-400" },
                            { bg: "from-sky-50 to-cyan-50", border: "border-sky-200/60", text: "text-sky-700 dark:text-sky-400" },
                            { bg: "from-violet-50 to-purple-50", border: "border-violet-200/60", text: "text-violet-700 dark:text-violet-400" },
                            { bg: "from-pink-50 to-fuchsia-50", border: "border-pink-200/60", text: "text-pink-700 dark:text-pink-400" },
                            { bg: "from-lime-50 to-green-50", border: "border-lime-200/60", text: "text-lime-700 dark:text-lime-400" },
                            { bg: "from-indigo-50 to-blue-50", border: "border-indigo-200/60", text: "text-indigo-700 dark:text-indigo-400" },
                            { bg: "from-red-50 to-rose-50", border: "border-red-200/60", text: "text-red-700 dark:text-red-400" },
                            { bg: "from-slate-100 to-gray-50", border: "border-slate-300/60", text: "text-slate-700 dark:text-slate-400" },
                          ]
                          const color = colors[index % colors.length]
                          const isSelected = selectedSymptoms.includes(symptom.id)
                          
                          return (
                            <motion.button
                              key={symptom.id}
                              whileHover={{ scale: 1.03, y: -2 }}
                              whileTap={{ scale: 0.97 }}
                              onClick={() => toggleSymptom(symptom.id)}
                              className={cn(
                                "px-4 py-2.5 rounded-full border text-sm font-medium transition-all duration-200",
                                isSelected
                                  ? `bg-gradient-to-br ${color.bg} ${color.border} ${color.text} shadow-md`
                                  : "bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-900 border-slate-200 dark:border-slate-700 text-foreground hover:border-slate-300 hover:shadow-sm"
                              )}
                            >
                              <span className="mr-1.5">{symptom.emoji}</span>
                              {symptom.label}
                            </motion.button>
                          )
                        })}
                      </div>
                    </div>

                    {/* Selected count indicator */}
                    <AnimatePresence mode="wait">
                      {selectedSymptoms.length > 0 && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          className="flex items-center gap-2 text-sm text-primary"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                          <span className="font-medium">
                            {selectedSymptoms.length} selected
                          </span>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Additional notes textarea */}
                    <div className="space-y-2 pt-2">
                      <label className="text-sm font-medium text-foreground">
                        Anything else the doctor should know?{" "}
                        <span className="text-muted-foreground font-normal">(Optional)</span>
                      </label>
                      <Textarea
                        value={additionalNotes}
                        onChange={(e) => setAdditionalNotes(e.target.value)}
                        placeholder="Keep it brief. No need to write a novel, just the key facts."
                        className={cn(
                          "min-h-[100px] resize-none rounded-xl border-2",
                          "border-slate-200 dark:border-slate-700",
                          "focus:border-primary focus:ring-2 focus:ring-primary/20",
                          "placeholder:text-muted-foreground/60 placeholder:italic"
                        )}
                        maxLength={500}
                      />
                      <p className="text-xs text-muted-foreground text-right">
                        {additionalNotes.length}/500
                      </p>
                    </div>
                  </div>
                </motion.div>
              </div>
            )

          // ======= STEP 4: SAFETY CHECK =======
          case 4:
            return (
              <div className="space-y-6">
                {/* Header */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className="text-center"
                >
                  <h2 className="text-xl sm:text-2xl font-semibold text-foreground tracking-tight mb-2">
                    Quick Safety Check. 🛡️
                  </h2>
                  <p className="text-sm text-muted-foreground max-w-md mx-auto">
                    We need to rule out the scary stuff. Please read these carefully. 
                    <span className="font-medium text-foreground"> We can&apos;t treat emergencies via telehealth.</span>
                  </p>
                </motion.div>

                {/* Emergency Alert */}
                <AnimatePresence>
                  {hasEmergencySymptoms && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: -10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: -10 }}
                      transition={{ type: "spring", stiffness: 300, damping: 25 }}
                    >
                      <div className="p-4 bg-red-50 dark:bg-red-900/20 border-2 border-red-300 dark:border-red-800 rounded-xl">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/40 flex items-center justify-center flex-shrink-0">
                            <svg className="w-5 h-5 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                          </div>
                          <div>
                            <p className="font-semibold text-red-800 dark:text-red-200">
                              Please stop.
                            </p>
                            <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                              You need to <strong>call 000</strong> or go to the <strong>ER immediately</strong>. 
                              We cannot help with this.
                            </p>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Toggle List */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1, duration: 0.3 }}
                  className="space-y-3"
                >
                  {/* Toggle 1: Emergency Symptoms */}
                  <div 
                    className={cn(
                      "flex items-center justify-between gap-4 p-4 rounded-xl border-2 transition-all duration-300",
                      "min-h-[72px]", // Ensure good tap target
                      hasEmergencySymptoms
                        ? "border-red-300 dark:border-red-700 bg-red-50/50 dark:bg-red-900/10"
                        : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                    )}
                    role="group"
                    aria-describedby="emergency-help"
                  >
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground" id="emergency-question">
                        Are you having chest pain, severe difficulty breathing, or signs of a stroke?
                      </p>
                    </div>
                    <Switch
                      checked={hasEmergencySymptoms}
                      onCheckedChange={(checked) => {
                        setHasEmergencySymptoms(checked)
                        if (checked) {
                          analytics.trackEmergencyRedirect()
                          toast.error("Emergency Symptoms Detected", {
                            description: "Please call 000 or go to the ER immediately.",
                            duration: 10000,
                          })
                        }
                      }}
                      aria-label="Has critical emergency symptoms"
                      aria-describedby="emergency-question"
                      className="shrink-0"
                    />
                  </div>

                  {/* Toggle 2: Pregnancy */}
                  <div 
                    className={cn(
                      "flex items-center justify-between gap-4 p-4 rounded-xl border-2 transition-all duration-300",
                      isPregnant
                        ? "border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-900/10"
                        : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                    )}
                  >
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground">
                        Are you currently pregnant?
                      </p>
                      {isPregnant && (
                        <motion.p
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          className="text-xs text-dawn-600 dark:text-dawn-400 mt-1"
                        >
                          We&apos;ll make sure your doctor knows.
                        </motion.p>
                      )}
                    </div>
                    <Switch
                      checked={isPregnant}
                      onCheckedChange={setIsPregnant}
                      aria-label="Is pregnant"
                      className="flex-shrink-0"
                    />
                  </div>

                  {/* Toggle 3: WorkCover */}
                  <div 
                    className={cn(
                      "flex items-center justify-between gap-4 p-4 rounded-xl border-2 transition-all duration-300",
                      isWorkCover
                        ? "border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-900/10"
                        : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                    )}
                  >
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground">
                        Is this related to a WorkCover or motor vehicle accident claim?
                      </p>
                      {isWorkCover && (
                        <motion.p
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          className="text-xs text-dawn-600 dark:text-dawn-400 mt-1"
                        >
                          Different rules apply — we&apos;ll guide you through it.
                        </motion.p>
                      )}
                    </div>
                    <Switch
                      checked={isWorkCover}
                      onCheckedChange={setIsWorkCover}
                      aria-label="Is WorkCover related"
                      className="flex-shrink-0"
                    />
                  </div>

                  {/* Divider with visual break */}
                  <div className="py-2">
                    <div className="border-t border-dashed border-slate-200 dark:border-slate-700" />
                  </div>

                  {/* Toggle 4: Declaration (Required ON) */}
                  <div 
                    className={cn(
                      "flex items-center justify-between gap-4 p-4 rounded-xl border-2 transition-all duration-300",
                      declarationAccepted
                        ? "border-green-300 dark:border-green-700 bg-green-50/50 dark:bg-green-900/10"
                        : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                    )}
                  >
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground">
                        Do you agree that you are not lying to get a day off to go to the beach? 🏖️
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        (Seriously though, this is a legal declaration of truthfulness)
                      </p>
                    </div>
                    <Switch
                      checked={declarationAccepted}
                      onCheckedChange={setDeclarationAccepted}
                      aria-label="Declaration of truthfulness"
                      className="flex-shrink-0"
                    />
                  </div>
                </motion.div>

                {/* Validation hint */}
                <AnimatePresence>
                  {!declarationAccepted && !hasEmergencySymptoms && (
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="text-center text-xs text-muted-foreground"
                    >
                      Toggle the declaration above to continue
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>
            )

          // ======= STEP 5: REVIEW =======
          case 5:
            return (
              <div className="space-y-6">
                {/* Header */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className="text-center"
                >
                  <h2 className="text-xl sm:text-2xl font-semibold text-foreground tracking-tight mb-2">
                    Almost there. Does this look right? 👀
                  </h2>
                </motion.div>

                {/* Summary Card with Edit Buttons */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1, duration: 0.3 }}
                  className="bg-gradient-to-br from-white to-slate-50/80 dark:from-slate-900 dark:to-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm"
                >
                  {/* Section: Patient Info */}
                  <div className="p-4 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-1">Patient</p>
                        <p className="font-semibold text-foreground">
                          {patientType === "self" ? "Myself" : "Someone in my care"}
                        </p>
                      </div>
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => jumpToStep(1)}
                        className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-primary/10 hover:text-primary flex items-center justify-center transition-colors"
                        aria-label="Edit patient selection"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </motion.button>
                    </div>
                  </div>

                  {/* Section: Certificate Type */}
                  <div className="p-4 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-1">Certificate Type</p>
                        <p className="font-semibold text-foreground capitalize">{selectedPurpose}</p>
                      </div>
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => jumpToStep(2)}
                        className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-primary/10 hover:text-primary flex items-center justify-center transition-colors"
                        aria-label="Edit certificate type"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </motion.button>
                    </div>
                  </div>

                  {/* Section: Dates */}
                  <div className="p-4 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-1">Dates Requested</p>
                        <p className="font-semibold text-foreground">
                          {startDate && format(startDate, "EEE, d MMM")} → {getEndDate() && format(getEndDate()!, "EEE, d MMM")}
                        </p>
                        <p className="text-sm text-muted-foreground">{getDurationText()}</p>
                      </div>
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => jumpToStep(3)}
                        className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-primary/10 hover:text-primary flex items-center justify-center transition-colors"
                        aria-label="Edit dates"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </motion.button>
                    </div>
                  </div>

                  {/* Section: Symptoms */}
                  <div className="p-4 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-1">Main Symptoms</p>
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          {selectedSymptoms.slice(0, 4).map((id) => {
                            const symptom = SYMPTOM_TAGS.find(s => s.id === id)
                            return symptom ? (
                              <span
                                key={id}
                                className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary"
                              >
                                {symptom.emoji} {symptom.label}
                              </span>
                            ) : null
                          })}
                          {selectedSymptoms.length > 4 && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-800 text-muted-foreground">
                              +{selectedSymptoms.length - 4} more
                            </span>
                          )}
                        </div>
                      </div>
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => jumpToStep(3)}
                        className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-primary/10 hover:text-primary flex items-center justify-center transition-colors flex-shrink-0"
                        aria-label="Edit symptoms"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </motion.button>
                    </div>
                  </div>

                  {/* Section: Safety Check Status */}
                  <div className="p-4 bg-green-50/50 dark:bg-green-900/10">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                        <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />
                      </div>
                      <span className="text-sm font-medium text-green-700 dark:text-green-400">
                        Safety check passed
                      </span>
                    </div>
                  </div>
                </motion.div>

                {/* Price Summary */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2, duration: 0.3 }}
                  className="flex justify-between items-center p-4 bg-gradient-to-r from-primary/5 to-blue-500/5 rounded-xl border border-primary/10"
                >
                  <div>
                    <p className="text-sm text-muted-foreground">Total</p>
                    <p className="text-2xl font-bold text-foreground">$29.95</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Includes</p>
                    <p className="text-sm font-medium text-foreground">Doctor review + Certificate</p>
                  </div>
                </motion.div>

                {/* Legal Toggle */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3, duration: 0.3 }}
                >
                  <div 
                    className={cn(
                      "flex items-start justify-between gap-4 p-4 rounded-xl border-2 transition-all duration-300",
                      termsAccepted
                        ? "border-green-300 dark:border-green-700 bg-green-50/50 dark:bg-green-900/10"
                        : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                    )}
                  >
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground">
                        I agree to the{" "}
                        <button className="text-primary hover:underline">Terms of Service</button>
                        {" "}and{" "}
                        <button className="text-primary hover:underline">Privacy Policy</button>
                        , and understand this is not a guarantee of a certificate.
                      </p>
                    </div>
                    <Switch
                      checked={termsAccepted}
                      onCheckedChange={setTermsAccepted}
                      aria-label="Accept terms and conditions"
                      className="flex-shrink-0 mt-0.5"
                    />
                  </div>
                </motion.div>

                {/* CTA Button */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4, duration: 0.3 }}
                  className="space-y-3"
                >
                  <Button
                    onClick={advanceStep}
                    disabled={!termsAccepted}
                    size="lg"
                    className={cn(
                      "w-full py-6 text-lg font-semibold",
                      "bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500",
                      "hover:from-emerald-600 hover:via-teal-600 hover:to-cyan-600",
                      "shadow-[0_8px_32px_rgba(16,185,129,0.35)]",
                      "hover:shadow-[0_12px_40px_rgba(16,185,129,0.45)]",
                      "hover:scale-[1.01] active:scale-[0.99]",
                      "transition-all duration-200",
                      "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                    )}
                  >
                    <Lock className="w-5 h-5 mr-2" />
                    Proceed to Payment ($29.95)
                    <ChevronRight className="w-5 h-5 ml-2" />
                  </Button>

                  {/* Reassurance text */}
                  <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                    <Shield className="w-3.5 h-3.5" />
                    <span>You won&apos;t be charged until a doctor reviews your request.</span>
                  </div>
                </motion.div>
              </div>
            )

          // ======= STEP 6: AUTH =======
          case 6:
            return (
              <div className="space-y-6">
                {/* Header */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className="text-center"
                >
                  <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-primary/80 mb-4 shadow-lg shadow-primary/20">
                    <Shield className="h-7 w-7 text-primary-foreground" />
                  </div>
                  <h2 className="text-xl sm:text-2xl font-semibold text-foreground tracking-tight mb-2">
                    Almost there! 🎉
                  </h2>
                  <p className="text-sm text-muted-foreground max-w-md mx-auto">
                    Create an account or sign in to complete your medical certificate request
                  </p>
                </motion.div>

                {/* Loading state */}
                {(authLoading || isAuthenticating) && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center py-8"
                  >
                    <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">
                      {isAuthenticating ? "Signing you in..." : "Checking account status..."}
                    </p>
                  </motion.div>
                )}

                {/* Already signed in */}
                {!authLoading && !isAuthenticating && isSignedIn && user && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center py-6"
                  >
                    <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-4">
                      <CheckCircle2 className="w-8 h-8 text-green-600 dark:text-green-400" />
                    </div>
                    <h3 className="font-semibold text-foreground mb-1">You&apos;re signed in!</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Welcome back{user.email ? `, ${user.email}` : ""}
                    </p>
                    <Button
                      onClick={() => setCurrentStep(7)}
                      size="lg"
                      className={cn(
                        "px-8 py-6 text-lg font-semibold",
                        "bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500",
                        "hover:from-emerald-600 hover:via-teal-600 hover:to-cyan-600",
                        "shadow-[0_8px_32px_rgba(16,185,129,0.35)]",
                        "transition-all duration-200"
                      )}
                    >
                      Continue to Payment
                      <ChevronRight className="w-5 h-5 ml-2" />
                    </Button>
                  </motion.div>
                )}

                {/* Auth options */}
                {!authLoading && !isAuthenticating && !isSignedIn && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1, duration: 0.3 }}
                    className="space-y-4"
                  >
                    {authError && (
                      <div className="p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-600 dark:text-red-400">
                        {authError}
                      </div>
                    )}

                    {/* Google Sign In */}
                    <Button
                      onClick={handleGoogleSignIn}
                      disabled={isAuthenticating}
                      variant="outline"
                      size="lg"
                      className="w-full h-14 rounded-xl bg-white hover:bg-gray-50 text-gray-700 border-2 border-gray-200 shadow-sm"
                    >
                      <GoogleIcon className="mr-3 h-5 w-5" />
                      Continue with Google
                    </Button>

                    {/* Divider */}
                    <div className="relative my-4">
                      <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t border-gray-200 dark:border-slate-700" />
                      </div>
                      <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-white dark:bg-slate-900 px-3 text-muted-foreground">or continue as guest</span>
                      </div>
                    </div>

                    {/* Email Sign In */}
                    <Button
                      onClick={handleEmailSignIn}
                      disabled={isAuthenticating}
                      variant="outline"
                      size="lg"
                      className="w-full h-14 rounded-xl border-2"
                    >
                      <Mail className="mr-3 h-5 w-5" />
                      Sign in with Email
                    </Button>

                    {/* Guest checkout option */}
                    <div className="space-y-3 pt-4">
                      <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                          <span className="w-full border-t border-gray-200 dark:border-slate-700" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                          <span className="bg-white dark:bg-slate-900 px-3 text-muted-foreground">or checkout as guest</span>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">Email address</label>
                        <input
                          type="email"
                          value={guestEmail}
                          onChange={(e) => setGuestEmail(e.target.value)}
                          placeholder="you@example.com"
                          className={cn(
                            "w-full px-4 py-3 rounded-xl border-2",
                            "bg-white dark:bg-slate-900",
                            "text-foreground placeholder:text-muted-foreground/60",
                            "transition-all duration-200",
                            isValidEmail(guestEmail)
                              ? "border-green-300 dark:border-green-700 focus:border-green-400 focus:ring-2 focus:ring-green-400/20"
                              : "border-slate-200 dark:border-slate-700 focus:border-primary focus:ring-2 focus:ring-primary/20",
                            "focus:outline-none"
                          )}
                        />
                        <p className="text-xs text-muted-foreground">
                          We&apos;ll send your certificate and updates here.
                        </p>
                      </div>

                      <Button
                        onClick={() => setCurrentStep(7)}
                        disabled={!isValidEmail(guestEmail)}
                        size="lg"
                        className={cn(
                          "w-full py-6 text-lg font-semibold",
                          "bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500",
                          "hover:from-emerald-600 hover:via-teal-600 hover:to-cyan-600",
                          "shadow-[0_8px_32px_rgba(16,185,129,0.35)]",
                          "transition-all duration-200",
                          "disabled:opacity-50 disabled:cursor-not-allowed"
                        )}
                      >
                        Continue as Guest
                        <ChevronRight className="w-5 h-5 ml-2" />
                      </Button>
                    </div>
                  </motion.div>
                )}

                {/* Terms */}
                <p className="text-xs text-center text-muted-foreground pt-4">
                  By continuing, you agree to our{" "}
                  <a href="/terms" className="text-primary hover:underline">Terms</a>{" "}
                  and{" "}
                  <a href="/privacy" className="text-primary hover:underline">Privacy Policy</a>
                </p>
              </div>
            )

          // ======= STEP 7: PAYMENT =======
          case 7:
            return (
              <div className="space-y-6">
                {/* Header */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className="text-center"
                >
                  <h2 className="text-xl sm:text-2xl font-semibold text-foreground tracking-tight mb-2">
                    Complete your payment 💳
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Secure payment processed by Stripe
                  </p>
                </motion.div>

                {/* Error message */}
                <AnimatePresence>
                  {submitError && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl"
                    >
                      <p className="text-sm text-red-600 dark:text-red-400">{submitError}</p>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Order summary */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1, duration: 0.3 }}
                  className="bg-gradient-to-br from-white to-slate-50/80 dark:from-slate-900 dark:to-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm"
                >
                  <div className="p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Medical Certificate</span>
                      <span className="font-semibold text-foreground">$29.95</span>
                    </div>
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <span>Doctor review + PDF certificate</span>
                    </div>
                    <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-foreground">Total</span>
                        <span className="text-2xl font-bold text-foreground">$29.95</span>
                      </div>
                    </div>
                  </div>
                </motion.div>

                {/* Pay button */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2, duration: 0.3 }}
                  className="space-y-3"
                >
                  <Button
                    onClick={handleComplete}
                    disabled={isSubmitting}
                    size="lg"
                    className={cn(
                      "w-full py-6 text-lg font-semibold",
                      "bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500",
                      "hover:from-emerald-600 hover:via-teal-600 hover:to-cyan-600",
                      "shadow-[0_8px_32px_rgba(16,185,129,0.35)]",
                      "hover:shadow-[0_12px_40px_rgba(16,185,129,0.45)]",
                      "transition-all duration-200",
                      "disabled:opacity-50 disabled:cursor-not-allowed"
                    )}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Lock className="w-5 h-5 mr-2" />
                        Pay $29.95
                      </>
                    )}
                  </Button>

                  {/* Reassurance */}
                  <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                    <Shield className="w-3.5 h-3.5" />
                    <span>Secure checkout • Full refund if not approved</span>
                  </div>
                </motion.div>

                {/* Trust badges */}
                <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground pt-2">
                  <span className="flex items-center gap-1">
                    <Pill className="w-3.5 h-3.5" />
                    AHPRA Registered
                  </span>
                  <span>•</span>
                  <span>SSL Encrypted</span>
                  <span>•</span>
                  <span>Stripe Secure</span>
                </div>
              </div>
            )

          default:
            return null
        }
      }}
    </MedCertIntakeFlow>
    </>
  )
}

