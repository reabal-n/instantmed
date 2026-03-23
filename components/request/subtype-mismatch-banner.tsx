"use client"

import { AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"

const SUBTYPE_LABELS: Record<string, string> = {
  general: 'General consultation',
  new_medication: 'General consultation', // legacy backward compat
  ed: 'Erectile dysfunction',
  hair_loss: 'Hair loss treatment',
  womens_health: "Women's health",
  weight_loss: 'Weight management',
}

interface SubtypeMismatchBannerProps {
  draftSubtype: string
  urlSubtype: string
  onResumeDraft: () => void
  onStartFresh: () => void
}

export function SubtypeMismatchBanner({
  draftSubtype,
  urlSubtype,
  onResumeDraft,
  onStartFresh,
}: SubtypeMismatchBannerProps) {
  const draftLabel = SUBTYPE_LABELS[draftSubtype] || draftSubtype
  const urlLabel = SUBTYPE_LABELS[urlSubtype] || urlSubtype

  return (
    <Alert className="mb-4 border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30">
      <AlertTriangle className="w-4 h-4 text-amber-600" />
      <AlertDescription className="flex flex-col gap-3">
        <span className="text-sm text-amber-700 dark:text-amber-300">
          You have an unfinished <strong>{draftLabel}</strong> consult.
          You selected <strong>{urlLabel}</strong>.
        </span>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={onStartFresh}>
            Start {urlLabel}
          </Button>
          <Button size="sm" onClick={onResumeDraft}>
            Resume {draftLabel}
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  )
}
