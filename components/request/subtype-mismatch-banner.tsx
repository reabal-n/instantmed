"use client"

import { AlertTriangle } from "lucide-react"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"

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
    <Alert className="mb-4 border-warning-border bg-warning-light">
      <AlertTriangle className="w-4 h-4 text-warning" />
      <AlertDescription className="flex flex-col gap-3">
        <span className="text-sm text-warning">
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
