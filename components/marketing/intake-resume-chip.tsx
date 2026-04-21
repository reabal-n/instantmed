'use client'

import { ArrowRight, Clock, RotateCcw, X } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'

import { Button } from '@/components/ui/button'
import { type DraftData, getAllDrafts } from '@/lib/request/draft-storage'
import { cn } from '@/lib/utils'

const SERVICE_LABELS: Record<DraftData['serviceType'], string> = {
  'med-cert': 'medical certificate',
  'prescription': 'repeat prescription',
  'consult': 'consult',
}

const SERVICE_ROUTES: Record<DraftData['serviceType'], string> = {
  'med-cert': '/request?service=med-cert',
  'prescription': '/request?service=prescription',
  'consult': '/request?service=consult',
}

const DISMISS_KEY = 'intake_resume_chip_dismissed_at'
const DISMISS_WINDOW_MS = 1000 * 60 * 60 * 6 // 6h - re-offer if they come back later

function formatRelative(iso: string): string {
  const saved = new Date(iso).getTime()
  const mins = Math.round((Date.now() - saved) / 60000)
  if (mins < 2) return 'just now'
  if (mins < 60) return `${mins} min ago`
  const hours = Math.round(mins / 60)
  if (hours < 24) return `${hours}h ago`
  return 'recently'
}

/**
 * Shows a resume chip above the hero if the visitor has an unfinished /request
 * draft in localStorage. Picks the most recently saved draft (drafts are
 * already sorted descending by lastSavedAt). Self-dismisses for 6 hours.
 */
export function IntakeResumeChip({ className }: { className?: string }) {
  const [draft, setDraft] = useState<DraftData | null>(null)

  useEffect(() => {
    try {
      const dismissedAt = Number(localStorage.getItem(DISMISS_KEY) ?? 0)
      if (dismissedAt && Date.now() - dismissedAt < DISMISS_WINDOW_MS) {
        return
      }
      const [most_recent] = getAllDrafts()
      if (most_recent) setDraft(most_recent)
    } catch {
      // localStorage unavailable - render nothing
    }
  }, [])

  if (!draft) return null

  const label = SERVICE_LABELS[draft.serviceType]
  const href = SERVICE_ROUTES[draft.serviceType]

  return (
    <div
      className={cn(
        'flex items-center justify-between gap-3 rounded-2xl border border-primary/30 bg-primary/5 dark:bg-primary/10 px-4 py-3 shadow-sm shadow-primary/[0.04]',
        className,
      )}
      role="status"
    >
      <div className="flex items-start gap-3 min-w-0">
        <div className="w-9 h-9 shrink-0 rounded-full bg-primary/15 flex items-center justify-center">
          <RotateCcw className="w-4 h-4 text-primary" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground leading-tight">
            Pick up your {label} request?
          </p>
          <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5">
            <Clock className="w-3 h-3" aria-hidden="true" />
            Saved {formatRelative(draft.lastSavedAt)} &middot; takes under a minute to finish
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Button asChild size="sm" className="rounded-full h-8">
          <Link href={href}>
            Continue
            <ArrowRight className="ml-1.5 w-3.5 h-3.5" />
          </Link>
        </Button>
        <button
          onClick={() => {
            try {
              localStorage.setItem(DISMISS_KEY, String(Date.now()))
            } catch {
              // ignore
            }
            setDraft(null)
          }}
          className="text-muted-foreground hover:text-foreground p-1 rounded-md hover:bg-foreground/5 transition-colors"
          aria-label="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
