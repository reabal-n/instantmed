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

import { useState, useEffect, useCallback } from "react"
import { User, Mail, Phone, Calendar, MapPin, Sparkles, Lock, EyeOff, CreditCard } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AddressAutocomplete, type AddressComponents } from "@/components/ui/address-autocomplete"
import { useRequestStore } from "../store"
import { FormField } from "../form-field"
import { getSavedIdentity, saveIdentity } from "@/lib/request/preferences"
import { validateEmail, validatePhone, validateDOB, validateName } from "@/lib/request/validation"
import { validateMedicareNumber, formatMedicareNumber } from "@/lib/validation/medicare"
import { useKeyboardNavigation } from "@/hooks/use-keyboard-navigation"
import { setEnhancedConversionsData } from "@/lib/analytics/conversion-tracking"
import type { UnifiedServiceType } from "@/lib/request/step-registry"

interface PatientDetailsStepProps {
  serviceType: UnifiedServiceType
  onNext: () => void
  onBack: () => void
  onComplete: () => void
}

export default function PatientDetailsStep({ serviceType, onNext }: PatientDetailsStepProps) {
  const { firstName, lastName, email, phone, dob, answers, setIdentity, setAnswer } = useRequestStore()
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
          error = 'Medicare number is required for prescriptions'
        }
        break
      case 'addressLine1':
        if (addressRequired && !value?.trim()) {
          error = 'Address is required for prescriptions'
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
        newErrors.medicareNumber = 'Medicare number is required for prescriptions'
      } else {
        const medicareResult = validateMedicareNumber(medicareNumber)
        if (!medicareResult.valid) newErrors.medicareNumber = medicareResult.error || 'Invalid Medicare number'
      }
      if (!addressLine1.trim()) {
        newErrors.addressLine1 = 'Address is required for prescriptions'
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
      onNext()
    } else {
      // Scroll to first error field for better UX
      requestAnimationFrame(() => {
        const firstError = document.querySelector('[data-error="true"], .border-destructive, [aria-invalid="true"]')
        firstError?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      })
    }
  }

  const isComplete = firstName && lastName && email && dob && (!needsPhone || phone) && (!needsPrescriptionDetails || (medicareNumber && addressLine1))
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
                size="sm"
                variant="ghost"
                className="h-7 px-2 text-xs"
                onClick={() => setShowAutofillBanner(false)}
              >
                No thanks
              </Button>
              <Button
                size="sm"
                className="h-7 px-3 text-xs"
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
          This information is required for your medical record and to deliver your result.
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
            data-error={touched.firstName && errors.firstName ? "true" : undefined}
            className={`h-11 ${touched.firstName && errors.firstName ? 'border-destructive' : ''}`}
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
            data-error={touched.lastName && errors.lastName ? "true" : undefined}
            className={`h-11 ${touched.lastName && errors.lastName ? 'border-destructive' : ''}`}
          />
        </FormField>
      </div>

      {/* Email */}
      <FormField
        label="Email"
        required
        error={touched.email ? errors.email : undefined}
        icon={Mail}
        helpContent={{ title: "Why do we need your email?", content: "We'll send your certificate or confirmation here. Your email is kept private." }}
      >
        <Input
          type="email"
          value={email}
          onChange={(e) => setIdentity({ email: e.target.value })}
          onBlur={() => handleBlur('email', email)}
          placeholder="jane@example.com"
          data-error={touched.email && errors.email ? "true" : undefined}
          className={`h-11 ${touched.email && errors.email ? 'border-destructive' : ''}`}
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
          data-error={touched.dob && errors.dob ? "true" : undefined}
          className={`h-11 ${touched.dob && errors.dob ? 'border-destructive' : ''}`}
          max={new Date(Date.now() - 18 * 365.25 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
        />
      </FormField>

      {/* Phone - required for prescriptions */}
      <FormField
        label="Mobile phone"
        required={needsPhone}
        error={touched.phone ? errors.phone : undefined}
        icon={Phone}
        hint={needsPhone ? undefined : "Optional - we only contact you if there's an urgent issue"}
      >
        <Input
          type="tel"
          value={phone}
          onChange={(e) => setIdentity({ phone: e.target.value })}
          onBlur={() => handleBlur('phone', phone)}
          placeholder="0412 345 678"
          data-error={touched.phone && errors.phone ? "true" : undefined}
          className={`h-11 ${touched.phone && errors.phone ? 'border-destructive' : ''}`}
        />
        {needsPhone && (
          <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1.5">
            <span className="inline-block w-1 h-1 rounded-full bg-primary" />
            Your eScript will be sent to this number via SMS
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
          helpContent={{ title: "Why do we need your Medicare number?", content: "Required by prescribing software to generate your eScript. Your Medicare details are encrypted and never shared." }}
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
            data-error={touched.medicareNumber && errors.medicareNumber ? "true" : undefined}
            className={`h-11 ${touched.medicareNumber && errors.medicareNumber ? 'border-destructive' : ''}`}
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
          hint={addressRequired ? undefined : "Optional - for prescription or referral delivery"}
          icon={MapPin}
        >
          <AddressAutocomplete
            value={addressLine1}
            onChange={(val) => setAnswer("addressLine1", val)}
            onAddressSelect={handleAddressSelect}
            placeholder="Start typing your address..."
            className={`h-11 ${touched.addressLine1 && errors.addressLine1 ? 'border-destructive' : ''}`}
          />
          {(suburb || state || postcode) && (
            <p className="text-xs text-muted-foreground mt-1">
              {[suburb, state, postcode].filter(Boolean).join(", ")}
            </p>
          )}
        </FormField>
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

      {/* Continue button */}
      <Button
        onClick={handleNext}
        className="w-full h-12"
        disabled={!canContinue}
      >
        Continue
      </Button>
    </div>
  )
}
