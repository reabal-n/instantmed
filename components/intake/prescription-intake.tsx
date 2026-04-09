"use client"

/**
 * PrescriptionIntake — multi-step prescription request form.
 * Used by /prescriptions/new to collect patient details before checkout.
 *
 * TODO: Implement full multi-step UI (see prescription-flow-client.tsx for the
 * full wizard). This component is the entry point for the new prescriptions/new route.
 */

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

export interface PrescriptionFormData {
  rxType: string
  medication: string
  condition: string
  otherCondition?: string
  duration: string
  additionalNotes?: string
  safetyAnswers: Record<string, boolean>
  fullName: string
  email: string
  dateOfBirth: string
  medicareNumber?: string
  medicareIrn?: string
}

interface PrescriptionIntakeProps {
  isAuthenticated: boolean
  profileData?: {
    fullName?: string
    email?: string
    dateOfBirth?: string
    medicareNumber?: string
    medicareIrn?: string
  }
  onSubmit: (data: PrescriptionFormData) => Promise<void>
  onAuthRequired: () => void
}

export function PrescriptionIntake({
  isAuthenticated,
  profileData,
  onSubmit,
  onAuthRequired,
}: PrescriptionIntakeProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState<Partial<PrescriptionFormData>>({
    rxType: "repeat",
    fullName: profileData?.fullName ?? "",
    email: profileData?.email ?? "",
    dateOfBirth: profileData?.dateOfBirth ?? "",
    medicareNumber: profileData?.medicareNumber ?? "",
    medicareIrn: profileData?.medicareIrn ?? "",
    safetyAnswers: {},
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isAuthenticated) {
      onAuthRequired()
      return
    }
    if (!form.medication || !form.condition || !form.duration || !form.fullName || !form.email) {
      setError("Please fill in all required fields.")
      return
    }
    setIsSubmitting(true)
    setError(null)
    try {
      await onSubmit(form as PrescriptionFormData)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="medication">Medication name *</Label>
        <Input
          id="medication"
          value={form.medication ?? ""}
          onChange={(e) => setForm((f) => ({ ...f, medication: e.target.value }))}
          placeholder="e.g. Metformin 500mg"
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="condition">Condition *</Label>
        <Input
          id="condition"
          value={form.condition ?? ""}
          onChange={(e) => setForm((f) => ({ ...f, condition: e.target.value }))}
          placeholder="e.g. Type 2 Diabetes"
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="duration">How long have you been on this medication? *</Label>
        <Input
          id="duration"
          value={form.duration ?? ""}
          onChange={(e) => setForm((f) => ({ ...f, duration: e.target.value }))}
          placeholder="e.g. 2 years"
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="notes">Additional notes</Label>
        <Textarea
          id="notes"
          value={form.additionalNotes ?? ""}
          onChange={(e) => setForm((f) => ({ ...f, additionalNotes: e.target.value }))}
          placeholder="Any other information for the doctor..."
          className="min-h-20"
        />
      </div>
      {!isAuthenticated && (
        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="fullName">Full name *</Label>
            <Input
              id="fullName"
              value={form.fullName ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              value={form.email ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="dob">Date of birth *</Label>
            <Input
              id="dob"
              type="date"
              value={form.dateOfBirth ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, dateOfBirth: e.target.value }))}
              required
            />
          </div>
        </div>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? "Submitting…" : "Continue to payment"}
      </Button>
    </form>
  )
}
