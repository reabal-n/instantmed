"use client"

import { Clock, FileText, StickyNote } from "lucide-react"
import Link from "next/link"

import { Badge } from "@/components/ui/badge"
import { buildAdminIntakeHref } from "@/lib/dashboard/routes"
import { formatDate } from "@/lib/format"
import { formatIntakeStatus } from "@/lib/format/intake"
import { cn } from "@/lib/utils"

export interface PatientTimelineRequest {
  id: string
  status: string
  created_at: string
  reference_number?: string | null
  category?: string | null
  service_label?: string | null
  service?: {
    name?: string | null
    short_name?: string | null
    type?: string | null
  } | null
}

export interface PatientTimelineNote {
  id: string
  content: string
  note_type: string
  created_at: string
  created_by_name?: string | null
}

interface PatientTimelineProps {
  requests?: PatientTimelineRequest[]
  notes?: PatientTimelineNote[]
  admin?: boolean
  compact?: boolean
  maxItems?: number
  title?: string
  emptyLabel?: string
  className?: string
}

type TimelineItem =
  | { type: "request"; date: string; request: PatientTimelineRequest }
  | { type: "note"; date: string; note: PatientTimelineNote }

function requestLabel(request: PatientTimelineRequest): string {
  return request.service_label
    || request.service?.short_name
    || request.service?.name
    || request.category
    || "Request"
}

function requestHref(request: PatientTimelineRequest, admin: boolean): string {
  return admin ? buildAdminIntakeHref(request.id) : `/doctor/intakes/${request.id}`
}

export function PatientTimeline({
  requests = [],
  notes = [],
  admin = false,
  compact = false,
  maxItems = compact ? 5 : 10,
  title = "Patient timeline",
  emptyLabel = "No previous activity recorded.",
  className,
}: PatientTimelineProps) {
  const items: TimelineItem[] = [
    ...requests.map((request) => ({ type: "request" as const, date: request.created_at, request })),
    ...notes.map((note) => ({ type: "note" as const, date: note.created_at, note })),
  ]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, maxItems)

  return (
    <section
      aria-label={title}
      className={cn(
        "rounded-xl border border-border/60 bg-background p-4",
        compact && "p-3",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-primary" aria-hidden />
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        </div>
        <Badge variant="outline" size="sm" className="shrink-0">
          {requests.length + notes.length}
        </Badge>
      </div>

      {items.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">{emptyLabel}</p>
      ) : (
        <ol className="mt-3 space-y-2">
          {items.map((item) => {
            if (item.type === "request") {
              const request = item.request
              return (
                <li key={`request-${request.id}`}>
                  <Link
                    href={requestHref(request, admin)}
                    className="group flex min-w-0 items-center justify-between gap-3 rounded-lg border border-border/45 px-3 py-2 transition-colors hover:bg-muted/35"
                  >
                    <div className="flex min-w-0 items-start gap-2">
                      <FileText className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground transition-colors group-hover:text-primary" aria-hidden />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-foreground">{requestLabel(request)}</p>
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">
                          {request.reference_number || request.id.slice(0, 8)} · {formatDate(request.created_at)}
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline" size="sm" className="shrink-0">
                      {formatIntakeStatus(request.status)}
                    </Badge>
                  </Link>
                </li>
              )
            }

            const note = item.note
            return (
              <li key={`note-${note.id}`} className="rounded-lg bg-muted/30 px-3 py-2">
                <div className="flex min-w-0 items-start gap-2">
                  <StickyNote className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                  <div className="min-w-0">
                    <p className="line-clamp-2 text-sm leading-6 text-foreground">{note.content}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {note.note_type} · {formatDate(note.created_at)}
                    </p>
                  </div>
                </div>
              </li>
            )
          })}
        </ol>
      )}
    </section>
  )
}
