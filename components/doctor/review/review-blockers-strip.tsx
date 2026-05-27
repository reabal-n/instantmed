"use client"

import { AlertTriangle, Mail, ShieldAlert, Truck } from "lucide-react"

import { useIntakeReview } from "@/components/doctor/review/intake-review-context"
import { Badge } from "@/components/ui/badge"
import {
  buildPatientSnapshot,
  getPatientSnapshotOptionsForCase,
  requiresPrescribingIdentityForCase,
} from "@/lib/doctor/patient-snapshot"
import { cn } from "@/lib/utils"

interface BlockerItem {
  id: string
  label: string
  detail: string
  icon: typeof AlertTriangle
  tone: "warning" | "destructive"
}

export function ReviewBlockersStrip() {
  const { intake, service, answers, data } = useIntakeReview()
  const snapshotContext = {
    answers,
    category: intake.category,
    serviceType: service?.type,
    subtype: intake.subtype,
  }
  const snapshot = buildPatientSnapshot(intake.patient, {
    ...getPatientSnapshotOptionsForCase(snapshotContext),
    answers,
  })
  const requiresPrescribingIdentity = requiresPrescribingIdentityForCase(snapshotContext)
  const patientReplyCount = data.patientMessages?.filter((message) => message.sender_type === "patient").length ?? 0
  const certificateDeliveryPending = Boolean(
    data.certificate &&
    ["approved", "completed"].includes(intake.status) &&
    !data.certificate.email_sent_at &&
    !data.certificate.email_opened_at,
  )
  const scriptDeliveryPending = intake.status === "awaiting_script" && !intake.script_sent

  const blockers: BlockerItem[] = [
    ...(snapshot.missingCriticalFields.length > 0 && requiresPrescribingIdentity
      ? [{
          id: "identity",
          label: "Identity missing",
          detail: snapshot.missingCriticalFields.join(", "),
          icon: ShieldAlert,
          tone: "destructive" as const,
        }]
      : []),
    ...(intake.status === "pending_info" && !intake.info_request_message
      ? [{
          id: "message-needed",
          label: "Message needed",
          detail: "Case is waiting for info, but no patient prompt is recorded.",
          icon: Mail,
          tone: "warning" as const,
        }]
      : []),
    ...(intake.status === "pending_info" && intake.info_request_message && patientReplyCount === 0
      ? [{
          id: "waiting-patient",
          label: "Waiting for patient",
          detail: "Info request sent. No patient reply yet.",
          icon: Mail,
          tone: "warning" as const,
        }]
      : []),
    ...(certificateDeliveryPending || scriptDeliveryPending
      ? [{
          id: "delivery",
          label: "Delivery pending",
          detail: certificateDeliveryPending ? "Certificate email not sent yet." : "Script not marked sent yet.",
          icon: Truck,
          tone: "warning" as const,
        }]
      : []),
  ]

  // Self-hide when there's nothing to surface. "No blocking issues" filler
  // copy on every case was scroll bloat; absence is the all-clear signal.
  if (blockers.length === 0) return null

  return (
    <section className="rounded-xl border border-warning-border bg-warning-light/30 p-3" aria-label="Case checks">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-warning" aria-hidden />
          <h3 className="text-sm font-semibold text-foreground">Needs attention</h3>
        </div>
        <Badge variant="warning" size="sm">
          {blockers.length} open
        </Badge>
      </div>

      <div className="mt-3 space-y-2">
        {blockers.map((blocker) => {
          const Icon = blocker.icon
          return (
            <div
              key={blocker.id}
              className={cn(
                "flex items-start gap-2 rounded-lg border px-3 py-2 text-sm",
                blocker.tone === "destructive"
                  ? "border-destructive/30 bg-destructive/10 text-destructive"
                  : "border-warning-border bg-warning-light text-warning",
              )}
            >
              <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              <div className="min-w-0">
                <p className="font-semibold">{blocker.label}</p>
                <p className="mt-0.5 break-words text-xs opacity-90">{blocker.detail}</p>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
