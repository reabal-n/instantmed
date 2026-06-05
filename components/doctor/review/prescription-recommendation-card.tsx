"use client"

import { Pill } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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

  const quantityLine = [
    intent.quantityTemplate ? `Quantity: ${intent.quantityTemplate}` : null,
    intent.repeatsTemplate ? `Repeats: ${intent.repeatsTemplate}` : null,
  ]
    .filter(Boolean)
    .join(" · ")

  return (
    <Card
      className={cn(
        "bg-white dark:bg-card border border-border/50 shadow-md shadow-primary/[0.06]",
        className,
      )}
    >
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          <Pill className="h-3.5 w-3.5" aria-hidden />
          Parchment handoff context
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {medicationLine ? (
          <p className="text-base font-semibold text-foreground">{medicationLine}</p>
        ) : null}
        {quantityLine ? (
          <p className="text-sm text-muted-foreground">{quantityLine}</p>
        ) : null}
        <p className="text-sm text-foreground">{intent.directionsTemplate}</p>
        <p className="text-xs text-muted-foreground">
          Confirm medicine, dose and all prescribing details in Parchment.
        </p>
        {intent.cautionChecks && intent.cautionChecks.length > 0 ? (
          <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200">
            <p className="font-semibold">Cautions</p>
            <ul className="mt-1 space-y-0.5">
              {intent.cautionChecks.map((check) => (
                <li key={check}>{check}</li>
              ))}
            </ul>
          </div>
        ) : null}
        {intent.alternativeNote ? (
          <p className="text-xs italic text-muted-foreground">{intent.alternativeNote}</p>
        ) : null}
      </CardContent>
    </Card>
  )
}
