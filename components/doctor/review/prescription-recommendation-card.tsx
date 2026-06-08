"use client"

import { Pill } from "lucide-react"

import type { PrescriptionIntent } from "@/lib/clinical/case-summary"
import { cn } from "@/lib/utils"

interface PrescriptionRecommendationCardProps {
  intent: PrescriptionIntent | undefined
  className?: string
}

export function PrescriptionRecommendationCard({
  intent,
  className,
}: PrescriptionRecommendationCardProps) {
  if (!intent) return null

  const medicationLine = [intent.medicationName, intent.strength, intent.form].filter(Boolean).join(" ")
  const qtyParts = [
    intent.quantityTemplate ?? null,
    intent.repeatsTemplate ? `${intent.repeatsTemplate} rpts` : null,
  ].filter(Boolean).join(" · ")

  return (
    <div className={cn("rounded-lg border border-border/50 bg-card px-3 py-2", className)}>
      <div className="flex items-center gap-1.5">
        <Pill className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
        <span className="text-[11px] font-medium text-muted-foreground">Parchment</span>
      </div>
      <div className="mt-0.5 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
        {medicationLine ? (
          <span className="text-sm font-semibold text-foreground">{medicationLine}</span>
        ) : null}
        {qtyParts ? (
          <span className="text-xs text-muted-foreground">{qtyParts}</span>
        ) : null}
      </div>
      {intent.cautionChecks && intent.cautionChecks.length > 0 ? (
        <p className="mt-1.5 rounded border border-amber-200 bg-amber-50 px-2 py-1 text-xs text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200">
          {intent.cautionChecks.join(" · ")}
        </p>
      ) : null}
    </div>
  )
}
