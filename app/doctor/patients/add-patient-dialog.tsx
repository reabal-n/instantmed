"use client"

import { ExternalLink, Loader2, Plus } from "lucide-react"
import { FormEvent, useState, useTransition } from "react"
import { toast } from "sonner"

import { createDoctorPatientAndOpenParchmentAction } from "@/app/doctor/patients/actions"
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

const STATES = ["ACT", "NSW", "NT", "QLD", "SA", "TAS", "VIC", "WA"] as const

const INITIAL_FORM: DoctorPatientCreateInput = {
  fullName: "",
  email: "",
  dateOfBirth: "",
  sex: "",
  phone: "",
  medicareNumber: "",
  medicareIrn: "",
  medicareExpiry: "",
  addressLine1: "",
  suburb: "",
  state: "",
  postcode: "",
}

export function AddPatientDialog() {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<DoctorPatientCreateInput>(INITIAL_FORM)
  const [fieldErrors, setFieldErrors] = useState<DoctorPatientCreateFieldErrors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [addressVerified, setAddressVerified] = useState(false)
  const [isPending, startTransition] = useTransition()

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

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setFormError(null)

    if (!addressVerified) {
      const message = "Select the address from the suggestions before creating the patient."
      setFieldErrors(prev => ({ ...prev, addressLine1: message }))
      setFormError(message)
      toast.error(message)
      return
    }

    startTransition(async () => {
      const result = await createDoctorPatientAndOpenParchmentAction(form)

      if (!result.success) {
        setFieldErrors(result.fieldErrors ?? {})
        const message = result.error || "Could not create patient"
        setFormError(message)
        toast.error(message)
        return
      }

      toast.success("Patient created and synced to Parchment")
      setForm(INITIAL_FORM)
      setFieldErrors({})
      setFormError(null)
      setAddressVerified(false)
      setOpen(false)
      if (result.ssoUrl) {
        window.location.assign(result.ssoUrl)
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add patient
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <form onSubmit={handleSubmit} className="space-y-5">
          <DialogHeader>
            <DialogTitle>Add patient</DialogTitle>
            <DialogDescription>
              Create the PMS patient record, sync it to Parchment, then open prescribing.
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
              {isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <ExternalLink className="mr-2 h-4 w-4" />
              )}
              Create and open Parchment
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
