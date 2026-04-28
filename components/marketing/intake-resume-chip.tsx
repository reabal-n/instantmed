'use client'

import { ArrowRight, Clock, RotateCcw, X } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'

import { Button } from '@/components/ui/button'
import { type DraftData, getAllDrafts } from '@/lib/request/draft-storage'
import { getServerDraftById } from '@/lib/request/server-draft'
import { cn } from '@/lib/utils'

type ServiceKey = DraftData['serviceType']

const SERVICE_LABELS: Record<ServiceKey, string> = {
  'med-cert': 'medical certificate',
  'prescription': 'repeat prescription',
  'consult': 'consult',
}

const SERVICE_ROUTES: Record<ServiceKey, string> = {
  'med-cert': '/request?service=med-cert',
  'prescription': '/request?service=prescription',
  'consult': '/request?service=consult',
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

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Shows a resume chip above the hero if the visitor has an unfinished /request
 * draft. Two source paths:
 *
 * 1. URL `?d=<sessionId>` - if present, fetch the server draft. Used for
 *    cross-device "continue here" links sent from the recovery email or
 *    shared by the user with themselves on another device. Server draft wins
 *    because it represents an explicit cross-device intent.
 *
 * 2. localStorage draft - the existing single-device path. Picks the most
 *    recently saved draft (drafts are sorted descending by lastSavedAt).
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

        // Path 1: explicit cross-device link via ?d=<sessionId>
        const params = new URLSearchParams(window.location.search)
        const sessionId = params.get('d')
        if (sessionId && UUID_REGEX.test(sessionId)) {
          const serverDraft = await getServerDraftById(sessionId)
          if (cancelled) return
          if (serverDraft && isValidServiceType(serverDraft.serviceType)) {
            setTarget({
              serviceType: serverDraft.serviceType,
              lastSavedAt: serverDraft.updatedAt,
              href: `${SERVICE_ROUTES[serverDraft.serviceType]}&d=${encodeURIComponent(sessionId)}`,
            })
            return
          }
        }

        // Path 2: localStorage fallback
        const [most_recent] = getAllDrafts()
        if (cancelled || !most_recent) return
        setTarget({
          serviceType: most_recent.serviceType,
          lastSavedAt: most_recent.lastSavedAt,
          href: SERVICE_ROUTES[most_recent.serviceType],
        })
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
