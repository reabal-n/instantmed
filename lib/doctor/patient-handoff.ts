import type { PatientSnapshot } from "@/lib/doctor/patient-snapshot"

export type PatientHandoffTone = "success" | "warning" | "critical"

export interface PatientHandoffSummary {
  tone: PatientHandoffTone
  statusLabel: string
  shortLabel: string
  detailLabel: string
  missingFields: string[]
  tooltip: string
  actionLabel: string
}

function summarizeMissingFields(fields: string[], visibleCount: number): string {
  const visible = fields.slice(0, visibleCount)
  const remaining = fields.length - visible.length
  if (visible.length === 0) return ""
  return remaining > 0 ? `${visible.join(", ")} +${remaining} more` : visible.join(", ")
}

export function buildPatientHandoffSummary(
  snapshot: Pick<PatientSnapshot, "missingCriticalFields" | "completenessTone" | "completenessLabel">,
): PatientHandoffSummary {
  const missingFields = snapshot.missingCriticalFields

  if (missingFields.length === 0) {
    return {
      tone: "success",
      statusLabel: "Handoff ready",
      shortLabel: "Ready",
      detailLabel: "Patient details complete",
      missingFields: [],
      tooltip: "Doctor handoff is ready.",
      actionLabel: "Open request",
    }
  }

  const compactFields = summarizeMissingFields(missingFields, 3)
  const tone: PatientHandoffTone = snapshot.completenessTone === "missing" ? "critical" : "warning"

  return {
    tone,
    statusLabel: `Missing ${missingFields.length}: ${compactFields}`,
    shortLabel: `Missing ${missingFields.length}`,
    detailLabel: snapshot.completenessLabel,
    missingFields,
    tooltip: `Missing doctor handoff fields: ${missingFields.join(", ")}. Action: open the request, request patient info if needed, then review again.`,
    actionLabel: "Fix before review",
  }
}
