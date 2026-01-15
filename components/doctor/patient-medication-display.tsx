"use client"

import { Pill, Info } from "lucide-react"
import { cn } from "@/lib/utils"

/**
 * Patient Medication Display - Clinician View
 *
 * Displays the medication a patient selected during intake.
 * Labeled clearly as "Patient-selected (reference only)" per policy.
 *
 * See: docs/MEDICATION_SEARCH_POLICY.md
 * See: docs/MEDICATION_SEARCH_SPEC.md
 */

interface PatientMedicationDisplayProps {
  pbsCode: string | null
  drugName: string | null
  strength?: string | null
  form?: string | null
  patientTypedValue?: string | null
  className?: string
}

export function PatientMedicationDisplay({
  pbsCode,
  drugName,
  strength,
  form,
  patientTypedValue,
  className,
}: PatientMedicationDisplayProps) {
  const hasSelection = pbsCode && drugName
  const hasTypedValue = patientTypedValue && !hasSelection

  if (!hasSelection && !hasTypedValue) {
    return (
      <div className={cn("text-sm text-muted-foreground italic", className)}>
        No medication provided by patient
      </div>
    )
  }

  return (
    <div
      className={cn(
        "rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 p-4",
        className
      )}
    >
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-lg bg-slate-200/50 dark:bg-slate-700/50 flex items-center justify-center shrink-0">
          <Pill className="w-4 h-4 text-slate-500" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Patient-selected (reference only)
            </span>
          </div>

          {hasSelection ? (
            <>
              <p className="font-medium text-foreground">{drugName}</p>
              {strength && (
                <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">
                  {strength}
                </p>
              )}
              {form && (
                <p className="text-xs text-muted-foreground/70 mt-0.5">
                  {form}
                </p>
              )}
              <p className="text-xs text-muted-foreground mt-2">
                PBS Code: {pbsCode}
              </p>
            </>
          ) : (
            <>
              <p className="font-medium text-foreground">{patientTypedValue}</p>
              <p className="text-xs text-muted-foreground mt-1 italic">
                Custom entry (not matched to PBS)
              </p>
            </>
          )}
        </div>
      </div>

      <div className="mt-3 pt-3 border-t border-slate-200/50 dark:border-slate-700/50 flex items-start gap-2">
        <Info className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />
        <p className="text-xs text-muted-foreground">
          This is what the patient entered for reference. All prescribing
          decisions occur in your prescribing system.
        </p>
      </div>
    </div>
  )
}
