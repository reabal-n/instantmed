"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import {
  Phone,
  MapPin,
  ShieldCheck,
  AlertTriangle,
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/uix"
import { Switch } from "@/components/ui/switch"
import { AddressAutocomplete, type AddressComponents } from "@/components/ui/address-autocomplete"
import { DataSecurityStrip } from "@/components/checkout/trust-badges"
import { ButtonSpinner } from "@/components/ui/unified-skeleton"
import { usePanel } from "@/components/panels"
import { cn } from "@/lib/utils"
import { validateAustralianPhone } from "@/lib/validation/australian-phone"
import { validateMedicareNumber, validateMedicareExpiry } from "@/lib/validation/medicare"
import { validatePostcodeState } from "@/lib/validation/australian-address"
import {
  updatePhoneAction,
  updateAddressAction,
  updateMedicareAction,
} from "@/app/actions/profile-todo"
import type { ProfileData } from "./profile-todo-card"
import type { AustralianState } from "@/types/db"

// ─── Constants ───────────────────────────────────────────────────────────────

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
const currentYear = new Date().getFullYear()
const YEARS = Array.from({ length: 11 }, (_, i) => currentYear + i)

// ─── Shared Styles ───────────────────────────────────────────────────────────

const pillActive =
  "bg-primary text-primary-foreground shadow-sm"
const pillInactive =
  "bg-muted/50 text-foreground hover:bg-muted border border-border"

// ─── Phone Drawer ────────────────────────────────────────────────────────────

interface PhoneDrawerProps {
  profileData: ProfileData
}

export function PhoneDrawerContent({ profileData }: PhoneDrawerProps) {
  const { closePanel } = usePanel()
  const [phone, setPhone] = useState(profileData.phone || "")
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setError(null)

    // Client-side validation
    const validation = validateAustralianPhone(phone)
    if (!validation.valid) {
      setError(validation.error || "Please enter a valid Australian phone number")
      return
    }

    setSaving(true)
    const result = await updatePhoneAction(profileData.profileId, phone)
    setSaving(false)

    if (result.success) {
      closePanel()
    } else {
      setError(result.fieldErrors?.phone || result.error || "Something went wrong")
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Phone className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h3 className="font-semibold text-foreground">Phone number</h3>
          <p className="text-sm text-muted-foreground">
            Required for prescriptions & consultations
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <label htmlFor="phone-input" className="text-sm font-medium text-foreground">
          Australian mobile or landline
        </label>
        <Input
          id="phone-input"
          type="tel"
          placeholder="0412 345 678"
          value={phone}
          onChange={(e) => {
            setPhone(e.target.value)
            if (error) setError(null)
          }}
          className={cn("h-12", error && "input-error")}
          startContent={<Phone className="h-4 w-4 text-muted-foreground" />}
          autoFocus
        />
        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}
        <p className="text-xs text-muted-foreground">
          We&apos;ll only use this to contact you about your requests
        </p>
      </div>

      <Button
        onClick={handleSave}
        disabled={saving || !phone.trim()}
        className="w-full h-12"
      >
        {saving ? <ButtonSpinner /> : "Save phone number"}
      </Button>
    </div>
  )
}

// ─── Address Drawer ──────────────────────────────────────────────────────────

interface AddressDrawerProps {
  profileData: ProfileData
}

export function AddressDrawerContent({ profileData }: AddressDrawerProps) {
  const { closePanel } = usePanel()
  const [addressLine1, setAddressLine1] = useState(profileData.addressLine1 || "")
  const [suburb, setSuburb] = useState(profileData.suburb || "")
  const [state, setState] = useState<AustralianState | null>(profileData.state || null)
  const [postcode, setPostcode] = useState(profileData.postcode || "")
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  const validate = (): boolean => {
    const errs: Record<string, string> = {}
    if (!addressLine1.trim()) errs.addressLine1 = "Street address is required"
    if (!suburb.trim()) errs.suburb = "Suburb is required"
    if (!state) errs.state = "Please select your state"
    if (!postcode.trim()) {
      errs.postcode = "Postcode is required"
    } else if (!/^\d{4}$/.test(postcode)) {
      errs.postcode = "Enter a valid 4-digit postcode"
    } else if (state) {
      const result = validatePostcodeState(postcode, state)
      if (!result.valid) errs.postcode = result.error || "Postcode doesn't match state"
    }
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSave = async () => {
    if (!validate() || !state) return

    setSaving(true)
    const result = await updateAddressAction(profileData.profileId, {
      addressLine1,
      suburb,
      state,
      postcode,
    })
    setSaving(false)

    if (result.success) {
      closePanel()
    } else if (result.fieldErrors) {
      setErrors(result.fieldErrors)
    } else {
      setErrors({ general: result.error || "Something went wrong" })
    }
  }

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <MapPin className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h3 className="font-semibold text-foreground">Home address</h3>
          <p className="text-sm text-muted-foreground">
            Required for prescriptions & referrals
          </p>
        </div>
      </div>

      {errors.general && (
        <p className="text-sm text-destructive bg-destructive/5 border border-destructive/20 rounded-lg p-3">
          {errors.general}
        </p>
      )}

      {/* Street address */}
      <div className="space-y-1.5">
        <label htmlFor="address-input" className="text-sm font-medium text-foreground">
          Street address
        </label>
        <AddressAutocomplete
          value={addressLine1}
          onChange={setAddressLine1}
          onAddressSelect={(address: AddressComponents) => {
            setAddressLine1(address.addressLine1 || address.fullAddress)
            setSuburb(address.suburb)
            setState(address.state as AustralianState)
            setPostcode(address.postcode)
            setErrors({})
          }}
          placeholder="Start typing your address..."
          className="h-12"
          error={errors.addressLine1}
        />
        {errors.addressLine1 && (
          <p className="text-sm text-destructive">{errors.addressLine1}</p>
        )}
      </div>

      {/* Suburb */}
      <div className="space-y-1.5">
        <label htmlFor="suburb-input" className="text-sm font-medium text-foreground">
          Suburb
        </label>
        <Input
          id="suburb-input"
          placeholder="Sydney"
          value={suburb}
          onChange={(e) => setSuburb(e.target.value)}
          className={cn("h-12", errors.suburb && "input-error")}
        />
        {errors.suburb && (
          <p className="text-sm text-destructive">{errors.suburb}</p>
        )}
      </div>

      {/* State pills */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-foreground">State</label>
        <div className="grid grid-cols-4 gap-2">
          {STATES.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => {
                setState(s)
                if (errors.state) setErrors((prev) => ({ ...prev, state: "" }))
              }}
              className={cn(
                "py-2.5 px-3 rounded-lg text-sm font-medium transition-all",
                state === s ? pillActive : pillInactive,
              )}
            >
              {s}
            </button>
          ))}
        </div>
        {errors.state && (
          <p className="text-sm text-destructive">{errors.state}</p>
        )}
      </div>

      {/* Postcode */}
      <div className="space-y-1.5">
        <label htmlFor="postcode-input" className="text-sm font-medium text-foreground">
          Postcode
        </label>
        <Input
          id="postcode-input"
          placeholder="2000"
          maxLength={4}
          value={postcode}
          onChange={(e) => setPostcode(e.target.value)}
          className={cn("h-12 w-32", errors.postcode && "input-error")}
        />
        {errors.postcode && (
          <p className="text-sm text-destructive">{errors.postcode}</p>
        )}
      </div>

      <Button
        onClick={handleSave}
        disabled={saving}
        className="w-full h-12"
      >
        {saving ? <ButtonSpinner /> : "Save address"}
      </Button>
    </div>
  )
}

// ─── Medicare Drawer ─────────────────────────────────────────────────────────

interface MedicareDrawerProps {
  profileData: ProfileData
}

export function MedicareDrawerContent({ profileData }: MedicareDrawerProps) {
  const { closePanel } = usePanel()

  // Parse existing medicare number into segments (if any)
  const existingNumber = profileData.medicareNumber || ""
  const initialDigits = existingNumber
    ? [
        existingNumber.slice(0, 2),
        existingNumber.slice(2, 4),
        existingNumber.slice(4, 6),
        existingNumber.slice(6, 8),
        existingNumber.slice(8, 10),
      ]
    : ["", "", "", "", ""]

  // Parse existing expiry
  const existingExpiry = profileData.medicareExpiry || ""
  const initialMonth = existingExpiry ? existingExpiry.slice(5, 7) : null
  const initialYear = existingExpiry ? Number(existingExpiry.slice(0, 4)) || null : null

  const [medicareDigits, setMedicareDigits] = useState<string[]>(initialDigits)
  const [irn, setIrn] = useState<number | null>(profileData.medicareIrn || null)
  const [expiryMonth, setExpiryMonth] = useState<string | null>(initialMonth)
  const [expiryYear, setExpiryYear] = useState<number | null>(initialYear)
  const [consentMyhr, setConsentMyhr] = useState(profileData.consentMyhr || false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [expiryWarning, setExpiryWarning] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const medicareNumber = medicareDigits.join("")

  const handleDigitChange = (index: number, value: string) => {
    if (value.length > 2) return
    if (value && !/^\d*$/.test(value)) return

    const newDigits = [...medicareDigits]
    newDigits[index] = value
    setMedicareDigits(newDigits)

    if (value.length === 2 && index < 4) {
      const nextInput = document.getElementById(`mc-drawer-${index + 1}`)
      nextInput?.focus()
    }
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && medicareDigits[index] === "" && index > 0) {
      const prevInput = document.getElementById(`mc-drawer-${index - 1}`)
      prevInput?.focus()
    }
  }

  const validate = (): boolean => {
    const errs: Record<string, string> = {}
    const hasMedicareData = medicareNumber.length > 0 || irn !== null || expiryMonth !== null || expiryYear !== null

    if (hasMedicareData) {
      if (medicareNumber.length > 0) {
        const result = validateMedicareNumber(medicareNumber)
        if (!result.valid) errs.medicare = result.error || "Invalid Medicare number"
      }
      if (medicareNumber.length >= 10 && !irn) {
        errs.irn = "Please select your IRN"
      }
      if (medicareNumber.length >= 10 && (!expiryMonth || !expiryYear)) {
        errs.expiry = "Please select expiry date"
      } else if (expiryMonth && expiryYear) {
        const expiryDate = `${expiryYear}-${expiryMonth}-01`
        const expiryValidation = validateMedicareExpiry(expiryDate)
        if (!expiryValidation.valid) {
          errs.expiry = expiryValidation.error || "Invalid expiry date"
        } else if (expiryValidation.isExpiringSoon) {
          setExpiryWarning("Your Medicare card is expiring soon. Please update it after this visit.")
        } else {
          setExpiryWarning(null)
        }
      }
    }

    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSave = async () => {
    if (!validate()) return

    setSaving(true)
    const medicareExpiry =
      expiryYear && expiryMonth ? `${expiryYear}-${expiryMonth}-01` : null

    const result = await updateMedicareAction(profileData.profileId, {
      medicareNumber: medicareNumber || null,
      medicareIrn: irn,
      medicareExpiry,
      consentMyhr,
    })
    setSaving(false)

    if (result.success) {
      closePanel()
    } else if (result.fieldErrors) {
      setErrors(result.fieldErrors)
    } else {
      setErrors({ general: result.error || "Something went wrong" })
    }
  }

  const handleSkip = () => {
    closePanel()
  }

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <ShieldCheck className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h3 className="font-semibold text-foreground">Medicare card</h3>
          <p className="text-sm text-muted-foreground">
            Optional — needed for prescriptions & referrals
          </p>
        </div>
      </div>

      <DataSecurityStrip variant="medicare" className="mb-2" />

      {errors.general && (
        <p className="text-sm text-destructive bg-destructive/5 border border-destructive/20 rounded-lg p-3">
          {errors.general}
        </p>
      )}

      {expiryWarning && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 text-sm text-amber-700 dark:text-amber-400 flex items-start gap-2"
        >
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{expiryWarning}</span>
        </motion.div>
      )}

      {/* Medicare Number - Segmented */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-foreground">Medicare number</label>
        <p className="text-xs text-muted-foreground">10-digit number from your card</p>
        <div className="flex gap-2 justify-center">
          {medicareDigits.map((digit, i) => (
            <Input
              key={i}
              id={`mc-drawer-${i}`}
              type="text"
              inputMode="numeric"
              maxLength={2}
              value={digit}
              onChange={(e) => handleDigitChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              className={cn(
                "w-14 h-12 text-center text-lg font-mono",
                errors.medicare && "input-error",
              )}
            />
          ))}
        </div>
        {errors.medicare && (
          <p className="text-sm text-destructive text-center">{errors.medicare}</p>
        )}
      </div>

      {/* IRN */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-foreground">
          IRN (number next to your name)
        </label>
        <div className="flex gap-2 justify-center">
          {IRNS.map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setIrn(n)}
              className={cn(
                "w-12 h-12 rounded-lg text-base font-semibold transition-all",
                irn === n ? pillActive : pillInactive,
              )}
            >
              {n}
            </button>
          ))}
        </div>
        {errors.irn && (
          <p className="text-sm text-destructive text-center">{errors.irn}</p>
        )}
      </div>

      {/* Expiry */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-foreground">Card expiry</label>
        <div className="space-y-2">
          <div className="grid grid-cols-6 gap-1.5">
            {MONTHS.map((m) => (
              <button
                key={m.value}
                type="button"
                onClick={() => setExpiryMonth(m.value)}
                className={cn(
                  "py-2 rounded-lg text-xs font-medium transition-all",
                  expiryMonth === m.value ? pillActive : pillInactive,
                )}
              >
                {m.label}
              </button>
            ))}
          </div>
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {YEARS.map((y) => (
              <button
                key={y}
                type="button"
                onClick={() => setExpiryYear(y)}
                className={cn(
                  "py-2 px-3 rounded-lg text-xs font-medium whitespace-nowrap transition-all shrink-0",
                  expiryYear === y ? pillActive : pillInactive,
                )}
              >
                {y}
              </button>
            ))}
          </div>
        </div>
        {errors.expiry && (
          <p className="text-sm text-destructive">{errors.expiry}</p>
        )}
      </div>

      {/* My Health Record Consent */}
      <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/30 border border-border">
        <Switch
          checked={consentMyhr}
          onCheckedChange={setConsentMyhr}
          id="myhr-consent"
        />
        <div>
          <label htmlFor="myhr-consent" className="text-sm font-medium text-foreground cursor-pointer">
            Upload to My Health Record
          </label>
          <p className="text-xs text-muted-foreground mt-0.5">
            Allow your documents to be uploaded to your My Health Record
          </p>
        </div>
      </div>

      <div className="flex gap-3">
        <Button
          variant="outline"
          onClick={handleSkip}
          className="flex-1 h-12"
        >
          Skip for now
        </Button>
        <Button
          onClick={handleSave}
          disabled={saving}
          className="flex-1 h-12"
        >
          {saving ? <ButtonSpinner /> : "Save"}
        </Button>
      </div>
    </div>
  )
}
