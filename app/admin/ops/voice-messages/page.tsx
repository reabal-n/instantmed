import { AlertTriangle, ArrowRight, PhoneCall } from "lucide-react"
import Link from "next/link"

import { DashboardCard, StatusBadge } from "@/components/dashboard"
import {
  OperatorPage,
  OperatorPageHeader,
  OperatorScrollArea,
} from "@/components/operator"
import {
  VOICE_MESSAGE_STATUSES,
  type VoiceMessageStatus,
} from "@/lib/admin/medical-director-voice-message-types"
import {
  getMedicalDirectorVoiceMessageInbox,
} from "@/lib/admin/medical-director-voice-messages"
import { requireRole } from "@/lib/auth/helpers"
import {
  ADMIN_VOICE_MESSAGES_HREF,
  buildAdminVoiceMessageHref,
} from "@/lib/dashboard/routes"
import { cn } from "@/lib/utils"

export const dynamic = "force-dynamic"

interface PageProps {
  searchParams: Promise<{ status?: string | string[] }>
}

const STATUS_LABELS: Record<VoiceMessageStatus, string> = {
  new: "New",
  in_review: "In review",
  resolved: "Resolved",
}

function parseStatus(value: string | string[] | undefined): VoiceMessageStatus {
  const candidate = Array.isArray(value) ? value[0] : value
  return VOICE_MESSAGE_STATUSES.includes(candidate as VoiceMessageStatus)
    ? candidate as VoiceMessageStatus
    : "new"
}

function receivedAt(value: string): string {
  return new Intl.DateTimeFormat("en-AU", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Australia/Sydney",
  }).format(new Date(value))
}

export default async function MedicalDirectorVoiceInboxPage({
  searchParams,
}: PageProps) {
  await requireRole(["admin"])
  const params = await searchParams
  const status = parseStatus(params.status)
  const inbox = await getMedicalDirectorVoiceMessageInbox(status)
  const now = Date.now()

  return (
    <OperatorPage>
      <OperatorPageHeader
        title="Voice inbox"
        description="Confirmed patient messages taken by Lena for the Medical Director."
        backHref="/admin/ops"
        badge={
          inbox.counts.new > 0 ? (
            <StatusBadge status="warning" size="sm">
              {inbox.counts.new} new
            </StatusBadge>
          ) : (
            <StatusBadge status="success" size="sm">Clear</StatusBadge>
          )
        }
      />

      <nav
        aria-label="Voice message status"
        className="flex shrink-0 gap-1 rounded-lg border border-border/50 bg-card p-1"
      >
        {VOICE_MESSAGE_STATUSES.map((item) => (
          <Link
            key={item}
            href={`${ADMIN_VOICE_MESSAGES_HREF}?status=${item}`}
            aria-current={status === item ? "page" : undefined}
            className={cn(
              "flex min-h-10 flex-1 items-center justify-center gap-2 rounded-md px-3 text-xs font-semibold transition-colors",
              status === item
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {STATUS_LABELS[item]}
            <span className="tabular-nums opacity-80">{inbox.counts[item]}</span>
          </Link>
        ))}
      </nav>

      <OperatorScrollArea className="space-y-2">
        {inbox.items.length === 0 ? (
          <DashboardCard
            padding="lg"
            className="flex min-h-56 items-center justify-center text-center"
          >
            <div>
              <PhoneCall className="mx-auto h-6 w-6 text-muted-foreground" aria-hidden />
              <h2 className="mt-3 text-sm font-semibold">
                No {STATUS_LABELS[status].toLowerCase()} voice messages
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Confirmed messages will appear here after the secure save succeeds.
              </p>
            </div>
          </DashboardCard>
        ) : inbox.items.map((item) => {
          const isOld = item.status !== "resolved" &&
            now - Date.parse(item.createdAt) >= 24 * 60 * 60 * 1000
          return (
            <Link
              key={item.id}
              href={buildAdminVoiceMessageHref(item.id)}
              prefetch={false}
            >
              <DashboardCard
                interactive
                padding="none"
                className="grid gap-3 px-4 py-3 sm:grid-cols-[minmax(180px,0.8fr)_minmax(200px,1fr)_auto] sm:items-center"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-foreground">
                      {item.categoryLabel}
                    </span>
                    {item.category === "complaint" ? (
                      <StatusBadge status="error" size="sm">Complaint</StatusBadge>
                    ) : null}
                    {isOld ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-destructive">
                        <AlertTriangle className="h-3 w-3" aria-hidden />
                        Over 24h
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {receivedAt(item.createdAt)}
                  </p>
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <span>{item.callbackRequested ? "Callback requested" : "Message only"}</span>
                  <span>
                    Match: {item.patientMatchState.replace("_", " ")}
                  </span>
                  {!item.patientDetailsComplete ? (
                    <span className="font-medium text-warning">Incomplete details</span>
                  ) : null}
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground" aria-hidden />
              </DashboardCard>
            </Link>
          )
        })}
      </OperatorScrollArea>
    </OperatorPage>
  )
}
