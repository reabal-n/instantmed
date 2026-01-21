"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import confetti from "canvas-confetti"
import {
  ArrowRight,
  ArrowLeft,
  Clock,
  CheckCircle,
  AlertTriangle,
  Briefcase,
  GraduationCap,
  Heart,
  AlertCircle,
  Check,
  FileText,
  Shield,
  Pencil,
  Calendar,
  User,
  Mail,
  RefreshCw,
  LogIn,
} from "lucide-react"
import { ButtonSpinner } from "@/components/ui/unified-skeleton"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { createClient } from "@/lib/supabase/client"
import type { User as SupabaseUser } from "@supabase/supabase-js"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { createIntakeAndCheckoutAction } from "@/lib/stripe/checkout"
import { createOrGetProfile } from "@/app/actions/create-profile"
import { createGuestCheckoutAction } from "@/lib/stripe/guest-checkout"
import { saveFormData, loadFormData, clearFormData, STORAGE_KEYS } from "@/lib/storage"
import { cn } from "@/lib/utils"
import { CinematicSwitch } from "@/components/ui/cinematic-switch"
import { 
  pageTransitionDirectional,
  validationMessage,
  formFieldEntrance,
} from "@/lib/motion"
import { validators } from "@/lib/form-validation"
import posthog from 'posthog-js'
import { FormattedInput } from "@/components/ui/formatted-input"
import { FieldLabelWithHelp } from "@/components/ui/help-tooltip"
import { InfoCard } from "@/components/ui/contextual-help"
import { ProgressiveSection } from "@/components/ui/progressive-section"

// ============================================
// TYPES & CONSTANTS
// ============================================

type FlowStep =
  | "type"
  | "duration"
  | "startDate"
  | "symptoms"
  | "notes"
  | "safety"
  | "details"
  | "review"

const STEPS: FlowStep[] = [
  "type",
  "duration",
  "startDate",
  "symptoms",
  "notes",
  "safety",
  "details",
  "review",
]

// Certificate types
const CERT_TYPES = [
  { id: "work", label: "Work", icon: Briefcase, description: "For your employer" },
  { id: "uni", label: "Study", icon: GraduationCap, description: "For university or school" },
  { id: "carer", label: "Carer's leave", icon: Heart, description: "To care for someone" },
] as const

// Duration options - MAX 3 DAYS ONLY
const DURATION_OPTIONS = [
  { value: "1", label: "1 day" },
  { value: "2", label: "2 days" },
  { value: "3", label: "3 days" },
] as const

// Symptoms
const SYMPTOMS = ["Headache", "Fever", "Nausea", "Pain", "Fatigue", "Cold/Flu", "Gastro", "Other"] as const

// Relationships for carer's certificate
const RELATIONSHIPS = ["Parent", "Child", "Partner", "Sibling", "Grandparent", "Other"] as const

// Use shared motion variants (imported from @/lib/motion)
// pageTransitionDirectional for step transitions
// formFieldEntrance for form field animations
// validationMessage for inline validation

// ============================================
// COMPONENT PROPS
// ============================================

interface MedCertFormProps {
  patientId: string | null
  isAuthenticated: boolean
  needsOnboarding: boolean
  userEmail?: string
  userName?: string
}

// ============================================
// HELPER COMPONENTS
// ============================================

function ProgressDots({
  total,
  current,
  className,
}: {
  total: number
  current: number
  className?: string
}) {
  return (
    <div className={cn("flex items-center gap-1.5", className)} role="progressbar" aria-valuenow={current + 1} aria-valuemax={total}>
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={cn(
            "h-1.5 rounded-full transition-all duration-300",
            i === current ? "w-6 bg-primary" : i < current ? "w-1.5 bg-primary/60" : "w-1.5 bg-muted"
          )}
        />
      ))}
    </div>
  )
}

function StepHeader({
  title,
  subtitle,
}: {
  title: string
  subtitle?: string
}) {
  return (
    <motion.header
      className="text-center space-y-1 mb-6"
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      <h1 className="text-xl font-semibold text-foreground">{title}</h1>
      {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
    </motion.header>
  )
}

function OptionCard({
  selected,
  onClick,
  icon: Icon,
  label,
  description,
  className,
}: {
  selected: boolean
  onClick: () => void
  icon?: React.ComponentType<{ className?: string }>
  label: string
  description?: string
  className?: string
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        // Glass surface
        "w-full min-h-[56px] p-4 rounded-2xl border-2",
        "bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl",
        "border-white/40 dark:border-white/10",
        "flex items-center gap-4 text-left",
        "transition-all duration-300 ease-out",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
        selected
          ? "border-primary/50 bg-primary/10 dark:bg-primary/20 shadow-[0_8px_30px_rgb(59,130,246,0.25)]"
          : "hover:border-primary/40 hover:bg-white/85 dark:hover:bg-slate-900/80 hover:-translate-y-1 hover:shadow-[0_12px_40px_rgb(59,130,246,0.15)]",
        className
      )}
      whileHover={selected ? {} : { scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
    >
      {Icon && (
        <div
          className={cn(
            "w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-all duration-300",
            selected 
              ? "bg-primary text-primary-foreground shadow-[0_4px_16px_rgb(59,130,246,0.3)]" 
              : "bg-white/60 dark:bg-slate-800/60 backdrop-blur-lg text-muted-foreground"
          )}
        >
          <Icon className="w-5 h-5" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <span className="font-medium text-sm block">{label}</span>
        {description && <span className="text-xs text-muted-foreground block">{description}</span>}
      </div>
      {selected && (
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 400, damping: 25 }}
          className="shrink-0"
        >
          <Check className="w-5 h-5 text-primary" />
        </motion.div>
      )}
    </motion.button>
  )
}

function DurationChip({
  selected,
  onClick,
  label,
}: {
  selected: boolean
  onClick: () => void
  label: string
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        // Glass surface
        "flex-1 min-h-[52px] px-4 py-3 rounded-xl border-2 font-medium text-sm",
        "bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl",
        "border-white/40 dark:border-white/10",
        "transition-all duration-300 ease-out",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
        selected
          ? "border-sky-300/60 dark:border-sky-600/40 bg-sky-50/80 dark:bg-sky-900/20 text-sky-800 dark:text-sky-200 shadow-[0_2px_8px_rgba(138,187,224,0.15)]"
          : "hover:border-slate-300 hover:bg-white"
      )}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.3 }}
    >
      {label}
    </motion.button>
  )
}

function SymptomChip({
  selected,
  onClick,
  label,
}: {
  selected: boolean
  onClick: () => void
  label: string
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        // Calm glass surface per brand guidelines
        "min-h-[44px] px-4 py-2 rounded-xl text-sm font-medium",
        "bg-white/90 dark:bg-slate-900/60",
        "border-2 border-slate-200/60 dark:border-slate-700/40",
        "transition-all duration-300 ease-out",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 focus-visible:ring-offset-2",
        selected
          ? "border-sky-300/60 dark:border-sky-600/40 bg-sky-50/80 dark:bg-sky-900/20 text-sky-800 dark:text-sky-200 shadow-[0_2px_8px_rgba(138,187,224,0.15)]"
          : "hover:border-slate-300 hover:bg-white text-slate-700 dark:text-slate-300"
      )}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.3 }}
    >
      {label}
    </motion.button>
  )
}

// Inline validation hint component
function ValidationHint({
  validation,
  show = true,
}: {
  validation: { isValid: boolean; message?: string; type: 'error' | 'warning' | 'success' | 'info' } | null
  show?: boolean
}) {
  if (!validation || !validation.message || !show) return null

  const colors = {
    error: 'text-destructive',
    warning: 'text-dawn-600',
    success: 'text-emerald-600',
    info: 'text-muted-foreground',
  }

  const icons = {
    error: <AlertCircle className="w-3 h-3" />,
    warning: <AlertCircle className="w-3 h-3" />,
    success: <Check className="w-3 h-3" />,
    info: null,
  }

  return (
    <AnimatePresence mode="wait">
      <motion.p
        key={validation.message}
        variants={validationMessage}
        initial="initial"
        animate="animate"
        exit="exit"
        className={cn("text-xs flex items-center gap-1 mt-1.5", colors[validation.type])}
      >
        {icons[validation.type]}
        {validation.message}
      </motion.p>
    </AnimatePresence>
  )
}

function SafetyQuestion({
  question,
  value,
  onChange,
}: {
  question: string
  value: boolean | undefined
  onChange: (val: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between p-4 rounded-2xl bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl border border-white/40 dark:border-white/10 shadow-[0_4px_16px_rgb(0,0,0,0.04)] hover:bg-white/85 dark:hover:bg-slate-900/80 transition-all duration-300">
      <span className="text-sm font-medium pr-4 flex-1">{question}</span>
      <CinematicSwitch
        value={value}
        onChange={onChange}
        onLabel="YES"
        offLabel="NO"
        variant="safety"
        className="shrink-0"
      />
    </div>
  )
}

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  )
}

// Enhanced error message with actions
function ErrorAlert({
  message,
  onRetry,
  onSignIn,
  onDismiss,
}: {
  message: string
  onRetry?: () => void
  onSignIn?: () => void
  onDismiss?: () => void
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 space-y-3"
      role="alert"
    >
      <div className="flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-destructive">{message}</p>
        </div>
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className="p-1 rounded hover:bg-destructive/10 transition-colors shrink-0"
            aria-label="Dismiss error"
          >
            <span className="text-destructive">×</span>
          </button>
        )}
      </div>
      
      {(onRetry || onSignIn) && (
        <div className="flex flex-wrap gap-2 pt-1">
          {onRetry && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={onRetry}
              className="h-8 rounded-lg gap-1.5 border-destructive/30 text-destructive hover:bg-destructive/10"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Try again
            </Button>
          )}
          {onSignIn && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={onSignIn}
              className="h-8 rounded-lg gap-1.5 text-muted-foreground hover:text-foreground"
            >
              <LogIn className="w-3.5 h-3.5" />
              or sign in instead
            </Button>
          )}
        </div>
      )}
    </motion.div>
  )
}

// Sign-in dialog component
function SignInDialog({
  open,
  onOpenChange,
  onSuccess: _onSuccess,
  onGoogleAuth,
  isGoogleLoading,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: (email: string, name?: string, dob?: string) => void
  onGoogleAuth: () => void
  isGoogleLoading: boolean
}) {
  // Authentication is handled via the main sign-in flow
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Welcome back</DialogTitle>
          <DialogDescription>
            Sign in to your account to prefill your details
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          {/* Sign in with Supabase */}
          <Button
            type="button"
            onClick={() => {
              onOpenChange(false)
              onGoogleAuth() // Redirects to Supabase login
            }}
            disabled={isGoogleLoading}
            className="w-full h-11 rounded-xl gap-2"
          >
            {isGoogleLoading ? (
              <ButtonSpinner />
            ) : (
              <LogIn className="w-4 h-4" />
            )}
            Sign in to your account
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            Don&apos;t have an account?{" "}
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="text-primary hover:underline font-medium"
            >
              Continue as guest
            </button>
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ============================================
// MAIN COMPONENT
// ============================================

export function MedCertForm({
  patientId: initialPatientId,
  isAuthenticated: initialIsAuthenticated,
  needsOnboarding: initialNeedsOnboarding,
  userEmail,
  userName,
}: MedCertFormProps) {
  const router = useRouter()
  const supabase = createClient()
  const mainRef = useRef<HTMLElement>(null)
  
  // Supabase auth state
  const [user, setUser] = useState<SupabaseUser | null>(null)
  const [_isLoading, setIsLoading] = useState(true)
  const _isSignedIn = !!user

  // Auth state
  const [patientId, setPatientId] = useState<string | null>(initialPatientId)
  const [isAuthenticated, setIsAuthenticated] = useState(initialIsAuthenticated)
  const [_needsOnboarding, setNeedsOnboarding] = useState(initialNeedsOnboarding)

  // Form state
  const [formData, setFormData] = useState({
    certType: null as string | null,
    duration: null as string | null,
    startDate: new Date().toISOString().split("T")[0],
    selectedSymptoms: [] as string[],
    otherSymptom: "",
    carerPatientName: "",
    carerRelationship: null as string | null,
    additionalNotes: "",
    // Patient details - collected once
    fullName: userName || "",
    email: userEmail || "",
    dateOfBirth: "",
    medicareNumber: "",
    medicareIrn: "",
    addressLine1: "",
    suburb: "",
    state: "",
    postcode: "",
    // Safety answers
    safetyAnswers: {} as Record<string, boolean>,
  })

  // UI state
  const [step, setStep] = useState<FlowStep>("type")
  const [direction, setDirection] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [errorType, setErrorType] = useState<"generic" | "guest_profile" | null>(null)
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)
  const [showSignInDialog, setShowSignInDialog] = useState(false)
  const [lastSubmitAction, setLastSubmitAction] = useState<(() => Promise<void>) | null>(null)

  const isCarer = formData.certType === "carer"
  const isRedFlag = formData.safetyAnswers.chestPain === true || 
    formData.safetyAnswers.severeSymptoms === true || 
    formData.safetyAnswers.emergency === true

  const currentIndex = STEPS.indexOf(step)

  // Focus management
  useEffect(() => {
    if (mainRef.current) {
      mainRef.current.focus()
    }
  }, [step])

  // Check for returning users after OAuth and restore form state
  useEffect(() => {
    // Check if we're returning from OAuth with saved form data (with localStorage TTL fallback)
    const savedFormDataObj = loadFormData<typeof formData>(STORAGE_KEYS.MED_CERT_FORM)
    const savedStep = loadFormData<FlowStep>(STORAGE_KEYS.MED_CERT_STEP)
    
    const checkSession = async () => {
      
      if (savedFormDataObj) {
        setFormData((prev) => ({ ...prev, ...savedFormDataObj }))
        clearFormData(STORAGE_KEYS.MED_CERT_FORM)
      }
      
      if (savedStep && STEPS.includes(savedStep)) {
        setStep(savedStep)
        clearFormData(STORAGE_KEYS.MED_CERT_STEP)
      }

      // Use Supabase user for authentication check
      try {
        const { data: { user: currentUser } } = await supabase.auth.getUser()
        setUser(currentUser)
        
        if (currentUser && !isAuthenticated) {
          const userMetadata = currentUser.user_metadata || {}
          const { profileId } = await createOrGetProfile(
            currentUser.id,
            userMetadata.full_name || userMetadata.name || currentUser.email?.split('@')[0] || "",
            ""
          )

          if (profileId) {
            setPatientId(profileId)
            setIsAuthenticated(true)
            setNeedsOnboarding(false)
            
            // Prefill form data from user profile (merge with restored data)
            const { data: profile } = await supabase
              .from("profiles")
              .select("full_name, date_of_birth, medicare_number, medicare_irn, address_line1, suburb, state, postcode, email")
              .eq("id", profileId)
              .single()

            setFormData((prev) => ({
              ...prev,
              email: currentUser.email || profile?.email || prev.email,
              fullName: profile?.full_name || userMetadata.full_name || userMetadata.name || prev.fullName,
              dateOfBirth: profile?.date_of_birth || prev.dateOfBirth,
              medicareNumber: profile?.medicare_number || prev.medicareNumber,
              medicareIrn: profile?.medicare_irn || prev.medicareIrn,
              addressLine1: profile?.address_line1 || prev.addressLine1,
              suburb: profile?.suburb || prev.suburb,
              state: profile?.state || prev.state,
              postcode: profile?.postcode || prev.postcode,
            }))
            
            // If we restored form data and are now authenticated, go to review
            if (savedFormDataObj) {
              setStep("review")
            }
          }
        }
      } catch (_error) {
        // Error checking session
      } finally {
        setIsLoading(false)
      }
    }
    
    checkSession()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setUser(session?.user ?? null)
      
      if (session?.user && !isAuthenticated) {
        const userMetadata = session.user.user_metadata || {}
        const { profileId } = await createOrGetProfile(
          session.user.id,
          userMetadata.full_name || userMetadata.name || session.user.email?.split('@')[0] || "",
          ""
        )

        if (profileId) {
          setPatientId(profileId)
          setIsAuthenticated(true)
          setNeedsOnboarding(false)
          
          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name, date_of_birth, medicare_number, medicare_irn, address_line1, suburb, state, postcode, email")
            .eq("id", profileId)
            .single()

          setFormData((prev) => ({
            ...prev,
            email: session.user.email || profile?.email || prev.email,
            fullName: profile?.full_name || userMetadata.full_name || userMetadata.name || prev.fullName,
            dateOfBirth: profile?.date_of_birth || prev.dateOfBirth,
            medicareNumber: profile?.medicare_number || prev.medicareNumber,
            medicareIrn: profile?.medicare_irn || prev.medicareIrn,
            addressLine1: profile?.address_line1 || prev.addressLine1,
            suburb: profile?.suburb || prev.suburb,
            state: profile?.state || prev.state,
            postcode: profile?.postcode || prev.postcode,
          }))
          
          if (savedFormDataObj) {
            setStep("review")
          }
        }
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [supabase, isAuthenticated])

  // Handle successful sign-in from dialog
  // Note: With Supabase migration, this is mainly triggered by the checkSession useEffect
  // when user signs in via Supabase auth. Kept for backwards compatibility.
  const handleSignInSuccess = async (email: string, name?: string, dob?: string) => {
    // Use Supabase user if available
    if (!user) return

    const { profileId } = await createOrGetProfile(
      user.id,
      name || user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || "",
      dob || ""
    )

    if (profileId) {
      setPatientId(profileId)
      setIsAuthenticated(true)
      setNeedsOnboarding(false)

      // Prefill form data from user profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, date_of_birth, medicare_number, medicare_irn, address_line1, suburb, state, postcode")
        .eq("id", profileId)
        .single()

      setFormData((prev) => ({
        ...prev,
        email: email || user.email || prev.email,
        fullName: profile?.full_name || name || prev.fullName,
        dateOfBirth: profile?.date_of_birth || dob || prev.dateOfBirth,
        medicareNumber: profile?.medicare_number || prev.medicareNumber,
        medicareIrn: profile?.medicare_irn || prev.medicareIrn,
        addressLine1: profile?.address_line1 || prev.addressLine1,
        suburb: profile?.suburb || prev.suburb,
        state: profile?.state || prev.state,
        postcode: profile?.postcode || prev.postcode,
      }))

      // Clear any previous errors
      setError(null)
      setErrorType(null)
    }
  }

  // Auto-advance handlers
  const selectCertType = useCallback((type: string) => {
    setFormData((prev) => ({ ...prev, certType: type }))
    setTimeout(() => goToStep("duration", 1), 200)
  }, [])

  const selectDuration = useCallback((duration: string) => {
    setFormData((prev) => ({ ...prev, duration }))
    setTimeout(() => goToStep("startDate", 1), 200)
  }, [])

  // Navigation
  const goToStep = (targetStep: FlowStep, dir: number) => {
    setDirection(dir)
    setError(null)
    setStep(targetStep)
  }

  const goNext = useCallback(() => {
    const currentIdx = STEPS.indexOf(step)
    if (currentIdx < STEPS.length - 1) {
      goToStep(STEPS[currentIdx + 1], 1)
    }
  }, [step])

  const goBack = useCallback(() => {
    const currentIdx = STEPS.indexOf(step)
    if (currentIdx > 0) {
      goToStep(STEPS[currentIdx - 1], -1)
    }
  }, [step])

  // Toggle symptom selection
  const toggleSymptom = (symptom: string) => {
    setFormData((prev) => ({
      ...prev,
      selectedSymptoms: prev.selectedSymptoms.includes(symptom)
        ? prev.selectedSymptoms.filter((s) => s !== symptom)
        : [...prev.selectedSymptoms, symptom],
    }))
  }

  // Validation
  const canProceed = () => {
    switch (step) {
      case "type":
        return formData.certType !== null
      case "duration":
        return formData.duration !== null
      case "startDate":
        return !!formData.startDate
      case "symptoms":
        if (isCarer) {
          return formData.selectedSymptoms.length > 0 && !!formData.carerPatientName && !!formData.carerRelationship
        }
        return formData.selectedSymptoms.length > 0
      case "notes":
        return true // Notes are optional
      case "safety":
        return Object.keys(formData.safetyAnswers).length === 3
      case "details":
        return (
          !!formData.email &&
          !!formData.dateOfBirth &&
          !!formData.addressLine1 &&
          !!formData.suburb &&
          !!formData.state &&
          !!formData.postcode
        )
      case "review":
        return true
      default:
        return false
    }
  }

  // Get date range for certificate
  const getDateRange = () => {
    const start = new Date(formData.startDate)
    const from = start.toISOString().split("T")[0]
    const durationDays = parseInt(formData.duration || "1", 10) - 1
    const end = new Date(start)
    end.setDate(end.getDate() + durationDays)
    const to = end.toISOString().split("T")[0]
    return { from, to }
  }

  // Google auth
  const handleGoogleAuth = async () => {
    setIsGoogleLoading(true)
    setError(null)

    try {
      // Store form data with localStorage fallback (24hr TTL) for OAuth redirect
      saveFormData(STORAGE_KEYS.MED_CERT_FORM, formData)
      saveFormData(STORAGE_KEYS.MED_CERT_STEP, step)
      
      router.push(`/sign-in?redirect=${encodeURIComponent(window.location.href)}`)
      setIsGoogleLoading(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to sign in. Please try again.")
      setIsGoogleLoading(false)
    }
  }

  // Submit handler
  const handleSubmit = async () => {
    setIsSubmitting(true)
    setError(null)
    setErrorType(null)

    // Track checkout initiation in PostHog
    posthog.capture('checkout_initiated', {
      service_category: 'medical_certificate',
      certificate_type: formData.certType,
      duration_days: formData.duration,
      is_carer_certificate: isCarer,
      is_authenticated: isAuthenticated,
      has_patient_id: !!patientId,
    })

    const dates = getDateRange()

    const answers = {
      certificate_type: formData.certType,
      duration: formData.duration,
      date_from: dates.from,
      date_to: dates.to,
      symptoms: formData.selectedSymptoms,
      other_symptom: formData.selectedSymptoms.includes("Other") ? formData.otherSymptom : null,
      additional_notes: formData.additionalNotes || null,
      carer_patient_name: isCarer ? formData.carerPatientName : null,
      carer_relationship: isCarer ? formData.carerRelationship : null,
      safety_chest_pain: formData.safetyAnswers.chestPain ?? null,
      safety_severe_symptoms: formData.safetyAnswers.severeSymptoms ?? null,
      safety_emergency: formData.safetyAnswers.emergency ?? null,
      patient_email: formData.email,
      patient_dob: formData.dateOfBirth,
      address_line1: formData.addressLine1,
      suburb: formData.suburb,
      state: formData.state,
      postcode: formData.postcode,
    }

    // Store the action for retry
    const submitAction = async () => {
      try {
        let result

        if (isAuthenticated && patientId) {
          // Authenticated user checkout
          result = await createIntakeAndCheckoutAction({
            category: "medical_certificate",
            subtype: formData.certType || "work",
            type: "med_cert",
            answers,
            patientId,
            patientEmail: formData.email,
          })
        } else {
          // Guest checkout
          result = await createGuestCheckoutAction({
            category: "medical_certificate",
            subtype: formData.certType || "work",
            type: "med_cert",
            guestEmail: formData.email,
            guestName: formData.fullName || undefined,
            guestDateOfBirth: formData.dateOfBirth || undefined,
            answers,
          })
        }

        if (!result.success) {
          // Show the actual error from the server for debugging
          setErrorType("guest_profile")
          throw new Error(result.error || "Payment could not be processed. Please try again.")
        }

        // Validate checkoutUrl exists
        if (!result.checkoutUrl) {
          throw new Error("No checkout URL received. Please try again.")
        }

        // Celebrate on success!
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { x: 0.5, y: 0.6 },
          colors: ["#2563EB", "#4f46e5", "#4f46e5", "#F59E0B", "#10B981"],
        })

        // Redirect to Stripe checkout
        window.location.href = result.checkoutUrl
      } catch (err) {
        throw err
      }
    }

    setLastSubmitAction(() => submitAction)

    try {
      await submitAction()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Something went wrong. Please try again."
      setError(errorMessage)
      if (!errorType) {
        setErrorType("generic")
      }
      setIsSubmitting(false)
    }
  }

  // Retry handler
  const handleRetry = async () => {
    if (lastSubmitAction) {
      setIsSubmitting(true)
      setError(null)
      setErrorType(null)
      try {
        await lastSubmitAction()
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Something went wrong. Please try again."
        setError(errorMessage)
        setIsSubmitting(false)
      }
    }
  }

  // Format date for display
  const formatDate = (dateStr: string) => {
    if (!dateStr) return ""
    return new Date(dateStr).toLocaleDateString("en-AU", {
      weekday: "short",
      day: "numeric",
      month: "short",
    })
  }

  // Get labels for review
  const getCertTypeLabel = () => CERT_TYPES.find((t) => t.id === formData.certType)?.label || formData.certType
  const getDurationLabel = () => DURATION_OPTIONS.find((o) => o.value === formData.duration)?.label || formData.duration

  // ============================================
  // RENDER STEPS
  // ============================================

  const renderStep = () => {
    switch (step) {
      case "type":
        return (
          <div className="space-y-3">
            <StepHeader title="What type of certificate do you need?" subtitle="Select one option" />
            <div className="space-y-3" role="radiogroup" aria-label="Certificate type">
              {CERT_TYPES.map((type, i) => (
                <motion.div
                  key={type.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <OptionCard
                    selected={formData.certType === type.id}
                    onClick={() => selectCertType(type.id)}
                    icon={type.icon}
                    label={type.label}
                    description={type.description}
                  />
                </motion.div>
              ))}
            </div>
          </div>
        )

      case "duration":
        return (
          <div className="space-y-4">
            <StepHeader title="How long do you need off?" subtitle="Maximum 3 days available" />
            <div className="flex gap-3" role="radiogroup" aria-label="Duration">
              {DURATION_OPTIONS.map((option, i) => (
                <motion.div
                  key={option.value}
                  className="flex-1"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <DurationChip
                    selected={formData.duration === option.value}
                    onClick={() => selectDuration(option.value)}
                    label={option.label}
                  />
                </motion.div>
              ))}
            </div>
          </div>
        )

      case "startDate":
        return (
          <div className="space-y-4">
            <StepHeader title="When does your leave start?" subtitle="We cannot backdate medical certificates" />
            <div className="space-y-2">
              <Label htmlFor="start-date" className="text-sm font-medium">Start date</Label>
              <Input
                id="start-date"
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData((prev) => ({ ...prev, startDate: e.target.value }))}
                min={new Date().toISOString().split("T")[0]}
                className="h-12"
                startContent={<Calendar className="w-4 h-4 text-muted-foreground" />}
              />
              <p className="text-xs text-muted-foreground">Certificates can only be issued from today onwards</p>
            </div>
          </div>
        )

      case "symptoms":
        return (
          <div className="space-y-4">
            <StepHeader
              title={isCarer ? "What symptoms are they experiencing?" : "What symptoms are you experiencing?"}
              subtitle="Select all that apply"
            />

            {isCarer && (
              <div className="space-y-4 p-4 rounded-2xl bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl border border-white/40 dark:border-white/10 shadow-[0_4px_16px_rgb(0,0,0,0.04)]">
                <div className="space-y-2">
                  <Label htmlFor="carer-name" className="text-sm font-medium">Person you&apos;re caring for</Label>
                  <Input
                    id="carer-name"
                    placeholder="Their full name"
                    value={formData.carerPatientName}
                    onChange={(e) => setFormData((prev) => ({ ...prev, carerPatientName: e.target.value }))}
                    className="h-11 rounded-xl bg-white/60 dark:bg-slate-900/40 backdrop-blur-lg border-white/30 dark:border-white/10 focus:border-primary/50 focus:shadow-[0_0_20px_rgb(59,130,246,0.15)] transition-all duration-200"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Your relationship</Label>
                  <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Relationship">
                    {RELATIONSHIPS.map((rel) => (
                      <button
                        key={rel}
                        type="button"
                        onClick={() => setFormData((prev) => ({ ...prev, carerRelationship: rel }))}
                        aria-pressed={formData.carerRelationship === rel}
                        className={cn(
                          "px-3 py-1.5 rounded-xl text-sm font-medium transition-all duration-300",
                          "bg-white/90 dark:bg-slate-900/60",
                          "border-2 border-slate-200/60 dark:border-slate-700/40",
                          "focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 focus-visible:ring-offset-2",
                          formData.carerRelationship === rel
                            ? "border-sky-300/60 dark:border-sky-600/40 bg-sky-50/80 dark:bg-sky-900/20 text-sky-800 dark:text-sky-200 shadow-[0_2px_8px_rgba(138,187,224,0.15)]"
                            : "hover:border-slate-300 hover:bg-white text-slate-700 dark:text-slate-300"
                        )}
                      >
                        {rel}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2" role="group" aria-label="Symptoms">
              {SYMPTOMS.map((symptom) => (
                <SymptomChip
                  key={symptom}
                  selected={formData.selectedSymptoms.includes(symptom)}
                  onClick={() => toggleSymptom(symptom)}
                  label={symptom}
                />
              ))}
            </div>

            {formData.selectedSymptoms.includes("Other") && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-2"
              >
                <Label htmlFor="other-symptom" className="text-sm font-medium">Please describe</Label>
                <Input
                  id="other-symptom"
                  placeholder="Brief description"
                  value={formData.otherSymptom}
                  onChange={(e) => setFormData((prev) => ({ ...prev, otherSymptom: e.target.value }))}
                  className="h-11 rounded-xl bg-white/60 dark:bg-slate-900/40 backdrop-blur-lg border-white/30 dark:border-white/10 focus:border-primary/50 focus:shadow-[0_0_20px_rgb(59,130,246,0.15)] transition-all duration-200"
                />
              </motion.div>
            )}
          </div>
        )

      case "notes":
        return (
          <div className="space-y-4">
            <StepHeader title="Any additional information?" subtitle="Optional — helps the GP understand your situation" />
            <ProgressiveSection
              title="Additional details"
              description="Any extra information that might help the doctor understand your situation"
              defaultOpen={!!formData.additionalNotes}
            >
              <div className="space-y-2">
              <Textarea
                value={formData.additionalNotes}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData((prev) => ({ ...prev, additionalNotes: e.target.value.slice(0, 500) }))}
                placeholder="e.g. symptoms started yesterday evening..."
                className="min-h-[120px] resize-none rounded-xl bg-white/60 dark:bg-slate-900/40 backdrop-blur-lg border-white/30 dark:border-white/10 focus:border-primary/50 focus:shadow-[0_0_20px_rgb(59,130,246,0.15)] transition-all duration-200"
                maxLength={500}
              />
                <p className="text-xs text-right text-muted-foreground">{formData.additionalNotes.length}/500</p>
                <InfoCard
                  title="Why we ask"
                  description="Additional context helps our doctors make informed decisions about your certificate."
                  variant="info"
                />
              </div>
            </ProgressiveSection>
          </div>
        )

      case "safety":
        return (
          <div className="space-y-4">
            <StepHeader title="Safety check" subtitle="To ensure this service is appropriate for you" />

            <div className="space-y-3">
              <SafetyQuestion
                question="Any chest pain or breathing difficulty?"
                value={formData.safetyAnswers.chestPain}
                onChange={(val) =>
                  setFormData((prev) => ({
                    ...prev,
                    safetyAnswers: { ...prev.safetyAnswers, chestPain: val },
                  }))
                }
              />
              <SafetyQuestion
                question="Are symptoms severe or getting worse?"
                value={formData.safetyAnswers.severeSymptoms}
                onChange={(val) =>
                  setFormData((prev) => ({
                    ...prev,
                    safetyAnswers: { ...prev.safetyAnswers, severeSymptoms: val },
                  }))
                }
              />
              <SafetyQuestion
                question="Do you feel this may be an emergency?"
                value={formData.safetyAnswers.emergency}
                onChange={(val) =>
                  setFormData((prev) => ({
                    ...prev,
                    safetyAnswers: { ...prev.safetyAnswers, emergency: val },
                  }))
                }
              />
            </div>

            {isRedFlag && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 space-y-3"
                role="alert"
              >
                <div className="flex items-center gap-2 text-destructive">
                  <AlertTriangle className="w-5 h-5" />
                  <span className="font-semibold">Please seek urgent care</span>
                </div>
                <p className="text-sm text-destructive/90">
                  Based on your answers, we recommend you contact emergency services or visit your nearest emergency department.
                </p>
                <Button variant="destructive" className="w-full" onClick={() => window.open("tel:000")}>
                  Call 000
                </Button>
              </motion.div>
            )}
          </div>
        )

      case "details":
        return (
          <div className="space-y-4">
            <StepHeader title="Your details" subtitle="Required for your certificate" />

            {/* Sign-in panel for guests */}
            {!isAuthenticated && (
              <Card className="border-primary/30 bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl shadow-[0_8px_30px_rgb(59,130,246,0.15)]">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">Have an account?</p>
                        <p className="text-xs text-muted-foreground">Sign in to prefill your details</p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowSignInDialog(true)}
                      className="h-8 rounded-lg gap-1.5 bg-white hover:bg-white/80"
                    >
                      <LogIn className="w-3.5 h-3.5" />
                      Sign in
                    </Button>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleGoogleAuth}
                      disabled={isGoogleLoading}
                      className="flex-1 h-9 rounded-lg gap-1.5 text-xs"
                    >
                      {isGoogleLoading ? (
                        <ButtonSpinner className="w-3.5 h-3.5" />
                      ) : (
                        <GoogleIcon className="w-3.5 h-3.5" />
                      )}
                      Google
                    </Button>
                    <span className="text-xs text-muted-foreground">or continue as guest below</span>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Authenticated user badge */}
            {isAuthenticated && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-50/80 dark:bg-emerald-900/30 backdrop-blur-lg border border-emerald-200/50 dark:border-emerald-800/30 shadow-[0_4px_16px_rgb(34,197,94,0.15)]">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                <span className="text-sm text-emerald-700">Signed in as {formData.email}</span>
              </div>
            )}

            <div className="space-y-4">
              {/* Email - only shown/editable for guests */}
              {!isAuthenticated && (
                <motion.div 
                  className="space-y-2"
                  variants={formFieldEntrance}
                  initial="initial"
                  animate="animate"
                >
                  <FieldLabelWithHelp
                    label="Email address"
                    helpText="Your certificate will be sent to this email address"
                    required
                  />
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                    placeholder="you@example.com"
                    className={cn(
                      "h-11",
                      formData.email && !validators.email(formData.email).isValid && "border-destructive/50",
                      formData.email && validators.email(formData.email).isValid && "border-emerald-500/50"
                    )}
                    startContent={<Mail className="w-4 h-4 text-muted-foreground" />}
                  />
                  {formData.email ? (
                    <ValidationHint validation={validators.email(formData.email)} />
                  ) : (
                    <p className="text-xs text-muted-foreground">Your certificate will be sent here</p>
                  )}
                </motion.div>
              )}

              {/* Date of Birth */}
              <div className="space-y-2">
                <FieldLabelWithHelp
                  label="Date of birth"
                  helpText="Required for your medical certificate. Format: DD/MM/YYYY"
                  required
                />
                <Input
                  id="dob"
                  type="date"
                  value={formData.dateOfBirth}
                  onChange={(e) => setFormData((prev) => ({ ...prev, dateOfBirth: e.target.value }))}
                  max={new Date().toISOString().split("T")[0]}
                  className="h-11 rounded-xl bg-white/60 dark:bg-slate-900/40 backdrop-blur-lg border-white/30 dark:border-white/10 focus:border-primary/50 focus:shadow-[0_0_20px_rgb(59,130,246,0.15)] transition-all duration-200"
                />
                {!formData.dateOfBirth && (
                  <p className="text-xs text-muted-foreground">We need this to verify your identity</p>
                )}
              </div>

              {/* Address */}
              <div className="space-y-2">
                <FieldLabelWithHelp
                  label="Street address"
                  helpText="Your residential address (required for certificate)"
                  required
                />
                <Input
                  id="address"
                  type="text"
                  value={formData.addressLine1}
                  onChange={(e) => setFormData((prev) => ({ ...prev, addressLine1: e.target.value }))}
                  placeholder="123 Main St"
                  className="h-11 rounded-xl bg-white/60 dark:bg-slate-900/40 backdrop-blur-lg border-white/30 dark:border-white/10 focus:border-primary/50 focus:shadow-[0_0_20px_rgb(59,130,246,0.15)] transition-all duration-200"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="suburb">Suburb</Label>
                  <Input
                    id="suburb"
                    type="text"
                    value={formData.suburb}
                    onChange={(e) => setFormData((prev) => ({ ...prev, suburb: e.target.value }))}
                    placeholder="Sydney"
                    className="h-11 rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="state">State</Label>
                  <select
                    id="state"
                    value={formData.state}
                    onChange={(e) => setFormData((prev) => ({ ...prev, state: e.target.value }))}
                    className="h-11 w-full rounded-xl bg-white/60 dark:bg-slate-900/40 backdrop-blur-lg border border-white/30 dark:border-white/10 px-3 text-sm focus:outline-none focus:border-primary/50 focus:shadow-[0_0_20px_rgb(59,130,246,0.15)] transition-all duration-200"
                  >
                    <option value="">Select</option>
                    <option value="NSW">NSW</option>
                    <option value="VIC">VIC</option>
                    <option value="QLD">QLD</option>
                    <option value="WA">WA</option>
                    <option value="SA">SA</option>
                    <option value="TAS">TAS</option>
                    <option value="ACT">ACT</option>
                    <option value="NT">NT</option>
                  </select>
                </div>
              </div>

              <motion.div 
                className="space-y-2"
                variants={formFieldEntrance}
                initial="initial"
                animate="animate"
                transition={{ delay: 0.3 }}
              >
                <FieldLabelWithHelp
                  label="Postcode"
                  helpText="4-digit Australian postcode"
                  required
                />
                <FormattedInput
                  format="postcode"
                  value={formData.postcode}
                  onChange={(unformatted) => setFormData((prev) => ({ ...prev, postcode: unformatted }))}
                  placeholder="2000"
                  label=""
                  className="h-11 rounded-xl w-32"
                  maxLength={4}
                />
                {formData.postcode && formData.postcode.length < 4 && (
                  <ValidationHint 
                    validation={{ 
                      isValid: false, 
                      message: `${4 - formData.postcode.length} more digits needed`, 
                      type: 'info' 
                    }} 
                  />
                )}
                {formData.postcode && formData.postcode.length === 4 && (
                  <ValidationHint 
                    validation={{ 
                      isValid: true, 
                      message: 'Valid postcode', 
                      type: 'success' 
                    }} 
                  />
                )}
              </motion.div>
            </div>
          </div>
        )

      case "review":
        return (
          <div className="space-y-4">
            <StepHeader title="Review your request" subtitle="Please confirm these details are correct" />

            <div className="rounded-2xl border border-white/40 dark:border-white/10 bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl shadow-[0_8px_30px_rgb(0,0,0,0.06)] divide-y divide-white/20 dark:divide-white/5">
              {/* Certificate type */}
              <div className="flex items-center justify-between p-4">
                <div className="space-y-0.5">
                  <p className="text-xs text-muted-foreground">Certificate type</p>
                  <p className="text-sm font-medium">{getCertTypeLabel()}</p>
                </div>
                <button
                  type="button"
                  onClick={() => goToStep("type", -1)}
                  className="p-2 rounded-lg hover:bg-muted transition-colors"
                  aria-label="Edit certificate type"
                >
                  <Pencil className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>

              {/* Duration */}
              <div className="flex items-center justify-between p-4">
                <div className="space-y-0.5">
                  <p className="text-xs text-muted-foreground">Duration</p>
                  <p className="text-sm font-medium">{getDurationLabel()}</p>
                </div>
                <button
                  type="button"
                  onClick={() => goToStep("duration", -1)}
                  className="p-2 rounded-lg hover:bg-muted transition-colors"
                  aria-label="Edit duration"
                >
                  <Pencil className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>

              {/* Start Date */}
              <div className="flex items-center justify-between p-4">
                <div className="space-y-0.5">
                  <p className="text-xs text-muted-foreground">Start date</p>
                  <p className="text-sm font-medium">{formatDate(formData.startDate)}</p>
                </div>
                <button
                  type="button"
                  onClick={() => goToStep("startDate", -1)}
                  className="p-2 rounded-lg hover:bg-muted transition-colors"
                  aria-label="Edit start date"
                >
                  <Pencil className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>

              {/* Symptoms */}
              <div className="flex items-center justify-between p-4">
                <div className="space-y-0.5 flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground">Symptoms</p>
                  <p className="text-sm font-medium truncate">
                    {formData.selectedSymptoms.join(", ")}
                    {formData.selectedSymptoms.includes("Other") && formData.otherSymptom && ` (${formData.otherSymptom})`}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => goToStep("symptoms", -1)}
                  className="p-2 rounded-lg hover:bg-muted transition-colors shrink-0"
                  aria-label="Edit symptoms"
                >
                  <Pencil className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>

              {/* Email */}
              <div className="flex items-center justify-between p-4">
                <div className="space-y-0.5 flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground">Email</p>
                  <p className="text-sm font-medium truncate">{formData.email}</p>
                </div>
                <button
                  type="button"
                  onClick={() => goToStep("details", -1)}
                  className="p-2 rounded-lg hover:bg-muted transition-colors shrink-0"
                  aria-label="Edit email"
                >
                  <Pencil className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>
            </div>

            {/* Sign-in options for guests */}
            {!isAuthenticated && (
              <div className="rounded-xl border border-border bg-linear-to-br from-muted/30 to-muted/50 p-4 space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <User className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Continuing as guest</span>
                </div>
                
                <div className="flex flex-col gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleGoogleAuth}
                    disabled={isGoogleLoading}
                    className="w-full h-10 rounded-lg gap-2 bg-white hover:bg-gray-50 border-border"
                  >
                    {isGoogleLoading ? (
                      <ButtonSpinner />
                    ) : (
                      <GoogleIcon className="w-4 h-4" />
                    )}
                    Continue with Google
                  </Button>
                  
                  <button
                    type="button"
                    onClick={() => setShowSignInDialog(true)}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Or sign in with email
                  </button>
                </div>
                
                <p className="text-xs text-muted-foreground">
                  Sign in to save your certificate to your account and access it anytime.
                </p>
              </div>
            )}

            {/* Authenticated badge */}
            {isAuthenticated && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-50/80 dark:bg-emerald-900/30 backdrop-blur-lg border border-emerald-200/50 dark:border-emerald-800/30 shadow-[0_4px_16px_rgb(34,197,94,0.15)]">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                <span className="text-sm text-emerald-700">Signed in — your certificate will be saved to your account</span>
              </div>
            )}

            {/* Pricing card */}
            <div className="rounded-2xl border border-white/40 dark:border-white/10 bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl shadow-[0_8px_30px_rgb(0,0,0,0.06)] p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <FileText className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">Medical Certificate</p>
                    <p className="text-xs text-muted-foreground">{getCertTypeLabel()}</p>
                  </div>
                </div>
                <p className="text-lg font-semibold">$19.95</p>
              </div>

              <div className="space-y-2 pt-2 border-t border-border">
                {["GP review of your information", "Digital certificate (if approved)", "Secure document storage"].map(
                  (item, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                      <span>{item}</span>
                    </div>
                  )
                )}
              </div>

              <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50">
                <Shield className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                <p className="text-xs text-muted-foreground">
                  A GP will review your information and may request further details if needed. Certificates are issued at
                  the GP&apos;s discretion based on clinical assessment.
                </p>
              </div>
            </div>

            {/* Guest account creation note */}
            {!isAuthenticated && (
              <p className="text-xs text-center text-muted-foreground">
                After payment, you&apos;ll receive your certificate by email. You can create a password later to access your account.
              </p>
            )}

            {/* Turnaround info */}
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Clock className="w-4 h-4" />
              <span>Usually within 1 hour (8am–10pm AEST)</span>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  // ============================================
  // RENDER
  // ============================================

  return (
    <main
      ref={mainRef}
      tabIndex={-1}
      className="h-screen bg-ivory-50 dark:bg-slate-950 flex flex-col overflow-hidden"
      aria-label="Medical certificate request"
    >
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-white/40 dark:border-white/10 px-4 py-3">
        <div className="max-w-md mx-auto space-y-3">
          <div className="flex items-center justify-between">
            <Link href="/" className="text-sm font-semibold text-primary">
              InstantMed
            </Link>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Clock className="w-3.5 h-3.5" />
              <span>Usually within 1 hour</span>
            </div>
          </div>
          <ProgressDots total={STEPS.length} current={currentIndex} />
        </div>
      </header>

      {/* Sign-in Dialog */}
      <SignInDialog
        open={showSignInDialog}
        onOpenChange={setShowSignInDialog}
        onSuccess={handleSignInSuccess}
        onGoogleAuth={handleGoogleAuth}
        isGoogleLoading={isGoogleLoading}
      />

      {/* Content */}
      <div className="flex-1 px-4 py-6 overflow-y-auto">
        <div className="max-w-md mx-auto">
          <AnimatePresence mode="wait">
            {error && (
              <div className="mb-4">
                <ErrorAlert
                  message={error}
                  onRetry={errorType === "guest_profile" || errorType === "generic" ? handleRetry : undefined}
                  onSignIn={errorType === "guest_profile" ? () => setShowSignInDialog(true) : undefined}
                  onDismiss={() => {
                    setError(null)
                    setErrorType(null)
                  }}
                />
              </div>
            )}
          </AnimatePresence>

          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={step}
              custom={direction}
              variants={pageTransitionDirectional}
              initial="enter"
              animate="center"
              exit="exit"
            >
              {renderStep()}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Footer - fixed at bottom of flex container */}
      <footer className="shrink-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-t border-white/40 dark:border-white/10 px-4 py-3">
        <div className="max-w-md mx-auto flex gap-3">
          {step !== "type" && (
            <Button
              type="button"
              variant="ghost"
              onClick={goBack}
              className="h-12 px-4 rounded-xl"
              aria-label="Go back"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
          )}

          {step === "review" ? (
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || isRedFlag}
              className="flex-1 h-12 rounded-full gap-2 bg-primary hover:bg-primary/90 text-white shadow-[0_2px_8px_rgba(0,0,0,0.1)] transition-all duration-300"
            >
              {isSubmitting ? (
                <>
                  <ButtonSpinner className="w-5 h-5" />
                  Processing...
                </>
              ) : (
                <>
                  Pay & submit request
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </Button>
          ) : step !== "type" && step !== "duration" ? (
            <Button
              onClick={goNext}
              disabled={!canProceed()}
              className="flex-1 h-12 rounded-full gap-2 bg-primary hover:bg-primary/90 text-white shadow-[0_2px_8px_rgba(0,0,0,0.1)] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Continue
              <ArrowRight className="w-5 h-5" />
            </Button>
          ) : (
            // Type and duration steps auto-advance, show helper text
            <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
              Select an option to continue
            </div>
          )}
        </div>
      </footer>
    </main>
  )
}
