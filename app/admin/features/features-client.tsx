"use client"

import { useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  AlertTriangle,
  ArrowLeft,
  Loader2,
  ToggleLeft,
  Shield,
  Pill,
  Stethoscope,
  FileText,
  Plus,
  X,
} from "lucide-react"
import { toast } from "sonner"
import { updateFeatureFlagAction } from "@/app/actions/admin-config"
import type { FeatureFlags } from "@/lib/feature-flags"
import { FLAG_KEYS, type FlagKey } from "@/lib/feature-flags"

interface FeatureFlagsClientProps {
  initialFlags: FeatureFlags
}

export function FeatureFlagsClient({ initialFlags }: FeatureFlagsClientProps) {
  const router = useRouter()
  const [flags, setFlags] = useState(initialFlags)
  const [isSaving, setIsSaving] = useState<string | null>(null)
  const [newBlockedTerm, setNewBlockedTerm] = useState("")
  const [newSafetySymptom, setNewSafetySymptom] = useState("")

  const handleToggleFlag = useCallback(async (key: FlagKey, currentValue: boolean) => {
    setIsSaving(key)
    try {
      const result = await updateFeatureFlagAction(key, !currentValue)
      if (result.success) {
        setFlags(prev => ({ ...prev, [key]: !currentValue }))
        toast.success(`${!currentValue ? "Disabled" : "Enabled"} successfully`)
        router.refresh()
      } else {
        toast.error(result.error || "Failed to update flag")
      }
    } catch {
      toast.error("Failed to update flag")
    } finally {
      setIsSaving(null)
    }
  }, [router])

  const handleUpdateList = useCallback(async (key: FlagKey, newList: string[]) => {
    setIsSaving(key)
    try {
      const result = await updateFeatureFlagAction(key, newList)
      if (result.success) {
        setFlags(prev => ({ ...prev, [key]: newList }))
        toast.success("Updated successfully")
        router.refresh()
      } else {
        toast.error(result.error || "Failed to update")
      }
    } catch {
      toast.error("Failed to update")
    } finally {
      setIsSaving(null)
    }
  }, [router])

  const addBlockedTerm = () => {
    if (!newBlockedTerm.trim()) return
    const term = newBlockedTerm.trim().toLowerCase()
    if (flags.blocked_medication_terms.includes(term)) {
      toast.error("Term already exists")
      return
    }
    const newList = [...flags.blocked_medication_terms, term]
    handleUpdateList(FLAG_KEYS.BLOCKED_MEDICATION_TERMS, newList)
    setNewBlockedTerm("")
  }

  const removeBlockedTerm = (term: string) => {
    const newList = flags.blocked_medication_terms.filter(t => t !== term)
    handleUpdateList(FLAG_KEYS.BLOCKED_MEDICATION_TERMS, newList)
  }

  const addSafetySymptom = () => {
    if (!newSafetySymptom.trim()) return
    const symptom = newSafetySymptom.trim()
    if (flags.safety_screening_symptoms.includes(symptom)) {
      toast.error("Symptom already exists")
      return
    }
    const newList = [...flags.safety_screening_symptoms, symptom]
    handleUpdateList(FLAG_KEYS.SAFETY_SCREENING_SYMPTOMS, newList)
    setNewSafetySymptom("")
  }

  const removeSafetySymptom = (symptom: string) => {
    const newList = flags.safety_screening_symptoms.filter(s => s !== symptom)
    handleUpdateList(FLAG_KEYS.SAFETY_SCREENING_SYMPTOMS, newList)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/admin">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
              <ToggleLeft className="h-6 w-6 text-primary" />
              Feature Flags
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Kill switches and configuration toggles
            </p>
          </div>
        </div>
      </div>

      {/* Warning */}
      <Card className="border-amber-200 bg-amber-50/50">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
            <div>
              <p className="font-medium text-amber-900">Service Kill Switches</p>
              <p className="text-sm text-amber-700 mt-1">
                Disabling a service will immediately prevent patients from creating new requests.
                Existing requests will continue processing. Changes take effect within 30 seconds.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Service Kill Switches */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Service Controls
          </CardTitle>
          <CardDescription>
            Quickly disable services during incidents or maintenance
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Medical Certificates */}
          <div className="flex items-center justify-between p-4 rounded-lg border">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100">
                <FileText className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="font-medium">Medical Certificates</p>
                <p className="text-sm text-muted-foreground">
                  {flags.disable_med_cert ? "Currently disabled" : "Accepting new requests"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {flags.disable_med_cert && (
                <Badge variant="destructive">Disabled</Badge>
              )}
              <Switch
                checked={!flags.disable_med_cert}
                onCheckedChange={() => handleToggleFlag(FLAG_KEYS.DISABLE_MED_CERT, flags.disable_med_cert)}
                disabled={isSaving === FLAG_KEYS.DISABLE_MED_CERT}
              />
            </div>
          </div>

          {/* Repeat Prescriptions */}
          <div className="flex items-center justify-between p-4 rounded-lg border">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100">
                <Pill className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="font-medium">Repeat Prescriptions</p>
                <p className="text-sm text-muted-foreground">
                  {flags.disable_repeat_scripts ? "Currently disabled" : "Accepting new requests"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {flags.disable_repeat_scripts && (
                <Badge variant="destructive">Disabled</Badge>
              )}
              <Switch
                checked={!flags.disable_repeat_scripts}
                onCheckedChange={() => handleToggleFlag(FLAG_KEYS.DISABLE_REPEAT_SCRIPTS, flags.disable_repeat_scripts)}
                disabled={isSaving === FLAG_KEYS.DISABLE_REPEAT_SCRIPTS}
              />
            </div>
          </div>

          {/* Consults */}
          <div className="flex items-center justify-between p-4 rounded-lg border">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-100">
                <Stethoscope className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="font-medium">Consultations</p>
                <p className="text-sm text-muted-foreground">
                  {flags.disable_consults ? "Currently disabled" : "Accepting new requests"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {flags.disable_consults && (
                <Badge variant="destructive">Disabled</Badge>
              )}
              <Switch
                checked={!flags.disable_consults}
                onCheckedChange={() => handleToggleFlag(FLAG_KEYS.DISABLE_CONSULTS, flags.disable_consults)}
                disabled={isSaving === FLAG_KEYS.DISABLE_CONSULTS}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Blocked Medication Terms */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Pill className="h-4 w-4" />
            Blocked Medication Terms
          </CardTitle>
          <CardDescription>
            Medication names containing these terms will be flagged and blocked from repeat prescription requests
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 mb-4">
            <Input
              placeholder="Add blocked term (e.g., oxycodone)"
              value={newBlockedTerm}
              onChange={(e) => setNewBlockedTerm(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addBlockedTerm()}
              className="flex-1"
            />
            <Button onClick={addBlockedTerm} disabled={isSaving === FLAG_KEYS.BLOCKED_MEDICATION_TERMS}>
              {isSaving === FLAG_KEYS.BLOCKED_MEDICATION_TERMS ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {flags.blocked_medication_terms.length > 0 ? (
              flags.blocked_medication_terms.map((term) => (
                <Badge
                  key={term}
                  variant="secondary"
                  className="gap-1 pr-1"
                >
                  {term}
                  <button
                    onClick={() => removeBlockedTerm(term)}
                    className="ml-1 hover:bg-muted rounded p-0.5"
                    disabled={isSaving === FLAG_KEYS.BLOCKED_MEDICATION_TERMS}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No blocked terms configured</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Safety Screening Symptoms */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Safety Screening Symptoms
          </CardTitle>
          <CardDescription>
            Emergency symptoms shown in safety screening. Patients who select these are directed to call 000.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 mb-4">
            <Input
              placeholder="Add safety symptom"
              value={newSafetySymptom}
              onChange={(e) => setNewSafetySymptom(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addSafetySymptom()}
              className="flex-1"
            />
            <Button onClick={addSafetySymptom} disabled={isSaving === FLAG_KEYS.SAFETY_SCREENING_SYMPTOMS}>
              {isSaving === FLAG_KEYS.SAFETY_SCREENING_SYMPTOMS ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
            </Button>
          </div>
          <div className="space-y-2">
            {flags.safety_screening_symptoms.map((symptom) => (
              <div
                key={symptom}
                className="flex items-center justify-between p-2 rounded-lg bg-red-50 border border-red-100"
              >
                <span className="text-sm text-red-900">{symptom}</span>
                <button
                  onClick={() => removeSafetySymptom(symptom)}
                  className="text-red-600 hover:text-red-800 p-1"
                  disabled={isSaving === FLAG_KEYS.SAFETY_SCREENING_SYMPTOMS}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
