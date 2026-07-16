'use client'

import { ArrowRight, Clock, RotateCcw, X } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'

import { Button } from '@/components/ui/button'
import { buildDraftResumePath } from '@/lib/request/draft-resume-route'
import { type DraftData, getAllDrafts } from '@/lib/request/draft-storage'
import { cn } from '@/lib/utils'

type ServiceKey = DraftData['serviceType']

const SERVICE_LABELS: Record<ServiceKey, string> = {
  'med-cert': 'medical certificate',
  'prescription': 'repeat prescription',
  'consult': 'consult',
}

const DISMISS_KEY = 'intake_resume_chip_dismissed_at'
const DISMISS_WINDOW_MS = 1000 * 60 * 60 * 6 // 6h - re-offer if they come back later

interface ResumeTarget {
  serviceType: ServiceKey
  lastSavedAt: string
  href: string
}

function formatRelative(iso: string): string {
  const saved = new Date(iso).getTime()
  const mins = Math.round((Date.now() - saved) / 60000)
  if (mins < 2) return 'just now'
  if (mins < 60) return `${mins} min ago`
  const hours = Math.round(mins / 60)
  if (hours < 24) return `${hours}h ago`
  return 'recently'
}

function isValidServiceType(value: string): value is ServiceKey {
  return value === 'med-cert' || value === 'prescription' || value === 'consult'
}

/**
 * Shows a resume chip above the hero if the visitor has an unfinished /request
 * draft stored on this device. Explicit cross-device `d=` links are consumed
 * only by /request, where the recovered state can be atomically restored.
 *
 * Self-dismisses for 6 hours.
 */
export function IntakeResumeChip({ className }: { className?: string }) {
  const [target, setTarget] = useState<ResumeTarget | null>(null)

  useEffect(() => {
    let cancelled = false

    async function resolve() {
      try {
        const dismissedAt = Number(localStorage.getItem(DISMISS_KEY) ?? 0)
        if (dismissedAt && Date.now() - dismissedAt < DISMISS_WINDOW_MS) {
          return
        }

        const params = new URLSearchParams(window.location.search)
        if (params.has('d')) return

        for (const draft of getAllDrafts()) {
          if (!isValidServiceType(draft.serviceType)) continue
          const consultSubtype = typeof draft.answers.consultSubtype === 'string'
            ? draft.answers.consultSubtype
            : undefined
          const href = buildDraftResumePath({
            serviceType: draft.serviceType,
            consultSubtype,
          })
          if (!href || cancelled) continue
          setTarget({
            serviceType: draft.serviceType,
            lastSavedAt: draft.lastSavedAt,
            href,
          })
          return
        }
      } catch {
        // localStorage / fetch unavailable - render nothing
      }
    }

    void resolve()
    return () => {
      cancelled = true
    }
  }, [])

  if (!target) return null

  const label = SERVICE_LABELS[target.serviceType]

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
            Saved {formatRelative(target.lastSavedAt)} &middot; takes under a minute to finish
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Button asChild size="sm" className="rounded-full h-8">
          <Link href={target.href}>
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
            setTarget(null)
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
