"use client"

import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  CreditCard,
  FileWarning,
  RefreshCw,
  Stethoscope,
  UserRoundCheck,
  Wrench,
} from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { toast } from "sonner"

import { repairCertificateDocumentSentAtAction } from "@/app/actions/certificate-document-sent-repair"
import { resendCertificateAsStaff } from "@/app/actions/resend-certificate"
import { DashboardCard, StatusBadge } from "@/components/dashboard"
import {
  OperatorPage,
  OperatorPageHeader,
  OperatorScrollArea,
  PageRefreshStatus,
} from "@/components/operator"
import { Button } from "@/components/ui/button"
import type {
  OpsActionGroup,
  OpsActionGroupKey,
  OpsActionIssue,
  OpsActionModel,
} from "@/lib/admin/ops-action-model"
import { cn } from "@/lib/utils"

const GROUP_ICONS: Record<OpsActionGroupKey, typeof CreditCard> = {
  payments: CreditCard,
  fulfilment: Stethoscope,
  identity_access: UserRoundCheck,
  delivery: FileWarning,
  measurement: BarChart3,
}

function formatAge(value: string | null, now: string): string {
  if (!value) return "Age unavailable"
  const valueMs = Date.parse(value)
  const nowMs = Date.parse(now)
  if (!Number.isFinite(valueMs) || !Number.isFinite(nowMs)) return "Age unavailable"
  const minutes = Math.max(0, Math.round((nowMs - valueMs) / 60_000))
  if (minutes < 1) return "Checked now"
  if (minutes < 60) return `${minutes}m old`
  const hours = Math.round((minutes / 60) * 10) / 10
  if (hours < 48) return `${hours}h old`
  return `${Math.round(hours / 24)}d old`
}

function IssueRow({
  issue,
  generatedAt,
  isPending,
  repairingArmed,
  resendingIntakeId,
  onRepair,
  onResend,
}: {
  generatedAt: string
  isPending: boolean
  issue: OpsActionIssue
  onRepair: () => void
  onResend: (intakeId: string) => void
  repairingArmed: boolean
  resendingIntakeId: string | null
}) {
  const isResending = issue.certificateIntakeId === resendingIntakeId && isPending
  const severityLabel = issue.severity === "critical" ? "Critical" : "Warning"
  const severityClass = issue.severity === "critical"
    ? "text-destructive"
    : "text-amber-700 dark:text-amber-300"

  return (
    <li
        className="grid gap-3 px-4 py-3.5 lg:grid-cols-[minmax(220px,0.82fr)_minmax(280px,1.25fr)_minmax(190px,0.72fr)_auto] lg:items-center"
        data-ops-issue
      >
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="truncate text-sm font-semibold text-foreground">{issue.title}</h3>
          {issue.count > 1 ? (
            <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold tabular-nums text-muted-foreground">{issue.count}</span>
          ) : null}
        </div>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{issue.detail}</p>
      </div>

      <div className="rounded-lg bg-muted/30 px-3 py-2 text-xs">
        <p className="font-medium text-foreground">Next: {issue.nextAction}</p>
      </div>

      <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-muted-foreground">
        <span className={cn("font-semibold", severityClass)}>{severityLabel}</span>
        <span aria-hidden>·</span>
        <span className="font-medium text-foreground">{issue.owner}</span>
        <span aria-hidden>·</span>
        <span>{formatAge(issue.occurredAt, generatedAt)}</span>
      </div>

      <div className="flex min-w-32 justify-start lg:justify-end">
        {issue.action === "resend_certificate" && issue.certificateIntakeId ? (
          <Button
            size="sm"
            variant="outline"
            className="min-h-11 w-full gap-1.5 sm:w-auto lg:min-h-9"
            disabled={isResending}
            aria-label={`Resend secure certificate link for ${issue.title}`}
            onClick={() => onResend(issue.certificateIntakeId!)}
          >
            <RefreshCw className={cn("h-3.5 w-3.5", isResending && "animate-spin")} aria-hidden />
            Resend link
          </Button>
        ) : issue.action === "repair_certificate_timestamps" ? (
          <Button
            size="sm"
            variant={repairingArmed ? "default" : "outline"}
            className="min-h-11 w-full gap-1.5 sm:w-auto lg:min-h-9"
            disabled={isPending}
            aria-label="Repair certificate timestamps"
            onClick={onRepair}
          >
            <Wrench className={cn("h-3.5 w-3.5", isPending && "animate-spin")} aria-hidden />
            {repairingArmed ? "Confirm repair" : "Repair"}
          </Button>
        ) : (
          <Button size="sm" variant="outline" className="min-h-11 w-full sm:w-auto lg:min-h-9" asChild>
            <Link href={issue.href} aria-label={`Open ${issue.title} recovery`}>
              Open <ArrowRight className="h-3.5 w-3.5" aria-hidden />
            </Link>
          </Button>
        )}
      </div>
    </li>
  )
}

function IssueGroup({
  group,
  generatedAt,
  isPending,
  repairingArmed,
  resendingIntakeId,
  onRepair,
  onResend,
}: {
  generatedAt: string
  group: OpsActionGroup
  isPending: boolean
  onRepair: () => void
  onResend: (intakeId: string) => void
  repairingArmed: boolean
  resendingIntakeId: string | null
}) {
  const Icon = GROUP_ICONS[group.key]

  return (
    <DashboardCard padding="none" data-ops-action-group={group.key}>
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-border/50 px-4 py-3">
        <div>
          <div className="flex items-center gap-2">
            <Icon className="h-4 w-4 text-muted-foreground" aria-hidden />
            <h2 className="text-sm font-semibold text-foreground">{group.label}</h2>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{group.detail}</p>
        </div>
        <StatusBadge status={group.issues.some(({ severity }) => severity === "critical") ? "error" : "warning"} size="sm">
          {group.count} need attention
        </StatusBadge>
      </header>
      <ul className="divide-y divide-border/50">
        {group.issues.map((issue) => (
          <IssueRow
            key={issue.id}
            issue={issue}
            generatedAt={generatedAt}
            isPending={isPending}
            repairingArmed={repairingArmed}
            resendingIntakeId={resendingIntakeId}
            onRepair={onRepair}
            onResend={onResend}
          />
        ))}
      </ul>
    </DashboardCard>
  )
}

export function OpsDashboardClient({ model }: { model: OpsActionModel }) {
  const router = useRouter()
  const [resendingIntakeId, setResendingIntakeId] = useState<string | null>(null)
  const [repairingArmed, setRepairingArmed] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleResendCertificate(intakeId: string) {
    setResendingIntakeId(intakeId)
    startTransition(async () => {
      try {
        const result = await resendCertificateAsStaff(intakeId)
        if (!result.success) {
          toast.error(result.error || "Could not resend the secure certificate link")
          return
        }
        toast.success(result.queued ? "Secure certificate email queued" : "Secure certificate link resent")
        router.refresh()
      } catch {
        toast.error("Could not resend the secure certificate link")
      } finally {
        setResendingIntakeId(null)
      }
    })
  }

  function handleRepairTimestamps() {
    if (!repairingArmed) {
      setRepairingArmed(true)
      toast.info("Click Confirm repair to mirror durable sent-email evidence. No email will be sent.")
      return
    }

    setRepairingArmed(false)
    startTransition(async () => {
      try {
        const result = await repairCertificateDocumentSentAtAction()
        if (!result.success) {
          toast.error(result.error || "Could not repair certificate timestamps")
          return
        }
        const updated = result.data?.updatedCount ?? 0
        const failed = result.data?.failedCount ?? 0
        if (failed > 0) toast.warning(`Repaired ${updated}; ${failed} failed. Check logs before retrying.`)
        else toast.success(updated > 0 ? `Repaired ${updated} certificate timestamp${updated === 1 ? "" : "s"}` : "No repairable timestamps found")
        router.refresh()
      } catch {
        toast.error("Could not repair certificate timestamps")
      }
    })
  }

  return (
    <OperatorPage>
      <OperatorPageHeader
        title="Operations"
        description="Current-state exceptions and bounded recovery signals across payment, fulfilment, identity, delivery, and measurement."
        badge={model.allClear ? (
          <StatusBadge status="success" size="sm">Scope clear</StatusBadge>
        ) : (
          <StatusBadge status="error" size="sm">{model.openCount} need attention</StatusBadge>
        )}
        actions={<PageRefreshStatus key={model.generatedAt} generatedAt={model.generatedAt} />}
      />

      <OperatorScrollArea className="space-y-3">
        {model.allClear ? (
          <DashboardCard
            padding="lg"
            tier="elevated"
            className="flex min-h-56 items-center justify-center text-center"
            data-ops-all-clear
          >
            <div className="max-w-md">
              <span className="mx-auto inline-flex h-11 w-11 items-center justify-center rounded-full border border-border/60 bg-background text-emerald-700 dark:text-emerald-300">
                <CheckCircle2 className="h-5 w-5" aria-hidden />
              </span>
              <h2 className="mt-3 text-base font-semibold text-foreground">No exceptions in monitored scope</h2>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                Current-state payment and script checks cover all matching records. Identity checks cover the oldest 100 active prescribing requests; email, Parchment, and Ads monitors cover 7 days; certificate delivery covers 14 days.
              </p>
            </div>
          </DashboardCard>
        ) : model.groups.map((group) => (
          <IssueGroup
            key={group.key}
            group={group}
            generatedAt={model.generatedAt}
            isPending={isPending}
            repairingArmed={repairingArmed}
            resendingIntakeId={resendingIntakeId}
            onRepair={handleRepairTimestamps}
            onResend={handleResendCertificate}
          />
        ))}
      </OperatorScrollArea>
    </OperatorPage>
  )
}
