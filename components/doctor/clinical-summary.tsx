"use client"

/**
 * Clinical Summary Component
 * 
 * P1 DOCTOR_WORKLOAD_AUDIT: Extracts clinical fields from JSON into structured summary.
 * Reduces cognitive load by presenting key clinical data in a scannable format.
 * Saves 30-45 minutes per 100 cases by eliminating JSON parsing.
 */

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { 
  AlertTriangle, 
  AlertCircle,
  Calendar, 
  Thermometer, 
  Activity,
  FileText,
  Pill,
  Heart,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface ClinicalSummaryProps {
  answers: Record<string, unknown>
  serviceType?: string
  consultSubtype?: string
  className?: string
}

// Field mapping for common intake fields
const FIELD_LABELS: Record<string, string> = {
  // Med cert fields
  certificate_type: "Certificate Type",
  duration: "Duration Requested",
  start_date: "Start Date",
  symptoms: "Symptoms",
  symptom_details: "Symptom Details",
  symptom_duration: "Symptom Duration",
  employer_name: "Employer",
  // Prescription fields
  medication_name: "Medication",
  medication_dosage: "Dosage",
  drug_name: "Drug Name",
  pbs_code: "PBS Code",
  form: "Form",
  strength: "Strength",
  manufacturer: "Manufacturer",
  last_prescribed: "Last Prescribed",
  pharmacy_preference: "Preferred Pharmacy",
  is_repeat: "Repeat Prescription",
  // Consult fields
  consult_reason: "Reason for Consult",
  // Safety fields
  emergency_symptoms: "Emergency Symptoms",
  red_flags_detected: "Red Flags",
  yellow_flags_detected: "Caution Flags",
  yellow_flags: "Caution Flags",
  // Consent
  telehealth_consent_given: "Telehealth Consent",
}

// Fields to highlight as critical (red - requires immediate attention)
const RED_FLAG_FIELDS = ["emergency_symptoms", "red_flags_detected", "symptom_severity"]

// Fields to highlight as warnings (yellow/amber - requires caution)
const YELLOW_FLAG_FIELDS = ["yellow_flags_detected", "yellow_flags", "caution_notes", "requires_followup"]

// Consult subtype-specific field groupings
const CONSULT_SUBTYPE_FIELDS: Record<string, { label: string; fields: string[]; highlight?: string[] }> = {
  ed: {
    label: "Erectile Dysfunction Assessment",
    fields: [
      "ed_duration", "ed_onset", "ed_frequency", "ed_severity",
      "morning_erections", "libido_changes", "relationship_impact",
      "previous_ed_treatment", "cardiovascular_history", "diabetes_status",
      "current_medications_ed", "nitrate_use", "alpha_blocker_use",
    ],
    highlight: ["nitrate_use", "cardiovascular_history"],
  },
  hair_loss: {
    label: "Hair Loss Assessment",
    fields: [
      "hair_loss_duration", "hair_loss_pattern", "hair_loss_family_history",
      "hair_loss_previous_treatment", "scalp_condition", "recent_stress",
      "recent_illness", "diet_changes", "thyroid_history",
    ],
  },
  womens_health: {
    label: "Women's Health Assessment",
    fields: [
      "contraception_type", "current_contraception", "menstrual_history",
      "pregnancy_status", "breastfeeding", "smoking_status",
      "migraine_with_aura", "blood_clot_history", "bmi_category",
      "blood_pressure_status", "liver_disease", "breast_cancer_history",
    ],
    highlight: ["migraine_with_aura", "blood_clot_history", "pregnancy_status"],
  },
  weight_loss: {
    label: "Weight Loss Assessment",
    fields: [
      "current_weight", "height", "bmi", "weight_loss_goal",
      "previous_weight_loss_attempts", "eating_disorder_history",
      "thyroid_history", "diabetes_status", "cardiovascular_history",
      "current_medications", "psychiatric_history",
      "requires_call", "call_scheduled", "call_completed",
    ],
    highlight: ["requires_call", "eating_disorder_history", "psychiatric_history"],
  },
  new_medication: {
    label: "New Medication Request",
    fields: [
      "requested_medication", "reason_for_request", "previous_use",
      "allergy_status", "current_medications", "medical_history",
    ],
  },
}

// Fields to show duration/time formatting
const DATE_FIELDS = ["start_date", "last_prescribed"]

// Duration labels
const SYMPTOM_DURATION_LABELS: Record<string, string> = {
  "1_day": "1 day",
  "2_days": "2 days",
  "3_days": "3 days",
  // Legacy values (for existing submissions)
  less_than_24h: "Less than 24 hours",
  "1_2_days": "1-2 days",
  "3_5_days": "3-5 days",
  "1_week_plus": "1 week or more",
}

const LAST_PRESCRIBED_LABELS: Record<string, string> = {
  within_3mo: "Within 3 months",
  "3_6mo": "3-6 months",
  "6_12mo": "6-12 months",
  over_1yr: "Over a year",
}

function formatValue(key: string, value: unknown): string {
  if (value === null || value === undefined) return "—"
  if (typeof value === "boolean") return value ? "Yes" : "No"
  if (Array.isArray(value)) return value.length > 0 ? value.join(", ") : "None"
  
  // Special formatting for known fields
  if (key === "symptom_duration" && typeof value === "string") {
    return SYMPTOM_DURATION_LABELS[value] || value
  }
  if (key === "last_prescribed" && typeof value === "string") {
    return LAST_PRESCRIBED_LABELS[value] || value
  }
  if (key === "duration" && typeof value === "string") {
    return `${value} day${value !== "1" ? "s" : ""}`
  }
  if (DATE_FIELDS.includes(key) && typeof value === "string") {
    try {
      return new Date(value).toLocaleDateString("en-AU", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    } catch {
      return String(value)
    }
  }
  
  return String(value)
}

function getFieldIcon(key: string) {
  if (key.includes("symptom")) return <Thermometer className="h-4 w-4" />
  if (key.includes("date") || key.includes("duration")) return <Calendar className="h-4 w-4" />
  if (key.includes("medication") || key.includes("dosage")) return <Pill className="h-4 w-4" />
  if (key.includes("emergency") || key.includes("flag")) return <AlertTriangle className="h-4 w-4" />
  if (key.includes("consent")) return <FileText className="h-4 w-4" />
  return <Activity className="h-4 w-4" />
}

export function ClinicalSummary({ answers, serviceType: _serviceType, consultSubtype, className }: ClinicalSummaryProps) {
  // Extract and categorize fields
  const redFlagFields: [string, unknown][] = []
  const yellowFlagFields: [string, unknown][] = []
  const primaryFields: [string, unknown][] = []
  const secondaryFields: [string, unknown][] = []
  const subtypeFields: [string, unknown][] = []
  
  // Get subtype-specific config if applicable
  const subtypeConfig = consultSubtype ? CONSULT_SUBTYPE_FIELDS[consultSubtype] : null
  const subtypeFieldSet = new Set(subtypeConfig?.fields || [])
  const subtypeHighlightSet = new Set(subtypeConfig?.highlight || [])
  
  // Priority order for display
  const priorityOrder = [
    "symptoms", "symptom_details", "symptom_duration",
    "certificate_type", "duration", "start_date",
    "medication_name", "drug_name", "pbs_code", "strength", "form", "medication_dosage", "last_prescribed",
    "consult_reason",
  ]
  
  // Sort entries by priority
  const sortedEntries = Object.entries(answers).sort((a, b) => {
    const aIndex = priorityOrder.indexOf(a[0])
    const bIndex = priorityOrder.indexOf(b[0])
    if (aIndex === -1 && bIndex === -1) return 0
    if (aIndex === -1) return 1
    if (bIndex === -1) return -1
    return aIndex - bIndex
  })
  
  // Fields to skip entirely - redundant/implied by payment completion
  const SKIP_FIELDS = new Set([
    // Consent fields - if they paid, they agreed
    "agreedToTerms",
    "agreed_to_terms",
    "terms_agreed",
    "termsAgreed",
    "confirmedAccuracy",
    "confirmed_accuracy",
    "accuracyConfirmed",
    "consent_given",
    "consentGiven",
    "telehealth_consent",
    "telehealthConsent",
    "privacy_acknowledged",
    "privacyAcknowledged",
    // Attribution/meta
    "attribution",
    "consent_timestamp",
    "submittedAt",
    "submitted_at",
    // Duplicate display fields (already shown in primary section)
    "certType",
    "cert_type",
    "startDate", // shown in formatted primary fields
    "addressLine1", // patient info shown separately
    "address_line1",
  ])
  
  for (const [key, value] of sortedEntries) {
    // Skip internal/meta fields
    if (key.startsWith("_")) continue
    // Skip patient details (shown separately)
    if (key.startsWith("patient_")) continue
    // Skip redundant/implied fields
    if (SKIP_FIELDS.has(key)) continue
    
    if (RED_FLAG_FIELDS.includes(key) && value) {
      redFlagFields.push([key, value])
    } else if (YELLOW_FLAG_FIELDS.includes(key) && value) {
      yellowFlagFields.push([key, value])
    } else if (subtypeFieldSet.has(key)) {
      // Subtype-specific fields go to their own section
      subtypeFields.push([key, value])
    } else if (priorityOrder.includes(key)) {
      primaryFields.push([key, value])
    } else {
      secondaryFields.push([key, value])
    }
  }
  
  // Check for weight loss call requirement flag
  const requiresCall = answers.requires_call === true || answers.requires_call === "true"
  const callCompleted = answers.call_completed === true || answers.call_completed === "true"

  return (
    <Card className={cn("", className)}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Heart className="h-5 w-5 text-primary" />
          Clinical Summary
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Red Flags - Critical, requires immediate attention */}
        {redFlagFields.length > 0 && (
          <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3 space-y-2">
            <div className="flex items-center gap-2 text-destructive font-medium text-sm">
              <AlertTriangle className="h-4 w-4" />
              Red Flags — Requires Immediate Attention
            </div>
            {redFlagFields.map(([key, value]) => (
              <div key={key} className="flex items-start gap-2 text-sm">
                <Badge variant="destructive" className="text-xs">
                  {FIELD_LABELS[key] || key.replace(/_/g, " ")}
                </Badge>
                <span className="text-destructive-foreground">{formatValue(key, value)}</span>
              </div>
            ))}
          </div>
        )}
        
        {/* Yellow Flags - Caution, review carefully */}
        {yellowFlagFields.length > 0 && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 space-y-2">
            <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 font-medium text-sm">
              <AlertCircle className="h-4 w-4" />
              Caution Flags — Review Carefully
            </div>
            {yellowFlagFields.map(([key, value]) => (
              <div key={key} className="flex items-start gap-2 text-sm">
                <Badge className="text-xs bg-amber-500/20 text-amber-700 dark:text-amber-400 border-amber-500/30">
                  {FIELD_LABELS[key] || key.replace(/_/g, " ")}
                </Badge>
                <span className="text-amber-900 dark:text-amber-200">{formatValue(key, value)}</span>
              </div>
            ))}
          </div>
        )}

        {/* Weight Loss Call Required Banner */}
        {consultSubtype === "weight_loss" && requiresCall && (
          <div className={cn(
            "rounded-lg p-3 flex items-center gap-3",
            callCompleted 
              ? "bg-emerald-500/10 border border-emerald-500/30" 
              : "bg-purple-500/10 border border-purple-500/30"
          )}>
            <div className={cn(
              "h-8 w-8 rounded-full flex items-center justify-center",
              callCompleted ? "bg-emerald-500/20" : "bg-purple-500/20"
            )}>
              {callCompleted ? (
                <Activity className="h-4 w-4 text-emerald-600" />
              ) : (
                <AlertCircle className="h-4 w-4 text-purple-600" />
              )}
            </div>
            <div>
              <p className={cn(
                "font-medium text-sm",
                callCompleted ? "text-emerald-700 dark:text-emerald-400" : "text-purple-700 dark:text-purple-400"
              )}>
                {callCompleted ? "Phone Consultation Completed" : "Phone Consultation Required"}
              </p>
              <p className="text-xs text-muted-foreground">
                {callCompleted 
                  ? "Patient has completed the required phone consultation"
                  : "This weight loss request requires a phone consultation before approval"
                }
              </p>
            </div>
          </div>
        )}

        {/* Consult Subtype-Specific Assessment Section */}
        {subtypeConfig && subtypeFields.length > 0 && (
          <div className="border rounded-lg p-3 space-y-3">
            <div className="flex items-center gap-2 font-medium text-sm">
              <FileText className="h-4 w-4 text-primary" />
              {subtypeConfig.label}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {subtypeFields.map(([key, value]) => {
                const isHighlighted = subtypeHighlightSet.has(key)
                return (
                  <div 
                    key={key} 
                    className={cn(
                      "flex items-start gap-2 p-2 rounded-lg text-sm",
                      isHighlighted ? "bg-amber-500/10 border border-amber-500/20" : "bg-muted/50"
                    )}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-muted-foreground font-medium">
                        {FIELD_LABELS[key] || key.replace(/_/g, " ")}
                      </p>
                      <p className={cn(
                        "font-medium mt-0.5",
                        isHighlighted && "text-amber-700 dark:text-amber-400"
                      )}>
                        {formatValue(key, value)}
                      </p>
                    </div>
                    {isHighlighted && (
                      <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}
        
        {/* Primary Clinical Fields - Key decision data */}
        {primaryFields.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {primaryFields.map(([key, value]) => (
              <div 
                key={key} 
                className="flex items-start gap-2 p-2 bg-muted/50 rounded-lg"
              >
                <div className="text-muted-foreground mt-0.5">
                  {getFieldIcon(key)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                    {FIELD_LABELS[key] || key.replace(/_/g, " ")}
                  </p>
                  <p className="font-medium text-sm mt-0.5 wrap-break-word">
                    {formatValue(key, value)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
        
        {/* Secondary Fields - Collapsible or less prominent */}
        {secondaryFields.length > 0 && (
          <div className="border-t pt-3">
            <p className="text-xs text-muted-foreground mb-2 font-medium">Additional Information</p>
            <div className="grid grid-cols-2 gap-2 text-sm">
              {secondaryFields.slice(0, 8).map(([key, value]) => (
                <div key={key} className="flex justify-between gap-2">
                  <span className="text-muted-foreground truncate">
                    {FIELD_LABELS[key] || key.replace(/_/g, " ")}
                  </span>
                  <span className="font-medium text-right truncate">
                    {formatValue(key, value)}
                  </span>
                </div>
              ))}
            </div>
            {secondaryFields.length > 8 && (
              <p className="text-xs text-muted-foreground mt-2">
                +{secondaryFields.length - 8} more fields in raw data
              </p>
            )}
          </div>
        )}
        
        {/* Empty state */}
        {primaryFields.length === 0 && secondaryFields.length === 0 && redFlagFields.length === 0 && yellowFlagFields.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            No intake data available
          </p>
        )}
      </CardContent>
    </Card>
  )
}
