"use client"

/**
 * Clinical Summary Component
 * 
 * P1 DOCTOR_WORKLOAD_AUDIT: Extracts clinical fields from JSON into structured summary.
 * Reduces cognitive load by presenting key clinical data in a scannable format.
 * Saves 30-45 minutes per 100 cases by eliminating JSON parsing.
 */

import {
  Activity,
  AlertCircle,
  AlertTriangle,
  Calendar,
  FileText,
  Heart,
  Pill,
  ShieldAlert,
  Thermometer,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { getContraindicationRationale } from "@/lib/clinical/contraindication-rationales"
import { cn } from "@/lib/utils"

/** Convert camelCase or snake_case keys into readable labels */
function formatFieldLabel(key: string): string {
  return key
    // Insert space before uppercase letters in camelCase
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    // Replace underscores with spaces
    .replace(/_/g, " ")
    // Capitalize first letter of each word
    .replace(/\b\w/g, c => c.toUpperCase())
}

interface ClinicalSummaryProps {
  answers: Record<string, unknown>
  consultSubtype?: string
  className?: string
  /** When true, renders without Card wrapper (for embedding inside another card) */
  inline?: boolean
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
  // ED subtype - camelCase keys written by ed-goals-step.tsx + ed-assessment-step.tsx
  edGoal: "Main goal",
  edDuration: "Duration of concern",
  iiefTotal: "IIEF-5 score",
  iief1: "IIEF-5: Confidence",
  iief2: "IIEF-5: Erection hardness",
  iief3: "IIEF-5: Maintenance during intercourse",
  iief4: "IIEF-5: Maintenance difficulty",
  iief5: "IIEF-5: Satisfaction",
  edOnset: "ED Onset",
  edFrequency: "ED Frequency",
  edMorningErections: "Morning Erections",
  edAgeConfirmed: "Age 18+ Confirmed",
  edHypertension: "Uncontrolled Hypertension",
  edDiabetes: "Uncontrolled Diabetes",
  edPreference: "Treatment Preference",
  edAdditionalInfo: "Additional Context",
  // ED safety - flat keys written by ed-health-step.tsx
  edNitrates: "Nitrate Use",
  edRecentHeartEvent: "Recent Heart Event",
  edSevereHeart: "Severe Heart Condition",
  edBpMedication: "Blood pressure medication",
  previousEdMeds: "Previous ED Medication Use",
  edGpCleared: "GP Cleared Cardiac Condition",
  edPreviousTreatment: "Previous ED treatment",
  edPreviousEffectiveness: "Previous treatment effectiveness",
  // ED health - medical history keys written by ed-health-step.tsx
  has_allergies: "Has allergies",
  known_allergies: "Allergies",
  has_conditions: "Has conditions",
  existing_conditions: "Conditions",
  takes_medications: "Takes medications",
  current_medications: "Current medications",
  // ED health - body metrics
  heightCm: "Height (cm)",
  weightKg: "Weight (kg)",
  bmi: "BMI",
  // Hair loss - camelCase keys written by hair-loss-assessment-step.tsx
  hairPattern: "Hair Loss Pattern",
  hairDuration: "Hair Loss Duration",
  hairFamilyHistory: "Family History",
  hairMedicationPreference: "Treatment Preference",
  hairAdditionalInfo: "Additional Context",
  // Hair loss - previous-treatment boolean toggles
  triedMinoxidil: "Tried Minoxidil",
  triedFinasteride: "Tried Finasteride",
  triedBiotin: "Tried Biotin",
  triedShampoos: "Tried Medicated Shampoos",
  triedPRP: "Tried PRP",
  triedOther: "Tried Other Treatment",
  // Hair loss - scalp condition boolean toggles
  scalpDandruff: "Scalp Dandruff",
  scalpPsoriasis: "Scalp Psoriasis",
  scalpItching: "Scalp Itching",
  scalpFolliculitis: "Scalp Folliculitis",
  scalpNone: "No Scalp Conditions",
}

// Fields to highlight as critical (red - requires immediate attention)
// NOTE: emergency_symptoms is a safety-gate toggle ("I am NOT experiencing an emergency" → true),
// not an actual symptom field - it's excluded here since blocking happens at intake time.
const RED_FLAG_FIELDS = ["red_flags_detected", "symptom_severity"]

// Values that indicate NO actual red flag (benign/negative values)
const BENIGN_VALUES = new Set(["none", "no", "n/a", "nil", "not applicable", "false", "true"])
const BENIGN_SEVERITY = new Set(["mild", "moderate", "low", "minimal", "minor"])

/** Check if a red flag field actually contains a concerning value */
function isActualRedFlag(key: string, value: unknown): boolean {
  const strValue = String(value).toLowerCase().trim()
  // "None", "No", etc. are not red flags
  if (BENIGN_VALUES.has(strValue)) return false
  // For severity, only "severe" and "critical" are red flags
  if (key === "symptom_severity" && BENIGN_SEVERITY.has(strValue)) return false
  return true
}

// Fields to highlight as warnings (yellow/amber - requires caution)
const YELLOW_FLAG_FIELDS = ["yellow_flags_detected", "yellow_flags", "caution_notes", "requires_followup"]

// Consult subtype-specific field groupings
const CONSULT_SUBTYPE_FIELDS: Record<string, { label: string; fields: string[]; highlight?: string[] }> = {
  ed: {
    label: "Erectile Dysfunction Assessment",
    fields: [
      // Goals step - ed-goals-step.tsx
      "edGoal", "edDuration",
      // Assessment step - ed-assessment-step.tsx (IIEF-5)
      "iiefTotal", "iief1", "iief2", "iief3", "iief4", "iief5",
      "edOnset", "edFrequency", "edMorningErections",
      "edAgeConfirmed", "edHypertension", "edDiabetes",
      "edPreference", "edAdditionalInfo",
      // Safety + medical history - ed-health-step.tsx
      "edNitrates", "edRecentHeartEvent",
      "edSevereHeart", "edBpMedication", "previousEdMeds",
      "edGpCleared",
      "has_allergies", "known_allergies",
      "has_conditions", "existing_conditions",
      "takes_medications", "current_medications",
      "edPreviousTreatment", "edPreviousEffectiveness",
      // Body metrics
      "heightCm", "weightKg", "bmi",
    ],
    highlight: [
      "iiefTotal",
      "edNitrates",
      "edRecentHeartEvent", "edSevereHeart",
      "edGpCleared",
      "edHypertension", "edDiabetes",
    ],
  },
  hair_loss: {
    label: "Hair Loss Assessment",
    fields: [
      // Main assessment fields - hair-loss-assessment-step.tsx
      "hairPattern", "hairDuration", "hairFamilyHistory",
      "hairMedicationPreference", "hairAdditionalInfo",
      // Previous-treatment boolean toggles
      "triedMinoxidil", "triedFinasteride", "triedBiotin",
      "triedShampoos", "triedPRP", "triedOther",
      // Scalp condition boolean toggles
      "scalpDandruff", "scalpPsoriasis", "scalpItching",
      "scalpFolliculitis", "scalpNone",
      // Reserved for planned intake rewrite (Norwood scale, expanded
      // history). Not written by today's intake - retained so the doctor
      // portal renders them correctly the moment the rewrite lands.
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

export function ClinicalSummary({ answers, consultSubtype, className, inline }: ClinicalSummaryProps) {
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
    "accuracy_confirmed",
    "consent_given",
    "consentGiven",
    "telehealth_consent",
    "telehealthConsent",
    "telehealth_consent_given",
    "telehealthConsentGiven",
    "privacy_acknowledged",
    "privacyAcknowledged",
    "safety_consent",
    "safetyConsent",
    "safety_consent_given",
    "safetyConsentGiven",
    "emergency_symptoms", // Safety gate toggle, not a clinical field
    "workers_comp", // Safety gate toggle
    "informed_consent",
    "informedConsent",
    "data_consent",
    "dataConsent",
    // Attribution/meta
    "attribution",
    "consent_timestamp",
    "submittedAt",
    "submitted_at",
    "completedAt",
    "completed_at",
    "step",
    "currentStep",
    "current_step",
    // Duplicate display fields (already shown in primary section)
    "certType",
    "cert_type",
    "startDate",
    "start_date",
    "endDate",
    "end_date",
    "addressLine1",
    "address_line1",
    "addressLine2",
    "address_line2",
    // Symptom details already captured in primary fields
    "symptomDetails",
    "symptom_details",
  ])
  
  for (const [key, value] of sortedEntries) {
    // Skip internal/meta fields
    if (key.startsWith("_")) continue
    // Skip patient details (shown separately)
    if (key.startsWith("patient_")) continue
    // Skip redundant/implied fields
    if (SKIP_FIELDS.has(key)) continue
    // Skip empty/null values
    if (value === null || value === undefined || value === "") continue
    // Skip any remaining consent-like boolean fields
    if ((key.toLowerCase().includes("consent") || key.toLowerCase().includes("agreed") || key.toLowerCase().includes("confirmed")) && (value === true || value === "true")) continue

    if (RED_FLAG_FIELDS.includes(key) && value && isActualRedFlag(key, value)) {
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

  const content = (
    <div className={cn("space-y-4", inline ? className : undefined)}>
        {/* Red Flags - Critical, requires immediate attention */}
        {redFlagFields.length > 0 && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 space-y-2">
            <div className="flex items-center gap-2 text-destructive font-medium text-sm">
              <AlertTriangle className="h-4 w-4" />
              Red Flags - Requires Immediate Attention
            </div>
            {redFlagFields.map(([key, value]) => (
              <div key={key} className="flex items-start gap-2 text-sm">
                <Badge variant="destructive" className="text-xs">
                  {FIELD_LABELS[key] || formatFieldLabel(key)}
                </Badge>
                <span className="text-destructive-foreground">{formatValue(key, value)}</span>
              </div>
            ))}
          </div>
        )}
        
        {/* Yellow Flags - Caution, review carefully */}
        {yellowFlagFields.length > 0 && (
          <div className="bg-warning-light border border-warning-border rounded-lg p-3 space-y-2">
            <div className="flex items-center gap-2 text-warning font-semibold text-sm">
              <AlertCircle className="h-4 w-4" />
              Caution Flags - Review Carefully
            </div>
            {yellowFlagFields.map(([key, value]) => (
              <div key={key} className="flex items-start gap-2 text-sm">
                <Badge className="text-xs bg-warning-light text-warning border-warning-border">
                  {FIELD_LABELS[key] || formatFieldLabel(key)}
                </Badge>
                <span className="text-warning">{formatValue(key, value)}</span>
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
              : "bg-blue-500/10 border border-blue-500/30"
          )}>
            <div className={cn(
              "h-8 w-8 rounded-full flex items-center justify-center",
              callCompleted ? "bg-emerald-500/20" : "bg-blue-500/20"
            )}>
              {callCompleted ? (
                <Activity className="h-4 w-4 text-emerald-600" />
              ) : (
                <AlertCircle className="h-4 w-4 text-blue-600" />
              )}
            </div>
            <div>
              <p className={cn(
                "font-medium text-sm",
                callCompleted ? "text-success" : "text-info"
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
          <div className="space-y-3">
            <div className="flex items-center gap-2 font-semibold text-sm">
              <FileText className="h-4 w-4 text-primary" />
              {subtypeConfig.label}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {subtypeFields.map(([key, value]) => {
                const isHighlighted = subtypeHighlightSet.has(key)
                // Map flat ED safety keys for rationale lookup (e.g. edNitrates → nitrates)
                const rationaleKey = key === "edNitrates" ? "nitrates" : key === "edRecentHeartEvent" ? "recentHeartEvent" : key === "edSevereHeart" ? "severeHeartCondition" : key === "edGpCleared" ? "managedCondition" : key
                const rationale = getContraindicationRationale(rationaleKey, value)
                const fieldLabel = FIELD_LABELS[key] || formatFieldLabel(key)
                return (
                  <div
                    key={key}
                    className={cn(
                      "flex items-start gap-2 p-3 rounded-lg text-sm",
                      rationale?.severity === "destructive" ? "bg-destructive/10 border border-destructive/20" :
                      isHighlighted ? "bg-warning-light border border-warning-border" : "bg-muted/30"
                    )}
                  >
                    <div className="flex-1 min-w-0">
                      {rationale ? (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div
                                className={cn(
                                  "flex items-center gap-1.5 cursor-help",
                                  rationale.severity === "destructive" && "text-destructive",
                                  rationale.severity === "warning" && "text-warning",
                                )}
                              >
                                {rationale.severity === "destructive" ? (
                                  <ShieldAlert className="h-3.5 w-3.5 shrink-0" />
                                ) : (
                                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                                )}
                                <span className="text-xs font-medium">{fieldLabel}</span>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs text-left">
                              <p className="text-xs leading-relaxed">{rationale.text}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ) : (
                        <p className="text-xs text-muted-foreground font-medium">
                          {fieldLabel}
                        </p>
                      )}
                      <p className={cn(
                        "font-medium mt-0.5",
                        rationale?.severity === "destructive" && "text-destructive",
                        !rationale && isHighlighted && "text-warning"
                      )}>
                        {formatValue(key, value)}
                      </p>
                    </div>
                    {!rationale && isHighlighted && (
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {primaryFields.map(([key, value]) => (
              <div
                key={key}
                className="flex items-start gap-2 p-3 bg-muted/30 rounded-lg"
              >
                <div className="text-muted-foreground mt-0.5">
                  {getFieldIcon(key)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                    {FIELD_LABELS[key] || formatFieldLabel(key)}
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
          <div className="border-t border-border/40 pt-3">
            <p className="text-xs text-muted-foreground mb-2 font-medium uppercase tracking-wide">Additional Information</p>
            <div className="grid grid-cols-2 gap-2 text-sm">
              {secondaryFields.slice(0, 8).map(([key, value]) => (
                <div key={key} className="flex justify-between gap-2 p-2.5 bg-muted/40 rounded-lg">
                  <span className="text-muted-foreground truncate">
                    {FIELD_LABELS[key] || formatFieldLabel(key)}
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
    </div>
  )

  if (inline) return content

  return (
    <Card className={cn("rounded-xl border-border/50", className)}>
      <CardHeader className="py-4 px-5">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Heart className="h-4 w-4 text-primary" />
          Clinical Summary
        </CardTitle>
      </CardHeader>
      <CardContent className="px-5 py-4">
        {content}
      </CardContent>
    </Card>
  )
}
