"use client"

import { AlertTriangle, Info, ShieldAlert } from "lucide-react"
import type { DrugInteraction } from "@/lib/clinical/decision-support"

interface ClinicalAlertsProps {
  interactions: DrugInteraction[]
  pbsListed: boolean
  pbsCode?: string
}

export function ClinicalAlerts({ interactions, pbsListed, pbsCode }: ClinicalAlertsProps) {
  if (interactions.length === 0 && pbsListed) return null

  return (
    <div className="space-y-2">
      {interactions.map((interaction, i) => (
        <div
          key={i}
          className={`flex items-start gap-2 rounded-lg p-3 text-sm ${
            interaction.severity === "severe"
              ? "border border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/20"
              : interaction.severity === "moderate"
              ? "border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/20"
              : "border border-sky-200 bg-sky-50 dark:border-sky-800 dark:bg-sky-950/20"
          }`}
        >
          {interaction.severity === "severe" ? (
            <ShieldAlert className="h-4 w-4 mt-0.5 shrink-0 text-red-600 dark:text-red-400" />
          ) : (
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0 text-amber-600 dark:text-amber-400" />
          )}
          <div>
            <p className="font-medium">
              {interaction.drug1} + {interaction.drug2}
            </p>
            <p className="text-muted-foreground">{interaction.description}</p>
          </div>
        </div>
      ))}

      {!pbsListed && (
        <div className="flex items-start gap-2 rounded-lg border border-sky-200 bg-sky-50 p-3 text-sm dark:border-sky-800 dark:bg-sky-950/20">
          <Info className="h-4 w-4 mt-0.5 shrink-0 text-sky-600 dark:text-sky-400" />
          <p>This medication is not listed on the PBS</p>
        </div>
      )}

      {pbsListed && pbsCode && (
        <div className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm dark:border-emerald-800 dark:bg-emerald-950/20">
          <Info className="h-4 w-4 mt-0.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
          <p>PBS Listed (Code: {pbsCode})</p>
        </div>
      )}
    </div>
  )
}
