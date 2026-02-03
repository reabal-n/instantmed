"use client"

import { useState, useTransition } from "react"
import { Button, Input, Textarea } from "@heroui/react"
import { Heart, Plus, X, Save, AlertCircle } from "lucide-react"
import { toast } from "sonner"
import type { HealthProfile } from "@/lib/data/health-profile"

interface HealthProfileClientProps {
  initialProfile: HealthProfile | null
  patientId: string
}

export function HealthProfileClient({ initialProfile, patientId: _patientId }: HealthProfileClientProps) {
  const [allergies, setAllergies] = useState<string[]>(initialProfile?.allergies || [])
  const [conditions, setConditions] = useState<string[]>(initialProfile?.conditions || [])
  const [medications, setMedications] = useState<string[]>(initialProfile?.current_medications || [])
  const [bloodType, setBloodType] = useState(initialProfile?.blood_type || "")
  const [emergencyName, setEmergencyName] = useState(initialProfile?.emergency_contact_name || "")
  const [emergencyPhone, setEmergencyPhone] = useState(initialProfile?.emergency_contact_phone || "")
  const [notes, setNotes] = useState(initialProfile?.notes || "")
  const [newItem, setNewItem] = useState({ allergy: "", condition: "", medication: "" })
  const [isPending, startTransition] = useTransition()

  function addItem(type: "allergy" | "condition" | "medication") {
    const value = newItem[type].trim()
    if (!value) return

    if (type === "allergy") setAllergies((prev) => [...prev, value])
    else if (type === "condition") setConditions((prev) => [...prev, value])
    else setMedications((prev) => [...prev, value])

    setNewItem((prev) => ({ ...prev, [type]: "" }))
  }

  function removeItem(type: "allergy" | "condition" | "medication", index: number) {
    if (type === "allergy") setAllergies((prev) => prev.filter((_, i) => i !== index))
    else if (type === "condition") setConditions((prev) => prev.filter((_, i) => i !== index))
    else setMedications((prev) => prev.filter((_, i) => i !== index))
  }

  async function handleSave() {
    startTransition(async () => {
      try {
        const res = await fetch("/api/patient/health-profile", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            allergies,
            conditions,
            current_medications: medications,
            blood_type: bloodType || null,
            emergency_contact_name: emergencyName || null,
            emergency_contact_phone: emergencyPhone || null,
            notes: notes || null,
          }),
        })

        if (!res.ok) throw new Error("Failed to save")
        toast.success("Health profile saved")
      } catch {
        toast.error("Failed to save profile")
      }
    })
  }

  function renderListSection(
    title: string,
    items: string[],
    type: "allergy" | "condition" | "medication",
    placeholder: string
  ) {
    return (
      <div className="space-y-3">
        <h3 className="font-medium text-foreground">{title}</h3>
        <div className="flex flex-wrap gap-2">
          {items.map((item, i) => (
            <span
              key={i}
              className="flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-sm"
            >
              {item}
              <button
                onClick={() => removeItem(type, i)}
                className="text-muted-foreground hover:text-foreground"
                aria-label={`Remove ${item}`}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <Input
            size="sm"
            placeholder={placeholder}
            value={newItem[type]}
            onChange={(e) => setNewItem((prev) => ({ ...prev, [type]: e.target.value }))}
            onKeyDown={(e) => e.key === "Enter" && addItem(type)}
          />
          <Button size="sm" variant="flat" onPress={() => addItem(type)} aria-label={`Add ${type}`}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-rose-400 to-rose-600 text-white">
          <Heart className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold">Health Profile</h1>
          <p className="text-sm text-muted-foreground">Pre-fills your future consultation forms</p>
        </div>
      </div>

      <div className="rounded-xl border border-sky-200 bg-sky-50/50 p-3 dark:border-sky-800 dark:bg-sky-950/20">
        <div className="flex gap-2">
          <AlertCircle className="h-4 w-4 mt-0.5 text-sky-600 dark:text-sky-400 shrink-0" />
          <p className="text-sm text-sky-700 dark:text-sky-300">
            This information is encrypted and only shared with your treating doctor during consultations.
          </p>
        </div>
      </div>

      <div className="space-y-6 rounded-xl border border-border/50 bg-card p-6">
        {renderListSection("Allergies", allergies, "allergy", "e.g. Penicillin")}
        {renderListSection("Medical Conditions", conditions, "condition", "e.g. Asthma")}
        {renderListSection("Current Medications", medications, "medication", "e.g. Ventolin 100mcg")}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium">Blood Type</label>
            <Input
              size="sm"
              placeholder="e.g. O+"
              value={bloodType}
              onChange={(e) => setBloodType(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-3">
          <h3 className="font-medium text-foreground">Emergency Contact</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              size="sm"
              label="Name"
              placeholder="Contact name"
              value={emergencyName}
              onChange={(e) => setEmergencyName(e.target.value)}
            />
            <Input
              size="sm"
              label="Phone"
              placeholder="04XX XXX XXX"
              value={emergencyPhone}
              onChange={(e) => setEmergencyPhone(e.target.value)}
            />
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium">Additional Notes</label>
          <Textarea
            placeholder="Any other health information..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            minRows={3}
          />
        </div>

        <Button
          color="primary"
          onPress={handleSave}
          isLoading={isPending}
          startContent={!isPending ? <Save className="h-4 w-4" /> : undefined}
          className="w-full sm:w-auto"
        >
          Save Health Profile
        </Button>
      </div>
    </div>
  )
}
