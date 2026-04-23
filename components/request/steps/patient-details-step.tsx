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

import { ArrowRight,Calendar, CreditCard, EyeOff, Lock, Mail, MapPin, Phone, Sparkles, User, Users } from "lucide-react"
import { useCallback, useEffect, useMemo,useState } from "react"

import { usePostHog } from "@/components/providers/posthog-provider"
import { AddressAutocomplete, type AddressComponents } from "@/components/ui/address-autocomplete"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { setEnhancedConversionsData } from "@/lib/analytics/conversion-tracking"
import { useKeyboardNavigation } from "@/lib/hooks/use-keyboard-navigation"
import { getSavedIdentity, saveIdentity } from "@/lib/request/preferences"
import type { UnifiedServiceType } from "@/lib/request/step-registry"
import { validateDOB, validateEmail, validateName,validatePhone } from "@/lib/request/validation"
import { cn } from "@/lib/utils"
import { formatMedicareNumber,validateMedicareNumber } from "@/lib/validation/medicare"

import { FormField } from "../form-field"
import { useRequestStore } from "../store"

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
  const [showAutofillBanner, setShowAutofillBanner] = useState(false)
  const [savedData, setSavedData] = useState<ReturnType<typeof getSavedIdentity>>(undefined)
  
  // Address state from answers
  const addressLine1 = (answers.addressLine1 as string) || ""
  const suburb = (answers.suburb as string) || ""
  const state = (answers.state as string) || ""
  const postcode = (answers.postcode as string) || ""
  const medicareNumber = (answers.medicareNumber as string) || ""
  const sex = (answers.sex as string) || ""
  const consultSubtype = answers.consultSubtype as string | undefined

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
      setShowAutofillBanner(false)
    }
  }, [savedData, setIdentity, setAnswer])
  
  const handleAddressSelect = (address: AddressComponents) => {
    setAnswer("addressLine1", address.addressLine1 || address.fullAddress)
    setAnswer("suburb", address.suburb)
    setAnswer("state", address.state)
    setAnswer("postcode", address.postcode)
    setAnswer("addressVerified", address.isVerified || false)
  }

  const needsPhone = serviceType === 'prescription' || serviceType === 'repeat-script' || serviceType === 'consult'
  const needsPrescriptionDetails = serviceType === 'prescription' || serviceType === 'repeat-script'
  // Show address for prescriptions (required by prescribing software) and consults
  const showAddress = serviceType !== 'med-cert'
  const addressRequired = needsPrescriptionDetails

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
        error = validateDOB(value)
        break
      case 'phone':
        error = validatePhone(value, needsPhone)
        break
      case 'medicareNumber':
        if (needsPrescriptionDetails && value) {
          const result = validateMedicareNumber(value)
          error = result.valid ? null : (result.error || 'Invalid Medicare number')
        } else if (needsPrescriptionDetails && !value) {
          error = 'Your Medicare number is needed to issue the prescription'
        }
        break
      case 'addressLine1':
        if (addressRequired && !value?.trim()) {
          error = 'Your address is needed to issue the prescription'
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
  }, [needsPhone, needsPrescriptionDetails, addressRequired])
  
  const handleBlur = (field: string, value: string | undefined) => {
    setTouched(prev => ({ ...prev, [field]: true }))
    validateField(field, value)
  }

  const validate = () => {
    const newErrors: Record<string, string> = {}
    
    const firstNameError = validateName(firstName, 'First name')
    if (firstNameError) newErrors.firstName = firstNameError
    
    const lastNameError = validateName(lastName, 'Last name')
    if (lastNameError) newErrors.lastName = lastNameError
    
    const emailError = validateEmail(email)
    if (emailError) newErrors.email = emailError
    
    const dobError = validateDOB(dob)
    if (dobError) newErrors.dob = dobError
    
    const phoneError = validatePhone(phone, needsPhone)
    if (phoneError) newErrors.phone = phoneError

    if (needsPrescriptionDetails) {
      if (!medicareNumber.trim()) {
        newErrors.medicareNumber = 'Your Medicare number is needed to issue the prescription'
      } else {
        const medicareResult = validateMedicareNumber(medicareNumber)
        if (!medicareResult.valid) newErrors.medicareNumber = medicareResult.error || 'Invalid Medicare number'
      }
      if (!addressLine1.trim()) {
        newErrors.addressLine1 = 'Your address is needed to issue the prescription'
      }
    }

    setErrors(newErrors)
    setTouched({ firstName: true, lastName: true, email: true, dob: true, phone: true, medicareNumber: true, addressLine1: true })
    return Object.keys(newErrors).length === 0
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
    } else {
      // Move AT focus to the first invalid field so screen readers announce
      // it and keyboard users don't have to re-tab. focus() scrolls into view
      // by default, so no separate scroll call needed.
      requestAnimationFrame(() => {
        const firstError = document.querySelector<HTMLElement>(
          '[aria-invalid="true"], [data-error="true"]'
        )
        firstError?.focus({ preventScroll: false })
      })
    }
  }

  const isComplete = firstName && lastName && email && dob && (!needsPhone || phone) && (!needsPrescriptionDetails || (medicareNumber && addressLine1 && sex))
  const hasNoErrors = Object.keys(errors).length === 0
  const canContinue = isComplete && hasNoErrors
  
  // Keyboard navigation
  useKeyboardNavigation({
    onNext: canContinue ? handleNext : undefined,
    enabled: Boolean(canContinue),
  })

  return (
    <div className="space-y-5">
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

      {/* Info alert */}
      <Alert variant="default" className="border-primary/20 bg-primary/5">
        <User className="w-4 h-4" />
        <AlertDescription className="text-xs">
          We need these details to create your medical record and send you your result.
        </AlertDescription>
      </Alert>

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
          onChange={(e) => setIdentity({ email: e.target.value })}
          onBlur={() => handleBlur('email', email)}
          placeholder="jane@example.com"
          autoComplete="email"
          inputMode="email"
          aria-invalid={touched.email && !!errors.email}
          data-error={touched.email && errors.email ? "true" : undefined}
          className={cn("h-11", touched.email && errors.email && "border-destructive")}
        />
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
          type="date"
          value={dob}
          onChange={(e) => setIdentity({ dob: e.target.value })}
          onBlur={() => handleBlur('dob', dob)}
          autoComplete="bday"
          aria-invalid={touched.dob && !!errors.dob}
          data-error={touched.dob && errors.dob ? "true" : undefined}
          className={cn("h-11", touched.dob && errors.dob && "border-destructive")}
          max={new Date(Date.now() - 18 * 365.25 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
        />
      </FormField>

      {/* Sex - required for prescriptions (eScript generation) */}
      {needsPrescriptionDetails && (
        <FormField
          label="Sex"
          required
          icon={Users}
          id="sex-select-trigger"
          helpContent={{ title: "Why do we ask this?", content: "Required by Australian prescribing regulations for eScript generation. Select the option that matches your Medicare record." }}
        >
          <Select value={sex} onValueChange={(val) => setAnswer("sex", val)}>
            <SelectTrigger
              id="sex-select-trigger"
              aria-invalid={touched.sex && !sex ? true : undefined}
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

      {/* Phone - required for prescriptions */}
      <FormField
        label="Mobile phone"
        required={needsPhone}
        error={touched.phone ? errors.phone : undefined}
        icon={Phone}
        hint={needsPhone ? undefined : "Optional - we'll only call if your doctor needs to follow up"}
      >
        <Input
          type="tel"
          value={phone}
          onChange={(e) => setIdentity({ phone: e.target.value })}
          onBlur={() => handleBlur('phone', phone)}
          placeholder="0412 345 678"
          autoComplete="tel"
          inputMode="tel"
          aria-invalid={touched.phone && !!errors.phone}
          data-error={touched.phone && errors.phone ? "true" : undefined}
          className={cn("h-11", touched.phone && errors.phone && "border-destructive")}
        />
        {needsPhone && (
          <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1.5">
            <span className="inline-block w-1 h-1 rounded-full bg-primary" />
            Your prescription will be sent to this number as a text message
          </p>
        )}
      </FormField>

      {/* Medicare number - required for prescriptions */}
      {needsPrescriptionDetails && (
        <FormField
          label="Medicare number"
          required
          error={touched.medicareNumber ? errors.medicareNumber : undefined}
          icon={CreditCard}
          helpContent={{ title: "Why do we need your Medicare number?", content: "Required to issue your prescription under your name. Your Medicare details are encrypted and never shared." }}
        >
          <Input
            type="text"
            inputMode="numeric"
            value={medicareNumber}
            onChange={(e) => {
              const raw = e.target.value.replace(/[^\d]/g, '').slice(0, 10)
              setAnswer('medicareNumber', raw)
            }}
            onBlur={() => handleBlur('medicareNumber', medicareNumber)}
            placeholder="1234 56789 0"
            autoComplete="off"
            aria-invalid={touched.medicareNumber && !!errors.medicareNumber}
            data-error={touched.medicareNumber && errors.medicareNumber ? "true" : undefined}
            className={cn("h-11", touched.medicareNumber && errors.medicareNumber && "border-destructive")}
          />
          {medicareNumber.length === 10 && !errors.medicareNumber && (
            <p className="text-xs text-muted-foreground mt-1">
              {formatMedicareNumber(medicareNumber)}
            </p>
          )}
        </FormField>
      )}

      {/* Address - required for prescriptions, optional for consults */}
      {showAddress && (
        <FormField
          label="Address"
          required={addressRequired}
          error={touched.addressLine1 ? errors.addressLine1 : undefined}
          hint={addressRequired ? undefined : "Optional - required if you need a prescription"}
          icon={MapPin}
        >
          <AddressAutocomplete
            value={addressLine1}
            onChange={(val) => setAnswer("addressLine1", val)}
            onAddressSelect={handleAddressSelect}
            placeholder="Start typing your address..."
            className={cn("h-11", touched.addressLine1 && errors.addressLine1 && "border-destructive")}
          />
          {(suburb || state || postcode) && (
            <p className="text-xs text-muted-foreground mt-1">
              {[suburb, state, postcode].filter(Boolean).join(", ")}
            </p>
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
      <div className="flex items-center justify-center gap-3 text-xs text-muted-foreground py-1">
        <span className="flex items-center gap-1">
          <Lock className="w-3 h-3 text-primary" />
          256-bit encrypted
        </span>
        <span className="flex items-center gap-1">
          <EyeOff className="w-3 h-3 text-primary" />
          Never shared with third parties
        </span>
      </div>

      {/* Continue button - always clickable so validate() fires and surfaces errors */}
      <Button
        onClick={handleNext}
        variant={canContinue ? "default" : "secondary"}
        className="w-full h-12"
      >
        {canContinue ? (
          <>
            Review your request
            <ArrowRight className="w-4 h-4" />
          </>
        ) : (
          "Continue"
        )}
      </Button>
    </div>
  )
}
