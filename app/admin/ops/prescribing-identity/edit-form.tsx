"use client"

import { Pencil, Save, X } from "lucide-react"
import { useRouter } from "next/navigation"
import { type FormEvent, useState, useTransition } from "react"
import { toast } from "sonner"

import { updatePrescribingIdentityAction } from "@/app/actions/prescribing-identity"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type {
  PrescribingIdentityFieldErrors,
  PrescribingIdentityFormValues,
} from "@/lib/doctor/prescribing-identity-update"

const STATES = ["ACT", "NSW", "NT", "QLD", "SA", "TAS", "VIC", "WA"] as const

function toMonthInputValue(value: string): string {
  const match = value.match(/^(\d{4})-(\d{2})/)
  return match ? `${match[1]}-${match[2]}` : value
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return <p className="mt-1 text-xs text-destructive">{message}</p>
}

export function PrescribingIdentityEditForm({
  patientId,
  intakeId,
  identity,
}: {
  patientId: string
  intakeId: string
  identity: PrescribingIdentityFormValues
}) {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [fieldErrors, setFieldErrors] = useState<PrescribingIdentityFieldErrors>({})
  const [form, setForm] = useState<PrescribingIdentityFormValues>({
    ...identity,
    medicareExpiry: toMonthInputValue(identity.medicareExpiry),
  })

  function updateField(name: keyof PrescribingIdentityFormValues, value: string) {
    setForm((current) => ({ ...current, [name]: value }))
    setFieldErrors((current) => {
      const next = { ...current }
      delete next[name]
      return next
    })
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    startTransition(async () => {
      const result = await updatePrescribingIdentityAction(patientId, form, intakeId)
      if (!result.success) {
        setFieldErrors(result.fieldErrors || {})
        toast.error(result.error || "Could not update prescribing identity")
        return
      }

      toast.success("Prescribing identity updated")
      setFieldErrors({})
      setIsOpen(false)
      router.refresh()
    })
  }

  if (!isOpen) {
    return (
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="justify-self-start lg:col-start-3 lg:justify-self-end"
        onClick={() => setIsOpen(true)}
      >
        <Pencil className="h-3.5 w-3.5" />
        Edit details
      </Button>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="col-span-full mt-2 rounded-md bg-muted/30 p-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Input
          label="DOB"
          type="date"
          value={form.dateOfBirth}
          isInvalid={Boolean(fieldErrors.dateOfBirth)}
          errorMessage={fieldErrors.dateOfBirth}
          onChange={(event) => updateField("dateOfBirth", event.target.value)}
        />

        <div>
          <label htmlFor={`sex-${intakeId}`} className="mb-2 block text-sm font-medium text-foreground/90">
            Sex
          </label>
          <select
            id={`sex-${intakeId}`}
            value={form.sex}
            onChange={(event) => updateField("sex", event.target.value)}
            className="h-11 w-full rounded-md border border-border bg-card px-3 text-sm outline-none transition-[border-color,box-shadow] focus:border-primary focus:ring-2 focus:ring-primary/20"
            aria-invalid={Boolean(fieldErrors.sex) || undefined}
          >
            <option value="">Select</option>
            <option value="M">Male</option>
            <option value="F">Female</option>
            <option value="N">Not stated</option>
            <option value="I">Intersex / Indeterminate</option>
          </select>
          <FieldError message={fieldErrors.sex} />
        </div>

        <Input
          label="Phone"
          type="tel"
          value={form.phone}
          isInvalid={Boolean(fieldErrors.phone)}
          errorMessage={fieldErrors.phone}
          onChange={(event) => updateField("phone", event.target.value)}
        />

        <Input
          label="Medicare"
          inputMode="numeric"
          value={form.medicareNumber}
          isInvalid={Boolean(fieldErrors.medicareNumber)}
          errorMessage={fieldErrors.medicareNumber}
          onChange={(event) => updateField("medicareNumber", event.target.value)}
        />

        <Input
          label="IRN"
          inputMode="numeric"
          value={form.medicareIrn}
          isInvalid={Boolean(fieldErrors.medicareIrn)}
          errorMessage={fieldErrors.medicareIrn}
          onChange={(event) => updateField("medicareIrn", event.target.value)}
        />

        <Input
          label="Medicare expiry (optional)"
          type="month"
          value={form.medicareExpiry}
          isInvalid={Boolean(fieldErrors.medicareExpiry)}
          errorMessage={fieldErrors.medicareExpiry}
          onChange={(event) => updateField("medicareExpiry", event.target.value)}
        />

        <Input
          label="Address"
          value={form.addressLine1}
          isInvalid={Boolean(fieldErrors.addressLine1)}
          errorMessage={fieldErrors.addressLine1}
          onChange={(event) => updateField("addressLine1", event.target.value)}
        />

        <Input
          label="Suburb"
          value={form.suburb}
          isInvalid={Boolean(fieldErrors.suburb)}
          errorMessage={fieldErrors.suburb}
          onChange={(event) => updateField("suburb", event.target.value)}
        />

        <div>
          <label htmlFor={`state-${intakeId}`} className="mb-2 block text-sm font-medium text-foreground/90">
            State
          </label>
          <select
            id={`state-${intakeId}`}
            value={form.state}
            onChange={(event) => updateField("state", event.target.value)}
            className="h-11 w-full rounded-md border border-border bg-card px-3 text-sm outline-none transition-[border-color,box-shadow] focus:border-primary focus:ring-2 focus:ring-primary/20"
            aria-invalid={Boolean(fieldErrors.state) || undefined}
          >
            <option value="">Select</option>
            {STATES.map((state) => (
              <option key={state} value={state}>
                {state}
              </option>
            ))}
          </select>
          <FieldError message={fieldErrors.state} />
        </div>

        <Input
          label="Postcode"
          inputMode="numeric"
          value={form.postcode}
          isInvalid={Boolean(fieldErrors.postcode)}
          errorMessage={fieldErrors.postcode}
          onChange={(event) => updateField("postcode", event.target.value)}
        />
      </div>

      <div className="mt-4 flex flex-wrap justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isPending}
          onClick={() => {
            setForm({ ...identity, medicareExpiry: toMonthInputValue(identity.medicareExpiry) })
            setFieldErrors({})
            setIsOpen(false)
          }}
        >
          <X className="h-3.5 w-3.5" />
          Cancel
        </Button>
        <Button type="submit" size="sm" disabled={isPending}>
          <Save className="h-3.5 w-3.5" />
          {isPending ? "Saving" : "Save details"}
        </Button>
      </div>
    </form>
  )
}
