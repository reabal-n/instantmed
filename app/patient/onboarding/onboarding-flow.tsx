"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  ArrowLeft, 
  ArrowRight, 
  Check, 
  Phone, 
  MapPin, 
  CreditCard, 
  Shield, 
  AlertTriangle,
} from "lucide-react"
import { ButtonSpinner } from "@/components/ui/unified-skeleton"
import { completeOnboardingAction } from "./actions"
import type { AustralianState } from "@/types/db"
import { validateMedicareNumber, validateMedicareExpiry } from "@/lib/validation/medicare"
import { PageShell } from "@/components/ui/page-shell"
import { FormStepper, type Step } from "@/components/ui/form-stepper"
import { FormSection, FormGroup, FormActions } from "@/components/ui/form-section"
import { cn } from "@/lib/utils"
import { spring } from "@/lib/motion"

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

// Stepper steps
const steps: Step[] = [
  { id: "contact", title: "Contact & Address" },
  { id: "medicare", title: "Medicare & Consent" },
]

export function OnboardingFlow({ profileId, fullName, redirectTo }: OnboardingFlowProps) {
  const router = useRouter()
  const [step, setStep] = useState(0) // 0-indexed for stepper
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
    if (!addressLine1.trim()) errors.addressLine1 = "Street address is required"
    if (!suburb.trim()) errors.suburb = "Suburb is required"
    if (!state) errors.state = "Please select your state"
    if (!postcode.trim()) errors.postcode = "Postcode is required"
    else if (!/^\d{4}$/.test(postcode)) errors.postcode = "Enter a valid 4-digit postcode"
    setStep1Errors(errors)
    return Object.keys(errors).length === 0
  }

  const validateStep2 = () => {
    const errors: Record<string, string> = {}
    const medicareNumber = medicareDigits.join("")

    // Medicare is optional - only validate if user has started entering data
    const hasMedicareData = medicareNumber.length > 0 || irn !== null || expiryMonth !== null || expiryYear !== null
    
    if (hasMedicareData) {
      // If user started entering Medicare, validate completely
      if (medicareNumber.length > 0) {
        const medicareValidation = validateMedicareNumber(medicareNumber)
        if (!medicareValidation.valid) {
          errors.medicare = medicareValidation.error || "Invalid Medicare number"
        }
      }

      if (medicareNumber.length >= 10 && !irn) {
        errors.irn = "Please select your IRN"
      }

      if (medicareNumber.length >= 10 && (!expiryMonth || !expiryYear)) {
        errors.expiry = "Please select expiry date"
      } else if (expiryMonth && expiryYear) {
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
    }

    setStep2Errors(errors)
    return Object.keys(errors).length === 0
  }

  const handleNext = () => {
    if (validateStep1()) {
      setStep(1)
    }
  }

  const handleBack = () => {
    setStep(0)
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
    <PageShell maxWidth="md" padding="md">
      {/* Sticky Stepper */}
      <div className="mb-8">
        <FormStepper steps={steps} currentStep={step} sticky />
      </div>

      {/* Step Content */}
      <AnimatePresence mode="wait">
        {/* Step 1: Contact & Address */}
        {step === 0 && (
          <motion.div
            key="step-0"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={spring.smooth}
          >
            <FormSection
              icon={<MapPin className="w-5 h-5 text-primary" />}
              title={`Hi ${firstName}, let's get you set up`}
              description="We need a few details to complete your profile"
              animate
            >
              {/* Phone */}
              <FormGroup
                label="Phone number"
                htmlFor="phone"
                error={step1Errors.phone}
                required
              >
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="0412 345 678"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className={cn(
                      "pl-10 h-12 rounded-xl",
                      step1Errors.phone && "input-error"
                    )}
                  />
                </div>
              </FormGroup>

              {/* Address Line 1 */}
              <FormGroup
                label="Street address"
                htmlFor="address"
                error={step1Errors.addressLine1}
                required
              >
                <Input
                  id="address"
                  placeholder="123 Example Street"
                  value={addressLine1}
                  onChange={(e) => setAddressLine1(e.target.value)}
                  className={cn(
                    "h-12 rounded-xl",
                    step1Errors.addressLine1 && "input-error"
                  )}
                />
              </FormGroup>

              {/* Suburb */}
              <FormGroup
                label="Suburb"
                htmlFor="suburb"
                error={step1Errors.suburb}
                required
              >
                <Input
                  id="suburb"
                  placeholder="Sydney"
                  value={suburb}
                  onChange={(e) => setSuburb(e.target.value)}
                  className={cn(
                    "h-12 rounded-xl",
                    step1Errors.suburb && "input-error"
                  )}
                />
              </FormGroup>

              {/* State - Pill Grid */}
              <FormGroup
                label="State"
                error={step1Errors.state}
                required
              >
                <div className="grid grid-cols-4 gap-2">
                  {STATES.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setState(s)}
                      className={cn(
                        "py-2.5 px-3 rounded-xl text-sm font-medium transition-all duration-300",
                        state === s
                          ? "bg-primary text-primary-foreground shadow-[0_8px_30px_rgb(59,130,246,0.3)]"
                          : "bg-white/70 dark:bg-gray-900/60 backdrop-blur-xl text-foreground hover:bg-white/85 dark:hover:bg-gray-900/80 border border-white/40 dark:border-white/10 hover:shadow-[0_4px_12px_rgb(59,130,246,0.1)] hover:-translate-y-0.5"
                      )}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </FormGroup>

              {/* Postcode */}
              <FormGroup
                label="Postcode"
                htmlFor="postcode"
                error={step1Errors.postcode}
                required
              >
                <Input
                  id="postcode"
                  placeholder="2000"
                  maxLength={4}
                  value={postcode}
                  onChange={(e) => setPostcode(e.target.value)}
                  className={cn(
                    "h-12 rounded-xl w-32",
                    step1Errors.postcode && "input-error"
                  )}
                />
              </FormGroup>
            </FormSection>

            <FormActions>
              <Button 
                onClick={handleNext} 
                className="w-full sm:flex-1 h-12 rounded-xl text-base font-medium shadow-[0_8px_30px_rgb(59,130,246,0.3)] hover:shadow-[0_12px_40px_rgb(59,130,246,0.4)] hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
                size="lg"
              >
                Next
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </FormActions>
          </motion.div>
        )}

        {/* Step 2: Medicare & Consent */}
        {step === 1 && (
          <motion.div
            key="step-1"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={spring.smooth}
            className="space-y-6"
          >
            <FormSection
              icon={<CreditCard className="w-5 h-5 text-primary" />}
              title="Medicare details"
              description="Optional for medical certificates. Required for prescriptions and referrals."
              animate
            >
              {/* Global error */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 rounded-xl bg-destructive/5 border border-destructive/20 text-sm text-destructive"
                >
                  {error}
                </motion.div>
              )}

              {/* Expiry warning */}
              {expiryWarning && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/20 text-sm text-amber-700 dark:text-amber-400 flex items-start gap-2"
                >
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{expiryWarning}</span>
                </motion.div>
              )}

              {/* Medicare Number - Segmented */}
              <FormGroup
                label="Medicare number"
                error={step2Errors.medicare}
                hint="Enter the 10-digit number from your card (optional for med certs)"
              >
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
                      className={cn(
                        "w-14 h-12 text-center text-lg font-mono rounded-xl",
                        step2Errors.medicare && "input-error"
                      )}
                    />
                  ))}
                </div>
              </FormGroup>

              {/* IRN - Pill Selector */}
              <FormGroup
                label="IRN (Individual Reference Number)"
                error={step2Errors.irn}
                hint="The number next to your name on the card"
                required
              >
                <div className="flex gap-2 justify-center">
                  {IRNS.map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setIrn(n)}
                      className={cn(
                        "w-12 h-12 rounded-xl text-base font-semibold transition-all duration-300",
                        irn === n
                          ? "bg-primary text-primary-foreground shadow-[0_8px_30px_rgb(59,130,246,0.3)]"
                          : "bg-white/70 dark:bg-gray-900/60 backdrop-blur-xl text-foreground hover:bg-white/85 dark:hover:bg-gray-900/80 border border-white/40 dark:border-white/10 hover:shadow-[0_4px_12px_rgb(59,130,246,0.1)] hover:-translate-y-0.5"
                      )}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </FormGroup>

              {/* Expiry - Month/Year Pills */}
              <FormGroup
                label="Card expiry"
                error={step2Errors.expiry}
                required
              >
                <div className="space-y-3">
                  {/* Months */}
                  <div className="grid grid-cols-6 gap-1.5">
                    {MONTHS.map((m) => (
                      <button
                        key={m.value}
                        type="button"
                        onClick={() => setExpiryMonth(m.value)}
                        className={cn(
                          "py-2 rounded-lg text-xs font-medium transition-all duration-300",
                          expiryMonth === m.value
                            ? "bg-primary text-primary-foreground shadow-[0_4px_16px_rgb(59,130,246,0.25)]"
                            : "bg-white/70 dark:bg-gray-900/60 backdrop-blur-lg text-foreground hover:bg-white/85 dark:hover:bg-gray-900/80 border border-white/40 dark:border-white/10"
                        )}
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
                        className={cn(
                          "py-2 px-3 rounded-lg text-xs font-medium whitespace-nowrap transition-all duration-300 shrink-0",
                          expiryYear === y
                            ? "bg-primary text-primary-foreground shadow-[0_4px_16px_rgb(59,130,246,0.25)]"
                            : "bg-white/70 dark:bg-gray-900/60 backdrop-blur-lg text-foreground hover:bg-white/85 dark:hover:bg-gray-900/80 border border-white/40 dark:border-white/10"
                        )}
                      >
                        {y}
                      </button>
                    ))}
                  </div>
                </div>
              </FormGroup>
            </FormSection>

            {/* Consent Card */}
            <FormSection animate index={1}>
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-primary/10 shrink-0">
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
                  className={cn(
                    "relative w-14 h-8 rounded-full transition-all duration-300 shrink-0",
                    consentMyhr ? "bg-primary shadow-[0_8px_30px_rgb(59,130,246,0.3)]" : "bg-white/70 dark:bg-gray-900/60 backdrop-blur-xl border border-white/40 dark:border-white/10"
                  )}
                >
                  <span
                    className={cn(
                      "absolute top-1 left-1 w-6 h-6 rounded-full bg-white shadow-sm transition-transform duration-300",
                      consentMyhr && "translate-x-6"
                    )}
                  />
                </button>
              </div>
            </FormSection>

            <FormActions>
              <Button
                variant="outline"
                onClick={handleBack}
                className="sm:flex-1 h-12 rounded-xl"
                size="lg"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="sm:flex-1 h-12 rounded-xl text-base font-medium shadow-[0_8px_30px_rgb(59,130,246,0.3)] hover:shadow-[0_12px_40px_rgb(59,130,246,0.4)] hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
                size="lg"
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <ButtonSpinner />
                    Saving...
                  </span>
                ) : (
                  <>
                    Complete setup
                    <Check className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </FormActions>
          </motion.div>
        )}
      </AnimatePresence>
    </PageShell>
  )
}
