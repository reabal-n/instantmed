"use client"

import { ClipboardCopy, Pill } from "lucide-react"

import { Button } from "@/components/ui/button"
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

  const handleCopyAll = () => {
    if (typeof navigator === "undefined") return
    void navigator.clipboard?.writeText(intent.clipboardText)
  }

  const medicationLine = [intent.medicationName, intent.strength, intent.form].filter(Boolean).join(" ")

  const handleCopyMed = () => {
    if (typeof navigator === "undefined" || !medicationLine) return
    void navigator.clipboard?.writeText(medicationLine)
  }

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
          Recommended prescription
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
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <Button variant="outline" size="sm" className="text-xs" onClick={handleCopyAll}>
            <ClipboardCopy className="h-3.5 w-3.5 mr-1" aria-hidden />
            Copy all
          </Button>
          {medicationLine ? (
            <Button variant="outline" size="sm" className="text-xs" onClick={handleCopyMed}>
              <ClipboardCopy className="h-3.5 w-3.5 mr-1" aria-hidden />
              Copy medication
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  )
}
