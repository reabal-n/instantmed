"use client"

import { ExternalLink, Loader2, Plus } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { type FormEvent, useState, useTransition } from "react"
import { toast } from "sonner"

import { createManualPatientAction, type CreateManualPatientInput } from "@/app/actions/manual-patient"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
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
import { buildStaffPatientHref } from "@/lib/dashboard/routes"

const STATES = ["ACT", "NSW", "NT", "QLD", "SA", "TAS", "VIC", "WA"]

const INITIAL_FORM: CreateManualPatientInput = {
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
  syncToParchment: true,
}

export function ManualPatientDialog() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [form, setForm] = useState<CreateManualPatientInput>(INITIAL_FORM)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)
  const [duplicatePatient, setDuplicatePatient] = useState<{ id: string; fullName: string } | null>(null)

  const updateField = (field: keyof CreateManualPatientInput, value: string | boolean) => {
    setForm((current) => ({ ...current, [field]: value }))
    setFieldErrors((current) => {
      const next = { ...current }
      delete next[field]
      return next
    })
  }

  const resetState = () => {
    setForm(INITIAL_FORM)
    setFieldErrors({})
    setError(null)
    setDuplicatePatient(null)
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setDuplicatePatient(null)

    startTransition(async () => {
      const result = await createManualPatientAction(form)

      if (!result.success) {
        setFieldErrors((result.fieldErrors ?? {}) as Record<string, string>)
        setError(result.error || "Could not create patient.")
        setDuplicatePatient(result.duplicatePatient ?? null)
        return
      }

      if (result.warning) {
        toast.warning(result.warning)
      } else if (result.syncedToParchment) {
        toast.success("Patient created and synced to Parchment")
      } else {
        toast.success("Patient created")
      }

      setOpen(false)
      resetState()
      if (result.patientId) {
        router.push(buildStaffPatientHref(result.patientId))
      } else {
        router.refresh()
      }
    })
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen)
        if (!nextOpen) resetState()
      }}
    >
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4" />
          Add patient
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl">
        <form onSubmit={handleSubmit} className="space-y-5">
          <DialogHeader>
            <DialogTitle>Add patient</DialogTitle>
            <DialogDescription>
              Create a PMS patient profile and sync it to Parchment.
            </DialogDescription>
          </DialogHeader>

          {error && (
            <Alert variant={duplicatePatient ? "warning" : "destructive"}>
              <AlertDescription>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <span>{error}</span>
                  {duplicatePatient && (
                    <Button asChild variant="outline" size="sm">
                      <Link href={buildStaffPatientHref(duplicatePatient.id)}>
                        <ExternalLink className="h-3.5 w-3.5" />
                        Open {duplicatePatient.fullName}
                      </Link>
                    </Button>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Legal name"
              value={form.fullName}
              onChange={(event) => updateField("fullName", event.target.value)}
              isInvalid={Boolean(fieldErrors.fullName)}
              errorMessage={fieldErrors.fullName}
              autoComplete="name"
            />
            <Input
              label="Email"
              type="email"
              value={form.email}
              onChange={(event) => updateField("email", event.target.value)}
              isInvalid={Boolean(fieldErrors.email)}
              errorMessage={fieldErrors.email}
              autoComplete="email"
            />
            <Input
              label="Date of birth"
              type="date"
              value={form.dateOfBirth}
              onChange={(event) => updateField("dateOfBirth", event.target.value)}
              isInvalid={Boolean(fieldErrors.dateOfBirth)}
              errorMessage={fieldErrors.dateOfBirth}
            />
            <div>
              <Label className="mb-2">Sex</Label>
              <Select value={form.sex} onValueChange={(value) => updateField("sex", value)}>
                <SelectTrigger className={fieldErrors.sex ? "border-destructive" : undefined}>
                  <SelectValue placeholder="Select sex" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="M">Male</SelectItem>
                  <SelectItem value="F">Female</SelectItem>
                  <SelectItem value="I">Intersex / indeterminate</SelectItem>
                  <SelectItem value="N">Not stated</SelectItem>
                </SelectContent>
              </Select>
              {fieldErrors.sex && <p className="mt-1.5 text-xs text-destructive">{fieldErrors.sex}</p>}
            </div>
            <Input
              label="Mobile"
              value={form.phone}
              onChange={(event) => updateField("phone", event.target.value)}
              isInvalid={Boolean(fieldErrors.phone)}
              errorMessage={fieldErrors.phone}
              autoComplete="tel"
            />
            <Input
              label="Medicare number"
              value={form.medicareNumber}
              onChange={(event) => updateField("medicareNumber", event.target.value)}
              isInvalid={Boolean(fieldErrors.medicareNumber)}
              errorMessage={fieldErrors.medicareNumber}
              inputMode="numeric"
            />
            <Input
              label="Medicare IRN"
              value={form.medicareIrn}
              onChange={(event) => updateField("medicareIrn", event.target.value)}
              isInvalid={Boolean(fieldErrors.medicareIrn)}
              errorMessage={fieldErrors.medicareIrn}
              inputMode="numeric"
              maxLength={1}
            />
            <Input
              label="Medicare expiry"
              value={form.medicareExpiry}
              onChange={(event) => updateField("medicareExpiry", event.target.value)}
              isInvalid={Boolean(fieldErrors.medicareExpiry)}
              errorMessage={fieldErrors.medicareExpiry}
              placeholder="MM/YYYY"
            />
            <Input
              label="Street address"
              value={form.addressLine1}
              onChange={(event) => updateField("addressLine1", event.target.value)}
              isInvalid={Boolean(fieldErrors.addressLine1)}
              errorMessage={fieldErrors.addressLine1}
              className="sm:col-span-2"
              autoComplete="address-line1"
            />
            <Input
              label="Suburb"
              value={form.suburb}
              onChange={(event) => updateField("suburb", event.target.value)}
              isInvalid={Boolean(fieldErrors.suburb)}
              errorMessage={fieldErrors.suburb}
              autoComplete="address-level2"
            />
            <div>
              <Label className="mb-2">State</Label>
              <Select value={form.state} onValueChange={(value) => updateField("state", value)}>
                <SelectTrigger className={fieldErrors.state ? "border-destructive" : undefined}>
                  <SelectValue placeholder="State" />
                </SelectTrigger>
                <SelectContent>
                  {STATES.map((state) => (
                    <SelectItem key={state} value={state}>{state}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {fieldErrors.state && <p className="mt-1.5 text-xs text-destructive">{fieldErrors.state}</p>}
            </div>
            <Input
              label="Postcode"
              value={form.postcode}
              onChange={(event) => updateField("postcode", event.target.value)}
              isInvalid={Boolean(fieldErrors.postcode)}
              errorMessage={fieldErrors.postcode}
              inputMode="numeric"
              autoComplete="postal-code"
            />
          </div>

          <Checkbox
            checked={form.syncToParchment}
            onCheckedChange={(checked) => updateField("syncToParchment", checked)}
          >
            Sync to Parchment now
          </Checkbox>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Create patient
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
