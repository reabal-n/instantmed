"use client"

import type React from "react"

import { useState, useMemo, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { 
  ArrowLeft, 
  ArrowRight, 
  Check, 
  Phone, 
  MapPin, 
  CreditCard, 
  Shield, 
  AlertTriangle,
  Clock,
  HelpCircle,
  Sparkles,
  CheckCircle2,
  X
} from "lucide-react"
import { completeOnboardingAction } from "./actions"
import type { AustralianState } from "@/types/db"
import { validateMedicareNumber, validateMedicareExpiry } from "@/lib/validation/medicare"
import { Tooltip, TooltipProvider, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

interface OnboardingFlowProps {
  profileId: string
  fullName: string
  redirectTo?: string
}

const STATES: AustralianState[] = ["ACT", "NSW", "NT", "QLD", "SA", "TAS", "VIC", "WA"]
const IRNS = [1, 2, 3, 4, 5, 6, 7, 8, 9]
const MONTHS = [
  { value: "01", label: "Jan" },
  { value: "02", label: "Feb" },
  { value: "03", label: "Mar" },
  { value: "04", label: "Apr" },
  { value: "05", label: "May" },
  { value: "06", label: "Jun" },
  { value: "07", label: "Jul" },
  { value: "08", label: "Aug" },
  { value: "09", label: "Sep" },
  { value: "10", label: "Oct" },
  { value: "11", label: "Nov" },
  { value: "12", label: "Dec" },
]

// Helper to generate years - called inside component to avoid hydration mismatch
function generateYears() {
  const currentYear = new Date().getFullYear()
  return Array.from({ length: 11 }, (_, i) => currentYear + i)
}

// Storage key for persisting form data
const STORAGE_KEY = "instantmed_onboarding_draft"

export function OnboardingFlow({ profileId, fullName, redirectTo }: OnboardingFlowProps) {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [isHydrated, setIsHydrated] = useState(false)
  const [showMedicareHelper, setShowMedicareHelper] = useState(false)
  
  // Generate years array on client to avoid hydration mismatch
  const YEARS = useMemo(() => generateYears(), [])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expiryWarning, setExpiryWarning] = useState<string | null>(null)

  // Step 1: Contact & Address
  const [phone, setPhone] = useState("")
  const [addressLine1, setAddressLine1] = useState("")
  const [suburb, setSuburb] = useState("")
  const [state, setState] = useState<AustralianState | null>(null)
  const [postcode, setPostcode] = useState("")

  // Step 2: Medicare & Consent
  const [medicareNumber, setMedicareNumber] = useState("")
  const [irn, setIrn] = useState<number | null>(null)
  const [expiryMonth, setExpiryMonth] = useState<string | null>(null)
  const [expiryYear, setExpiryYear] = useState<number | null>(null)
  const [consentMyhr, setConsentMyhr] = useState(false)

  // Validation
  const [step1Errors, setStep1Errors] = useState<Record<string, string>>({})
  const [step2Errors, setStep2Errors] = useState<Record<string, string>>({})
  const [medicareValid, setMedicareValid] = useState(false)

  const firstName = fullName.split(" ")[0]

  // Load saved progress from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const data = JSON.parse(saved)
        if (data.profileId === profileId) {
          setPhone(data.phone || "")
          setAddressLine1(data.addressLine1 || "")
          setSuburb(data.suburb || "")
          setState(data.state || null)
          setPostcode(data.postcode || "")
          setMedicareNumber(data.medicareNumber || "")
          setIrn(data.irn || null)
          setExpiryMonth(data.expiryMonth || null)
          setExpiryYear(data.expiryYear || null)
          setConsentMyhr(data.consentMyhr || false)
          // Resume at step 2 if step 1 was completed
          if (data.phone && data.addressLine1 && data.suburb && data.state && data.postcode) {
            setStep(2)
          }
        }
      }
    } catch {
      // Ignore localStorage errors
    }
    setIsHydrated(true)
  }, [profileId])

  // Save progress to localStorage
  const saveProgress = useCallback(() => {
    try {
      const data = {
        profileId,
        phone,
        addressLine1,
        suburb,
        state,
        postcode,
        medicareNumber,
        irn,
        expiryMonth,
        expiryYear,
        consentMyhr,
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    } catch {
      // Ignore localStorage errors
    }
  }, [profileId, phone, addressLine1, suburb, state, postcode, medicareNumber, irn, expiryMonth, expiryYear, consentMyhr])

  // Auto-save on changes
  useEffect(() => {
    if (isHydrated) {
      saveProgress()
    }
  }, [isHydrated, saveProgress])

  // Clear saved progress on successful completion
  const clearSavedProgress = () => {
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch {
      // Ignore localStorage errors
    }
  }

  // Format phone number as user types
  const formatPhoneNumber = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 10)
    if (digits.length <= 4) return digits
    if (digits.length <= 7) return `${digits.slice(0, 4)} ${digits.slice(4)}`
    return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`
  }

  const handlePhoneChange = (value: string) => {
    setPhone(formatPhoneNumber(value))
    // Clear error on change
    if (step1Errors.phone) {
      setStep1Errors(prev => {
        const { phone, ...rest } = prev
        return rest
      })
    }
  }

  // Format Medicare number with spaces (xxxx xxxxx x)
  const formatMedicareNumber = (value: string): string => {
    const digits = value.replace(/\D/g, "").slice(0, 10)
    if (digits.length <= 4) return digits
    if (digits.length <= 9) return `${digits.slice(0, 4)} ${digits.slice(4)}`
    return `${digits.slice(0, 4)} ${digits.slice(4, 9)} ${digits.slice(9)}`
  }

  const handleMedicareChange = (value: string) => {
    const formatted = formatMedicareNumber(value)
    setMedicareNumber(formatted)
    
    // Validate as user types
    const raw = formatted.replace(/\s/g, "")
    if (raw.length === 10) {
      const validation = validateMedicareNumber(raw)
      setMedicareValid(validation.valid)
      if (!validation.valid) {
        setStep2Errors(prev => ({ ...prev, medicare: validation.error || "Invalid Medicare number" }))
      } else {
        setStep2Errors(prev => {
          const { medicare, ...rest } = prev
          return rest
        })
      }
    } else {
      setMedicareValid(false)
      // Clear error when user is still typing
      if (step2Errors.medicare) {
        setStep2Errors(prev => {
          const { medicare, ...rest } = prev
          return rest
        })
      }
    }
  }

  const validateStep1 = () => {
    const errors: Record<string, string> = {}
    const phoneDigits = phone.replace(/\D/g, "")
    
    if (!phoneDigits) {
      errors.phone = "Phone number is required"
    } else if (phoneDigits.length < 10) {
      errors.phone = "Enter a valid 10-digit phone number"
    } else if (!phoneDigits.startsWith("04") && !phoneDigits.startsWith("02") && !phoneDigits.startsWith("03") && !phoneDigits.startsWith("07") && !phoneDigits.startsWith("08")) {
      errors.phone = "Enter a valid Australian phone number"
    }
    
    if (!addressLine1.trim()) errors.addressLine1 = "Address is required"
    if (!suburb.trim()) errors.suburb = "Suburb is required"
    if (!state) errors.state = "State is required"
    if (!postcode.trim()) errors.postcode = "Postcode is required"
    else if (!/^\d{4}$/.test(postcode)) errors.postcode = "Enter a valid 4-digit postcode"
    
    setStep1Errors(errors)
    return Object.keys(errors).length === 0
  }

  const validateStep2 = () => {
    const errors: Record<string, string> = {}
    const rawMedicare = medicareNumber.replace(/\s/g, "")

    const medicareValidation = validateMedicareNumber(rawMedicare)
    if (!medicareValidation.valid) {
      errors.medicare = medicareValidation.error || "Invalid Medicare number"
    }

    if (!irn) errors.irn = "Select your IRN"

    if (!expiryMonth || !expiryYear) {
      errors.expiry = "Select expiry date"
    } else {
      const expiryDate = `${expiryYear}-${expiryMonth}-01`
      const expiryValidation = validateMedicareExpiry(expiryDate)

      if (!expiryValidation.valid) {
        errors.expiry = expiryValidation.error || "Invalid expiry date"
      } else if (expiryValidation.isExpiringSoon) {
        setExpiryWarning("Your Medicare card is expiring soon. Please update it after this visit.")
      } else {
        setExpiryWarning(null)
      }
    }

    setStep2Errors(errors)
    return Object.keys(errors).length === 0
  }

  const handleNext = () => {
    if (validateStep1()) {
      setStep(2)
      window.scrollTo(0, 0)
    }
  }

  const handleBack = () => {
    setStep(1)
    window.scrollTo(0, 0)
  }

  const handleSubmit = async () => {
    if (!validateStep2()) return

    setIsSubmitting(true)
    setError(null)

    const rawMedicare = medicareNumber.replace(/\s/g, "")
    const medicareExpiry = `${expiryYear}-${expiryMonth}-01`

    const result = await completeOnboardingAction(profileId, {
      phone: phone.replace(/\s/g, ""),
      address_line1: addressLine1,
      suburb,
      state: state!,
      postcode,
      medicare_number: rawMedicare,
      medicare_irn: irn!,
      medicare_expiry: medicareExpiry,
      consent_myhr: consentMyhr,
    })

    if (result.error) {
      setError(result.error)
      setIsSubmitting(false)
    } else {
      clearSavedProgress()
      const destination = redirectTo || "/patient?onboarded=true"
      router.push(destination.includes("?") ? `${destination}&onboarded=true` : `${destination}?onboarded=true`)
    }
  }

  // Calculate completion percentage
  const getCompletionPercentage = () => {
    let completed = 0
    const total = 9 // Total fields

    if (phone.replace(/\D/g, "").length >= 10) completed++
    if (addressLine1.trim()) completed++
    if (suburb.trim()) completed++
    if (state) completed++
    if (postcode.trim().length === 4) completed++
    if (medicareNumber.replace(/\s/g, "").length === 10) completed++
    if (irn) completed++
    if (expiryMonth && expiryYear) completed++
    // Consent is optional, so we don't count it

    return Math.round((completed / total) * 100)
  }

  return (
    <TooltipProvider>
      <div className="min-h-[80vh] flex flex-col items-center justify-center px-4 py-8">
        {/* Header with time estimate */}
        <div 
          className="w-full max-w-md mb-4 flex items-center justify-between text-sm animate-fade-in-up opacity-0"
          style={{ animationDelay: "0.05s", animationFillMode: "forwards" }}
        >
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="w-4 h-4" />
            <span>About 2 min to complete</span>
          </div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-primary font-medium">{getCompletionPercentage()}%</span>
          </div>
        </div>

        {/* Progress indicator */}
        <div
          className="w-full max-w-md mb-8 animate-fade-in-up opacity-0"
          style={{ animationDelay: "0.1s", animationFillMode: "forwards" }}
        >
          <div className="flex items-center justify-center gap-3">
            <div
              className={`flex items-center justify-center w-10 h-10 rounded-full text-sm font-semibold transition-all duration-300 ${
                step >= 1
                  ? "bg-primary text-primary-foreground shadow-lg shadow-primary/30"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {step > 1 ? <Check className="w-5 h-5" /> : "1"}
            </div>
            <div
              className={`h-1 w-16 rounded-full transition-all duration-300 ${step >= 2 ? "bg-primary" : "bg-muted"}`}
            />
            <div
              className={`flex items-center justify-center w-10 h-10 rounded-full text-sm font-semibold transition-all duration-300 ${
                step >= 2
                  ? "bg-primary text-primary-foreground shadow-lg shadow-primary/30"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              2
            </div>
          </div>
          <div className="flex justify-between mt-2 text-xs text-muted-foreground px-1">
            <span className={step === 1 ? "text-primary font-medium" : ""}>Contact & Address</span>
            <span className={step === 2 ? "text-primary font-medium" : ""}>Medicare & Consent</span>
          </div>
        </div>

        {/* Step 1: Contact & Address */}
        {step === 1 && (
          <div
            className="w-full max-w-md glass-card rounded-3xl p-8 animate-fade-in-up opacity-0"
            style={{ animationDelay: "0.2s", animationFillMode: "forwards" }}
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2.5 rounded-xl bg-primary/10">
                <MapPin className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-foreground">Hi {firstName}, let's get you set up</h2>
                <p className="text-sm text-muted-foreground">We need a few details to complete your profile</p>
              </div>
            </div>

            <div className="space-y-5">
              {/* Phone */}
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-sm font-medium">
                  Phone number
                </Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="0412 345 678"
                    value={phone}
                    onChange={(e) => handlePhoneChange(e.target.value)}
                    className={`pl-10 h-12 rounded-xl bg-white/50 border-white/40 focus:border-primary/50 focus:bg-white/80 transition-all ${
                      step1Errors.phone ? "border-red-400" : phone.replace(/\D/g, "").length >= 10 ? "border-green-400" : ""
                    }`}
                  />
                  {phone.replace(/\D/g, "").length >= 10 && !step1Errors.phone && (
                    <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-green-500" />
                  )}
                </div>
                {step1Errors.phone && <p className="text-xs text-red-500">{step1Errors.phone}</p>}
              </div>

              {/* Address Line 1 */}
              <div className="space-y-2">
                <Label htmlFor="address" className="text-sm font-medium">
                  Street address
                </Label>
                <Input
                  id="address"
                  placeholder="123 Example Street"
                  value={addressLine1}
                  onChange={(e) => {
                    setAddressLine1(e.target.value)
                    if (step1Errors.addressLine1) {
                      setStep1Errors(prev => {
                        const { addressLine1, ...rest } = prev
                        return rest
                      })
                    }
                  }}
                  className={`h-12 rounded-xl bg-white/50 border-white/40 focus:border-primary/50 focus:bg-white/80 transition-all ${
                    step1Errors.addressLine1 ? "border-red-400" : ""
                  }`}
                />
                {step1Errors.addressLine1 && <p className="text-xs text-red-500">{step1Errors.addressLine1}</p>}
              </div>

              {/* Suburb & Postcode Row */}
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2 space-y-2">
                  <Label htmlFor="suburb" className="text-sm font-medium">
                    Suburb
                  </Label>
                  <Input
                    id="suburb"
                    placeholder="Sydney"
                    value={suburb}
                    onChange={(e) => {
                      setSuburb(e.target.value)
                      if (step1Errors.suburb) {
                        setStep1Errors(prev => {
                          const { suburb, ...rest } = prev
                          return rest
                        })
                      }
                    }}
                    className={`h-12 rounded-xl bg-white/50 border-white/40 focus:border-primary/50 focus:bg-white/80 transition-all ${
                      step1Errors.suburb ? "border-red-400" : ""
                    }`}
                  />
                  {step1Errors.suburb && <p className="text-xs text-red-500">{step1Errors.suburb}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="postcode" className="text-sm font-medium">
                    Postcode
                  </Label>
                  <Input
                    id="postcode"
                    placeholder="2000"
                    maxLength={4}
                    inputMode="numeric"
                    value={postcode}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, "").slice(0, 4)
                      setPostcode(value)
                      if (step1Errors.postcode) {
                        setStep1Errors(prev => {
                          const { postcode, ...rest } = prev
                          return rest
                        })
                      }
                    }}
                    className={`h-12 rounded-xl bg-white/50 border-white/40 focus:border-primary/50 focus:bg-white/80 transition-all ${
                      step1Errors.postcode ? "border-red-400" : ""
                    }`}
                  />
                  {step1Errors.postcode && <p className="text-xs text-red-500">{step1Errors.postcode}</p>}
                </div>
              </div>

              {/* State - Pill Grid */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">State</Label>
                <div className="grid grid-cols-4 gap-2">
                  {STATES.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => {
                        setState(s)
                        if (step1Errors.state) {
                          setStep1Errors(prev => {
                            const { state, ...rest } = prev
                            return rest
                          })
                        }
                      }}
                      className={`py-2.5 px-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                        state === s
                          ? "bg-primary text-primary-foreground shadow-md shadow-primary/25"
                          : "bg-white/50 text-foreground hover:bg-white/80 border border-white/40"
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
                {step1Errors.state && <p className="text-xs text-red-500">{step1Errors.state}</p>}
              </div>
            </div>

            <Button onClick={handleNext} className="w-full mt-8 h-12 rounded-xl btn-glow text-base font-medium">
              Next
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Step 2: Medicare & Consent */}
        {step === 2 && (
          <div
            className="w-full max-w-md glass-card rounded-3xl p-8 animate-fade-in-up opacity-0"
            style={{ animationDelay: "0.1s", animationFillMode: "forwards" }}
          >
            <div className="flex items-center justify-between gap-3 mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-primary/10">
                  <CreditCard className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-foreground">Medicare details</h2>
                  <p className="text-sm text-muted-foreground">Required for prescriptions and referrals</p>
                </div>
              </div>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button 
                    type="button"
                    onClick={() => setShowMedicareHelper(true)}
                    className="p-2 rounded-lg hover:bg-white/50 transition-colors"
                    aria-label="Where to find this"
                  >
                    <HelpCircle className="w-5 h-5 text-muted-foreground" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="left">
                  <p className="text-xs">Click to see where to find these details</p>
                </TooltipContent>
              </Tooltip>
            </div>

            {/* Medicare Card Helper Modal */}
            {showMedicareHelper && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
                <div className="w-full max-w-sm bg-white rounded-2xl p-6 shadow-2xl animate-scale-in">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold">Finding your Medicare details</h3>
                    <button
                      onClick={() => setShowMedicareHelper(false)}
                      className="p-1 rounded-lg hover:bg-muted transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  
                  {/* Medicare card illustration */}
                  <div className="relative bg-gradient-to-r from-green-500 to-green-600 rounded-xl p-4 text-white mb-4 aspect-[1.6/1]">
                    <div className="absolute top-3 left-4 text-xs font-medium opacity-80">Medicare</div>
                    <div className="absolute top-1/2 left-4 -translate-y-1/2">
                      <div className="text-xs opacity-80 mb-1">Card Number</div>
                      <div className="text-lg font-mono font-bold tracking-wider">
                        <span className="bg-yellow-400/30 px-1 rounded">1234</span>{" "}
                        <span className="bg-yellow-400/30 px-1 rounded">56789</span>{" "}
                        <span className="bg-yellow-400/30 px-1 rounded">0</span>
                      </div>
                    </div>
                    <div className="absolute bottom-3 left-4 text-xs">
                      <div className="opacity-80">1. JOHN SMITH</div>
                      <div className="opacity-60">2. JANE SMITH</div>
                    </div>
                    <div className="absolute bottom-3 right-4 text-right">
                      <div className="text-xs opacity-80">Valid to</div>
                      <div className="text-sm font-medium">
                        <span className="bg-blue-400/30 px-1 rounded">01/2026</span>
                      </div>
                    </div>
                    <div className="absolute top-3 right-4">
                      <div className="text-xs opacity-80">IRN</div>
                      <div className="text-sm font-bold">
                        <span className="bg-purple-400/30 px-1 rounded">1</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-3 text-sm text-muted-foreground">
                    <div className="flex items-start gap-2">
                      <div className="w-3 h-3 rounded-full bg-yellow-400 mt-1 flex-shrink-0" />
                      <p><strong>Card Number:</strong> The 10-digit number in the center</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <div className="w-3 h-3 rounded-full bg-purple-400 mt-1 flex-shrink-0" />
                      <p><strong>IRN:</strong> The number (1-9) next to your name on the card</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <div className="w-3 h-3 rounded-full bg-blue-400 mt-1 flex-shrink-0" />
                      <p><strong>Expiry:</strong> The "Valid to" date at the bottom right</p>
                    </div>
                  </div>
                  
                  <Button 
                    onClick={() => setShowMedicareHelper(false)} 
                    className="w-full mt-4 rounded-xl"
                  >
                    Got it
                  </Button>
                </div>
              </div>
            )}

            {error && (
              <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-600">{error}</div>
            )}

            {expiryWarning && (
              <div className="mb-6 p-4 rounded-xl bg-amber-50 border border-amber-200 text-sm text-amber-700 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{expiryWarning}</span>
              </div>
            )}

            <div className="space-y-6">
              {/* Medicare Number - Single input with auto-formatting */}
              <div className="space-y-2">
                <Label htmlFor="medicare" className="text-sm font-medium">Medicare number</Label>
                <div className="relative">
                  <Input
                    id="medicare"
                    type="text"
                    inputMode="numeric"
                    placeholder="1234 56789 0"
                    value={medicareNumber}
                    onChange={(e) => handleMedicareChange(e.target.value)}
                    className={`h-12 text-lg font-mono tracking-wider rounded-xl bg-white/50 border-white/40 focus:border-primary/50 focus:bg-white/80 transition-all pr-12 ${
                      step2Errors.medicare ? "border-red-400" : medicareValid ? "border-green-400" : ""
                    }`}
                  />
                  {medicareValid && (
                    <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-green-500" />
                  )}
                </div>
                <p className="text-xs text-muted-foreground">Enter the 10-digit number from your card</p>
                {step2Errors.medicare && <p className="text-xs text-red-500">{step2Errors.medicare}</p>}
              </div>

              {/* IRN - Pill Selector */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label className="text-sm font-medium">IRN (Individual Reference Number)</Label>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button type="button" className="p-0.5 rounded-full hover:bg-muted">
                        <HelpCircle className="w-3.5 h-3.5 text-muted-foreground" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs">The number (1-9) next to your name on the card</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <div className="flex gap-1.5 flex-wrap">
                  {IRNS.map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setIrn(n)}
                      className={`w-10 h-10 rounded-xl text-base font-semibold transition-all duration-200 ${
                        irn === n
                          ? "bg-primary text-primary-foreground shadow-md shadow-primary/25"
                          : "bg-white/50 text-foreground hover:bg-white/80 border border-white/40"
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
                {step2Errors.irn && <p className="text-xs text-red-500">{step2Errors.irn}</p>}
              </div>

              {/* Expiry - Month/Year Pills */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Card expiry</Label>
                <div className="space-y-3">
                  {/* Months */}
                  <div className="grid grid-cols-6 gap-1.5">
                    {MONTHS.map((m) => (
                      <button
                        key={m.value}
                        type="button"
                        onClick={() => setExpiryMonth(m.value)}
                        className={`py-2 rounded-lg text-xs font-medium transition-all duration-200 ${
                          expiryMonth === m.value
                            ? "bg-primary text-primary-foreground shadow-sm shadow-primary/25"
                            : "bg-white/50 text-foreground hover:bg-white/80 border border-white/40"
                        }`}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>
                  {/* Years */}
                  <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
                    {YEARS.map((y) => (
                      <button
                        key={y}
                        type="button"
                        onClick={() => setExpiryYear(y)}
                        className={`py-2 px-3 rounded-lg text-xs font-medium whitespace-nowrap transition-all duration-200 flex-shrink-0 ${
                          expiryYear === y
                            ? "bg-primary text-primary-foreground shadow-sm shadow-primary/25"
                            : "bg-white/50 text-foreground hover:bg-white/80 border border-white/40"
                        }`}
                      >
                        {y}
                      </button>
                    ))}
                  </div>
                </div>
                {step2Errors.expiry && <p className="text-xs text-red-500">{step2Errors.expiry}</p>}
              </div>

              {/* Consent Toggle */}
              <div className="glass-card rounded-2xl p-4 bg-white/30">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-primary/10 flex-shrink-0">
                    <Shield className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">My Health Record access</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Allow access to your Medicare and My Health Record for clinical care.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setConsentMyhr(!consentMyhr)}
                    role="switch"
                    aria-checked={consentMyhr}
                    className={`relative w-14 h-8 rounded-full transition-all duration-300 flex-shrink-0 ${
                      consentMyhr ? "bg-primary shadow-md shadow-primary/30" : "bg-muted"
                    }`}
                  >
                    <span
                      className={`absolute top-1 left-1 w-6 h-6 rounded-full bg-white shadow-sm transition-transform duration-300 ${
                        consentMyhr ? "translate-x-6" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-8">
              <Button
                variant="outline"
                onClick={handleBack}
                className="flex-1 h-12 rounded-xl border-white/40 bg-white/30 hover:bg-white/50"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="flex-1 h-12 rounded-xl btn-glow text-base font-medium"
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Saving...
                  </span>
                ) : (
                  <>
                    Complete setup
                    <Check className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </div>

            {/* Auto-save indicator */}
            <p className="text-xs text-muted-foreground text-center mt-4 flex items-center justify-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-green-500" />
              Progress saved automatically
            </p>
          </div>
        )}
      </div>
    </TooltipProvider>
  )
}
