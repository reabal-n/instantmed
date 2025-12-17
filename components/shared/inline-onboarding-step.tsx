"use client"
import { useState, useRef } from "react"
import type React from "react"

import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Loader2, MapPin, CreditCard, ArrowLeft, AlertTriangle, HelpCircle } from "lucide-react"
import { validateMedicareNumber, validateMedicareExpiry } from "@/lib/validation/medicare"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { GlassRadioGroup } from "@/components/ui/glass-radio-group"

const STATES = ["NSW", "VIC", "QLD", "WA", "SA", "TAS", "ACT", "NT"]
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
const currentYear = new Date().getFullYear()
const YEARS = Array.from({ length: 10 }, (_, i) => currentYear + i)

interface InlineOnboardingStepProps {
  profileId: string
  userName: string
  onBack: () => void
  onComplete: () => void
}

export function InlineOnboardingStep({ profileId, userName, onBack, onComplete }: InlineOnboardingStepProps) {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(1)
  const medicareInputRef = useRef<HTMLInputElement>(null)

  // Step 1: Contact
  const [phone, setPhone] = useState("")
  const [addressLine1, setAddressLine1] = useState("")
  const [addressLine2, setAddressLine2] = useState("")
  const [suburb, setSuburb] = useState("")
  const [state, setState] = useState<string | null>(null)
  const [postcode, setPostcode] = useState("")

  const [medicareNumber, setMedicareNumber] = useState("")
  const [irn, setIrn] = useState<number | null>(null)
  const [expiryMonth, setExpiryMonth] = useState<string | null>(null)
  const [expiryYear, setExpiryYear] = useState<number | null>(null)
  const [consentMyhr, setConsentMyhr] = useState(false)

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [expiryWarning, setExpiryWarning] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const firstName = userName.split(" ")[0] || "there"

  const validateStep1 = () => {
    const newErrors: Record<string, string> = {}
    if (!phone.trim()) newErrors.phone = "Phone number is required"
    if (!addressLine1.trim()) newErrors.addressLine1 = "Address is required"
    if (!suburb.trim()) newErrors.suburb = "Suburb is required"
    if (!state) newErrors.state = "State is required"
    if (!postcode.trim()) newErrors.postcode = "Postcode is required"
    else if (!/^\d{4}$/.test(postcode)) newErrors.postcode = "Enter a valid 4-digit postcode"
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const validateStep2 = () => {
    const newErrors: Record<string, string> = {}
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

  const formatMedicareNumber = (value: string): string => {
    // Remove all non-digits
    const digits = value.replace(/\D/g, "")

    // Limit to 10 digits
    const limited = digits.slice(0, 10)

    // Format as XXXX XXXXX X
    if (limited.length <= 4) {
      return limited
    } else if (limited.length <= 9) {
      return `${limited.slice(0, 4)} ${limited.slice(4)}`
    } else {
      return `${limited.slice(0, 4)} ${limited.slice(4, 9)} ${limited.slice(9)}`
    }
  }

  const handleMedicareChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatMedicareNumber(e.target.value)
    setMedicareNumber(formatted)

    // Clear error when user starts typing
    if (errors.medicare) {
      setErrors((prev) => ({ ...prev, medicare: "" }))
    }
  }

  const handleNext = () => {
    if (validateStep1()) {
      setCurrentStep(2)
    }
  }

  const handleSubmit = async () => {
    if (!validateStep2()) return

    setIsLoading(true)
    setError(null)

    const supabase = createClient()

    try {
      const rawMedicare = medicareNumber.replace(/\s/g, "")

      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          phone,
          address_line_1: addressLine1,
          address_line_2: addressLine2 || null,
          suburb,
          state,
          postcode,
          medicare_number: rawMedicare,
          medicare_irn: irn,
          medicare_expiry: `${expiryYear}-${expiryMonth}-01`,
          consent_myhr: consentMyhr,
          onboarding_completed: true,
        })
        .eq("id", profileId)

      if (updateError) throw updateError

      onComplete()
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save details")
    } finally {
      setIsLoading(false)
    }
  }

  // Step 1: Contact details
  if (currentStep === 1) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-linear-to-br from-primary to-primary/80 mb-4 shadow-lg shadow-primary/20">
            <MapPin className="h-7 w-7 text-primary-foreground" />
          </div>
          <h2 className="text-xl font-semibold text-foreground">Hi {firstName}, just a few more details</h2>
          <p className="mt-1 text-sm text-muted-foreground">We need your contact info for your medical documents</p>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Phone number</Label>
            <Input
              type="tel"
              placeholder="0400 000 000"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className={`h-11 rounded-xl bg-white/50 border-white/40 ${errors.phone ? "border-red-400" : ""}`}
            />
            {errors.phone && <p className="text-xs text-red-500">{errors.phone}</p>}
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">Address</Label>
            <Input
              placeholder="Street address"
              value={addressLine1}
              onChange={(e) => setAddressLine1(e.target.value)}
              className={`h-11 rounded-xl bg-white/50 border-white/40 ${errors.addressLine1 ? "border-red-400" : ""}`}
            />
            <Input
              placeholder="Apartment, unit, etc. (optional)"
              value={addressLine2}
              onChange={(e) => setAddressLine2(e.target.value)}
              className="h-11 rounded-xl bg-white/50 border-white/40"
            />
            {errors.addressLine1 && <p className="text-xs text-red-500">{errors.addressLine1}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Suburb</Label>
              <Input
                placeholder="Suburb"
                value={suburb}
                onChange={(e) => setSuburb(e.target.value)}
                className={`h-11 rounded-xl bg-white/50 border-white/40 ${errors.suburb ? "border-red-400" : ""}`}
              />
              {errors.suburb && <p className="text-xs text-red-500">{errors.suburb}</p>}
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Postcode</Label>
              <Input
                placeholder="2000"
                maxLength={4}
                value={postcode}
                onChange={(e) => setPostcode(e.target.value)}
                className={`h-11 rounded-xl bg-white/50 border-white/40 ${errors.postcode ? "border-red-400" : ""}`}
              />
              {errors.postcode && <p className="text-xs text-red-500">{errors.postcode}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">State</Label>
            <div className="flex flex-wrap gap-2">
              {STATES.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setState(s)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    state === s
                      ? "bg-primary text-primary-foreground shadow-md"
                      : "bg-white/50 text-foreground hover:bg-white/80 border border-white/40"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
            {errors.state && <p className="text-xs text-red-500">{errors.state}</p>}
          </div>
        </div>

        <div className="flex gap-3">
          <Button variant="outline" onClick={onBack} className="flex-1 h-11 rounded-xl bg-transparent">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <Button onClick={handleNext} className="flex-1 h-11 rounded-xl btn-glow">
            Continue
          </Button>
        </div>
      </div>
    )
  }

  // Step 2: Medicare
  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-linear-to-br from-primary to-primary/80 mb-4 shadow-lg shadow-primary/20">
          <CreditCard className="h-7 w-7 text-primary-foreground" />
        </div>
        <h2 className="text-xl font-semibold text-foreground">Medicare details</h2>
        <p className="mt-1 text-sm text-muted-foreground">Required for prescriptions and referrals</p>
      </div>

      {error && <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-600">{error}</div>}

      {expiryWarning && (
        <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-sm text-amber-700 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{expiryWarning}</span>
        </div>
      )}

      <div className="space-y-5">
        <div className="space-y-2">
          <Label className="text-sm font-medium">Medicare card number</Label>
          <Input
            ref={medicareInputRef}
            type="text"
            inputMode="numeric"
            placeholder="1234 56789 0"
            value={medicareNumber}
            onChange={handleMedicareChange}
            className={`h-12 text-lg font-mono tracking-wider rounded-xl bg-white/50 border-white/40 text-center ${
              errors.medicare ? "border-red-400" : ""
            }`}
            aria-describedby="medicare-help"
          />
          <p id="medicare-help" className="text-xs text-muted-foreground text-center">
            Enter the 10-digit number shown on your Medicare card
          </p>
          {errors.medicare && <p className="text-xs text-red-500 text-center">{errors.medicare}</p>}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-center gap-2">
            <Label className="text-sm font-medium">IRN (Individual Reference Number)</Label>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button type="button" className="text-muted-foreground hover:text-foreground">
                    <HelpCircle className="h-4 w-4" />
                    <span className="sr-only">What is IRN?</span>
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs text-center">
                  <p>The IRN is the number shown next to your name on your Medicare card (usually 1-9)</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <div className="flex justify-center">
            <GlassRadioGroup
              options={IRNS.map((n) => ({
                id: `irn-${n}`,
                value: n.toString(),
                label: n.toString(),
              }))}
              value={irn?.toString()}
              onChange={(value) => {
                setIrn(parseInt(value))
                if (errors.irn) {
                  setErrors((prev) => ({ ...prev, irn: "" }))
                }
              }}
              name="irn"
            />
          </div>
          {errors.irn && <p className="text-xs text-red-500 text-center">{errors.irn}</p>}
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-medium">Card expiry</Label>
          <div className="space-y-2">
            <div className="grid grid-cols-6 gap-1">
              {MONTHS.map((m) => (
                <button
                  key={m.value}
                  type="button"
                  onClick={() => setExpiryMonth(m.value)}
                  className={`py-1.5 rounded-lg text-xs font-medium transition-all ${
                    expiryMonth === m.value
                      ? "bg-primary text-primary-foreground"
                      : "bg-white/50 text-foreground hover:bg-white/80 border border-white/40"
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
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                    expiryYear === y
                      ? "bg-primary text-primary-foreground"
                      : "bg-white/50 text-foreground hover:bg-white/80 border border-white/40"
                  }`}
                >
                  {y}
                </button>
              ))}
            </div>
          </div>
          {errors.expiry && <p className="text-xs text-red-500 text-center">{errors.expiry}</p>}
        </div>

        <div className="flex items-start gap-2 pt-2">
          <Checkbox
            id="inline-consent-myhr"
            checked={consentMyhr}
            onCheckedChange={(checked) => setConsentMyhr(checked === true)}
            className="mt-0.5"
          />
          <label htmlFor="inline-consent-myhr" className="text-xs text-muted-foreground leading-relaxed">
            I consent to upload documents to My Health Record (optional)
          </label>
        </div>
      </div>

      <div className="flex gap-3">
        <Button variant="outline" onClick={() => setCurrentStep(1)} className="flex-1 h-11 rounded-xl">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <Button onClick={handleSubmit} disabled={isLoading} className="flex-1 h-11 rounded-xl btn-glow">
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            "Continue to payment"
          )}
        </Button>
      </div>
    </div>
  )
}
