"use client"

import { CheckCircle2, Clock, AlertCircle, FileText, CreditCard, Stethoscope, Send } from "lucide-react"

interface TimelineEvent {
  status: string
  timestamp: string
  label: string
}

const STATUS_META: Record<string, { icon: typeof Clock; color: string; label: string }> = {
  draft: { icon: FileText, color: "text-slate-400", label: "Request Created" },
  pending_payment: { icon: CreditCard, color: "text-amber-500", label: "Awaiting Payment" },
  paid: { icon: CreditCard, color: "text-sky-500", label: "Payment Received" },
  in_review: { icon: Stethoscope, color: "text-violet-500", label: "Doctor Reviewing" },
  pending_info: { icon: AlertCircle, color: "text-amber-500", label: "More Info Needed" },
  approved: { icon: CheckCircle2, color: "text-emerald-500", label: "Approved" },
  declined: { icon: AlertCircle, color: "text-red-500", label: "Declined" },
  completed: { icon: Send, color: "text-emerald-600", label: "Completed" },
}

interface RequestTimelineProps {
  events: TimelineEvent[]
  currentStatus: string
}

export function RequestTimeline({ events, currentStatus }: RequestTimelineProps) {
  return (
    <div className="space-y-0">
      {events.map((event, i) => {
        const meta = STATUS_META[event.status] || { icon: Clock, color: "text-muted-foreground", label: event.label }
        const Icon = meta.icon
        const isLast = i === events.length - 1
        const isCurrent = event.status === currentStatus

        return (
          <div key={i} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div className={`flex h-8 w-8 items-center justify-center rounded-full border-2 ${
                isCurrent ? "border-sky-400 bg-sky-50 dark:bg-sky-950" : "border-border bg-card"
              }`}>
                <Icon className={`h-4 w-4 ${meta.color}`} />
              </div>
              {!isLast && (
                <div className="h-8 w-px bg-border" />
              )}
            </div>
            <div className="pb-6">
              <p className={`font-medium text-sm ${isCurrent ? "text-foreground" : "text-muted-foreground"}`}>
                {meta.label}
              </p>
              <p className="text-xs text-muted-foreground">
                {new Date(event.timestamp).toLocaleString("en-AU", {
                  day: "numeric",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
          </div>
        )
      })}
    </div>
  )
}
