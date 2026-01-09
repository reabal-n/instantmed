"use client"

import { useState, useCallback, useRef, useEffect } from "react"
import { 
  MedCertIntakeFlow, 
  StepContent, 
  type IntakeStep 
} from "@/components/intake"
import { useRouter } from "next/navigation"
import { useAuth } from "@/components/providers/supabase-auth-provider"
import { 
  Search,
  Pill,
  X,
  Clock,
  Shield,
  ChevronRight,
  AlertCircle,
  HelpCircle,
  Phone,
  Calendar,
  Repeat,
  Sun,
  Zap,
  Smartphone,
  Mail,
  FileText,
  CheckCircle2,
  Lock,
  RefreshCw,
  Loader2
} from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { type Medication } from "@/lib/data/medications"
import { createRequestAndCheckoutAction } from "@/lib/stripe/checkout"
import { createGuestCheckoutAction } from "@/lib/stripe/guest-checkout"

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

// Define the steps for the repeat prescription flow
const STEPS: IntakeStep[] = [
  { id: "medication", title: "Your medication" },
  { id: "details", title: "The details" },
  { id: "history", title: "History" },
  { id: "safety", title: "Safety check" },
  { id: "auth", title: "Account" },
  { id: "checkout", title: "Checkout" },
]

// Popular/common medication requests (chips) - softer gradient styling
const POPULAR_MEDICATIONS = [
  { id: "contraceptive", label: "Contraceptive Pill", emoji: "💊", searchTerm: "contraceptive", color: "from-rose-50 to-pink-50 border-rose-200/60 hover:border-rose-300" },
  { id: "asthma", label: "Asthma Inhaler", emoji: "🌬️", searchTerm: "ventolin", color: "from-sky-50 to-cyan-50 border-sky-200/60 hover:border-sky-300" },
  { id: "bloodpressure", label: "Blood Pressure", emoji: "❤️", searchTerm: "blood pressure", color: "from-red-50 to-rose-50 border-red-200/60 hover:border-red-300" },
  { id: "cholesterol", label: "Cholesterol", emoji: "🫀", searchTerm: "statin", color: "from-orange-50 to-amber-50 border-orange-200/60 hover:border-orange-300" },
  { id: "thyroid", label: "Thyroid", emoji: "🦋", searchTerm: "thyroxine", color: "from-violet-50 to-purple-50 border-violet-200/60 hover:border-violet-300" },
  { id: "diabetes", label: "Diabetes", emoji: "📊", searchTerm: "metformin", color: "from-emerald-50 to-teal-50 border-emerald-200/60 hover:border-emerald-300" },
  { id: "reflux", label: "Reflux/Heartburn", emoji: "🔥", searchTerm: "omeprazole", color: "from-amber-50 to-yellow-50 border-amber-200/60 hover:border-amber-300" },
  { id: "anxiety", label: "Mental Health", emoji: "🧠", searchTerm: "sertraline", color: "from-indigo-50 to-blue-50 border-indigo-200/60 hover:border-indigo-300" },
]

// ============================================
// DEMO PAGE
// ============================================

export default function RepeatPrescriptionDemoPage() {
  const router = useRouter()
  const { isSignedIn, user, profile, signInWithGoogle, isLoading: authLoading } = useAuth()
  const [currentStep, setCurrentStep] = useState(0)
  
  // Medication search state
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedMedication, setSelectedMedication] = useState<Medication | null>(null)
  const [isSearchFocused, setIsSearchFocused] = useState(false)
  const [customMedicationName, setCustomMedicationName] = useState("")
  const [highlightedIndex, setHighlightedIndex] = useState(0)
  
  // Step 2: Dosage & Details state
  const [selectedStrength, setSelectedStrength] = useState<string | null>(null)
  const [customStrength, setCustomStrength] = useState("")
  const [showCustomStrength, setShowCustomStrength] = useState(false)
  const [frequency, setFrequency] = useState<string | null>(null)
  const [customFrequency, setCustomFrequency] = useState("")
  const [lastPrescribed, setLastPrescribed] = useState<string | null>(null)
  
  // Step 3: Safety Check state
  const [healthChanged, setHealthChanged] = useState(false)
  const [healthChangedDetails, setHealthChangedDetails] = useState("")
  const [newMedications, setNewMedications] = useState(false)
  const [newMedicationsDetails, setNewMedicationsDetails] = useState("")
  const [isPregnantOrBreastfeeding, setIsPregnantOrBreastfeeding] = useState(false)
  const [understandsRepeatOnly, setUnderstandsRepeatOnly] = useState(false)
  
  // Step 4: Auth state
  const [guestEmail, setGuestEmail] = useState("")
  const [authError, setAuthError] = useState<string | null>(null)
  const [isAuthenticating, setIsAuthenticating] = useState(false)
  
  // Step 5: Delivery & Checkout state
  const [mobileNumber, setMobileNumber] = useState("")
  const [email, setEmail] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  
  const searchInputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  
  // Auto-skip auth step if already signed in
  useEffect(() => {
    if (currentStep === 4 && isSignedIn && user && !authLoading) {
      // User is authenticated, auto-advance to checkout
      setTimeout(() => setCurrentStep(5), 500)
    }
  }, [currentStep, isSignedIn, user, authLoading])

  // API-based search results
  const [searchResults, setSearchResults] = useState<Array<{
    id: string
    medication_id: string
    label: string
    generic: string
    brand_names: string[]
    form: string
    strength: string
    category: string
    schedule: string | null
    is_common: boolean
  }>>([])
  const [isSearching, setIsSearching] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  
  // Debounced API search
  useEffect(() => {
    if (searchQuery.length < 2) {
      setSearchResults([])
      setSearchError(null)
      return
    }

    const controller = new AbortController()
    const timeoutId = setTimeout(async () => {
      setIsSearching(true)
      setSearchError(null)
      
      try {
        const res = await fetch(`/api/medications?q=${encodeURIComponent(searchQuery)}`, {
          signal: controller.signal
        })
        
        if (!res.ok) {
          throw new Error("Search failed")
        }
        
        const data = await res.json()
        
        if (data.blocked) {
          setSearchError(data.message)
          setSearchResults([])
        } else {
          // Flatten the nested arrays from the API
          const flattened = data.medications?.flat() || []
          setSearchResults(flattened)
        }
      } catch (err) {
        if (err instanceof Error && err.name !== "AbortError") {
          setSearchError("Search failed. Please try again.")
        }
      } finally {
        setIsSearching(false)
      }
    }, 300) // 300ms debounce

    return () => {
      clearTimeout(timeoutId)
      controller.abort()
    }
  }, [searchQuery])
  
  // Derive showNotFound from searchResults
  const showNotFound = searchQuery.length >= 2 && searchResults.length === 0 && !isSearching && !searchError

  // Advance to next step
  const advanceStep = useCallback(() => {
    setCurrentStep(prev => Math.min(prev + 1, STEPS.length - 1))
  }, [])

  const handleStepChange = (step: number, _direction: "forward" | "back") => {
    setCurrentStep(step)
  }

  const handleComplete = async () => {
    // Submit to Stripe checkout
    setIsSubmitting(true)
    setSubmitError(null)
    
    try {
      // Build the answers object for the request
      const answers = {
        medication_name: selectedMedication?.name,
        medication_display: searchQuery,
        strength: effectiveStrength,
        frequency: frequency === "other" ? customFrequency : frequency,
        last_prescribed: lastPrescribed,
        health_changed: healthChanged,
        health_changed_details: healthChangedDetails,
        new_medications: newMedications,
        new_medications_details: newMedicationsDetails,
        is_pregnant_or_breastfeeding: isPregnantOrBreastfeeding,
        mobile_number: mobileNumber,
        email: email || guestEmail,
      }
      
      let result
      
      if (isSignedIn && profile) {
        // Authenticated checkout
        result = await createRequestAndCheckoutAction({
          category: "prescription",
          subtype: "repeat",
          type: "repeat_script",
          answers,
        })
      } else {
        // Guest checkout with email
        result = await createGuestCheckoutAction({
          category: "prescription",
          subtype: "repeat",
          type: "repeat_script",
          answers,
          guestEmail: guestEmail || email,
        })
      }
      
      if (result.success && result.checkoutUrl) {
        // Redirect to Stripe checkout
        window.location.href = result.checkoutUrl
      } else {
        setSubmitError(result.error || "Something went wrong. Please try again.")
      }
    } catch (_err) {
      setSubmitError("Failed to create checkout session. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleExit = () => {
    router.push("/prescriptions")
  }

  const handleClose = () => {
    router.push("/")
  }
  
  // Handle Google sign in
  const handleGoogleSignIn = async () => {
    try {
      setIsAuthenticating(true)
      setAuthError(null)
      await signInWithGoogle(window.location.pathname + window.location.search)
    } catch (_err) {
      setAuthError("Failed to sign in with Google. Please try again.")
      setIsAuthenticating(false)
    }
  }
  
  // Handle email sign in redirect
  const handleEmailSignIn = () => {
    const returnUrl = encodeURIComponent(window.location.pathname + window.location.search)
    router.push(`/auth/login?redirect=${returnUrl}&flow=intake`)
  }

  // Handle medication selection from API results
  const handleSelectMedication = (apiMed: typeof searchResults[0]) => {
    // Convert API result to Medication format for compatibility
    const medication: Medication = {
      id: apiMed.medication_id,
      name: apiMed.generic,
      brandNames: apiMed.brand_names || [],
      strengths: [apiMed.strength], // Pre-select the chosen strength
      category: "other",
      commonUses: [apiMed.category],
      requiresCall: apiMed.schedule === "S8",
      schedule: apiMed.schedule ? parseInt(apiMed.schedule.replace("S", "")) : 4,
      searchTerms: [],
    }
    setSelectedMedication(medication)
    setSearchQuery(apiMed.label)
    setCustomMedicationName("")
    // Pre-select strength from API result
    setSelectedStrength(apiMed.strength)
  }

  // Handle popular chip click
  const handlePopularChipClick = (searchTerm: string) => {
    setSearchQuery(searchTerm)
    setHighlightedIndex(0)
    searchInputRef.current?.focus()
  }

  // Handle custom medication entry
  const handleCustomMedicationSubmit = () => {
    if (customMedicationName.trim()) {
      // Create a mock medication object for custom entry
      setSelectedMedication({
        id: "custom",
        name: customMedicationName.trim(),
        brandNames: [],
        strengths: [],
        category: "other",
        commonUses: ["Custom medication"],
        requiresCall: true,
        schedule: 4,
        searchTerms: [],
        notes: "This medication will be reviewed by our doctors."
      })
      setSearchQuery(customMedicationName.trim())
    }
  }

  // Clear selection
  const handleClearSelection = () => {
    setSelectedMedication(null)
    setSearchQuery("")
    setCustomMedicationName("")
    searchInputRef.current?.focus()
  }

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (searchResults.length === 0) return

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault()
        setHighlightedIndex(prev => (prev + 1) % searchResults.length)
        break
      case "ArrowUp":
        e.preventDefault()
        setHighlightedIndex(prev => (prev - 1 + searchResults.length) % searchResults.length)
        break
      case "Enter":
        e.preventDefault()
        if (searchResults[highlightedIndex]) {
          handleSelectMedication(searchResults[highlightedIndex])
        }
        break
      case "Escape":
        setIsSearchFocused(false)
        break
    }
  }

  // Get effective strength (either selected chip or custom)
  const effectiveStrength = showCustomStrength ? customStrength : selectedStrength
  
  // Simple mobile validation (Australian format)
  const isValidMobile = (num: string) => {
    const cleaned = num.replace(/\s/g, '')
    return /^04\d{8}$/.test(cleaned) || /^\+614\d{8}$/.test(cleaned)
  }
  
  // Simple email validation
  const isValidEmail = (emailStr: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailStr)
  }
  
  // Determine if user can continue based on current step
  const canContinue = (() => {
    switch (currentStep) {
      case 0: return !!selectedMedication // Must select a medication
      case 1: return !!effectiveStrength && !!frequency && !!lastPrescribed // Details step
      case 2: return true // History step (placeholder)
      case 3: return understandsRepeatOnly // Safety check - must acknowledge repeat-only
      case 4: return isSignedIn || isValidEmail(guestEmail) // Auth step - signed in or valid guest email
      case 5: return isValidMobile(mobileNumber) && isValidEmail(email || guestEmail) // Checkout
      default: return true
    }
  })()

  // Hide navigation on medication step, auth step and checkout (all have own CTAs)
  const hideNavigation = currentStep === 0 || currentStep === 4 || currentStep === 5
  
  // Hide progress bar on first step for cleaner intro
  const hideProgress = false

  return (
    <MedCertIntakeFlow
      steps={STEPS}
      currentStep={currentStep}
      onStepChange={handleStepChange}
      onComplete={handleComplete}
      onExit={handleExit}
      onClose={handleClose}
      canContinue={canContinue}
      continueLabel={currentStep === 5 ? "Pay $19.95" : undefined}
      hideNavigation={hideNavigation}
      hideProgress={hideProgress}
    >
      {(step) => {
        switch (step) {
          // ======= STEP 0: MEDICATION SEARCH =======
          case 0:
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
                    Refill time. What do you need? 💊
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Search for your medication. If it&apos;s your usual, we probably know it.
                  </p>
                </motion.div>

                {/* Search Input */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1, duration: 0.3 }}
                  className="relative"
                >
                  <div
                    className={cn(
                      "relative flex items-center gap-3 px-5 h-16 rounded-2xl border-2 transition-all duration-300",
                      "bg-white dark:bg-slate-900",
                      isSearchFocused
                        ? "border-primary shadow-[0_0_0_4px_rgba(37,99,235,0.1)] ring-4 ring-primary/10"
                        : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600",
                      selectedMedication && "border-green-300 dark:border-green-700 bg-green-50/50 dark:bg-green-900/10"
                    )}
                  >
                    <Search className={cn(
                      "w-5 h-5 transition-colors",
                      isSearchFocused ? "text-primary" : "text-muted-foreground"
                    )} />
                    
                    <input
                      ref={searchInputRef}
                      type="text"
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value)
                        setHighlightedIndex(0)
                        if (selectedMedication) {
                          setSelectedMedication(null)
                        }
                      }}
                      onFocus={() => setIsSearchFocused(true)}
                      onBlur={() => {
                        setTimeout(() => setIsSearchFocused(false), 200)
                      }}
                      onKeyDown={handleKeyDown}
                      placeholder="e.g. Lipitor, Ventolin, Panadol..."
                      className={cn(
                        "flex-1 bg-transparent border-none outline-none text-base sm:text-lg",
                        "placeholder:text-muted-foreground/60",
                        "text-foreground"
                      )}
                      disabled={!!selectedMedication}
                    />

                    {/* Loading spinner */}
                    {isSearching && (
                      <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                    )}

                    {(searchQuery || selectedMedication) && !isSearching && (
                      <motion.button
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        onClick={handleClearSelection}
                        className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center transition-colors"
                      >
                        <X className="w-4 h-4 text-muted-foreground" />
                      </motion.button>
                    )}
                  </div>

                  {/* Search Error (e.g., blocked medications) */}
                  <AnimatePresence>
                    {searchError && isSearchFocused && !selectedMedication && (
                      <motion.div
                        initial={{ opacity: 0, y: -10, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.98 }}
                        transition={{ duration: 0.2 }}
                        className={cn(
                          "absolute z-50 w-full mt-2 p-4",
                          "bg-red-50/95 dark:bg-red-900/20 backdrop-blur-xl",
                          "border border-red-200 dark:border-red-800",
                          "rounded-2xl shadow-lg"
                        )}
                      >
                        <div className="flex items-start gap-3">
                          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                          <p className="text-sm text-red-700 dark:text-red-300">{searchError}</p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Floating Glass Dropdown */}
                  <AnimatePresence>
                    {isSearchFocused && searchResults.length > 0 && !selectedMedication && !searchError && (
                      <motion.div
                        ref={dropdownRef}
                        initial={{ opacity: 0, y: -10, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.98 }}
                        transition={{ duration: 0.2 }}
                        className={cn(
                          "absolute z-50 w-full mt-2 overflow-hidden",
                          "bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl",
                          "border border-slate-200 dark:border-slate-700",
                          "rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.15)]",
                          "max-h-80 overflow-y-auto"
                        )}
                      >
                        {searchResults.slice(0, 10).map((med, index) => (
                          <motion.button
                            key={med.id}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.03 }}
                            onMouseDown={(e) => {
                              e.preventDefault()
                              handleSelectMedication(med)
                            }}
                            onMouseEnter={() => setHighlightedIndex(index)}
                            className={cn(
                              "w-full text-left px-4 py-3 transition-colors",
                              "border-b border-slate-100 dark:border-slate-800 last:border-b-0",
                              "first:rounded-t-2xl last:rounded-b-2xl",
                              highlightedIndex === index
                                ? "bg-gradient-to-r from-emerald-50/80 to-teal-50/80 dark:from-emerald-900/20 dark:to-teal-900/20"
                                : "hover:bg-slate-50 dark:hover:bg-slate-800/50"
                            )}
                          >
                            <div className="flex items-start gap-3">
                              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-900/40 dark:to-teal-900/40 flex items-center justify-center flex-shrink-0">
                                <Pill className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-0.5">
                                  <span className="font-semibold text-foreground">{med.generic}</span>
                                  <span className="text-xs text-muted-foreground">{med.strength}</span>
                                  {med.schedule === "S8" && (
                                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 font-medium">
                                      Call needed
                                    </span>
                                  )}
                                </div>
                                {med.brand_names && med.brand_names.length > 0 && (
                                  <p className="text-xs text-muted-foreground">
                                    {med.brand_names.slice(0, 3).join(", ")}
                                  </p>
                                )}
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  {med.form} • {med.category}
                                </p>
                              </div>
                              <ChevronRight className="w-4 h-4 text-muted-foreground mt-2" />
                            </div>
                          </motion.button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* "Not Found" State */}
                  <AnimatePresence>
                    {showNotFound && isSearchFocused && !selectedMedication && (
                      <motion.div
                        initial={{ opacity: 0, y: -10, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.98 }}
                        transition={{ duration: 0.2 }}
                        className={cn(
                          "absolute z-50 w-full mt-2 p-5",
                          "bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl",
                          "border border-slate-200 dark:border-slate-700",
                          "rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.15)]"
                        )}
                      >
                        {/* Fun header */}
                        <div className="flex items-start gap-3 mb-4">
                          <div className="w-12 h-12 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0">
                            <span className="text-2xl">🧐</span>
                          </div>
                          <div>
                            <h3 className="font-semibold text-foreground">
                              Computer says &quot;no&quot;?
                            </h3>
                            <p className="text-sm text-muted-foreground mt-1">
                              We couldn&apos;t match that exact name. No stress—just type it in manually below and our doctors will double-check it.
                            </p>
                          </div>
                        </div>

                        {/* Manual input */}
                        <div className="space-y-3">
                          <input
                            type="text"
                            value={customMedicationName}
                            onChange={(e) => setCustomMedicationName(e.target.value)}
                            placeholder="Type the medication name..."
                            className={cn(
                              "w-full px-4 py-3 rounded-xl border-2 border-slate-200 dark:border-slate-700",
                              "bg-white dark:bg-slate-800",
                              "text-foreground placeholder:text-muted-foreground/60",
                              "focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none",
                              "transition-all duration-200"
                            )}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && customMedicationName.trim()) {
                                handleCustomMedicationSubmit()
                              }
                            }}
                          />
                          <Button
                            onClick={handleCustomMedicationSubmit}
                            disabled={!customMedicationName.trim()}
                            className="w-full"
                          >
                            Use &quot;{customMedicationName || "..."}&quot;
                          </Button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>

                {/* Selected Medication Card */}
                <AnimatePresence>
                  {selectedMedication && (
                    <motion.div
                      initial={{ opacity: 0, y: 20, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -10, scale: 0.95 }}
                      transition={{ type: "spring", stiffness: 300, damping: 25 }}
                      className="p-5 bg-gradient-to-br from-green-50 to-emerald-50/50 dark:from-green-900/20 dark:to-emerald-900/10 border-2 border-green-200 dark:border-green-800 rounded-2xl"
                    >
                      <div className="flex items-start gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center flex-shrink-0 shadow-lg shadow-green-500/25">
                          <Pill className="w-7 h-7 text-white" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-bold text-lg text-foreground">
                              {selectedMedication.name}
                            </h3>
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center"
                            >
                              <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                            </motion.div>
                          </div>
                          
                          {selectedMedication.brandNames.length > 0 && (
                            <p className="text-sm text-muted-foreground mb-2">
                              Also known as: {selectedMedication.brandNames.join(", ")}
                            </p>
                          )}

                          {selectedMedication.strengths.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mb-2">
                              {selectedMedication.strengths.slice(0, 5).map((strength) => (
                                <span
                                  key={strength}
                                  className="text-xs px-2 py-1 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-muted-foreground"
                                >
                                  {strength}
                                </span>
                              ))}
                              {selectedMedication.strengths.length > 5 && (
                                <span className="text-xs px-2 py-1 text-muted-foreground">
                                  +{selectedMedication.strengths.length - 5} more
                                </span>
                              )}
                            </div>
                          )}

                          <p className="text-sm text-green-700 dark:text-green-400">
                            {selectedMedication.commonUses.slice(0, 2).join(" • ")}
                          </p>

                          {selectedMedication.notes && (
                            <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl">
                              <div className="flex items-start gap-2">
                                <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                                <p className="text-xs text-amber-700 dark:text-amber-300">
                                  {selectedMedication.notes}
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Popular Requests Chips */}
                {!selectedMedication && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2, duration: 0.3 }}
                    className="space-y-3"
                  >
                    <p className="text-sm font-medium text-muted-foreground">
                      Popular Requests
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {POPULAR_MEDICATIONS.map((med, index) => (
                        <motion.button
                          key={med.id}
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: 0.2 + index * 0.03 }}
                          whileHover={{ scale: 1.03, y: -2 }}
                          whileTap={{ scale: 0.97 }}
                          onClick={() => handlePopularChipClick(med.searchTerm)}
                          className={cn(
                            "inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full",
                            "bg-gradient-to-br border",
                            med.color,
                            "text-sm font-medium text-slate-700 dark:text-slate-200",
                            "shadow-sm hover:shadow-md",
                            "transition-all duration-200"
                          )}
                        >
                          <span>{med.emoji}</span>
                          <span>{med.label}</span>
                        </motion.button>
                      ))}
                    </div>
                  </motion.div>
                )}

                {/* Continue Button */}
                <AnimatePresence>
                  {selectedMedication && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ delay: 0.1, duration: 0.3 }}
                      className="space-y-3 pt-4"
                    >
                      <Button
                        onClick={advanceStep}
                        size="lg"
                        className={cn(
                          "w-full py-6 text-lg font-semibold",
                          "bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500",
                          "hover:from-emerald-600 hover:via-teal-600 hover:to-cyan-600",
                          "shadow-[0_8px_32px_rgba(16,185,129,0.35)]",
                          "hover:shadow-[0_12px_40px_rgba(16,185,129,0.45)]",
                          "hover:scale-[1.01] active:scale-[0.99]",
                          "transition-all duration-200"
                        )}
                      >
                        Continue with {selectedMedication.name}
                        <ChevronRight className="w-5 h-5 ml-2" />
                      </Button>

                      {/* Trust badges */}
                      <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-primary" />
                          ~2 min process
                        </span>
                        <span className="text-slate-300 dark:text-slate-600">•</span>
                        <span className="flex items-center gap-1.5">
                          <Shield className="w-3.5 h-3.5 text-green-500" />
                          Doctor verified
                        </span>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Help text when nothing selected */}
                {!selectedMedication && !isSearchFocused && searchQuery === "" && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4 }}
                    className="flex items-center justify-center gap-2 text-xs text-muted-foreground pt-4"
                  >
                    <HelpCircle className="w-3.5 h-3.5" />
                    <span>Can&apos;t find yours? Start typing and we&apos;ll help.</span>
                  </motion.div>
                )}
              </div>
            )

          // ======= STEP 1: THE DETAILS (Dosage & Frequency) =======
          case 1:
            // Get available strengths from selected medication
            const availableStrengths = selectedMedication?.strengths || []
            
            // Frequency options
            const frequencyOptions = [
              { id: "once", label: "Once daily", icon: Sun },
              { id: "twice", label: "Twice daily", icon: Repeat },
              { id: "asneeded", label: "As needed", icon: Zap },
              { id: "other", label: "Other", icon: Clock },
            ]
            
            // Last prescribed options
            const lastPrescribedOptions = [
              { 
                id: "1-3months", 
                label: "1-3 months ago", 
                emoji: "✅",
                description: "Recently prescribed",
                warning: false 
              },
              { 
                id: "3-6months", 
                label: "3-6 months ago", 
                emoji: "👍",
                description: "Still within range",
                warning: false 
              },
              { 
                id: "6-12months", 
                label: "6-12 months ago", 
                emoji: "📞",
                description: "May need a quick chat",
                warning: true 
              },
              { 
                id: "12plus", 
                label: "Over a year ago", 
                emoji: "🩺",
                description: "Doctor review required",
                warning: true 
              },
            ]

            return (
              <div className="space-y-8">
                {/* Header */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className="text-center"
                >
                  <h2 className="text-xl sm:text-2xl font-semibold text-foreground tracking-tight mb-2">
                    Got it. How do you take it? 📏
                  </h2>
                  {selectedMedication && (
                    <p className="text-sm text-muted-foreground">
                      Tell us about your <span className="font-medium text-primary">{selectedMedication.name}</span> prescription
                    </p>
                  )}
                </motion.div>

                {/* ===== SECTION 1: STRENGTH/DOSAGE ===== */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1, duration: 0.3 }}
                  className="space-y-3"
                >
                  <label className="text-sm font-medium text-foreground flex items-center gap-2">
                    <Pill className="w-4 h-4 text-primary" />
                    What strength is on the box?
                  </label>

                  {/* Smart Chips for available strengths */}
                  <div className="flex flex-wrap gap-2">
                    {availableStrengths.map((strength, index) => (
                      <motion.button
                        key={strength}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: index * 0.03 }}
                        whileHover={{ scale: 1.03, y: -2 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => {
                          setSelectedStrength(strength)
                          setShowCustomStrength(false)
                          setCustomStrength("")
                        }}
                        className={cn(
                          "px-4 py-2.5 rounded-full border text-sm font-semibold transition-all duration-200",
                          selectedStrength === strength && !showCustomStrength
                            ? "bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-400 shadow-md"
                            : "bg-gradient-to-br from-slate-50 to-white border-slate-200 dark:from-slate-800 dark:to-slate-900 dark:border-slate-700 text-foreground hover:border-slate-300 dark:hover:border-slate-600 hover:shadow-sm"
                        )}
                      >
                        {strength}
                      </motion.button>
                    ))}

                    {/* Custom strength option */}
                    <motion.button
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: availableStrengths.length * 0.03 }}
                      whileHover={{ scale: 1.03, y: -2 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => {
                        setShowCustomStrength(true)
                        setSelectedStrength(null)
                      }}
                      className={cn(
                        "px-4 py-2.5 rounded-full border text-sm font-semibold transition-all duration-200",
                        showCustomStrength
                          ? "bg-gradient-to-br from-violet-50 to-purple-50 border-violet-300 dark:border-violet-700 text-violet-700 dark:text-violet-400 shadow-md"
                          : "border-dashed bg-gradient-to-br from-slate-50 to-white border-slate-300 dark:from-slate-800 dark:to-slate-900 dark:border-slate-600 text-muted-foreground hover:border-slate-400 dark:hover:border-slate-500 hover:shadow-sm"
                      )}
                    >
                      Custom
                    </motion.button>
                  </div>

                  {/* Custom strength input */}
                  <AnimatePresence>
                    {showCustomStrength && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <input
                          type="text"
                          value={customStrength}
                          onChange={(e) => setCustomStrength(e.target.value)}
                          placeholder="e.g. 25mg, 100mcg..."
                          className={cn(
                            "w-full px-4 py-3 rounded-xl border-2",
                            "bg-white dark:bg-slate-900",
                            "border-slate-200 dark:border-slate-700",
                            "focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none",
                            "text-foreground placeholder:text-muted-foreground/60",
                            "transition-all duration-200"
                          )}
                          autoFocus
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>

                {/* ===== SECTION 2: FREQUENCY ===== */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2, duration: 0.3 }}
                  className="space-y-3"
                >
                  <label className="text-sm font-medium text-foreground flex items-center gap-2">
                    <Clock className="w-4 h-4 text-primary" />
                    How often?
                  </label>

                  {/* Segmented Control / Pill Toggle Row */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {frequencyOptions.map((option, index) => {
                      const Icon = option.icon
                      const isSelected = frequency === option.id
                      
                      // Different pastel colors for each option
                      const colors = [
                        { bg: "from-amber-50 to-orange-50", border: "border-amber-200 dark:border-amber-700", icon: "from-amber-400 to-orange-400", text: "text-amber-700 dark:text-amber-400" },
                        { bg: "from-sky-50 to-cyan-50", border: "border-sky-200 dark:border-sky-700", icon: "from-sky-400 to-cyan-400", text: "text-sky-700 dark:text-sky-400" },
                        { bg: "from-emerald-50 to-teal-50", border: "border-emerald-200 dark:border-emerald-700", icon: "from-emerald-400 to-teal-400", text: "text-emerald-700 dark:text-emerald-400" },
                        { bg: "from-violet-50 to-purple-50", border: "border-violet-200 dark:border-violet-700", icon: "from-violet-400 to-purple-400", text: "text-violet-700 dark:text-violet-400" },
                      ]
                      const color = colors[index]
                      
                      return (
                        <motion.button
                          key={option.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.2 + index * 0.05 }}
                          whileHover={{ scale: 1.02, y: -2 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => {
                            setFrequency(option.id)
                            if (option.id !== "other") {
                              setCustomFrequency("")
                            }
                          }}
                          className={cn(
                            "flex flex-col items-center gap-2 p-4 rounded-xl border transition-all duration-200",
                            isSelected
                              ? `bg-gradient-to-br ${color.bg} ${color.border} shadow-md`
                              : "bg-gradient-to-br from-slate-50 to-white dark:from-slate-800 dark:to-slate-900 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 hover:shadow-sm"
                          )}
                        >
                          <div className={cn(
                            "w-10 h-10 rounded-full flex items-center justify-center transition-colors",
                            isSelected
                              ? `bg-gradient-to-br ${color.icon} text-white shadow-sm`
                              : "bg-slate-100 dark:bg-slate-800 text-muted-foreground"
                          )}>
                            <Icon className="w-5 h-5" />
                          </div>
                          <span className={cn(
                            "text-xs font-medium text-center",
                            isSelected ? color.text : "text-foreground"
                          )}>
                            {option.label}
                          </span>
                        </motion.button>
                      )
                    })}
                  </div>

                  {/* Custom frequency input */}
                  <AnimatePresence>
                    {frequency === "other" && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <input
                          type="text"
                          value={customFrequency}
                          onChange={(e) => setCustomFrequency(e.target.value)}
                          placeholder="e.g. Three times daily, Every 8 hours..."
                          className={cn(
                            "w-full px-4 py-3 rounded-xl border-2",
                            "bg-white dark:bg-slate-900",
                            "border-slate-200 dark:border-slate-700",
                            "focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none",
                            "text-foreground placeholder:text-muted-foreground/60",
                            "transition-all duration-200"
                          )}
                          autoFocus
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>

                {/* ===== SECTION 3: LAST PRESCRIBED ===== */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3, duration: 0.3 }}
                  className="space-y-3"
                >
                  <label className="text-sm font-medium text-foreground flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-primary" />
                    When did you last have this prescribed?
                  </label>

                  {/* 4-grid of tactile cards */}
                  <div className="grid grid-cols-2 gap-3">
                    {lastPrescribedOptions.map((option, index) => {
                      const isSelected = lastPrescribed === option.id
                      
                      return (
                        <motion.button
                          key={option.id}
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: 0.3 + index * 0.05 }}
                          whileHover={{ scale: 1.02, y: -2 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => setLastPrescribed(option.id)}
                          className={cn(
                            "relative p-4 rounded-2xl border-2 text-left transition-all duration-200",
                            isSelected && !option.warning && "border-green-400 dark:border-green-600 bg-green-50/50 dark:bg-green-900/20",
                            isSelected && option.warning && "border-amber-400 dark:border-amber-600 bg-amber-50/50 dark:bg-amber-900/20",
                            !isSelected && "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
                          )}
                        >
                          {/* Selection indicator */}
                          {isSelected && (
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              className={cn(
                                "absolute top-3 right-3 w-5 h-5 rounded-full flex items-center justify-center",
                                option.warning ? "bg-amber-500" : "bg-green-500"
                              )}
                            >
                              <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                            </motion.div>
                          )}

                          <div className="text-2xl mb-2">{option.emoji}</div>
                          <p className={cn(
                            "font-semibold text-sm mb-1",
                            isSelected && !option.warning && "text-green-700 dark:text-green-400",
                            isSelected && option.warning && "text-amber-700 dark:text-amber-400",
                            !isSelected && "text-foreground"
                          )}>
                            {option.label}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {option.description}
                          </p>
                        </motion.button>
                      )
                    })}
                  </div>

                  {/* Warning for 6-12 months */}
                  <AnimatePresence>
                    {(lastPrescribed === "6-12months" || lastPrescribed === "12plus") && (
                      <motion.div
                        initial={{ opacity: 0, y: -10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.95 }}
                        className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl"
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center flex-shrink-0">
                            <Phone className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                          </div>
                          <div>
                            <p className="font-medium text-amber-800 dark:text-amber-200 text-sm">
                              Just a heads up 📞
                            </p>
                            <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                              {lastPrescribed === "6-12months" 
                                ? "The doctor might want a quick chat if it's been a while. Don't worry—it's usually just a few questions to make sure everything's still right for you."
                                : "Since it's been over a year, our doctor will definitely want to have a quick chat to review your medication. This is for your safety."
                              }
                            </p>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              </div>
            )

          case 2:
            return (
              <StepContent
                title="Prescription History"
                description="Help us understand your history with this medication."
              >
                <div className="p-6 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl text-center">
                  <Clock className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Step 3: How long have you been taking this?
                  </p>
                </div>
              </StepContent>
            )

          // ======= STEP 3: SAFETY CHECK (The Red Flags) =======
          case 3:
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
                    Just a few safety formalities. 🛡️
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    We need to make sure this medication is still safe for you.
                  </p>
                </motion.div>

                {/* Toggle List */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1, duration: 0.3 }}
                  className="space-y-3"
                >
                  {/* Toggle 1: Health Changes */}
                  <div className="space-y-3">
                    <div 
                      className={cn(
                        "flex items-center justify-between gap-4 p-4 rounded-xl border-2 transition-all duration-300",
                        healthChanged
                          ? "border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-900/10"
                          : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                      )}
                    >
                      <div className="flex-1">
                        <p className="text-sm font-medium text-foreground">
                          Has your health changed significantly since your last script?
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          e.g. new diagnoses, hospital visits, major symptoms
                        </p>
                      </div>
                      <Switch
                        checked={healthChanged}
                        onCheckedChange={setHealthChanged}
                        aria-label="Health changed significantly"
                        className="flex-shrink-0"
                      />
                    </div>

                    {/* Conditional textarea for health changes */}
                    <AnimatePresence>
                      {healthChanged && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.2 }}
                          className="pl-4 border-l-2 border-amber-300 dark:border-amber-700"
                        >
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-amber-700 dark:text-amber-400">
                              Briefly tell us what changed?
                            </label>
                            <p className="text-xs text-muted-foreground">
                              Don&apos;t worry, we just need to check this won&apos;t affect your medication.
                            </p>
                            <Textarea
                              value={healthChangedDetails}
                              onChange={(e) => setHealthChangedDetails(e.target.value)}
                              placeholder="e.g. I was diagnosed with high blood pressure last month..."
                              className={cn(
                                "min-h-[80px] resize-none rounded-xl border-2",
                                "border-amber-200 dark:border-amber-800",
                                "focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20",
                                "placeholder:text-muted-foreground/60"
                              )}
                            />
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Toggle 2: New Medications */}
                  <div className="space-y-3">
                    <div 
                      className={cn(
                        "flex items-center justify-between gap-4 p-4 rounded-xl border-2 transition-all duration-300",
                        newMedications
                          ? "border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-900/10"
                          : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                      )}
                    >
                      <div className="flex-1">
                        <p className="text-sm font-medium text-foreground">
                          Are you taking any other new medications?
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Including over-the-counter, supplements, or herbal
                        </p>
                      </div>
                      <Switch
                        checked={newMedications}
                        onCheckedChange={setNewMedications}
                        aria-label="Taking new medications"
                        className="flex-shrink-0"
                      />
                    </div>

                    {/* Conditional textarea for new medications */}
                    <AnimatePresence>
                      {newMedications && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.2 }}
                          className="pl-4 border-l-2 border-amber-300 dark:border-amber-700"
                        >
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-amber-700 dark:text-amber-400">
                              What are you taking?
                            </label>
                            <p className="text-xs text-muted-foreground">
                              We&apos;ll check for any interactions—better safe than sorry!
                            </p>
                            <Textarea
                              value={newMedicationsDetails}
                              onChange={(e) => setNewMedicationsDetails(e.target.value)}
                              placeholder="e.g. Started taking fish oil and vitamin D supplements..."
                              className={cn(
                                "min-h-[80px] resize-none rounded-xl border-2",
                                "border-amber-200 dark:border-amber-800",
                                "focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20",
                                "placeholder:text-muted-foreground/60"
                              )}
                            />
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Toggle 3: Pregnant/Breastfeeding */}
                  <div 
                    className={cn(
                      "flex items-center justify-between gap-4 p-4 rounded-xl border-2 transition-all duration-300",
                      isPregnantOrBreastfeeding
                        ? "border-pink-300 dark:border-pink-700 bg-pink-50/50 dark:bg-pink-900/10"
                        : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                    )}
                  >
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground">
                        Are you pregnant or breastfeeding?
                      </p>
                    </div>
                    <Switch
                      checked={isPregnantOrBreastfeeding}
                      onCheckedChange={setIsPregnantOrBreastfeeding}
                      aria-label="Pregnant or breastfeeding"
                      className="flex-shrink-0"
                    />
                  </div>

                  {/* Pregnancy warning */}
                  <AnimatePresence>
                    {isPregnantOrBreastfeeding && (
                      <motion.div
                        initial={{ opacity: 0, y: -10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.95 }}
                        className="p-4 bg-pink-50 dark:bg-pink-900/20 border border-pink-200 dark:border-pink-800 rounded-xl"
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-full bg-pink-100 dark:bg-pink-900/40 flex items-center justify-center flex-shrink-0">
                            <span className="text-lg">👶</span>
                          </div>
                          <div>
                            <p className="font-medium text-pink-800 dark:text-pink-200 text-sm">
                              Thanks for letting us know
                            </p>
                            <p className="text-xs text-pink-700 dark:text-pink-300 mt-1">
                              Our doctor will review your medication to ensure it&apos;s safe during pregnancy or breastfeeding.
                            </p>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Divider */}
                  <div className="py-2">
                    <div className="border-t border-dashed border-slate-200 dark:border-slate-700" />
                  </div>

                  {/* Toggle 4: Acknowledgment (Required ON) */}
                  <div 
                    className={cn(
                      "flex items-center justify-between gap-4 p-4 rounded-xl border-2 transition-all duration-300",
                      understandsRepeatOnly
                        ? "border-green-300 dark:border-green-700 bg-green-50/50 dark:bg-green-900/10"
                        : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                    )}
                  >
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground">
                        I understand this is strictly for a repeat of a stable medication, not a new issue.
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        For new health concerns, please book a full consultation.
                      </p>
                    </div>
                    <Switch
                      checked={understandsRepeatOnly}
                      onCheckedChange={setUnderstandsRepeatOnly}
                      aria-label="Understands repeat only"
                      className="flex-shrink-0"
                    />
                  </div>
                </motion.div>

                {/* Validation hint */}
                <AnimatePresence>
                  {!understandsRepeatOnly && (
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="text-center text-xs text-muted-foreground"
                    >
                      Toggle the acknowledgment above to continue
                    </motion.p>
                  )}
                </AnimatePresence>

                {/* Summary of flagged items */}
                <AnimatePresence>
                  {(healthChanged || newMedications || isPregnantOrBreastfeeding) && understandsRepeatOnly && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center flex-shrink-0">
                          <AlertCircle className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                          <p className="font-medium text-blue-800 dark:text-blue-200 text-sm">
                            Our doctor will review this
                          </p>
                          <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                            We&apos;ve noted your responses. The prescribing doctor will take them into account when reviewing your request.
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )

          // ======= STEP 4: AUTH =======
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
                  <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-primary/80 mb-4 shadow-lg shadow-primary/20">
                    <Shield className="h-7 w-7 text-primary-foreground" />
                  </div>
                  <h2 className="text-xl sm:text-2xl font-semibold text-foreground tracking-tight mb-2">
                    Almost there! 🎉
                  </h2>
                  <p className="text-sm text-muted-foreground max-w-md mx-auto">
                    Create an account or sign in to complete your prescription request
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
                      onClick={() => setCurrentStep(5)}
                      size="lg"
                      className={cn(
                        "px-8 py-6 text-lg font-semibold",
                        "bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500",
                        "hover:from-emerald-600 hover:via-teal-600 hover:to-cyan-600",
                        "shadow-[0_8px_32px_rgba(16,185,129,0.35)]",
                        "transition-all duration-200"
                      )}
                    >
                      Continue to Checkout
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
                          We&apos;ll send your eScript and updates here.
                        </p>
                      </div>

                      <Button
                        onClick={() => setCurrentStep(5)}
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

          // ======= STEP 5: DELIVERY & CHECKOUT =======
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
                    Where are we sending this? 📲
                  </h2>
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

                {/* Product Card (Glassy) */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1, duration: 0.3 }}
                  className={cn(
                    "relative overflow-hidden rounded-2xl",
                    "bg-gradient-to-br from-white/80 via-white/60 to-slate-50/80",
                    "dark:from-slate-900/80 dark:via-slate-800/60 dark:to-slate-900/80",
                    "backdrop-blur-xl",
                    "border border-white/50 dark:border-white/10",
                    "shadow-[0_8px_32px_rgba(0,0,0,0.08)]"
                  )}
                >
                  {/* Decorative gradient blob */}
                  <div className="absolute -top-20 -right-20 w-40 h-40 bg-gradient-to-br from-primary/20 to-cyan-500/20 rounded-full blur-3xl" />
                  
                  <div className="relative p-5">
                    <div className="flex items-start gap-4">
                      {/* Icon */}
                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-primary/25">
                        <FileText className="w-7 h-7 text-white" />
                      </div>
                      
                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <h3 className="font-bold text-lg text-foreground">
                            {selectedMedication?.name || "Medication"}
                          </h3>
                          <span className="text-sm text-muted-foreground">
                            {effectiveStrength}
                          </span>
                        </div>
                        
                        {/* Frequency */}
                        <p className="text-sm text-muted-foreground mb-3">
                          {frequency === "once" && "Once daily"}
                          {frequency === "twice" && "Twice daily"}
                          {frequency === "asneeded" && "As needed"}
                          {frequency === "other" && customFrequency}
                        </p>
                        
                        {/* eScript Badge */}
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-100 dark:bg-green-900/30 border border-green-200 dark:border-green-800">
                          <Smartphone className="w-4 h-4 text-green-600 dark:text-green-400" />
                          <span className="text-sm font-medium text-green-700 dark:text-green-400">
                            eScript Token (SMS)
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>

                {/* Contact Details (Glass Panel) */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2, duration: 0.3 }}
                  className={cn(
                    "rounded-2xl p-5 space-y-4",
                    "bg-gradient-to-br from-slate-50/80 to-white/60",
                    "dark:from-slate-800/50 dark:to-slate-900/50",
                    "backdrop-blur-sm",
                    "border border-slate-200/50 dark:border-slate-700/50"
                  )}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Smartphone className="w-4 h-4 text-primary" />
                    <h3 className="font-semibold text-foreground text-sm">Contact Details</h3>
                  </div>
                  
                  <p className="text-xs text-muted-foreground -mt-2">
                    We&apos;ll SMS the token to this number instantly after approval.
                  </p>

                  {/* Mobile Number */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">
                      Mobile Number
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <input
                        type="tel"
                        value={mobileNumber}
                        onChange={(e) => setMobileNumber(e.target.value)}
                        placeholder="0412 345 678"
                        className={cn(
                          "w-full pl-11 pr-4 py-3 rounded-xl border-2",
                          "bg-white dark:bg-slate-900",
                          "text-foreground placeholder:text-muted-foreground/60",
                          "transition-all duration-200",
                          isValidMobile(mobileNumber)
                            ? "border-green-300 dark:border-green-700 focus:border-green-400 focus:ring-2 focus:ring-green-400/20"
                            : "border-slate-200 dark:border-slate-700 focus:border-primary focus:ring-2 focus:ring-primary/20",
                          "focus:outline-none"
                        )}
                      />
                      {isValidMobile(mobileNumber) && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="absolute right-4 top-1/2 -translate-y-1/2"
                        >
                          <CheckCircle2 className="w-5 h-5 text-green-500" />
                        </motion.div>
                      )}
                    </div>
                  </div>

                  {/* Email */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        className={cn(
                          "w-full pl-11 pr-4 py-3 rounded-xl border-2",
                          "bg-white dark:bg-slate-900",
                          "text-foreground placeholder:text-muted-foreground/60",
                          "transition-all duration-200",
                          isValidEmail(email)
                            ? "border-green-300 dark:border-green-700 focus:border-green-400 focus:ring-2 focus:ring-green-400/20"
                            : "border-slate-200 dark:border-slate-700 focus:border-primary focus:ring-2 focus:ring-primary/20",
                          "focus:outline-none"
                        )}
                      />
                      {isValidEmail(email) && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="absolute right-4 top-1/2 -translate-y-1/2"
                        >
                          <CheckCircle2 className="w-5 h-5 text-green-500" />
                        </motion.div>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      We&apos;ll send a receipt and updates here.
                    </p>
                  </div>
                </motion.div>

                {/* No Call Promise Banner */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3, duration: 0.3 }}
                  className="flex items-center gap-3 p-4 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800"
                >
                  <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/40 flex items-center justify-center flex-shrink-0">
                    <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <p className="font-medium text-green-800 dark:text-green-200 text-sm">
                      No phone call needed for most repeats
                    </p>
                    <p className="text-xs text-green-700 dark:text-green-300 mt-0.5">
                      Your script will be reviewed and sent directly to your phone.
                    </p>
                  </div>
                </motion.div>

                {/* Price & Checkout */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4, duration: 0.3 }}
                  className="space-y-4"
                >
                  {/* Price Card */}
                  <div className="flex justify-between items-center p-4 bg-gradient-to-r from-primary/5 to-blue-500/5 rounded-xl border border-primary/10">
                    <div>
                      <p className="text-sm text-muted-foreground">Total</p>
                      <p className="text-3xl font-bold text-foreground">$19.95</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Includes</p>
                      <p className="text-sm font-medium text-foreground">Doctor review + eScript</p>
                    </div>
                  </div>

                  {/* CTA Button */}
                  <Button
                    onClick={handleComplete}
                    disabled={!canContinue || isSubmitting}
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
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Lock className="w-5 h-5 mr-2" />
                        Pay & Request Script
                        <span className="ml-2 text-white/80">$19.95</span>
                      </>
                    )}
                  </Button>

                  {/* Refund Guarantee Footer */}
                  <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>If the doctor can&apos;t prescribe it, you get a full refund. No stress.</span>
                  </div>

                  {/* Trust Badges */}
                  <div className="flex items-center justify-center gap-4 pt-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Shield className="w-3.5 h-3.5 text-green-500" />
                      AHPRA Doctors
                    </span>
                    <span>•</span>
                    <span>SSL Encrypted</span>
                    <span>•</span>
                    <span>Stripe Secure</span>
                  </div>
                </motion.div>
              </div>
            )

          default:
            return null
        }
      }}
    </MedCertIntakeFlow>
  )
}

