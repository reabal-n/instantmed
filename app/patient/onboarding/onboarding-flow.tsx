"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowLeft, ArrowRight, Check, Phone, MapPin, CreditCard, Shield, AlertTriangle } from "lucide-react"
import { completeOnboardingAction } from "./actions"
import type { AustralianState } from "@/types/db"
import { validateMedicareNumber, validateMedicareExpiry } from "@/lib/validation/medicare"

interface OnboardingFlowProps {
  profileId: string
  fullName: string
  redirectTo?: string
}

const STATES: AustralianState[] = ["ACT", "NSW", "NT", "QLD", "SA", "TAS", "VIC", "WA"]
const IRNS = [1, 2, 3, 4, 5]
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

// Generate years from current year to +10 years
const currentYear = new Date().getFullYear()
const YEARS = Array.from({ length: 11 }, (_, i) => currentYear + i)

export function OnboardingFlow({ profileId, fullName, redirectTo }: OnboardingFlowProps) {
  const router = useRouter()
  const [step, setStep] = useState(1)
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
  const [medicareDigits, setMedicareDigits] = useState(["", "", "", "", ""])
  const [irn, setIrn] = useState<number | null>(null)
  const [expiryMonth, setExpiryMonth] = useState<string | null>(null)
  const [expiryYear, setExpiryYear] = useState<number | null>(null)
  const [consentMyhr, setConsentMyhr] = useState(false)

  // Validation
  const [step1Errors, setStep1Errors] = useState<Record<string, string>>({})
  const [step2Errors, setStep2Errors] = useState<Record<string, string>>({})

  const firstName = fullName.split(" ")[0]

  const validateStep1 = () => {
    const errors: Record<string, string> = {}
    if (!phone.trim()) errors.phone = "Phone number is required"
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
    const medicareNumber = medicareDigits.join("")

    const medicareValidation = validateMedicareNumber(medicareNumber)
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
    }
  }

  const handleBack = () => {
    setStep(1)
  }

  const handleMedicareDigitChange = (index: number, value: string) => {
    if (value.length > 2) return // Max 2 digits per segment
    if (value && !/^\d*$/.test(value)) return // Only digits

    const newDigits = [...medicareDigits]
    newDigits[index] = value
    setMedicareDigits(newDigits)

    // Auto-focus next input when filled
    if (value.length === 2 && index < 4) {
      const nextInput = document.getElementById(`medicare-${index + 1}`)
      nextInput?.focus()
    }
  }

  const handleMedicareKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && medicareDigits[index] === "" && index > 0) {
      const prevInput = document.getElementById(`medicare-${index - 1}`)
      prevInput?.focus()
    }
  }

  const handleSubmit = async () => {
    if (!validateStep2()) return

    setIsSubmitting(true)
    setError(null)

    const medicareNumber = medicareDigits.join("")
    const medicareExpiry = `${expiryYear}-${expiryMonth}-01`

    const result = await completeOnboardingAction(profileId, {
      phone,
      address_line1: addressLine1,
      suburb,
      state: state!,
      postcode,
      medicare_number: medicareNumber,
      medicare_irn: irn!,
      medicare_expiry: medicareExpiry,
      consent_myhr: consentMyhr,
    })

    if (result.error) {
      setError(result.error)
      setIsSubmitting(false)
    } else {
      const destination = redirectTo || "/patient?onboarded=true"
      router.push(destination.includes("?") ? `${destination}&onboarded=true` : `${destination}?onboarded=true`)
    }
  }

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center px-4 py-8">
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
              <h2 className="text-xl font-semibold text-foreground">Hi {firstName}, let&apos;s get you set up</h2>
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
                  onChange={(e) => setPhone(e.target.value)}
                  className={`pl-10 h-12 rounded-xl bg-white/50 border-white/40 focus:border-primary/50 focus:bg-white/80 transition-all ${
                    step1Errors.phone ? "border-red-400" : ""
                  }`}
                />
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
                onChange={(e) => setAddressLine1(e.target.value)}
                className={`h-12 rounded-xl bg-white/50 border-white/40 focus:border-primary/50 focus:bg-white/80 transition-all ${
                  step1Errors.addressLine1 ? "border-red-400" : ""
                }`}
              />
              {step1Errors.addressLine1 && <p className="text-xs text-red-500">{step1Errors.addressLine1}</p>}
            </div>

            {/* Suburb */}
            <div className="space-y-2">
              <Label htmlFor="suburb" className="text-sm font-medium">
                Suburb
              </Label>
              <Input
                id="suburb"
                placeholder="Sydney"
                value={suburb}
                onChange={(e) => setSuburb(e.target.value)}
                className={`h-12 rounded-xl bg-white/50 border-white/40 focus:border-primary/50 focus:bg-white/80 transition-all ${
                  step1Errors.suburb ? "border-red-400" : ""
                }`}
              />
              {step1Errors.suburb && <p className="text-xs text-red-500">{step1Errors.suburb}</p>}
            </div>

            {/* State - Pill Grid */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">State</Label>
              <div className="grid grid-cols-4 gap-2">
                {STATES.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setState(s)}
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

            {/* Postcode */}
            <div className="space-y-2">
              <Label htmlFor="postcode" className="text-sm font-medium">
                Postcode
              </Label>
              <Input
                id="postcode"
                placeholder="2000"
                maxLength={4}
                value={postcode}
                onChange={(e) => setPostcode(e.target.value)}
                className={`h-12 rounded-xl bg-white/50 border-white/40 focus:border-primary/50 focus:bg-white/80 transition-all w-32 ${
                  step1Errors.postcode ? "border-red-400" : ""
                }`}
              />
              {step1Errors.postcode && <p className="text-xs text-red-500">{step1Errors.postcode}</p>}
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
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 rounded-xl bg-primary/10">
              <CreditCard className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-foreground">Medicare details</h2>
              <p className="text-sm text-muted-foreground">We&apos;ll use this for prescriptions and referrals</p>
            </div>
          </div>

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
            {/* Medicare Number - Segmented */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Medicare number</Label>
              <div className="flex gap-2 justify-center">
                {medicareDigits.map((digit, i) => (
                  <Input
                    key={i}
                    id={`medicare-${i}`}
                    type="text"
                    inputMode="numeric"
                    maxLength={2}
                    value={digit}
                    onChange={(e) => handleMedicareDigitChange(i, e.target.value)}
                    onKeyDown={(e) => handleMedicareKeyDown(i, e)}
                    className={`w-14 h-12 text-center text-lg font-mono rounded-xl bg-white/50 border-white/40 focus:border-primary/50 focus:bg-white/80 transition-all ${
                      step2Errors.medicare ? "border-red-400" : ""
                    }`}
                  />
                ))}
              </div>
              <p className="text-xs text-muted-foreground text-center">Enter the 10-digit number from your card</p>
              {step2Errors.medicare && <p className="text-xs text-red-500 text-center">{step2Errors.medicare}</p>}
            </div>

            {/* IRN - Pill Selector */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">IRN (Individual Reference Number)</Label>
              <p className="text-xs text-muted-foreground mb-2">The number next to your name on the card</p>
              <div className="flex gap-2 justify-center">
                {IRNS.map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setIrn(n)}
                    className={`w-12 h-12 rounded-xl text-base font-semibold transition-all duration-200 ${
                      irn === n
                        ? "bg-primary text-primary-foreground shadow-md shadow-primary/25"
                        : "bg-white/50 text-foreground hover:bg-white/80 border border-white/40"
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
              {step2Errors.irn && <p className="text-xs text-red-500 text-center">{step2Errors.irn}</p>}
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
                    Allow access to your Medicare and My Health Record information for clinical care purposes.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setConsentMyhr(!consentMyhr)}
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
        </div>
      )}
    </div>
  )
}
