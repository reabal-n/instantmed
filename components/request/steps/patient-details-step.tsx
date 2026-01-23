"use client"

/**
 * Patient Details Step - Identity and contact information
 * Collects name, email, DOB, phone for guest checkout or profile update
 */

import { useState } from "react"
import { Info, User, Mail, Phone, Calendar, MapPin } from "lucide-react"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { AddressAutocomplete, type AddressComponents } from "@/components/ui/address-autocomplete"
import { useRequestStore } from "../store"
import type { UnifiedServiceType } from "@/lib/request/step-registry"

interface PatientDetailsStepProps {
  serviceType: UnifiedServiceType
  onNext: () => void
  onBack: () => void
  onComplete: () => void
}

function FormField({
  label,
  required,
  error,
  children,
  hint,
  helpText,
  icon: Icon,
}: {
  label: string
  required?: boolean
  error?: string
  children: React.ReactNode
  hint?: string
  helpText?: string
  icon?: React.ElementType
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        {Icon && <Icon className="w-4 h-4 text-muted-foreground" />}
        <Label className="text-sm font-medium">
          {label}
          {required && <span className="text-destructive ml-0.5">*</span>}
        </Label>
        {helpText && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button type="button" className="text-muted-foreground hover:text-foreground transition-colors">
                  <Info className="w-3.5 h-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p className="text-sm">{helpText}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      {children}
      {error && <p className="text-xs text-destructive mt-1">{error}</p>}
    </div>
  )
}

export default function PatientDetailsStep({ serviceType, onNext }: PatientDetailsStepProps) {
  const { firstName, lastName, email, phone, dob, answers, setIdentity, setAnswer } = useRequestStore()
  const [errors, setErrors] = useState<Record<string, string>>({})
  
  // Address state from answers
  const addressLine1 = (answers.addressLine1 as string) || ""
  const suburb = (answers.suburb as string) || ""
  const state = (answers.state as string) || ""
  const postcode = (answers.postcode as string) || ""
  
  const handleAddressSelect = (address: AddressComponents) => {
    setAnswer("addressLine1", address.addressLine1 || address.fullAddress)
    setAnswer("suburb", address.suburb)
    setAnswer("state", address.state)
    setAnswer("postcode", address.postcode)
    setAnswer("addressVerified", address.isVerified || false)
  }

  const needsPhone = serviceType === 'prescription' || serviceType === 'repeat-script'

  const validate = () => {
    const newErrors: Record<string, string> = {}
    
    if (!firstName?.trim()) newErrors.firstName = "First name is required"
    if (!lastName?.trim()) newErrors.lastName = "Last name is required"
    if (!email?.trim()) {
      newErrors.email = "Email is required"
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = "Please enter a valid email address"
    }
    if (!dob) {
      newErrors.dob = "Date of birth is required"
    } else {
      const birthDate = new Date(dob)
      const age = (Date.now() - birthDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000)
      if (age < 18) {
        newErrors.dob = "You must be 18 or older to use this service"
      }
    }
    if (needsPhone && !phone?.trim()) {
      newErrors.phone = "Phone number is required for prescription requests (eScript delivery)"
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleNext = () => {
    if (validate()) {
      onNext()
    }
  }

  const isComplete = firstName && lastName && email && dob && (!needsPhone || phone)

  return (
    <div className="space-y-5 animate-in fade-in">
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
          error={errors.firstName}
          icon={User}
        >
          <Input
            value={firstName}
            onChange={(e) => setIdentity({ firstName: e.target.value })}
            placeholder="Jane"
            className="h-11"
          />
        </FormField>
        
        <FormField
          label="Last name"
          required
          error={errors.lastName}
        >
          <Input
            value={lastName}
            onChange={(e) => setIdentity({ lastName: e.target.value })}
            placeholder="Smith"
            className="h-11"
          />
        </FormField>
      </div>

      {/* Email */}
      <FormField
        label="Email"
        required
        error={errors.email}
        icon={Mail}
        helpText="We'll send your certificate or confirmation here"
      >
        <Input
          type="email"
          value={email}
          onChange={(e) => setIdentity({ email: e.target.value })}
          placeholder="jane@example.com"
          className="h-11"
        />
      </FormField>

      {/* Date of birth */}
      <FormField
        label="Date of birth"
        required
        error={errors.dob}
        icon={Calendar}
        helpText="Required for your medical record. Must be 18+"
      >
        <Input
          type="date"
          value={dob}
          onChange={(e) => setIdentity({ dob: e.target.value })}
          className="h-11"
          max={new Date(Date.now() - 18 * 365.25 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
        />
      </FormField>

      {/* Phone - required for prescriptions */}
      <FormField
        label="Mobile phone"
        required={needsPhone}
        error={errors.phone}
        icon={Phone}
        helpText={needsPhone 
          ? "Required for eScript delivery via SMS" 
          : "Optional - for urgent updates only"
        }
      >
        <Input
          type="tel"
          value={phone}
          onChange={(e) => setIdentity({ phone: e.target.value })}
          placeholder="0412 345 678"
          className="h-11"
        />
      </FormField>

      {/* Address - for certificate delivery */}
      <FormField
        label="Address"
        hint="Optional - for certificate delivery if required"
        icon={MapPin}
      >
        <AddressAutocomplete
          value={addressLine1}
          onChange={(val) => setAnswer("addressLine1", val)}
          onAddressSelect={handleAddressSelect}
          placeholder="Start typing your address..."
          className="h-11"
        />
        {(suburb || state || postcode) && (
          <p className="text-xs text-muted-foreground mt-1">
            {[suburb, state, postcode].filter(Boolean).join(", ")}
          </p>
        )}
      </FormField>

      {/* Continue button */}
      <Button 
        onClick={handleNext} 
        className="w-full h-12 mt-4"
        disabled={!isComplete}
      >
        Continue
      </Button>
    </div>
  )
}
