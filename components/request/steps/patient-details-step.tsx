"use client"

/**
 * Patient Details Step - Identity and contact information
 * Collects name, email, DOB, phone for guest checkout or profile update
 * 
 * Features:
 * - Profile autofill from saved preferences
 * - Real-time field validation
 * - Help tooltips for sensitive fields
 * - Keyboard navigation (Enter to continue)
 */

import { ArrowRight, Calendar, CreditCard, Lock, Mail, MapPin, Phone, Sparkles, User, Users } from "lucide-react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import { IntakeStepIntro } from "@/components/request/shared/intake-step-primitives"
import { AddressAutocomplete, type AddressComponents } from "@/components/ui/address-autocomplete"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { setEnhancedConversionsData } from "@/lib/analytics/conversion-tracking"
import { usePostHog } from "@/lib/analytics/posthog-context"
import { useKeyboardNavigation } from "@/lib/hooks/use-keyboard-navigation"
import { getSavedIdentity, saveIdentity } from "@/lib/request/preferences"
import { requiresPrescribingIdentityForRequest } from "@/lib/request/prescribing-identity"
import type { UnifiedServiceType } from "@/lib/request/step-registry"
import { validateDOB, validateEmail, validateName, validatePhone } from "@/lib/request/validation"
import { cn } from "@/lib/utils"
import { suggestStateFromPostcode, validatePostcodeState } from "@/lib/validation/australian-address"
import { detectRelayEmail, getRelayEmailMessage } from "@/lib/validation/email-relay"
import { detectEmailTypo } from "@/lib/validation/email-typo"
import { formatIHI, validateIHI } from "@/lib/validation/ihi"
import { formatMedicareNumber, validateMedicareNumber } from "@/lib/validation/medicare"

import { FormField } from "../form-field"
import { useRequestStore } from "../store"

const DATE_OF_BIRTH_PLACEHOLDER = "DD/MM/YYYY"
const AU_DATE_PATTERN = /^(\d{2})\/(\d{2})\/(\d{4})$/
const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/
const AUSTRALIAN_STATES = ["ACT", "NSW", "NT", "QLD", "SA", "TAS", "VIC", "WA"] as const
const IDENTITY_METHOD_OPTIONS = [
  {
    value: "medicare",
    label: "Medicare",
    description: "Most patients",
  },
  {
    value: "ihi",
    label: "IHI",
    description: "No Medicare card",
  },
] as const

type IdentityMethod = (typeof IDENTITY_METHOD_OPTIONS)[number]["value"]

function formatIsoDateToAu(isoDate: string) {
  const match = ISO_DATE_PATTERN.exec(isoDate)
  if (!match) return isoDate
  const [, year, month, day] = match
  return `${day}/${month}/${year}`
}

function normaliseDateOfBirthInput(value: string) {
  const trimmed = value.trim()
  const isoMatch = ISO_DATE_PATTERN.exec(trimmed)
  if (isoMatch) {
    return formatIsoDateToAu(trimmed)
  }

  const digits = trimmed.replace(/\D/g, "").slice(0, 8)
  const day = digits.slice(0, 2)
  const month = digits.slice(2, 4)
  const year = digits.slice(4, 8)
  return [day, month, year].filter(Boolean).join("/")
}

function parseDateOfBirthInput(value: string) {
  const match = AU_DATE_PATTERN.exec(value)
  if (!match) return null

  const [, dayString, monthString, yearString] = match
  const day = Number(dayString)
  const month = Number(monthString)
  const year = Number(yearString)
  const date = new Date(Date.UTC(year, month - 1, day))

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null
  }

  return `${yearString}-${monthString}-${dayString}`
}

function validateDateOfBirthInput(displayValue: string, isoValue: string | undefined) {
  const value = displayValue.trim()
  if (!value) return "Date of birth is required"
  if (value.length < DATE_OF_BIRTH_PLACEHOLDER.length) return `Enter your date of birth as ${DATE_OF_BIRTH_PLACEHOLDER}`

  const parsed = parseDateOfBirthInput(value)
  if (!parsed) return "Please enter a valid date of birth"
  return validateDOB(isoValue || parsed)
}

interface PatientDetailsStepProps {
  serviceType: UnifiedServiceType
  onNext: () => void
  onBack: () => void
  onComplete: () => void
}

export default function PatientDetailsStep({ serviceType, onNext }: PatientDetailsStepProps) {
  const { firstName, lastName, email, phone, dob, answers, setIdentity, setAnswer } = useRequestStore()
  const posthog = usePostHog()
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const [emailSuggestion, setEmailSuggestion] = useState<string | null>(null)
  // Derived (not blur-gated) so it also fires when iOS autofills a Hide My
  // Email address or the early-recovery field prefills one — those paths never
  // blur the field. Relay addresses DO deliver, but into the inbox behind the
  // relay; setting that expectation here is what prevents the "paid but never
  // got my certificate" ticket (incident 2026-07-02).
  const relayEmailNote = useMemo(() => {
    if (!email || validateEmail(email) !== null) return null
    return getRelayEmailMessage(detectRelayEmail(email))
  }, [email])
  // Field labels to surface in the top-of-step validation summary when a
  // Continue attempt fails (otherwise the only feedback is a silent scroll-to-
  // field, which reads as "nothing happened" — esp. on mobile where the desktop
  // button is hidden and the sticky CTA mirrors it).
  const [validationSummary, setValidationSummary] = useState<string[]>([])
  const [showAutofillBanner, setShowAutofillBanner] = useState(false)
  const [savedData, setSavedData] = useState<ReturnType<typeof getSavedIdentity>>(undefined)
  const [dobInput, setDobInput] = useState(() => formatIsoDateToAu(dob))
  
  // Address state from answers
  const addressLine1 = (answers.addressLine1 as string) || ""
  const suburb = (answers.suburb as string) || ""
  const state = (answers.state as string) || ""
  const postcode = (answers.postcode as string) || ""
  const medicareNumber = (answers.medicareNumber as string) || ""
  const medicareIrn = String(answers.medicareIrn || "")
  const ihiNumber = (answers.ihiNumber as string) || ""
  const sex = (answers.sex as string) || ""
  const consultSubtype = answers.consultSubtype as string | undefined
  const identityMethodManuallyChangedRef = useRef(false)
  // Focus target for the Medicare→IRN auto-advance (P1.4).
  const irnInputRef = useRef<HTMLInputElement>(null)
  const [identityMethod, setIdentityMethod] = useState<IdentityMethod>(() =>
    ihiNumber.trim() && !medicareNumber.trim() ? "ihi" : "medicare",
  )

  // BMI auto-calculation for ED subtype
  const bmi = useMemo(() => {
    const h = Number(answers.heightCm)
    const w = Number(answers.weightKg)
    if (!h || !w || h < 100 || h > 250 || w < 30 || w > 300) return null
    return Math.round((w / ((h / 100) ** 2)) * 10) / 10
  }, [answers.heightCm, answers.weightKg])

  // Persist BMI to store when it changes
  useEffect(() => {
    if (consultSubtype === "ed") {
      setAnswer("bmi", bmi ?? "")
    }
  }, [bmi, consultSubtype, setAnswer])

  useEffect(() => {
    if (dob) {
      setDobInput(formatIsoDateToAu(dob))
    }
  }, [dob])

  useEffect(() => {
    if (identityMethodManuallyChangedRef.current) return
    if (ihiNumber.trim() && !medicareNumber.trim()) {
      setIdentityMethod("ihi")
    }
  }, [ihiNumber, medicareNumber])

  // Check for saved identity on mount
  useEffect(() => {
    const saved = getSavedIdentity()
    if (saved && (saved.firstName || saved.email)) {
      // Only show banner if we have saved data AND current fields are empty
      if (!firstName && !email) {
        setSavedData(saved)
        setShowAutofillBanner(true)
      }
    }
  }, [firstName, email])
  
  // Handle autofill from saved preferences
  const handleAutofill = useCallback(() => {
    if (savedData) {
      setIdentity({
        firstName: savedData.firstName || '',
        lastName: savedData.lastName || '',
        email: savedData.email || '',
        phone: savedData.phone || '',
        dob: savedData.dob || '',
      })
      if (savedData.addressLine1) {
        setAnswer('addressLine1', savedData.addressLine1)
        setAnswer('suburb', savedData.suburb || '')
        setAnswer('state', savedData.state || '')
        setAnswer('postcode', savedData.postcode || '')
      }
      if (savedData.medicareNumber) {
        setAnswer('medicareNumber', savedData.medicareNumber)
      }
      if (savedData.medicareIrn) {
        setAnswer('medicareIrn', savedData.medicareIrn)
      }
      if (savedData.ihiNumber) {
        setAnswer('ihiNumber', savedData.ihiNumber)
        if (!savedData.medicareNumber) {
          setIdentityMethod("ihi")
        }
      }
      setShowAutofillBanner(false)
    }
  }, [savedData, setIdentity, setAnswer])
  
  const handleAddressSelect = (address: AddressComponents) => {
    setAnswer("addressLine1", address.addressLine1 || address.fullAddress)
    setAnswer("addressLine2", address.addressLine2 || "")
    setAnswer("suburb", address.suburb)
    setAnswer("state", address.state)
    setAnswer("postcode", address.postcode)
    setAnswer("addressVerified", address.isVerified || false)
    setAnswer("addressProviderPlaceId", address.providerPlaceId || address.pxid || "")
    setErrors((prev) => {
      const {
        addressLine1: _addressLine1,
        suburb: _suburb,
        state: _state,
        postcode: _postcode,
        ...rest
      } = prev
      return rest
    })
  }

  const handleAddressLineChange = (value: string) => {
    setAnswer("addressLine1", value)
    setAnswer("addressVerified", false)
    setAnswer("addressProviderPlaceId", "")

    if (!value.trim()) {
      setAnswer("addressLine2", "")
      setAnswer("suburb", "")
      setAnswer("state", "")
      setAnswer("postcode", "")
    }
  }

  const handleManualAddressEntry = () => {
    setAnswer("addressVerified", false)
    setAnswer("addressProviderPlaceId", "")
    setTouched((prev) => ({
      ...prev,
      addressLine1: true,
      suburb: true,
      state: true,
      postcode: true,
    }))
  }

  const needsPhone = serviceType === 'prescription' || serviceType === 'repeat-script' || serviceType === 'consult'
  const needsPrescriptionDetails = requiresPrescribingIdentityForRequest({
    serviceType,
    subtype: consultSubtype,
  })
  // Prescribing pathways need the structured address bundle for eScript/Parchment handoff.
  const needsAddress = needsPrescriptionDetails
  const showManualAddressFields = needsAddress
  const medicareValidation = needsPrescriptionDetails && medicareNumber.trim()
    ? validateMedicareNumber(medicareNumber)
    : null
  const ihiValidation = needsPrescriptionDetails && ihiNumber.trim()
    ? validateIHI(ihiNumber)
    : null
  const ihiReady = Boolean(ihiNumber.trim() && ihiValidation?.valid)
  const medicareNumberReady = Boolean(medicareNumber.trim() && medicareValidation?.valid)
  const medicareIdentityReady = !needsPrescriptionDetails || ihiReady || Boolean(medicareNumberReady && /^[1-9]$/.test(medicareIrn))

  // Real-time validation on blur
  const validateField = useCallback((field: string, value: string | undefined) => {
    let error: string | null = null
    
    switch (field) {
      case 'firstName':
        error = validateName(value, 'First name')
        break
      case 'lastName':
        error = validateName(value, 'Last name')
        break
      case 'email':
        error = validateEmail(value)
        break
      case 'dob':
        error = validateDateOfBirthInput(dobInput, value)
        break
      case 'phone':
        error = validatePhone(value, needsPhone)
        break
      case 'medicareNumber':
        if (needsPrescriptionDetails && identityMethod === "medicare" && value) {
          const result = validateMedicareNumber(value)
          error = result.valid || ihiReady ? null : (result.error || 'Invalid Medicare number')
        } else if (needsPrescriptionDetails && identityMethod === "medicare" && !value && !ihiReady) {
          error = 'Enter Medicare details or your IHI'
        }
        break
      case 'medicareIrn':
        if (needsPrescriptionDetails && identityMethod === "medicare" && medicareNumberReady && !ihiReady && !/^[1-9]$/.test(value || "")) {
          error = 'Select your Medicare IRN'
        }
        break
      case 'ihiNumber':
        if (needsPrescriptionDetails && identityMethod === "ihi" && value) {
          const result = validateIHI(value)
          error = result.valid ? null : (result.error || 'Enter a valid IHI')
        } else if (needsPrescriptionDetails && identityMethod === "ihi" && !value && !medicareNumberReady) {
          error = 'Enter an IHI if you do not have Medicare'
        }
        break
      case 'addressLine1':
        if (needsAddress && !value?.trim()) {
          error = "Your address is needed to issue the prescription"
        }
        break
      case 'suburb':
        if (needsAddress && !value?.trim()) {
          error = 'Suburb is required'
        }
        break
      case 'state':
        if (needsAddress && !value?.trim()) {
          error = 'State is required'
        }
        break
      case 'postcode':
        if (needsAddress && !/^\d{4}$/.test(value || "")) {
          error = 'Enter a valid 4-digit postcode'
        } else if (needsAddress && value && state) {
          const result = validatePostcodeState(value, state as (typeof AUSTRALIAN_STATES)[number])
          error = result.valid ? null : (result.error || "Postcode does not match state")
        }
        break
    }

    setErrors(prev => {
      if (error) {
        return { ...prev, [field]: error }
      }
      const { [field]: _, ...rest } = prev
      return rest
    })

    return error === null
  }, [dobInput, identityMethod, needsPhone, needsPrescriptionDetails, needsAddress, state, ihiReady, medicareNumberReady])

  const handleIdentityMethodChange = (method: IdentityMethod) => {
    identityMethodManuallyChangedRef.current = true
    setIdentityMethod(method)
    setErrors((prev) => {
      const {
        medicareNumber: _medicareNumber,
        medicareIrn: _medicareIrn,
        ihiNumber: _ihiNumber,
        ...rest
      } = prev
      return rest
    })
  }
  
  const handleBlur = (field: string, value: string | undefined) => {
    setTouched(prev => ({ ...prev, [field]: true }))
    validateField(field, value)
  }

  // gamil.com / gmial.com etc. are structurally valid emails, so validateEmail
  // passes and the patient's certificate silently goes nowhere. Suggest the
  // likely correction on blur (non-blocking — they can keep their address).
  const handleEmailBlur = () => {
    handleBlur('email', email)
    const result = detectEmailTypo(email || "")
    setEmailSuggestion(result.hasTypo ? result.suggested : null)
  }

  const acceptEmailSuggestion = () => {
    if (!emailSuggestion) return
    setIdentity({ email: emailSuggestion })
    setTouched(prev => ({ ...prev, email: true }))
    validateField('email', emailSuggestion)
    setEmailSuggestion(null)
  }

  const handleDateOfBirthChange = (value: string) => {
    const nextValue = normaliseDateOfBirthInput(value)
    setDobInput(nextValue)

    const parsedDate = parseDateOfBirthInput(nextValue)
    setIdentity({ dob: parsedDate || "" })

    if (touched.dob) {
      const error = validateDateOfBirthInput(nextValue, parsedDate || undefined)
      setErrors((prev) => {
        if (error) return { ...prev, dob: error }
        const { dob: _, ...rest } = prev
        return rest
      })
    }
  }

  const focusFirstError = () => {
    requestAnimationFrame(() => {
      const firstError = document.querySelector<HTMLElement>(
        '[aria-invalid="true"], [data-error="true"]'
      )
      if (!firstError) return

      firstError.scrollIntoView({ block: "center", behavior: "smooth" })
      firstError.focus({ preventScroll: true })
    })
  }

  const validate = () => {
    const newErrors: Record<string, string> = {}
    
    const firstNameError = validateName(firstName, 'First name')
    if (firstNameError) newErrors.firstName = firstNameError
    
    const lastNameError = validateName(lastName, 'Last name')
    if (lastNameError) newErrors.lastName = lastNameError
    
    const emailError = validateEmail(email)
    if (emailError) newErrors.email = emailError
    
    const dobError = validateDateOfBirthInput(dobInput, dob)
    if (dobError) newErrors.dob = dobError
    
    const phoneError = validatePhone(phone, needsPhone)
    if (phoneError) newErrors.phone = phoneError

    if (needsPrescriptionDetails) {
      if (!sex) {
        newErrors.sex = 'Select your sex'
      }
      if (identityMethod === "ihi" && ihiNumber.trim() && !ihiReady) {
        const result = validateIHI(ihiNumber)
        newErrors.ihiNumber = result.error || 'Enter a valid IHI'
      }
      if (!medicareIdentityReady) {
        if (identityMethod === "ihi") {
          newErrors.ihiNumber = ihiNumber.trim() ? (newErrors.ihiNumber || 'Enter a valid IHI') : 'Enter your IHI'
        } else {
          newErrors.medicareNumber = 'Enter Medicare number and IRN, or choose IHI'
        }
      } else {
        if (identityMethod === "medicare" && medicareNumber.trim() && !medicareNumberReady && !ihiReady) {
          const medicareResult = validateMedicareNumber(medicareNumber)
          newErrors.medicareNumber = medicareResult.error || 'Invalid Medicare number'
        }
      }
      if (identityMethod === "medicare" && medicareNumberReady && !ihiReady && !/^[1-9]$/.test(medicareIrn)) {
        newErrors.medicareIrn = 'Select your Medicare IRN'
      }
    }

    if (needsAddress) {
      if (!addressLine1.trim()) {
        newErrors.addressLine1 = "Your address is needed to issue the prescription"
      }
      if (!suburb.trim()) {
        newErrors.suburb = 'Suburb is required'
      }
      if (!state.trim()) {
        newErrors.state = 'State is required'
      }
      if (!/^\d{4}$/.test(postcode)) {
        newErrors.postcode = 'Enter a valid 4-digit postcode'
      } else if (state) {
        const result = validatePostcodeState(postcode, state as (typeof AUSTRALIAN_STATES)[number])
        if (!result.valid) {
          newErrors.postcode = result.error || "Postcode does not match state"
        }
      }
    }

    setErrors(newErrors)
    setTouched({
      firstName: true,
      lastName: true,
      email: true,
      dob: true,
      phone: needsPhone,
      medicareNumber: true,
      medicareIrn: true,
      ihiNumber: true,
      addressLine1: true,
      suburb: true,
      state: true,
      postcode: true,
      sex: true,
    })
    const isValid = Object.keys(newErrors).length === 0
    if (!isValid) {
      const FIELD_LABELS: Record<string, string> = {
        firstName: "First name", lastName: "Last name", email: "Email",
        dob: "Date of birth", phone: "Phone", sex: "Sex",
        medicareNumber: "Medicare number", medicareIrn: "Medicare IRN",
        ihiNumber: "IHI", addressLine1: "Street address", suburb: "Suburb",
        state: "State", postcode: "Postcode",
      }
      setValidationSummary(Object.keys(newErrors).map((k) => FIELD_LABELS[k] ?? k))
      focusFirstError()
    } else {
      setValidationSummary([])
    }
    return isValid
  }

  const handleNext = () => {
    if (validate()) {
      // Save identity for future autofill
      saveIdentity({
        firstName,
        lastName,
        email,
        phone,
        dob,
        addressLine1,
        suburb,
        state,
        postcode,
        medicareNumber,
        medicareIrn,
        ihiNumber,
      })
      // Send hashed user data to Google for Enhanced Conversions
      setEnhancedConversionsData({ email, phone, firstName, lastName })
      // Identify user in PostHog as soon as we have their email - stitches
      // all prior anonymous events (page views, step completions) to this person.
      // Safe to call even if already identified (PostHog deduplicates).
      if (email) {
        posthog?.identify(email, {
          email,
          name: `${firstName} ${lastName}`.trim() || undefined,
        })
      }
      posthog?.capture('step_completed', { step: 'details', service_type: serviceType })
      onNext()
    }
  }

  const addressComplete = !needsAddress || (addressLine1 && suburb && state && postcode)
  const isComplete = firstName && lastName && email && dob && (!needsPhone || phone) && (!needsPrescriptionDetails || (medicareIdentityReady && sex)) && addressComplete
  const hasNoErrors = Object.keys(errors).length === 0
  const canContinue = isComplete && hasNoErrors
  const primaryActionLabel = canContinue
    ? serviceType === "med-cert" ? "Continue to payment" : "Review your request"
    : "Continue"
  
  // Keyboard navigation
  useKeyboardNavigation({
    onNext: canContinue ? handleNext : undefined,
    enabled: Boolean(canContinue),
  })

  return (
    <div className="space-y-4">
      <IntakeStepIntro
        title="Your details"
        description={needsPrescriptionDetails ? "Needed for your medical record, eScript, and identity match." : "Needed for your medical record and result delivery."}
      />

      {/* Top-of-step validation summary — gives a visible, screen-reader-announced
          reason when a Continue attempt is blocked, instead of only scrolling to
          the first invalid field. */}
      {validationSummary.length > 0 ? (
        <Alert variant="destructive" role="alert" aria-live="assertive">
          <AlertDescription>
            {validationSummary.length === 1
              ? "Add or fix this detail to continue: "
              : `Add or fix these ${validationSummary.length} details to continue: `}
            {validationSummary.join(", ")}.
          </AlertDescription>
        </Alert>
      ) : null}

      {/* Autofill banner */}
      {showAutofillBanner && savedData && (
        <Alert variant="default" className="border-primary/20 bg-primary/5">
          <Sparkles className="w-4 h-4" />
          <AlertDescription className="flex items-center justify-between gap-2">
            <span className="text-xs">
              Use your saved details?
            </span>
            <div className="flex gap-2">
              <Button
                size="default"
                variant="ghost"
                className="px-3 text-xs"
                onClick={() => setShowAutofillBanner(false)}
              >
                No thanks
              </Button>
              <Button
                size="default"
                className="px-4 text-xs"
                onClick={handleAutofill}
              >
                Autofill
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}
      {/* Name fields */}
      <div className="grid grid-cols-2 gap-3">
        <FormField
          label="First name"
          required
          error={touched.firstName ? errors.firstName : undefined}
          icon={User}
        >
          <Input
            value={firstName}
            onChange={(e) => setIdentity({ firstName: e.target.value })}
            onBlur={() => handleBlur('firstName', firstName)}
            placeholder="Jane"
            autoComplete="given-name"
            enterKeyHint="next"
            aria-invalid={touched.firstName && !!errors.firstName}
            data-error={touched.firstName && errors.firstName ? "true" : undefined}
            className={cn("h-11", touched.firstName && errors.firstName && "border-destructive")}
          />
        </FormField>
        
        <FormField
          label="Last name"
          required
          error={touched.lastName ? errors.lastName : undefined}
        >
          <Input
            value={lastName}
            onChange={(e) => setIdentity({ lastName: e.target.value })}
            onBlur={() => handleBlur('lastName', lastName)}
            placeholder="Smith"
            autoComplete="family-name"
            enterKeyHint="next"
            aria-invalid={touched.lastName && !!errors.lastName}
            data-error={touched.lastName && errors.lastName ? "true" : undefined}
            className={cn("h-11", touched.lastName && errors.lastName && "border-destructive")}
          />
        </FormField>
      </div>

      {/* Email */}
      <FormField
        label="Email"
        required
        error={touched.email ? errors.email : undefined}
        icon={Mail}
        helpContent={{ title: "Why do we need your email?", content: "We'll send your certificate or prescription here. Your email is kept private." }}
      >
        <Input
          type="email"
          value={email}
          onChange={(e) => {
            setIdentity({ email: e.target.value })
            if (emailSuggestion) setEmailSuggestion(null)
          }}
          onBlur={handleEmailBlur}
          placeholder="jane@example.com"
          autoComplete="email"
          inputMode="email"
          enterKeyHint="next"
          aria-invalid={touched.email && !!errors.email}
          data-error={touched.email && errors.email ? "true" : undefined}
          className={cn("h-11", touched.email && errors.email && "border-destructive")}
        />
        {emailSuggestion && !errors.email && (
          <p className="text-xs text-muted-foreground mt-1" aria-live="polite">
            Did you mean{" "}
            <button
              type="button"
              // preventDefault on mousedown keeps focus on the active field so it
              // does not blur + re-render between mousedown and mouseup, which
              // would cancel the click and swallow the correction.
              onMouseDown={(e) => e.preventDefault()}
              onClick={acceptEmailSuggestion}
              className="font-medium text-primary underline underline-offset-2 hover:opacity-80"
            >
              {emailSuggestion}
            </button>
            ?
          </p>
        )}
        {relayEmailNote && !emailSuggestion && !errors.email && (
          <p className="text-xs text-muted-foreground mt-1.5 flex items-start gap-1.5" aria-live="polite">
            <span className="inline-block w-1 h-1 rounded-full bg-primary mt-1.5 shrink-0" />
            {relayEmailNote}
          </p>
        )}
      </FormField>

      {/* Date of birth */}
      <FormField
        label="Date of birth"
        required
        error={touched.dob ? errors.dob : undefined}
        icon={Calendar}
        helpContent={{ title: "Why do we need your date of birth?", content: "Required for your medical record. Our services are only available to patients aged 18+." }}
      >
        <Input
          autoComplete="bday"
          enterKeyHint="next"
          aria-invalid={touched.dob && !!errors.dob}
          data-error={touched.dob && errors.dob ? "true" : undefined}
          className={cn("h-11 tabular-nums", touched.dob && errors.dob && "border-destructive")}
          type="text"
          inputMode="numeric"
          maxLength={10}
          placeholder={DATE_OF_BIRTH_PLACEHOLDER}
          value={dobInput}
          onChange={(e) => handleDateOfBirthChange(e.target.value)}
          onBlur={() => handleBlur('dob', dob)}
        />
      </FormField>

      {/* Sex - required for eScript generation */}
      {needsPrescriptionDetails && (
        <FormField
          label="Sex"
          required
          icon={Users}
          id="sex-select-trigger"
          error={touched.sex ? errors.sex : undefined}
          helpContent={{ title: "Why do we ask this?", content: "Required for eScript generation. Select the option that matches your Medicare record." }}
        >
          <Select
            value={sex}
            onValueChange={(val) => {
              setAnswer("sex", val)
              setErrors((prev) => {
                const { sex: _sex, ...rest } = prev
                return rest
              })
            }}
          >
            <SelectTrigger
              id="sex-select-trigger"
              aria-invalid={touched.sex && !sex ? true : undefined}
              data-error={touched.sex && errors.sex ? "true" : undefined}
              className={cn("h-11", touched.sex && !sex && "border-destructive")}
            >
              <SelectValue placeholder="Select..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="M">Male</SelectItem>
              <SelectItem value="F">Female</SelectItem>
              <SelectItem value="I">Intersex / Indeterminate</SelectItem>
              <SelectItem value="N">Prefer not to say</SelectItem>
            </SelectContent>
          </Select>
        </FormField>
      )}

      {/* Phone - required for prescriptions and consults */}
      {needsPhone && (
        <FormField
          label="Mobile phone"
          required
          error={touched.phone ? errors.phone : undefined}
          icon={Phone}
        >
          <Input
            type="tel"
            value={phone}
            onChange={(e) => setIdentity({ phone: e.target.value })}
            onBlur={() => handleBlur('phone', phone)}
            placeholder="0412 345 678"
            autoComplete="tel"
            enterKeyHint="next"
            inputMode="tel"
            aria-invalid={touched.phone && !!errors.phone}
            data-error={touched.phone && errors.phone ? "true" : undefined}
            className={cn("h-11", touched.phone && errors.phone && "border-destructive")}
          />
          <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1.5">
            <span className="inline-block w-1 h-1 rounded-full bg-primary" />
            Your doctor can contact you here if needed
          </p>
        </FormField>
      )}

      {/* Medicare or IHI - required for prescribing pathways */}
      {needsPrescriptionDetails && (
        <div className="space-y-3">
          {/* Group divider so the prescribing-identity fields read as one set
              with a clear rationale, not a wall of independent asks. */}
          <div className="space-y-0.5 border-t border-border/50 pt-4">
            <Label className="text-sm font-medium">Prescribing details</Label>
            <p className="text-xs text-muted-foreground">
              Required for your eScript identity match. Kept private and used only for the prescription record.
            </p>
          </div>
          <div
            role="radiogroup"
            aria-label="Choose Medicare or IHI"
            className="grid grid-cols-2 gap-2"
          >
            {IDENTITY_METHOD_OPTIONS.map((option) => {
              const selected = identityMethod === option.value
              return (
                <button
                  key={option.value}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => handleIdentityMethodChange(option.value)}
                  className={cn(
                    "min-h-14 rounded-xl border px-3 py-2.5 text-left transition-[background-color,border-color,color,box-shadow]",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
                    selected
                      ? "border-primary bg-primary/10 text-primary shadow-sm shadow-primary/10"
                      : "border-border bg-background text-foreground hover:border-primary/50 hover:bg-primary/5",
                  )}
                >
                  <span className="block text-sm font-semibold leading-tight">{option.label}</span>
                  <span className={cn(
                    "mt-0.5 block text-[11px] leading-snug",
                    selected ? "text-primary/80" : "text-muted-foreground",
                  )}>
                    {option.description}
                  </span>
                </button>
              )
            })}
          </div>
          {identityMethod === "medicare" ? (
            <>
              <FormField
                label="Medicare number"
                required={!ihiReady}
                error={touched.medicareNumber ? errors.medicareNumber : undefined}
                icon={CreditCard}
                helpContent={{ title: "Why do we need this?", content: "Used to issue the prescription under your name and match the eScript record." }}
              >
                <Input
                  type="text"
                  inputMode="numeric"
                  enterKeyHint="next"
                  value={medicareNumber}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/[^\d]/g, '').slice(0, 10)
                    setAnswer('medicareNumber', raw)
                    // Complete number typed → hop focus to the one-digit IRN
                    // so the card can be transcribed in one motion (P1.4). Skip
                    // the hop when the IRN is already filled (restored draft /
                    // back-nav): there's nothing to advance to, and yanking focus
                    // fires a synchronous blur on this field mid-onChange.
                    if (raw.length === 10 && medicareNumber.length < 10 && !medicareIrn) {
                      irnInputRef.current?.focus()
                    }
                    if (touched.medicareNumber) {
                      const result = validateMedicareNumber(raw)
                      setErrors((prev) => {
                        if (!raw.trim() && !ihiReady) return { ...prev, medicareNumber: 'Enter Medicare details or choose IHI' }
                        if (raw.trim() && !result.valid && !ihiReady) return { ...prev, medicareNumber: result.error || 'Invalid Medicare number' }
                        const { medicareNumber: _, medicareIrn: _medicareIrn, ...rest } = prev
                        return rest
                      })
                    }
                  }}
                  // Validate the live DOM value, not the `medicareNumber`
                  // closure: the 10th-digit auto-advance focuses the IRN
                  // synchronously inside onChange, firing this blur before React
                  // commits the 10th digit — the closure would still hold 9
                  // digits and stamp a false "Invalid Medicare number". Also
                  // covers browser autofill that skips onChange.
                  onBlur={(e) => handleBlur('medicareNumber', e.target.value.replace(/[^\d]/g, '').slice(0, 10))}
                  placeholder="10 digits"
                  autoComplete="off"
                  aria-invalid={touched.medicareNumber && !!errors.medicareNumber}
                  data-error={touched.medicareNumber && errors.medicareNumber ? "true" : undefined}
                  className={cn("h-11", touched.medicareNumber && errors.medicareNumber && "border-destructive")}
                />
                {medicareNumber.length === 10 && medicareValidation?.valid && !errors.medicareNumber && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatMedicareNumber(medicareNumber)}
                  </p>
                )}
              </FormField>

              {/* Single numeric input (P1.4) — the 9-button grid forced a scan
                  of nine tap targets for a one-digit fact the patient reads
                  straight off the card. Medicare auto-advances here on its
                  10th digit. */}
              <div className="space-y-1.5">
                <Label htmlFor="medicare-irn" className="text-xs">IRN</Label>
                <Input
                  id="medicare-irn"
                  ref={irnInputRef}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  pattern="[1-9]"
                  value={medicareIrn || ""}
                  onChange={(e) => {
                    const digit = e.target.value.replace(/[^1-9]/g, "").slice(0, 1)
                    setAnswer("medicareIrn", digit || undefined)
                    if (digit) {
                      setErrors((prev) => {
                        const { medicareIrn: _, ...withoutIrn } = prev
                        if (!medicareValidation?.valid) return withoutIrn

                        // Auto-advancing from the tenth Medicare digit blurs
                        // the number field before React commits that digit.
                        // A stale combined-identity error can therefore remain
                        // even though both values are now valid.
                        const { medicareNumber: _medicareNumber, ...rest } = withoutIrn
                        return rest
                      })
                    }
                  }}
                  onBlur={() => handleBlur("medicareIrn", medicareIrn || "")}
                  placeholder="1"
                  autoComplete="off"
                  enterKeyHint="next"
                  aria-invalid={touched.medicareIrn && !!errors.medicareIrn}
                  className={cn(
                    "h-11 w-16 text-center",
                    touched.medicareIrn && errors.medicareIrn && "border-destructive",
                  )}
                />
                <p className="text-xs text-muted-foreground">
                  The number next to your name on the card.
                </p>
                {touched.medicareIrn && errors.medicareIrn && (
                  <p className="text-xs text-destructive">{errors.medicareIrn}</p>
                )}
              </div>
            </>
          ) : (
            <FormField
              label="Individual Healthcare Identifier"
              required={!medicareIdentityReady}
              error={touched.ihiNumber ? errors.ihiNumber : undefined}
              icon={CreditCard}
              hint="Use this if you do not have Medicare"
              helpContent={{ title: "Where do I find my IHI?", content: "You can find your IHI in myGov or through the Healthcare Identifiers Service." }}
            >
              <Input
                type="text"
                inputMode="numeric"
                value={ihiNumber}
                onChange={(e) => {
                  const raw = e.target.value.replace(/[^\d]/g, '').slice(0, 16)
                  setAnswer('ihiNumber', raw)
                  if (touched.ihiNumber) {
                    const result = validateIHI(raw)
                    setErrors((prev) => {
                      if (!raw.trim() && !medicareIdentityReady) return { ...prev, ihiNumber: 'Enter your IHI' }
                      if (raw.trim() && !result.valid) return { ...prev, ihiNumber: result.error || 'Enter a valid IHI' }
                      const { ihiNumber: _, medicareNumber: _medicareNumber, ...rest } = prev
                      return rest
                    })
                  }
                }}
                onBlur={() => handleBlur('ihiNumber', ihiNumber)}
                placeholder="16 digits"
                autoComplete="off"
                aria-invalid={touched.ihiNumber && !!errors.ihiNumber}
                data-error={touched.ihiNumber && errors.ihiNumber ? "true" : undefined}
                className={cn("h-11", touched.ihiNumber && errors.ihiNumber && "border-destructive")}
              />
              {ihiNumber.length === 16 && ihiValidation?.valid && !errors.ihiNumber && (
                <p className="text-xs text-muted-foreground mt-1">
                  {formatIHI(ihiNumber)}
                </p>
              )}
            </FormField>
          )}
        </div>
      )}

      {/* Address - required for prescribing pathways */}
      {needsAddress && (
        <FormField
          label="Address"
          required
          error={touched.addressLine1 ? errors.addressLine1 : undefined}
          icon={MapPin}
        >
          <AddressAutocomplete
            value={addressLine1}
            onChange={handleAddressLineChange}
            onAddressSelect={handleAddressSelect}
            onVerificationChange={(verified) => {
              setAnswer("addressVerified", verified)
              if (!verified) setAnswer("addressProviderPlaceId", "")
            }}
            onManualEntry={handleManualAddressEntry}
            placeholder="Start typing your address..."
            className={cn("h-11", touched.addressLine1 && errors.addressLine1 && "border-destructive")}
          />
          {showManualAddressFields && (
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-[1fr_120px_120px]">
              <div className="space-y-1.5">
                <Label htmlFor="suburb" className="text-xs">Suburb</Label>
                <Input
                  id="suburb"
                  value={suburb}
                  onChange={(e) => setAnswer("suburb", e.target.value)}
                  onBlur={() => handleBlur('suburb', suburb)}
                  autoComplete="address-level2"
                  aria-invalid={touched.suburb && !!errors.suburb}
                  data-error={touched.suburb && errors.suburb ? "true" : undefined}
                  className={cn("h-10", touched.suburb && errors.suburb && "border-destructive")}
                />
                {touched.suburb && errors.suburb && (
                  <p className="text-xs text-destructive">{errors.suburb}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="state-select-trigger" className="text-xs">State</Label>
                <Select
                  value={state}
                  onValueChange={(val) => {
                    setAnswer("state", val)
                    setTouched((prev) => ({ ...prev, state: true }))
                  }}
                >
                  <SelectTrigger
                    id="state-select-trigger"
                    aria-invalid={touched.state && !!errors.state}
                    data-error={touched.state && errors.state ? "true" : undefined}
                    className={cn("h-10", touched.state && errors.state && "border-destructive")}
                  >
                    <SelectValue placeholder="State" />
                  </SelectTrigger>
                  <SelectContent>
                    {AUSTRALIAN_STATES.map((item) => (
                      <SelectItem key={item} value={item}>{item}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {touched.state && errors.state && (
                  <p className="text-xs text-destructive">{errors.state}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="postcode" className="text-xs">Postcode</Label>
                <Input
                  id="postcode"
                  value={postcode}
                  onChange={(e) => {
                    const nextPostcode = e.target.value.replace(/\D/g, "").slice(0, 4)
                    setAnswer("postcode", nextPostcode)
                    if (!state && nextPostcode.length === 4) {
                      const suggestedState = suggestStateFromPostcode(nextPostcode)
                      if (suggestedState) setAnswer("state", suggestedState)
                    }
                  }}
                  onBlur={() => handleBlur('postcode', postcode)}
                  inputMode="numeric"
                  autoComplete="postal-code"
                  aria-invalid={touched.postcode && !!errors.postcode}
                  data-error={touched.postcode && errors.postcode ? "true" : undefined}
                  className={cn("h-10", touched.postcode && errors.postcode && "border-destructive")}
                />
                {touched.postcode && errors.postcode && (
                  <p className="text-xs text-destructive">{errors.postcode}</p>
                )}
              </div>
            </div>
          )}
        </FormField>
      )}

      {/* Height/Weight/BMI - ED subtype only */}
      {consultSubtype === "ed" && (
        <div className="space-y-3">
          <Label className="text-sm font-medium">Height &amp; weight</Label>
          <p className="text-xs text-muted-foreground -mt-1">
            Helps your doctor assess your overall health profile.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="heightCm" className="text-xs">Height (cm)</Label>
              <Input
                id="heightCm"
                type="number"
                inputMode="numeric"
                placeholder="175"
                value={(answers.heightCm as string) || ""}
                onChange={(e) => setAnswer("heightCm", e.target.value)}
                min={100}
                max={250}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="weightKg" className="text-xs">Weight (kg)</Label>
              <Input
                id="weightKg"
                type="number"
                inputMode="numeric"
                placeholder="80"
                value={(answers.weightKg as string) || ""}
                onChange={(e) => setAnswer("weightKg", e.target.value)}
                min={30}
                max={300}
              />
            </div>
          </div>
          {bmi !== null && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-2xl border border-border/50 bg-white dark:bg-card shadow-md shadow-primary/[0.06] text-sm" aria-live="polite">
              <span className="text-muted-foreground">BMI:</span>
              <span className="font-medium">{bmi}</span>
              <span className={cn(
                "text-xs",
                bmi < 18.5 ? "text-warning" :
                bmi < 25 ? "text-success" :
                bmi < 30 ? "text-warning" :
                "text-destructive"
              )}>
                {bmi < 18.5 ? "Underweight" :
                 bmi < 25 ? "Normal weight" :
                 bmi < 30 ? "Overweight" :
                 "Obese"}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Data security reassurance */}
      <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 py-1 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <Lock className="w-3 h-3 text-primary" />
          AES-256 encrypted
        </span>
        <span className="flex items-center gap-1">
          <CreditCard className="w-3 h-3 text-primary" />
          Payments by Stripe
        </span>
      </div>

      {/* Continue button - always clickable so validate() fires and surfaces errors */}
      <Button
        data-intake-primary-action="true"
        data-intake-primary-label={primaryActionLabel}
        data-intake-primary-ready={canContinue ? "true" : "false"}
        onClick={handleNext}
        variant={canContinue ? "default" : "secondary"}
        className="w-full h-12 max-sm:hidden"
      >
        {canContinue ? (
          <>
            {primaryActionLabel}
            <ArrowRight className="w-4 h-4" />
          </>
        ) : (
          primaryActionLabel
        )}
      </Button>
    </div>
  )
}
