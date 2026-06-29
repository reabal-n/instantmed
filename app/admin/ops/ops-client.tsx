"use client"

import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  FileText,
  Mail,
  RefreshCw,
  Wrench,
} from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { toast } from "sonner"

import { repairCertificateDocumentSentAtAction } from "@/app/actions/certificate-document-sent-repair"
import { resendCertificateAsStaff } from "@/app/actions/resend-certificate"
import {
  CounterCard,
  type CounterCardTone,
  OperatorPage,
  OperatorPageHeader,
  OperatorScrollArea,
  RecoveryRow,
  type RecoverySeverity,
} from "@/components/operator"
import { Badge, type BadgeProps } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type {
  CertificateDeliveryRescueCase,
  CertificateDeliveryRescueOverview,
} from "@/lib/admin/certificate-delivery-rescue"
import { cn } from "@/lib/utils"

type CounterCellData = {
  count: number
  helperText: string
  tone: CounterCardTone
  href: string
}

export interface OpsDashboardClientProps {
  counters: {
    paymentFailures: CounterCellData
    webhookDlq: CounterCellData
    parchmentUnsynced: CounterCellData
    missingIdentity: CounterCellData
    googleAdsConversions: CounterCellData
  }
  invariants: {
    slaBreachBacklog: CounterCellData
    certRefundOrphans: CounterCellData
    refundRecordAnomalies: CounterCellData
    certificateSentMissingTimestamp: CounterCellData
    approvedCertificateMissingRecord: CounterCellData
    queryFailures: CounterCellData
  }
  recoveries: Array<{
    id: string
    title: string
    detail: string
    occurredAt: string
    severity: RecoverySeverity
    href: string
  }>
  certificateDelivery: CertificateDeliveryRescueOverview
  canOpenEmailHub: boolean
  heardAboutUs: {
    answered: number
    paidTotal: number
    rows: Array<{ value: string; label: string; count: number }>
  }
  aiAttribution: {
    weeks: number
    totalAiOrders: number
    paidTotal: number
    bySource: Array<{ label: string; count: number }>
    weekly: Array<{ weekStart: string; chatgpt: number; ai: number }>
  }
}

function formatDateTime(value: string | null): string {
  if (!value) return "Not recorded"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "Not recorded"
  return date.toLocaleString("en-AU", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function SignalBadge({
  kind,
  label,
}: {
  kind: CertificateDeliveryRescueCase["certificateEmail"]["kind"]
  label: string
}) {
  const variant: BadgeProps["variant"] =
    kind === "failed"
      ? "destructive"
      : kind === "delivered" || kind === "opened" || kind === "clicked"
        ? "success"
        : kind === "sent" || kind === "test"
          ? "info"
          : kind === "queued"
            ? "warning"
            : "outline"

  return (
    <Badge variant={variant} size="sm" className="capitalize">
      {label}
    </Badge>
  )
}

function AccessSignal({ row }: { row: CertificateDeliveryRescueCase }) {
  if (row.accessEvidence === "downloaded") {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-emerald-700 dark:text-emerald-400">
        <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
        Downloaded
      </span>
    )
  }

  if (row.accessEvidence === "email_clicked") {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-emerald-700 dark:text-emerald-400">
        <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
        Email clicked
      </span>
    )
  }

  if (row.accessEvidence === "email_opened") {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-sky-700 dark:text-sky-400">
        <Mail className="h-3.5 w-3.5" aria-hidden />
        Email opened
      </span>
    )
  }

  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
      <Clock className="h-3.5 w-3.5" aria-hidden />
      Not tracked
    </span>
  )
}

function RecommendationBadge({ row }: { row: CertificateDeliveryRescueCase }) {
  const action = row.recommendation.action
  const variant: BadgeProps["variant"] =
    action === "escalate" || action === "resend_secure_link"
      ? "destructive"
      : action === "resend_receipt"
        ? "warning"
        : "secondary"

  return (
    <Badge variant={variant} size="sm">
      {row.recommendation.label}
    </Badge>
  )
}

export function OpsDashboardClient({
  counters,
  invariants,
  recoveries,
  certificateDelivery,
  canOpenEmailHub,
  heardAboutUs,
  aiAttribution,
}: OpsDashboardClientProps) {
  const router = useRouter()
  const [resendingIntakeId, setResendingIntakeId] = useState<string | null>(null)
  const [repairingTimestamps, setRepairingTimestamps] = useState(false)
  const [timestampRepairArmed, setTimestampRepairArmed] = useState(false)
  const [isPending, startTransition] = useTransition()
  const canRepairCertificateTimestamps =
    canOpenEmailHub && invariants.certificateSentMissingTimestamp.count > 0
  const answerRate =
    heardAboutUs.paidTotal > 0
      ? Math.round((heardAboutUs.answered / heardAboutUs.paidTotal) * 100)
      : 0
  const heardRows = heardAboutUs.rows.filter((r) => r.count > 0)
  const aiShare =
    aiAttribution.paidTotal > 0
      ? Math.round((aiAttribution.totalAiOrders / aiAttribution.paidTotal) * 100)
      : 0
  const maxWeeklyChatgpt = Math.max(1, ...aiAttribution.weekly.map((w) => w.chatgpt))

  const handleResendSecureLink = (intakeId: string) => {
    setResendingIntakeId(intakeId)
    startTransition(async () => {
      try {
        const result = await resendCertificateAsStaff(intakeId)
        if (result.success) {
          toast.success("Secure certificate link resent")
          router.refresh()
          return
        }

        toast.error(result.error || "Could not resend secure certificate link")
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not resend secure certificate link")
      } finally {
        setResendingIntakeId(null)
      }
    })
  }

  const handleRepairCertificateTimestamps = () => {
    if (!timestampRepairArmed) {
      setTimestampRepairArmed(true)
      toast.info(
        "Click Confirm repair to mirror sent-email evidence. This does not resend emails or expose certificate URLs.",
      )
      return
    }

    setTimestampRepairArmed(false)
    setRepairingTimestamps(true)
    startTransition(async () => {
      try {
        const result = await repairCertificateDocumentSentAtAction()
        const summary = result.data

        if (!result.success) {
          toast.error(result.error || "Could not repair certificate timestamps")
          return
        }

        const repaired = summary?.updatedCount ?? 0
        const failed = summary?.failedCount ?? 0
        if (repaired === 0 && failed === 0) {
          toast.success("No repairable certificate timestamps found")
        } else if (failed > 0) {
          toast.warning(`Repaired ${repaired}; ${failed} failed. Check logs before retrying.`)
        } else {
          toast.success(`Repaired ${repaired} certificate timestamp${repaired === 1 ? "" : "s"}`)
        }
        router.refresh()
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not repair certificate timestamps")
      } finally {
        setRepairingTimestamps(false)
      }
    })
  }

  return (
    <OperatorPage>
      <OperatorPageHeader
        title="Operations"
        description="Resolve payment, sync, and identity issues."
      />
      <OperatorScrollArea>
        <section
          aria-label="Recovery counters"
          className="grid gap-3 md:grid-cols-2 xl:grid-cols-5"
        >
          <CounterCard
            count={counters.paymentFailures.count}
            label="Payment failures"
            helperText={counters.paymentFailures.helperText}
            tone={counters.paymentFailures.tone}
            href={counters.paymentFailures.href}
          />
          <CounterCard
            count={counters.webhookDlq.count}
            label="Stripe webhook DLQ"
            helperText={counters.webhookDlq.helperText}
            tone={counters.webhookDlq.tone}
            href={counters.webhookDlq.href}
          />
          <CounterCard
            count={counters.parchmentUnsynced.count}
            label="Parchment unsynced"
            helperText={counters.parchmentUnsynced.helperText}
            tone={counters.parchmentUnsynced.tone}
            href={counters.parchmentUnsynced.href}
          />
          <CounterCard
            count={counters.missingIdentity.count}
            label="Missing identity"
            helperText={counters.missingIdentity.helperText}
            tone={counters.missingIdentity.tone}
            href={counters.missingIdentity.href}
          />
          <CounterCard
            count={counters.googleAdsConversions.count}
            label="Google Ads conversions"
            helperText={counters.googleAdsConversions.helperText}
            tone={counters.googleAdsConversions.tone}
            href={counters.googleAdsConversions.href}
          />
        </section>

        <section
          id="certificate-delivery-rescue"
          aria-label="Certificate delivery rescue"
          className="rounded-xl border border-border/50 bg-card shadow-sm shadow-primary/[0.04]"
        >
          <header className="flex flex-col gap-2 border-b border-border/40 px-4 py-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h2 className="flex items-center gap-2 text-sm font-semibold tracking-tight text-foreground">
                <FileText className="h-4 w-4 text-muted-foreground" aria-hidden />
                Certificate delivery rescue
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Last 14 days. Shows generation, certificate email state, document_sent_at, and access evidence without exposing document URLs.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {canRepairCertificateTimestamps ? (
                <Button
                  size="sm"
                  variant={timestampRepairArmed ? "default" : "outline"}
                  className="h-7 gap-1.5 px-2.5 text-xs"
                  onClick={handleRepairCertificateTimestamps}
                  disabled={repairingTimestamps && isPending}
                >
                  <Wrench
                    className={cn("h-3.5 w-3.5", repairingTimestamps && isPending && "animate-spin")}
                    aria-hidden
                  />
                  {timestampRepairArmed ? "Confirm repair" : "Repair timestamps"}
                </Button>
              ) : null}
              <Badge variant={certificateDelivery.actionCount > 0 ? "destructive" : "secondary"} size="sm">
                {certificateDelivery.actionCount} action{certificateDelivery.actionCount === 1 ? "" : "s"}
              </Badge>
              <Badge variant={certificateDelivery.warningCount > 0 ? "warning" : "secondary"} size="sm">
                {certificateDelivery.warningCount} warning{certificateDelivery.warningCount === 1 ? "" : "s"}
              </Badge>
              {certificateDelivery.queryFailed ? (
                <Badge variant="destructive" size="sm">Query failed</Badge>
              ) : null}
            </div>
          </header>
          {certificateDelivery.cases.length === 0 ? (
            <div className="px-4 py-6 text-sm text-muted-foreground">
              {certificateDelivery.queryFailed
                ? "Could not load certificate delivery state. Check server logs before assuming the queue is clear."
                : "No recent medical certificate delivery cases to show."}
            </div>
          ) : (
            <div className="divide-y divide-border/40">
              {certificateDelivery.cases.map((row) => {
                const canResend = row.recommendation.action === "resend_secure_link"
                const resending = resendingIntakeId === row.intakeId && isPending

                return (
                  <div
                    key={row.intakeId}
                    className={cn(
                      "grid gap-3 px-4 py-3 text-sm xl:grid-cols-[minmax(120px,0.65fr)_minmax(160px,0.85fr)_minmax(190px,1fr)_minmax(160px,0.85fr)_minmax(220px,1.15fr)] xl:items-center",
                      row.recommendation.severity === "critical" && "bg-destructive/5",
                    )}
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium text-foreground">
                        {row.referenceNumber || `Request ${row.shortIntakeId}`}
                      </p>
                      <p className="mt-0.5 text-xs capitalize text-muted-foreground">
                        {row.intakeStatus?.replace("_", " ") || "Unknown status"}
                      </p>
                    </div>

                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Badge variant={row.generated ? "success" : "outline"} size="sm">
                          {row.generated ? "Generated" : "Not generated"}
                        </Badge>
                        {row.resendCount > 0 ? (
                          <Badge variant="secondary" size="sm">{row.resendCount} resend{row.resendCount === 1 ? "" : "s"}</Badge>
                        ) : null}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        document_sent_at: {row.documentSentAt ? formatDateTime(row.documentSentAt) : "Missing"}
                      </p>
                    </div>

                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-xs text-muted-foreground">Certificate email</span>
                        <SignalBadge kind={row.certificateEmail.kind} label={row.certificateEmail.label} />
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-xs text-muted-foreground">Receipt</span>
                        <SignalBadge kind={row.receiptEmail.kind} label={row.receiptEmail.label} />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <AccessSignal row={row} />
                      <p className="text-xs text-muted-foreground">{formatDateTime(row.accessedAt)}</p>
                      {row.warnings.length > 0 ? (
                        <p className="flex items-center gap-1.5 text-xs text-warning">
                          <AlertTriangle className="h-3.5 w-3.5" aria-hidden />
                          {row.warnings.join(", ")}
                        </p>
                      ) : null}
                    </div>

                    <div className="flex flex-col gap-2 xl:items-end">
                      <div className="flex flex-wrap items-center gap-2 xl:justify-end">
                        <RecommendationBadge row={row} />
                        {canResend ? (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 gap-1.5 px-2.5 text-xs"
                            onClick={() => handleResendSecureLink(row.intakeId)}
                            disabled={resending}
                          >
                            <RefreshCw className={cn("h-3.5 w-3.5", resending && "animate-spin")} aria-hidden />
                            Resend link
                          </Button>
                        ) : row.recommendation.action === "resend_receipt" && canOpenEmailHub ? (
                          <Button size="sm" variant="outline" className="h-8 gap-1.5 px-2.5 text-xs" asChild>
                            <Link href={row.emailHubHref}>
                              Email ledger
                              <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                            </Link>
                          </Button>
                        ) : null}
                      </div>
                      <p className="max-w-sm text-xs text-muted-foreground xl:text-right">
                        {row.recommendation.reason}
                        {row.recommendation.action === "resend_receipt" && !canOpenEmailHub
                          ? " Ask an admin to retry the receipt email."
                          : ""}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>

        <section aria-label="Operational invariants">
          <h2 className="mb-3 text-sm font-semibold tracking-tight text-foreground">
            Integrity (weekly invariants)
          </h2>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
            <CounterCard
              count={invariants.slaBreachBacklog.count}
              label="Review SLA backlog"
              helperText={invariants.slaBreachBacklog.helperText}
              tone={invariants.slaBreachBacklog.tone}
              href={invariants.slaBreachBacklog.href}
            />
            <CounterCard
              count={invariants.certRefundOrphans.count}
              label="Cert + refund orphans"
              helperText={invariants.certRefundOrphans.helperText}
              tone={invariants.certRefundOrphans.tone}
              href={invariants.certRefundOrphans.href}
            />
            <CounterCard
              count={invariants.refundRecordAnomalies.count}
              label="Refund record anomalies"
              helperText={invariants.refundRecordAnomalies.helperText}
              tone={invariants.refundRecordAnomalies.tone}
              href={invariants.refundRecordAnomalies.href}
            />
            <CounterCard
              count={invariants.certificateSentMissingTimestamp.count}
              label="Cert timestamp drift"
              helperText={invariants.certificateSentMissingTimestamp.helperText}
              tone={invariants.certificateSentMissingTimestamp.tone}
              href={invariants.certificateSentMissingTimestamp.href}
            />
            <CounterCard
              count={invariants.approvedCertificateMissingRecord.count}
              label="Cert missing record"
              helperText={invariants.approvedCertificateMissingRecord.helperText}
              tone={invariants.approvedCertificateMissingRecord.tone}
              href={invariants.approvedCertificateMissingRecord.href}
            />
            <CounterCard
              count={invariants.queryFailures.count}
              label="Invariant query failures"
              helperText={invariants.queryFailures.helperText}
              tone={invariants.queryFailures.tone}
              href={invariants.queryFailures.href}
            />
          </div>
        </section>

        <section aria-label="Acquisition source">
          <h2 className="mb-3 text-sm font-semibold tracking-tight text-foreground">
            How did you hear about us? (30 days)
          </h2>
          <div className="rounded-xl border border-border/50 bg-card px-4 py-3 shadow-sm shadow-primary/[0.04]">
            {heardAboutUs.answered === 0 ? (
              <p className="text-sm text-muted-foreground">
                No self-reported answers yet. The survey is forward-only (live since 9 Jun 2026);
                answers appear here as new paid orders come in.
              </p>
            ) : (
              <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
                {heardRows.map((r) => (
                  <span key={r.value} className="inline-flex items-baseline gap-1.5">
                    <span className="font-semibold tabular-nums text-foreground">{r.count}</span>
                    <span className="text-muted-foreground">{r.label}</span>
                  </span>
                ))}
                <span className="ml-auto text-xs text-muted-foreground">
                  {heardAboutUs.answered}/{heardAboutUs.paidTotal} answered ({answerRate}%)
                </span>
              </div>
            )}
          </div>
        </section>

        <section aria-label="AI assistant acquisition">
          <h2 className="mb-3 text-sm font-semibold tracking-tight text-foreground">
            AI assistants ({aiAttribution.weeks} weeks)
          </h2>
          <div className="rounded-xl border border-border/50 bg-card px-4 py-3 shadow-sm shadow-primary/[0.04]">
            {aiAttribution.totalAiOrders === 0 ? (
              <p className="text-sm text-muted-foreground">
                No AI-attributed paid orders yet. Counts orders arriving with an AI assistant
                utm_source (ChatGPT appends one) — the cleanest measure of GEO / AI-citation
                progress, and the metric to watch instead of the unused self-report survey.
              </p>
            ) : (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
                  {aiAttribution.bySource.map((s) => (
                    <span key={s.label} className="inline-flex items-baseline gap-1.5">
                      <span className="font-semibold tabular-nums text-foreground">{s.count}</span>
                      <span className="text-muted-foreground">{s.label}</span>
                    </span>
                  ))}
                  <span className="ml-auto text-xs text-muted-foreground">
                    {aiAttribution.totalAiOrders}/{aiAttribution.paidTotal} of paid orders ({aiShare}%)
                  </span>
                </div>
                <div>
                  <div className="flex items-end gap-1.5">
                    {aiAttribution.weekly.map((w) => (
                      <div
                        key={w.weekStart}
                        className="flex flex-1 flex-col items-center gap-1"
                        title={`Week of ${w.weekStart}: ${w.chatgpt} ChatGPT order${w.chatgpt === 1 ? "" : "s"}`}
                      >
                        <div
                          className="w-full rounded-sm bg-primary/70"
                          style={{ height: `${Math.max(3, Math.round((w.chatgpt / maxWeeklyChatgpt) * 28))}px` }}
                        />
                        <span className="text-[10px] tabular-nums text-muted-foreground">{w.chatgpt}</span>
                      </div>
                    ))}
                  </div>
                  <p className="mt-1.5 text-[11px] text-muted-foreground">
                    ChatGPT paid orders per week (oldest to newest)
                  </p>
                </div>
              </div>
            )}
          </div>
        </section>

        <section
          aria-label="Recent recoveries"
          className="rounded-xl border border-border/50 bg-card shadow-sm shadow-primary/[0.04]"
        >
          <header className="border-b border-border/40 px-4 py-3">
            <h2 className="text-sm font-semibold tracking-tight text-foreground">
              Recent (7 days)
            </h2>
          </header>
          {recoveries.length === 0 ? (
            <div className="px-4 py-6 text-sm text-muted-foreground">
              Nothing to recover. All systems clear.
            </div>
          ) : (
            <ul className="divide-y divide-border/40">
              {recoveries.map((r) => (
                <li key={r.id}>
                  <RecoveryRow
                    title={r.title}
                    detail={r.detail}
                    occurredAt={r.occurredAt}
                    severity={r.severity}
                    href={r.href}
                  />
                </li>
              ))}
            </ul>
          )}
        </section>
      </OperatorScrollArea>
    </OperatorPage>
  )
}
