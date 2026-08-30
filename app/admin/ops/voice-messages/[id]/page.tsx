import { AlertTriangle, Phone, UserRound } from "lucide-react"
import Link from "next/link"
import { notFound } from "next/navigation"

import { DashboardCard, StatusBadge } from "@/components/dashboard"
import {
  OperatorPage,
  OperatorPageHeader,
  OperatorScrollArea,
} from "@/components/operator"
import {
  VOICE_MESSAGE_RESOLUTION_LABELS,
} from "@/lib/admin/medical-director-voice-message-types"
import {
  getMedicalDirectorVoiceMessageDetail,
} from "@/lib/admin/medical-director-voice-messages"
import { requireRole } from "@/lib/auth/helpers"
import {
  ADMIN_VOICE_MESSAGES_HREF,
  buildStaffPatientHref,
} from "@/lib/dashboard/routes"

import { VoiceMessageWorkflow } from "./voice-message-workflow"

export const dynamic = "force-dynamic"

interface PageProps {
  params: Promise<{ id: string }>
}

function formatDateTime(value: string | null): string {
  if (!value) return "—"
  return new Intl.DateTimeFormat("en-AU", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Australia/Sydney",
  }).format(new Date(value))
}

function formatDob(value: string | null): string {
  if (!value) return "Not captured"
  const [year, month, day] = value.split("-")
  return year && month && day ? `${day}/${month}/${year}` : value
}

export default async function MedicalDirectorVoiceMessagePage({
  params,
}: PageProps) {
  const auth = await requireRole(["admin"])
  const { id } = await params
  const message = await getMedicalDirectorVoiceMessageDetail(id, auth.profile.id)
  if (!message) notFound()

  const statusTone = message.status === "new"
    ? "warning"
    : message.status === "in_review"
      ? "info"
      : "success"

  return (
    <OperatorPage>
      <OperatorPageHeader
        title={message.categoryLabel}
        description={`Received ${formatDateTime(message.createdAt)}`}
        backHref={ADMIN_VOICE_MESSAGES_HREF}
        backLabel="Voice inbox"
        badge={<StatusBadge status={statusTone} size="sm">
          {message.status.replace("_", " ")}
        </StatusBadge>}
      />

      <OperatorScrollArea className="space-y-3">
        {message.category === "complaint" ? (
          <div className="flex gap-3 rounded-xl border border-destructive/25 bg-destructive/5 p-4 text-sm text-foreground">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" aria-hidden />
            <div>
              <p className="font-semibold">Complaint flagged</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Start the formal complaints workflow if this message meets the complaints policy.
              </p>
            </div>
          </div>
        ) : null}

        <div className="grid gap-3 lg:grid-cols-[minmax(0,1.35fr)_minmax(300px,0.75fr)]">
          <div className="space-y-3">
            <DashboardCard padding="md">
              <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Patient details
              </h2>
              <dl className="mt-4 grid gap-4 sm:grid-cols-2">
                <div>
                  <dt className="text-xs text-muted-foreground">Full name</dt>
                  <dd className="mt-1 text-sm font-semibold">
                    {message.payload.patientFullName || "Not captured"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Date of birth</dt>
                  <dd className="mt-1 text-sm font-semibold">
                    {formatDob(message.payload.dateOfBirth)}
                  </dd>
                </div>
              </dl>
              {!message.patientDetailsComplete ? (
                <p className="mt-4 text-xs font-medium text-warning">
                  Lena could not capture both identity details. The confirmed message was retained.
                </p>
              ) : null}
            </DashboardCard>

            <DashboardCard padding="md">
              <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Confirmed message
              </h2>
              <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                {message.payload.confirmedSummary}
              </p>
              <p className="mt-4 text-[11px] text-muted-foreground">
                Immutable readback confirmed by the patient. No raw audio or full transcript is stored by InstantMed.
              </p>
            </DashboardCard>

            <DashboardCard padding="md">
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" aria-hidden />
                <h2 className="text-sm font-semibold">
                  {message.callbackRequested ? "Callback requested" : "Message only"}
                </h2>
              </div>
              {message.callbackRequested ? (
                <>
                  <p className="mt-3 font-mono text-sm">
                    {message.payload.callbackNumber || "Number not captured"}
                  </p>
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                    Return calls must present 0495 049 555 or use withheld caller ID. Do not call from the retired private support number.
                  </p>
                </>
              ) : (
                <p className="mt-2 text-xs text-muted-foreground">
                  The patient did not ask for a return call.
                </p>
              )}
            </DashboardCard>
          </div>

          <div className="space-y-3">
            <DashboardCard padding="md">
              <div className="flex items-center gap-2">
                <UserRound className="h-4 w-4 text-muted-foreground" aria-hidden />
                <h2 className="text-sm font-semibold">Patient match</h2>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                State: {message.patientMatchState}
              </p>
              {message.suggestedPatient ? (
                <Link
                  href={buildStaffPatientHref(message.suggestedPatient.id)}
                  className="mt-3 inline-flex text-sm font-semibold text-primary hover:underline"
                >
                  {message.suggestedPatient.fullName}
                </Link>
              ) : (
                <p className="mt-3 text-sm">No suggested patient</p>
              )}
              <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
                Name and date of birth provide a suggestion only. They do not verify caller identity.
              </p>
            </DashboardCard>

            <DashboardCard padding="md">
              <VoiceMessageWorkflow
                messageId={message.id}
                status={message.status}
                suggestedPatient={message.suggestedPatient}
              />
            </DashboardCard>

            <DashboardCard padding="md">
              <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Queue history
              </h2>
              <dl className="mt-3 space-y-2 text-xs">
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">Claimed</dt>
                  <dd>{formatDateTime(message.claimedAt)}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">Resolved</dt>
                  <dd>{formatDateTime(message.resolvedAt)}</dd>
                </div>
                {message.resolutionReason ? (
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">Reason</dt>
                    <dd>{VOICE_MESSAGE_RESOLUTION_LABELS[message.resolutionReason]}</dd>
                  </div>
                ) : null}
              </dl>
            </DashboardCard>
          </div>
        </div>
      </OperatorScrollArea>
    </OperatorPage>
  )
}
