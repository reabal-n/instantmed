"use client"

import { Loader2, Pencil } from "lucide-react"
import { useRouter } from "next/navigation"
import { FormEvent, useMemo, useState, useTransition } from "react"
import { toast } from "sonner"

import { updateDoctorPatientAndSyncParchmentAction } from "@/app/doctor/patients/actions"
import { AddressAutocomplete, type AddressComponents } from "@/components/ui/address-autocomplete"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type {
  DoctorPatientCreateFieldErrors,
  DoctorPatientCreateInput,
} from "@/lib/doctor/doctor-patient-create"
import type { Profile } from "@/types/db"

const STATES = ["ACT", "NSW", "NT", "QLD", "SA", "TAS", "VIC", "WA"] as const

function monthInputValue(value: string | null | undefined): string {
  return value && /^\d{4}-\d{2}/.test(value) ? value.slice(0, 7) : ""
}

function patientFormValue(patient: Profile): DoctorPatientCreateInput {
  const fullName = patient.full_name?.trim()
    || [patient.first_name, patient.last_name].filter(Boolean).join(" ").trim()

  return {
    fullName,
    email: patient.email ?? "",
    dateOfBirth: patient.date_of_birth ?? "",
    sex: patient.sex ?? "",
    phone: patient.phone ?? "",
    medicareNumber: patient.medicare_number ?? "",
    medicareIrn: patient.medicare_irn ? String(patient.medicare_irn) : "",
    medicareExpiry: monthInputValue(patient.medicare_expiry),
    addressLine1: patient.address_line1 ?? "",
    suburb: patient.suburb ?? "",
    state: patient.state ?? "",
    postcode: patient.postcode ?? "",
  }
}

interface EditPatientDialogProps {
  patient: Profile
}

export function EditPatientDialog({ patient }: EditPatientDialogProps) {
  const router = useRouter()
  const initialForm = useMemo(() => patientFormValue(patient), [patient])
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<DoctorPatientCreateInput>(initialForm)
  const [fieldErrors, setFieldErrors] = useState<DoctorPatientCreateFieldErrors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [addressVerified, setAddressVerified] = useState(Boolean(initialForm.addressLine1))
  const [isPending, startTransition] = useTransition()

  const resetForm = () => {
    setForm(initialForm)
    setFieldErrors({})
    setFormError(null)
    setAddressVerified(Boolean(initialForm.addressLine1))
  }

  const setField = (field: keyof DoctorPatientCreateInput, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }))
    setFieldErrors(prev => {
      if (!prev[field]) return prev
      const next = { ...prev }
      delete next[field]
      return next
    })
    setFormError(null)
  }

  const setAddressFields = (address: AddressComponents) => {
    setForm(prev => ({
      ...prev,
      addressLine1: address.addressLine1 || address.fullAddress,
      suburb: address.suburb,
      state: address.state,
      postcode: address.postcode,
    }))
    setFieldErrors(prev => {
      const next = { ...prev }
      delete next.addressLine1
      delete next.suburb
      delete next.state
      delete next.postcode
      return next
    })
    setFormError(null)
    setAddressVerified(true)
  }

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen)
    if (nextOpen) resetForm()
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setFormError(null)

    if (!addressVerified) {
      const message = "Select the address from the suggestions before updating the patient."
      setFieldErrors(prev => ({ ...prev, addressLine1: message }))
      setFormError(message)
      toast.error(message)
      return
    }

    startTransition(async () => {
      const result = await updateDoctorPatientAndSyncParchmentAction(patient.id, form)

      if (!result.success) {
        setFieldErrors(result.fieldErrors ?? {})
        const message = result.error || "Could not update patient"
        setFormError(message)
        toast.error(message)
        return
      }

      toast.success("Patient updated and synced to Parchment")
      setFieldErrors({})
      setFormError(null)
      setOpen(false)
      router.refresh()
    })
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Pencil className="mr-2 h-4 w-4" />
          Edit patient
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <form onSubmit={handleSubmit} className="space-y-5">
          <DialogHeader>
            <DialogTitle>Edit patient</DialogTitle>
            <DialogDescription>
              Update the PMS patient record and sync the same patient to Parchment.
            </DialogDescription>
          </DialogHeader>

          {formError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {formError}
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Full name"
              value={form.fullName}
              onChange={(event) => setField("fullName", event.target.value)}
              isInvalid={Boolean(fieldErrors.fullName)}
              errorMessage={fieldErrors.fullName}
              autoComplete="name"
              required
            />
            <Input
              label="Email"
              type="email"
              value={form.email}
              onChange={(event) => setField("email", event.target.value)}
              isInvalid={Boolean(fieldErrors.email)}
              errorMessage={fieldErrors.email}
              autoComplete="email"
              required
            />
            <Input
              label="Date of birth"
              type="date"
              value={form.dateOfBirth}
              onChange={(event) => setField("dateOfBirth", event.target.value)}
              isInvalid={Boolean(fieldErrors.dateOfBirth)}
              errorMessage={fieldErrors.dateOfBirth}
              required
            />
            <div className="space-y-2">
              <Label>Sex for prescribing</Label>
              <Select value={form.sex} onValueChange={(value) => setField("sex", value)}>
                <SelectTrigger className={fieldErrors.sex ? "border-red-500" : undefined}>
                  <SelectValue placeholder="Select sex" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="M">Male</SelectItem>
                  <SelectItem value="F">Female</SelectItem>
                  <SelectItem value="N">Not stated</SelectItem>
                  <SelectItem value="I">Intersex / indeterminate</SelectItem>
                </SelectContent>
              </Select>
              {fieldErrors.sex && <p className="text-xs text-red-600">{fieldErrors.sex}</p>}
            </div>
            <Input
              label="Phone"
              value={form.phone}
              onChange={(event) => setField("phone", event.target.value)}
              isInvalid={Boolean(fieldErrors.phone)}
              errorMessage={fieldErrors.phone}
              autoComplete="tel"
              required
            />
            <Input
              label="Medicare number"
              value={form.medicareNumber}
              onChange={(event) => setField("medicareNumber", event.target.value)}
              isInvalid={Boolean(fieldErrors.medicareNumber)}
              errorMessage={fieldErrors.medicareNumber}
              required
            />
            <Input
              label="Medicare IRN"
              value={form.medicareIrn}
              onChange={(event) => setField("medicareIrn", event.target.value)}
              isInvalid={Boolean(fieldErrors.medicareIrn)}
              errorMessage={fieldErrors.medicareIrn}
              maxLength={1}
              required
            />
            <Input
              label="Medicare expiry (optional)"
              placeholder="Optional"
              type="month"
              value={form.medicareExpiry}
              onChange={(event) => setField("medicareExpiry", event.target.value)}
              isInvalid={Boolean(fieldErrors.medicareExpiry)}
              errorMessage={fieldErrors.medicareExpiry}
            />
            <div className="space-y-2 sm:col-span-2">
              <Label>Street address</Label>
              <AddressAutocomplete
                value={form.addressLine1}
                onChange={(value) => setField("addressLine1", value)}
                onAddressSelect={setAddressFields}
                onVerificationChange={setAddressVerified}
                placeholder="Start typing your address..."
                error={fieldErrors.addressLine1}
                requireVerified={true}
              />
              {fieldErrors.addressLine1 && (
                <p className="text-xs text-red-600">{fieldErrors.addressLine1}</p>
              )}
            </div>
            <Input
              label="Suburb"
              value={form.suburb}
              onChange={(event) => setField("suburb", event.target.value)}
              isInvalid={Boolean(fieldErrors.suburb)}
              errorMessage={fieldErrors.suburb}
              autoComplete="address-level2"
              required
            />
            <div className="space-y-2">
              <Label>State</Label>
              <Select value={form.state} onValueChange={(value) => setField("state", value)}>
                <SelectTrigger className={fieldErrors.state ? "border-red-500" : undefined}>
                  <SelectValue placeholder="Select state" />
                </SelectTrigger>
                <SelectContent>
                  {STATES.map((state) => (
                    <SelectItem key={state} value={state}>{state}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {fieldErrors.state && <p className="text-xs text-red-600">{fieldErrors.state}</p>}
            </div>
            <Input
              label="Postcode"
              value={form.postcode}
              onChange={(event) => setField("postcode", event.target.value)}
              isInvalid={Boolean(fieldErrors.postcode)}
              errorMessage={fieldErrors.postcode}
              autoComplete="postal-code"
              required
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Update and sync
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
