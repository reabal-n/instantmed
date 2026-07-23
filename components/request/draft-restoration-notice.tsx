"use client"

import { RotateCcw } from "lucide-react"

import { RequestButton } from "./request-button"

interface DraftRestorationNoticeProps {
  onStartOver: () => void
}

/**
 * Acknowledges the restore that has already happened without interrupting the
 * form with a false confirmation step. It remains visible only on the restored
 * landing step; RequestFlow retires it as soon as the patient continues.
 */
export function DraftRestorationNotice({ onStartOver }: DraftRestorationNoticeProps) {
  return (
    <div className="mb-3 flex min-h-12 items-center justify-between gap-3 rounded-lg bg-muted/40 px-3 text-muted-foreground">
      <span className="flex min-w-0 items-center gap-2 text-base" role="status" aria-live="polite">
        <RotateCcw className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span>Progress restored</span>
      </span>
      <RequestButton
        variant="ghost"
        size="sm"
        onClick={onStartOver}
        aria-label="Start this request over"
        className="-mr-2 h-12 shrink-0 px-2 text-sm font-medium text-foreground/70 underline underline-offset-4 hover:text-foreground"
      >
        Start over
      </RequestButton>
    </div>
  )
}
