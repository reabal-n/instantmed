"use client"

import type React from "react"

import { useState, useMemo, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { 
  Check, 
  Phone, 
  MapPin, 
  CreditCard, 
  Shield, 
  AlertTriangle,
  Clock,
  HelpCircle,
  CheckCircle2,
  X,
  FlaskConical,
  Loader2
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

// Test mode - allows quick testing without real data
const IS_TEST_MODE = process.env.NEXT_PUBLIC_ENABLE_TEST_MODE === "true"

// Test data for quick fill
const TEST_DATA = {
  phone: "0412 345 678",
  addressLine1: "123 Test Street",
  suburb: "Sydney",
  state: "NSW" as AustralianState,
  postcode: "2000",
  medicareNumber: "2123 45670 1",
  irn: 1,
  expiryMonth: "12",
  expiryYear: new Date().getFullYear() + 2,
}

// Storage key for persisting form data
const STORAGE_KEY = "instantmed_onboarding_draft"

export function OnboardingFlow({ profileId, fullName, redirectTo }: OnboardingFlowProps) {
  const router = useRouter()
  const [isHydrated, setIsHydrated] = useState(false)
  const [showMedicareHelper, setShowMedicareHelper] = useState(false)
  
  // Generate years array on client to avoid hydration mismatch
  const YEARS = useMemo(() => generateYears(), [])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expiryWarning, setExpiryWarning] = useState<string | null>(null)

  // All fields in one form
  const [phone, setPhone] = useState("")
  const [addressLine1, setAddressLine1] = useState("")
  const [suburb, setSuburb] = useState("")
  const [state, setState] = useState<AustralianState | null>(null)
  const [postcode, setPostcode] = useState("")
  const [medicareNumber, setMedicareNumber] = useState("")
  const [irn, setIrn] = useState<number | null>(null)
  const [expiryMonth, setExpiryMonth] = useState<string | null>(null)
  const [expiryYear, setExpiryYear] = useState<number | null>(null)
  const [consentMyhr, setConsentMyhr] = useState(false)

  // Validation
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [medicareValid, setMedicareValid] = useState(false)
  const [touched, setTouched] = useState<Record<string, boolean>>({})

  const firstName = fullName.split(" ")[0]

  // Fill with test data
  const fillTestData = () => {
    if (!IS_TEST_MODE) return
    setPhone(TEST_DATA.phone)
    setAddressLine1(TEST_DATA.addressLine1)
    setSuburb(TEST_DATA.suburb)
    setState(TEST_DATA.state)
    setPostcode(TEST_DATA.postcode)
    setMedicareNumber(TEST_DATA.medicareNumber)
    setMedicareValid(true)
    setIrn(TEST_DATA.irn)
    setExpiryMonth(TEST_DATA.expiryMonth)
    setExpiryYear(TEST_DATA.expiryYear)
    setErrors({})
  }

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
    setTouched(prev => ({ ...prev, phone: true }))
    // Clear error on change
    if (errors.phone) {
      setErrors(prev => {
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
    setTouched(prev => ({ ...prev, medicare: true }))
    
    // Validate as user types
    const raw = formatted.replace(/\s/g, "")
    if (raw.length === 10) {
      const validation = validateMedicareNumber(raw)
      setMedicareValid(validation.valid)
      if (!validation.valid) {
        setErrors(prev => ({ ...prev, medicare: validation.error || "Invalid Medicare number" }))
      } else {
        setErrors(prev => {
          const { medicare, ...rest } = prev
          return rest
        })
      }
    } else {
      setMedicareValid(false)
      // Clear error when user is still typing
      if (errors.medicare) {
        setErrors(prev => {
          const { medicare, ...rest } = prev
          return rest
        })
      }
    }
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}
    const phoneDigits = phone.replace(/\D/g, "")
    
    // Phone validation
    if (!phoneDigits) {
      newErrors.phone = "Phone number is required"
    } else if (phoneDigits.length < 10) {
      newErrors.phone = "Enter a valid 10-digit phone number"
    } else if (!phoneDigits.startsWith("04") && !phoneDigits.startsWith("02") && !phoneDigits.startsWith("03") && !phoneDigits.startsWith("07") && !phoneDigits.startsWith("08")) {
      newErrors.phone = "Enter a valid Australian phone number"
    }
    
    // Address validation
    if (!addressLine1.trim()) newErrors.addressLine1 = "Address is required"
    if (!suburb.trim()) newErrors.suburb = "Suburb is required"
    if (!state) newErrors.state = "State is required"
    if (!postcode.trim()) newErrors.postcode = "Postcode is required"
    else if (!/^\d{4}$/.test(postcode)) newErrors.postcode = "Enter a valid 4-digit postcode"
    
    // Medicare validation
    const rawMedicare = medicareNumber.replace(/\s/g, "")
    const medicareValidation = validateMedicareNumber(rawMedicare)
    if (!medicareValidation.valid) {
      newErrors.medicare = medicareValidation.error || "Invalid Medicare number"
    }

    if (!irn) newErrors.irn = "Select your IRN"

    if (!expiryMonth || !expiryYear) {
      newErrors.expiry = "Select expiry date"
    } else {
      const expiryDate = `${expiryYear}-${expiryMonth}-01`
      const expiryValidation = validateMedicareExpiry(expiryDate)

      if (!expiryValidation.valid) {
        newErrors.expiry = expiryValidation.error || "Invalid expiry date"
      } else if (expiryValidation.isExpiringSoon) {
        setExpiryWarning("Your Medicare card is expiring soon. Please update it after this visit.")
      } else {
        setExpiryWarning(null)
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // Check if form is valid (for enabling submit button)
  const isFormValid = useMemo(() => {
    const phoneDigits = phone.replace(/\D/g, "")
    const rawMedicare = medicareNumber.replace(/\s/g, "")
    
    return (
      phoneDigits.length >= 10 &&
      addressLine1.trim() !== "" &&
      suburb.trim() !== "" &&
      state !== null &&
      postcode.length === 4 &&
      rawMedicare.length === 10 &&
      medicareValid &&
      irn !== null &&
      expiryMonth !== null &&
      expiryYear !== null
    )
  }, [phone, addressLine1, suburb, state, postcode, medicareNumber, medicareValid, irn, expiryMonth, expiryYear])

  const handleSubmit = async () => {
    if (!validateForm()) {
      // Scroll to first error
      const firstErrorKey = Object.keys(errors)[0]
      const el = document.getElementById(firstErrorKey)
      el?.scrollIntoView({ behavior: "smooth", block: "center" })
      return
    }

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
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 px-4 py-8">
        <div className="max-w-md mx-auto">
          {/* Header */}
          <div className="text-center mb-6">
            <h1 className="text-2xl font-semibold text-foreground">
              Hi {firstName}, let's set up your profile
            </h1>
            <p className="text-sm text-muted-foreground mt-1 flex items-center justify-center gap-2">
              <Clock className="w-4 h-4" />
              Takes about 1 minute
            </p>
          </div>

          {/* Test Mode Quick Fill */}
          {IS_TEST_MODE && (
            <button
              type="button"
              onClick={fillTestData}
              className="w-full mb-6 flex items-center justify-center gap-2 p-3 rounded-xl border-2 border-dashed border-amber-400 bg-amber-50 text-amber-700 hover:bg-amber-100 transition-colors"
            >
              <FlaskConical className="w-4 h-4" />
              <span className="text-sm font-medium">Fill with test data</span>
            </button>
          )}

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-600">{error}</div>
          )}

          {/* Single Form */}
          <div className="space-y-6">
            {/* Section: Contact */}
            <section className="glass-card rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-xl bg-primary/10">
                  <Phone className="w-5 h-5 text-primary" />
                </div>
                <h2 className="text-lg font-semibold">Contact details</h2>
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="phone" className="text-sm font-medium">Phone number</Label>
                  <div className="relative">
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="0412 345 678"
                      value={phone}
                      onChange={(e) => handlePhoneChange(e.target.value)}
                      className={`h-11 rounded-xl ${
                        errors.phone ? "border-red-400" : phone.replace(/\D/g, "").length >= 10 ? "border-green-400" : ""
                      }`}
                    />
                    {phone.replace(/\D/g, "").length >= 10 && !errors.phone && (
                      <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-green-500" />
                    )}
                  </div>
                  {errors.phone && <p className="text-xs text-red-500">{errors.phone}</p>}
                </div>
              </div>
            </section>

            {/* Section: Address */}
            <section className="glass-card rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-xl bg-primary/10">
                  <MapPin className="w-5 h-5 text-primary" />
                </div>
                <h2 className="text-lg font-semibold">Address</h2>
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="address" className="text-sm font-medium">Street address</Label>
                  <Input
                    id="addressLine1"
                    placeholder="123 Example Street"
                    value={addressLine1}
                    onChange={(e) => {
                      setAddressLine1(e.target.value)
                      if (errors.addressLine1) setErrors(prev => { const { addressLine1, ...rest } = prev; return rest })
                    }}
                    className={`h-11 rounded-xl ${errors.addressLine1 ? "border-red-400" : ""}`}
                  />
                  {errors.addressLine1 && <p className="text-xs text-red-500">{errors.addressLine1}</p>}
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2 space-y-1.5">
                    <Label htmlFor="suburb" className="text-sm font-medium">Suburb</Label>
                    <Input
                      id="suburb"
                      placeholder="Sydney"
                      value={suburb}
                      onChange={(e) => {
                        setSuburb(e.target.value)
                        if (errors.suburb) setErrors(prev => { const { suburb, ...rest } = prev; return rest })
                      }}
                      className={`h-11 rounded-xl ${errors.suburb ? "border-red-400" : ""}`}
                    />
                    {errors.suburb && <p className="text-xs text-red-500">{errors.suburb}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="postcode" className="text-sm font-medium">Postcode</Label>
                    <Input
                      id="postcode"
                      placeholder="2000"
                      maxLength={4}
                      inputMode="numeric"
                      value={postcode}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, "").slice(0, 4)
                        setPostcode(value)
                        if (errors.postcode) setErrors(prev => { const { postcode, ...rest } = prev; return rest })
                      }}
                      className={`h-11 rounded-xl ${errors.postcode ? "border-red-400" : ""}`}
                    />
                    {errors.postcode && <p className="text-xs text-red-500">{errors.postcode}</p>}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">State</Label>
                  <div className="grid grid-cols-4 gap-2">
                    {STATES.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => {
                          setState(s)
                          if (errors.state) setErrors(prev => { const { state, ...rest } = prev; return rest })
                        }}
                        className={`py-2 rounded-lg text-sm font-medium transition-all ${
                          state === s
                            ? "bg-primary text-primary-foreground shadow-sm"
                            : "bg-muted hover:bg-muted/80"
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                  {errors.state && <p className="text-xs text-red-500">{errors.state}</p>}
                </div>
              </div>
            </section>

            {/* Section: Medicare */}
            <section className="glass-card rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-primary/10">
                    <CreditCard className="w-5 h-5 text-primary" />
                  </div>
                  <h2 className="text-lg font-semibold">Medicare</h2>
                </div>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button 
                      type="button"
                      onClick={() => setShowMedicareHelper(true)}
                      className="p-2 rounded-lg hover:bg-muted transition-colors"
                    >
                      <HelpCircle className="w-5 h-5 text-muted-foreground" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs">Where to find this</p>
                  </TooltipContent>
                </Tooltip>
              </div>

              {expiryWarning && (
                <div className="mb-4 p-3 rounded-xl bg-amber-50 border border-amber-200 text-sm text-amber-700 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>{expiryWarning}</span>
                </div>
              )}

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="medicare" className="text-sm font-medium">Card number</Label>
                  <div className="relative">
                    <Input
                      id="medicare"
                      type="text"
                      inputMode="numeric"
                      placeholder="1234 56789 0"
                      value={medicareNumber}
                      onChange={(e) => handleMedicareChange(e.target.value)}
                      className={`h-11 text-lg font-mono tracking-wider rounded-xl pr-10 ${
                        errors.medicare ? "border-red-400" : medicareValid ? "border-green-400" : ""
                      }`}
                    />
                    {medicareValid && (
                      <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-green-500" />
                    )}
                  </div>
                  {errors.medicare && <p className="text-xs text-red-500">{errors.medicare}</p>}
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <Label className="text-sm font-medium">IRN</Label>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <HelpCircle className="w-3.5 h-3.5 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs">The number (1-9) next to your name</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <div className="flex gap-1.5">
                    {IRNS.map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setIrn(n)}
                        className={`w-9 h-9 rounded-lg text-sm font-semibold transition-all ${
                          irn === n
                            ? "bg-primary text-primary-foreground shadow-sm"
                            : "bg-muted hover:bg-muted/80"
                        }`}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                  {errors.irn && <p className="text-xs text-red-500">{errors.irn}</p>}
                </div>

                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">Card expiry</Label>
                  <div className="grid grid-cols-6 gap-1">
                    {MONTHS.map((m) => (
                      <button
                        key={m.value}
                        type="button"
                        onClick={() => setExpiryMonth(m.value)}
                        className={`py-1.5 rounded-lg text-xs font-medium transition-all ${
                          expiryMonth === m.value
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted hover:bg-muted/80"
                        }`}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-1 overflow-x-auto pb-1">
                    {YEARS.map((y) => (
                      <button
                        key={y}
                        type="button"
                        onClick={() => setExpiryYear(y)}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all flex-shrink-0 ${
                          expiryYear === y
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted hover:bg-muted/80"
                        }`}
                      >
                        {y}
                      </button>
                    ))}
                  </div>
                  {errors.expiry && <p className="text-xs text-red-500">{errors.expiry}</p>}
                </div>
              </div>
            </section>

            {/* Section: Consent */}
            <section className="glass-card rounded-2xl p-6">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-xl bg-primary/10 flex-shrink-0">
                  <Shield className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-foreground">My Health Record access</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Allow us to access your Medicare and My Health Record for clinical care.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setConsentMyhr(!consentMyhr)}
                  role="switch"
                  aria-checked={consentMyhr}
                  className={`relative w-12 h-7 rounded-full transition-all flex-shrink-0 ${
                    consentMyhr ? "bg-primary" : "bg-muted"
                  }`}
                >
                  <span
                    className={`absolute top-1 left-1 w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${
                      consentMyhr ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
            </section>

            {/* Submit Button */}
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || !isFormValid}
              className="w-full h-12 rounded-xl btn-glow text-base font-medium"
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </span>
              ) : (
                <>
                  Complete setup
                  <Check className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>

            {/* Auto-save indicator */}
            <p className="text-xs text-muted-foreground text-center flex items-center justify-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-green-500" />
              Progress saved automatically
            </p>
          </div>
        </div>

        {/* Medicare Card Helper Modal */}
        {showMedicareHelper && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="w-full max-w-sm bg-white rounded-2xl p-6 shadow-2xl">
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
                  <p><strong>IRN:</strong> The number (1-9) next to your name</p>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-3 h-3 rounded-full bg-blue-400 mt-1 flex-shrink-0" />
                  <p><strong>Expiry:</strong> The "Valid to" date</p>
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
      </div>
    </TooltipProvider>
  )
}
