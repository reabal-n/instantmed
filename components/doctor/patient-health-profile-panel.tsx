"use client"

import { useEffect, useState } from "react"
import { 
  Heart, 
  Pill, 
  AlertTriangle, 
  Phone,
  User,
  Loader2,
  Droplets,
  FileWarning,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface HealthProfile {
  allergies: string[]
  conditions: string[]
  current_medications: string[]
  blood_type: string | null
  emergency_contact_name: string | null
  emergency_contact_phone: string | null
  notes: string | null
  updated_at: string
}

interface PatientHealthProfilePanelProps {
  patientId: string
  className?: string
}

/**
 * Patient Health Profile Panel for the Doctor Review Queue.
 * 
 * Fetches and displays the patient's standing health profile (allergies,
 * conditions, current medications, emergency contact) alongside the
 * intake answers so the doctor has full clinical context.
 */
export function PatientHealthProfilePanel({ 
  patientId, 
  className 
}: PatientHealthProfilePanelProps) {
  const [profile, setProfile] = useState<HealthProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    fetch(`/api/patients/${patientId}/health-profile`)
      .then(r => {
        if (!r.ok) throw new Error("Failed to load")
        return r.json()
      })
      .then((data) => {
        if (!cancelled) setProfile(data.profile)
      })
      .catch(() => {
        if (!cancelled) setError("Could not load health profile")
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => { cancelled = true }
  }, [patientId])

  if (loading) {
    return (
      <div className={cn("rounded-lg border p-4", className)}>
        <div className="flex items-center gap-2 text-muted-foreground text-sm">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading health profile...
        </div>
      </div>
    )
  }

  if (error || !profile) {
    return (
      <div className={cn("rounded-lg border p-4", className)}>
        <div className="flex items-center gap-2 text-muted-foreground text-sm">
          <User className="h-4 w-4" />
          <span>{error || "No health profile on file"}</span>
        </div>
      </div>
    )
  }

  const hasAllergies = profile.allergies && profile.allergies.length > 0
  const hasConditions = profile.conditions && profile.conditions.length > 0
  const hasMedications = profile.current_medications && profile.current_medications.length > 0
  const hasEmergencyContact = profile.emergency_contact_name

  return (
    <div className={cn("rounded-lg border bg-card", className)}>
      <div className="px-4 py-3 border-b flex items-center justify-between">
        <h4 className="text-sm font-semibold flex items-center gap-2">
          <Heart className="h-4 w-4 text-primary" />
          Health Profile
        </h4>
        <span className="text-[11px] text-muted-foreground">
          Updated {new Date(profile.updated_at).toLocaleDateString("en-AU", {
            day: "numeric",
            month: "short",
            year: "numeric",
          })}
        </span>
      </div>

      <div className="p-4 space-y-4">
        {/* Allergies - highlighted in red if present */}
        <div>
          <div className="flex items-center gap-1.5 mb-1.5">
            <AlertTriangle className={cn("h-3.5 w-3.5", hasAllergies ? "text-red-500" : "text-muted-foreground")} />
            <span className={cn("text-xs font-medium", hasAllergies ? "text-red-700 dark:text-red-400" : "text-muted-foreground")}>
              Allergies
            </span>
          </div>
          {hasAllergies ? (
            <div className="flex flex-wrap gap-1.5">
              {profile.allergies.map((allergy, i) => (
                <span key={i} className="px-2 py-0.5 rounded-md bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300 text-xs font-medium border border-red-200 dark:border-red-800">
                  {allergy}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">No known allergies</p>
          )}
        </div>

        {/* Conditions */}
        <div>
          <div className="flex items-center gap-1.5 mb-1.5">
            <FileWarning className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground">Conditions</span>
          </div>
          {hasConditions ? (
            <div className="flex flex-wrap gap-1.5">
              {profile.conditions.map((condition, i) => (
                <span key={i} className="px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 text-xs border border-amber-200 dark:border-amber-800">
                  {condition}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">None reported</p>
          )}
        </div>

        {/* Current Medications */}
        <div>
          <div className="flex items-center gap-1.5 mb-1.5">
            <Pill className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground">Current Medications</span>
          </div>
          {hasMedications ? (
            <div className="flex flex-wrap gap-1.5">
              {profile.current_medications.map((med, i) => (
                <span key={i} className="px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 text-xs border border-blue-200 dark:border-blue-800">
                  {med}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">None reported</p>
          )}
        </div>

        {/* Blood Type */}
        {profile.blood_type && (
          <div className="flex items-center gap-2">
            <Droplets className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Blood type:</span>
            <span className="text-xs font-medium">{profile.blood_type}</span>
          </div>
        )}

        {/* Emergency Contact */}
        {hasEmergencyContact && (
          <div className="pt-2 border-t">
            <div className="flex items-center gap-1.5 mb-1">
              <Phone className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground">Emergency Contact</span>
            </div>
            <p className="text-xs text-foreground">
              {profile.emergency_contact_name}
              {profile.emergency_contact_phone && (
                <span className="text-muted-foreground ml-2">{profile.emergency_contact_phone}</span>
              )}
            </p>
          </div>
        )}

        {/* Doctor Notes */}
        {profile.notes && (
          <div className="pt-2 border-t">
            <p className="text-xs text-muted-foreground italic">{profile.notes}</p>
          </div>
        )}
      </div>
    </div>
  )
}
