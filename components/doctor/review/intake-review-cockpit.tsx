"use client"

import { FileText, History, Loader2, NotebookPen, RefreshCw } from "lucide-react"
import { useState } from "react"

import { PatientDecisionStrip } from "@/components/doctor/patient-decision-strip"
import { PatientTimeline } from "@/components/doctor/patient-timeline"
import { ClinicalNotesEditor } from "@/components/doctor/review/clinical-notes-editor"
import { IntakeActionButtons } from "@/components/doctor/review/intake-action-buttons"
import { useIntakeReview } from "@/components/doctor/review/intake-review-context"
import { PatientMessageThread } from "@/components/doctor/review/patient-message-thread"
import { RequestInfoCard } from "@/components/doctor/review/request-info-card"
import { ReviewBlockersStrip } from "@/components/doctor/review/review-blockers-strip"
import { SafetyFlagsCard } from "@/components/doctor/review/safety-flags-card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"

interface IntakeReviewCockpitProps {
  className?: string
  showDecisionStrip?: boolean
}

/**
 * IntakeReviewCockpit — Linear issue-panel layout.
 *
 * Phase 3 of the dashboard remaster (2026-05-12): the cockpit moves from a
 * two-column grid stuffed with nested cards to a single-column panel with
 * three tabs (Request / Notes / History). Keeps the panel inside one
 * viewport without scroll for the common med-cert path.
 *
 * Layout:
 *   ┌────────────────────────────────────────────┐
 *   │ PatientDecisionStrip      (sticky top)     │
 *   ├────────────────────────────────────────────┤
 *   │ ReviewBlockersStrip       (only if blockers│
 *   │ SafetyFlagsCard           or red flags)    │
 *   ├────────────────────────────────────────────┤
 *   │  [Request]  [Notes]  [History]    (tabs)   │
 *   │                                            │
 *   │  ... tab content (scrollable region)       │
 *   │                                            │
 *   ├────────────────────────────────────────────┤
 *   │ IntakeActionButtons       (sticky bottom)  │
 *   └────────────────────────────────────────────┘
 *
 * The action bar is always visible. Notes editor lives in the Notes tab;
 * when the operator hits Approve and notes are too short, the tab will
 * switch to Notes (handled inside IntakeActionButtons via its existing
 * min-length validation toast).
 */

type CockpitTab = "request" | "notes" | "history"

function CertificateDeliveryCard() {
  const {
    data,
    intake,
    isViewingCert,
    isResending,
    handleViewCertificate,
    handleResend,
  } = useIntakeReview()

  if (!data.certificate || !["approved", "completed"].includes(intake.status)) return null

  return (
    <div className="rounded-xl border border-border/50 bg-card p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2 text-sm">
          <span className="font-medium text-foreground">Certificate delivery</span>
          {data.certificate.email_opened_at ? (
            <Badge className="bg-success-light text-success border-success-border text-xs">
              Opened
            </Badge>
          ) : data.certificate.email_sent_at ? (
            <Badge variant="outline" className="text-xs text-muted-foreground">
              Sent
            </Badge>
          ) : (
            <Badge variant="outline" className="text-xs text-muted-foreground">
              Pending
            </Badge>
          )}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          className="text-xs"
          disabled={isViewingCert || !handleViewCertificate}
          onClick={handleViewCertificate}
        >
          {isViewingCert ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
          ) : (
            <FileText className="h-3.5 w-3.5 mr-1" />
          )}
          View
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="text-xs"
          disabled={isResending || !handleResend || (data.certificate.resend_count ?? 0) >= 3}
          onClick={handleResend}
          title={(data.certificate.resend_count ?? 0) >= 3 ? "Maximum resends reached" : undefined}
        >
          {isResending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
          ) : (
            <RefreshCw className="h-3.5 w-3.5 mr-1" />
          )}
          {(data.certificate.resend_count ?? 0) > 0
            ? `Resent (${data.certificate.resend_count})`
            : "Resend"}
        </Button>
      </div>
      {data.certificate.email_opened_at && (
        <p className="text-xs text-muted-foreground">
          Opened {new Date(data.certificate.email_opened_at).toLocaleString("en-AU", {
            day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
          })}
        </p>
      )}
    </div>
  )
}

export function IntakeReviewCockpit({
  className,
  showDecisionStrip = true,
}: IntakeReviewCockpitProps) {
  const {
    data,
    intake,
    answers,
    service,
  } = useIntakeReview()

  // The Notes tab is the default IF the case is `paid`/`in_review` AND
  // there are no patient messages to triage; for everything else the
  // Request tab is the natural starting point.
  const [tab, setTab] = useState<CockpitTab>("request")

  const messageCount = (data.patientMessages?.length ?? 0) +
    (intake.info_request_message ? 1 : 0)

  return (
    <div className={cn("flex h-full min-h-0 flex-col", className)}>
      {/* Sticky top: patient header + always-on blockers. Compact density. */}
      <div className="flex flex-col gap-3 pb-3">
        {showDecisionStrip && (
          <PatientDecisionStrip
            intake={intake}
            answers={answers}
            previousIntakes={data.previousIntakes ?? []}
            service={service}
            compact
          />
        )}
        <ReviewBlockersStrip />
        <SafetyFlagsCard />
      </div>

      {/* Scrollable middle: tabbed content. Bounded so the action bar stays in view. */}
      <Tabs
        value={tab}
        onValueChange={(value) => setTab(value as CockpitTab)}
        className="min-h-0 flex-1 gap-3"
      >
        <TabsList className="shrink-0 self-start">
          <TabsTrigger value="request" className="gap-1.5 text-xs">
            <FileText className="h-3.5 w-3.5" aria-hidden />
            Request
          </TabsTrigger>
          <TabsTrigger value="notes" className="gap-1.5 text-xs">
            <NotebookPen className="h-3.5 w-3.5" aria-hidden />
            Notes
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-1.5 text-xs">
            <History className="h-3.5 w-3.5" aria-hidden />
            History
            {(data.previousIntakes?.length ?? 0) > 0 ? (
              <span className="ml-0.5 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-muted-foreground">
                {data.previousIntakes?.length}
              </span>
            ) : null}
          </TabsTrigger>
        </TabsList>

        {/* Request tab: facts + patient messages. */}
        <TabsContent value="request" className="min-h-0 flex-1 overflow-y-auto pr-1">
          <div className="space-y-3">
            <RequestInfoCard compact hideFullAnswers />
            {messageCount > 0 ? (
              <PatientMessageThread
                messages={data.patientMessages ?? []}
                infoRequestMessage={intake.info_request_message}
                infoRequestedAt={intake.info_requested_at}
                status={intake.status}
              />
            ) : null}
            <CertificateDeliveryCard />
          </div>
        </TabsContent>

        {/* Notes tab: clinical-notes editor with whatever historical patient notes exist. */}
        <TabsContent value="notes" className="min-h-0 flex-1 overflow-y-auto pr-1">
          <ClinicalNotesEditor />
        </TabsContent>

        {/* History tab: compact unified timeline. */}
        <TabsContent value="history" className="min-h-0 flex-1 overflow-y-auto pr-1">
          <PatientTimeline
            requests={data.previousIntakes ?? []}
            notes={data.patientNotes ?? []}
            compact
            maxItems={20}
            title="Patient history"
            emptyLabel="No previous patient activity."
          />
        </TabsContent>
      </Tabs>

      {/* Sticky bottom: action bar. Always visible. */}
      <div className="mt-3 shrink-0 border-t border-border/40 pt-3">
        <IntakeActionButtons />
      </div>
    </div>
  )
}
