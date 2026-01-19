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
  last_prescribed: "Last Prescribed",
  pharmacy_preference: "Preferred Pharmacy",
  is_repeat: "Repeat Prescription",
  // Consult fields
  consult_reason: "Reason for Consult",
  // Safety fields
  emergency_symptoms: "Emergency Symptoms",
  red_flags_detected: "Red Flags",
  // Consent
  telehealth_consent_given: "Telehealth Consent",
}

// Fields to highlight as critical
const CRITICAL_FIELDS = ["emergency_symptoms", "red_flags_detected", "symptom_severity"]

// Fields to show duration/time formatting
const DATE_FIELDS = ["start_date", "last_prescribed"]

// Duration labels
const SYMPTOM_DURATION_LABELS: Record<string, string> = {
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

export function ClinicalSummary({ answers, serviceType: _serviceType, className }: ClinicalSummaryProps) {
  // Extract and categorize fields
  const criticalFields: [string, unknown][] = []
  const primaryFields: [string, unknown][] = []
  const secondaryFields: [string, unknown][] = []
  
  // Priority order for display
  const priorityOrder = [
    "symptoms", "symptom_details", "symptom_duration",
    "certificate_type", "duration", "start_date",
    "medication_name", "medication_dosage", "last_prescribed",
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
  
  for (const [key, value] of sortedEntries) {
    // Skip internal/meta fields
    if (key.startsWith("_") || key === "attribution" || key === "consent_timestamp") continue
    // Skip patient details (shown separately)
    if (key.startsWith("patient_")) continue
    
    if (CRITICAL_FIELDS.includes(key) && value) {
      criticalFields.push([key, value])
    } else if (priorityOrder.includes(key)) {
      primaryFields.push([key, value])
    } else {
      secondaryFields.push([key, value])
    }
  }

  return (
    <Card className={cn("", className)}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Heart className="h-5 w-5 text-primary" />
          Clinical Summary
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Critical/Red Flags - Always prominent */}
        {criticalFields.length > 0 && (
          <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3 space-y-2">
            <div className="flex items-center gap-2 text-destructive font-medium text-sm">
              <AlertTriangle className="h-4 w-4" />
              Flags Requiring Attention
            </div>
            {criticalFields.map(([key, value]) => (
              <div key={key} className="flex items-start gap-2 text-sm">
                <Badge variant="destructive" className="text-xs">
                  {FIELD_LABELS[key] || key.replace(/_/g, " ")}
                </Badge>
                <span className="text-destructive-foreground">{formatValue(key, value)}</span>
              </div>
            ))}
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
        {primaryFields.length === 0 && secondaryFields.length === 0 && criticalFields.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            No intake data available
          </p>
        )}
      </CardContent>
    </Card>
  )
}
