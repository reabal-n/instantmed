"use client"

import {
  AlertTriangle,
  ArrowRight,
  CheckCircle,
  Clock,
  FileWarning,
  type LucideIcon,
  Mail,
  Pill,
  ReceiptText,
  Server,
  Webhook,
} from "lucide-react"
import Link from "next/link"
import { useMemo } from "react"

import type { StaffCommandItem } from "@/components/operator"
import { OperatorPage, OperatorPageHeader, OperatorScrollArea, StaffCommandPalette } from "@/components/operator"
import { Button } from "@/components/ui/button"
import {
  ADMIN_EMAIL_HUB_HREF,
  ADMIN_PARCHMENT_OPS_HREF,
  ADMIN_PATIENT_MERGE_AUDIT_HREF,
  ADMIN_STALE_INTAKES_HREF,
  ADMIN_WEBHOOK_DLQ_HREF,
} from "@/lib/dashboard/routes"
import { cn } from "@/lib/utils"

interface OpsData {
  webhooks: {
    failedCount: number
    recentFailed: Array<{ id: string; created_at: string; status: string; event_type: string }>
  }
  emails: {
    total: number
    sent: number
    failed: number
    pending: number
    successRate: number
    configured: boolean
    missingVars: string[]
    lastTestedAt: string | null
    recentOutgoing: Array<{
      id: string
      emailType: string
      subject: string
      status: string
      deliveryStatus: string | null
      errorMessage: string | null
      retryCount: number
      intakeId: string | null
      occurredAt: string
      href: string
    }>
  }
  authEmails: {
    total: number
    sent: number
    failed: number
    successRate: number
    unavailable: boolean
    recentFailures: Array<{
      id: string
      createdAt: string
      actionType: string
      recipientDomain: string | null
      httpStatus: number | null
      errorMessage: string | null
    }>
  }
  errors: {
    count: number
    recent: Array<{ id: string; action: string; created_at: string; metadata: Record<string, unknown> | null }>
  }
  auditVolume: number
  safetyBlocks: {
    count: number
    recent: Array<{
      id: string
      evaluated_at: string
      service_slug: string
      outcome: string
      risk_tier: string
      triggered_rule_ids: string[] | null
      request_id: string | null
    }>
  }
  patientIdentity: {
    rawProfileCount: number
    uniqueProfileCount: number
    duplicateProfileCount: number
    duplicateGroupCount: number
  }
  prescribingIdentity: {
    totalActive: number
    blockedCount: number
    readyCount: number
    topBlockers: Array<{ label: string; count: number }>
  }
  staleIntakes: number
  alerting: {
    telegramConfigured: boolean
    missingTelegramVars: string[]
    telegramLastTestedAt: string | null
  }
  productionTimeline: Array<{
    id: string
    label: string
    status: "ok" | "missing"
    detail: string
    occurredAt: string | null
    href: string
  }>
  failureOverview: {
    openCount: number
    categories: Array<{
      id: string
      label: string
      count: number
      href: string
      severity: "critical" | "warning"
      emptyLabel: string
    }>
    recent: Array<{
      id: string
      categoryId: string
      title: string
      detail: string
      occurredAt: string
      href: string
      severity: "critical" | "warning"
    }>
  }
  systemStatus: {
    webhooksHealthy: boolean
    emailsHealthy: boolean
    authEmailsHealthy: boolean
    intakesHealthy: boolean
    patientIdentityHealthy: boolean
    prescribingIdentityHealthy: boolean
    failureOverviewHealthy: boolean
    telegramAlertsHealthy: boolean
  }
}

interface OpsDashboardClientProps {
  ops: OpsData
}

type FailureCategory = OpsData["failureOverview"]["categories"][number]

const categoryActionById: Record<string, string> = {
  stripe_webhooks: "Open webhooks",
  email_delivery: "Open email",
  checkout: "Open ledger",
  incomplete_requests: "Open requests",
  certificate_delivery: "Open certs",
  prescription_delivery: "Open Parchment",
  stale_scripts: "Open scripts",
  refund_failures: "Open refunds",
}

const categoryIconById: Record<string, LucideIcon> = {
  stripe_webhooks: Webhook,
  email_delivery: Mail,
  checkout: ReceiptText,
  incomplete_requests: Clock,
  certificate_delivery: FileWarning,
  prescription_delivery: Pill,
  stale_scripts: Clock,
  refund_failures: ReceiptText,
}

function StatusPill({
  tone,
  children,
}: {
  tone: "success" | "warning" | "critical" | "neutral"
  children: React.ReactNode
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-medium leading-none",
        tone === "success" && "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-950/30 dark:text-emerald-300",
        tone === "warning" && "border-orange-200 bg-orange-100 text-orange-800 dark:border-orange-500/30 dark:bg-orange-950/40 dark:text-orange-200",
        tone === "critical" && "border-red-200 bg-red-100 text-red-800 dark:border-red-500/30 dark:bg-red-950/40 dark:text-red-200",
        tone === "neutral" && "border-border/60 bg-muted/60 text-muted-foreground",
      )}
    >
      {children}
    </span>
  )
}

function HealthRow({ label, healthy }: { label: string; healthy: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border/40 py-2.5 last:border-b-0">
      <span className="text-sm font-medium text-foreground">{label}</span>
      <StatusPill tone={healthy ? "success" : "warning"}>{healthy ? "Clear" : "Open"}</StatusPill>
    </div>
  )
}

function RecoveryLink({ category }: { category: FailureCategory }) {
  const Icon = categoryIconById[category.id] || AlertTriangle
  const hasWork = category.count > 0

  return (
    <Link
      href={category.href}
      className={cn(
        "group flex items-center justify-between gap-4 rounded-lg border px-3 py-3 transition-colors",
        hasWork
          ? "border-orange-200 bg-orange-50/70 hover:border-orange-300 dark:border-orange-500/30 dark:bg-orange-950/20"
          : "border-border/50 bg-muted/20 hover:border-primary/30 hover:bg-muted/40",
      )}
    >
      <div className="flex min-w-0 items-center gap-3">
        <span
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-background text-muted-foreground",
            hasWork && "bg-orange-100 text-orange-700 dark:bg-orange-950/50 dark:text-orange-300",
          )}
        >
          <Icon className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">{category.label}</p>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            {hasWork ? categoryActionById[category.id] || "Open fix" : category.emptyLabel}
          </p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <StatusPill tone={hasWork ? category.severity === "critical" ? "critical" : "warning" : "success"}>
          {hasWork ? "Open" : "Clear"}
        </StatusPill>
        <ArrowRight className="h-4 w-4 text-muted-foreground opacity-60 transition-[opacity,transform] group-hover:translate-x-0.5 group-hover:opacity-100" />
      </div>
    </Link>
  )
}

export function OpsDashboardClient({ ops }: OpsDashboardClientProps) {
  const {
    webhooks,
    emails,
    staleIntakes,
    failureOverview,
    systemStatus,
  } = ops

  const allHealthy = systemStatus.webhooksHealthy
    && systemStatus.emailsHealthy
    && systemStatus.authEmailsHealthy
    && systemStatus.intakesHealthy
    && systemStatus.patientIdentityHealthy
    && systemStatus.prescribingIdentityHealthy
    && systemStatus.failureOverviewHealthy
    && systemStatus.telegramAlertsHealthy
  const attentionCategories = failureOverview.categories.filter((category) => category.count > 0)
  const clearCategories = failureOverview.categories.filter((category) => category.count === 0)
  const prescriptionFailures = failureOverview.categories.find(
    (category) => category.id === "prescription_delivery",
  )?.count || 0
  const commandItems = useMemo<StaffCommandItem[]>(() => [
    {
      id: "retry-webhook",
      title: "Payment webhooks",
      detail: webhooks.failedCount > 0 ? "Payment webhook failures need review" : "Open webhook recovery",
      href: ADMIN_WEBHOOK_DLQ_HREF,
      tone: webhooks.failedCount > 0 ? "critical" : "neutral",
      keywords: "stripe webhook payment checkout dead letter retry",
    },
    {
      id: "resend-email",
      title: "Email delivery",
      detail: emails.failed > 0 || emails.pending > 0 ? "Email delivery has work" : "Open email queue",
      href: `${ADMIN_EMAIL_HUB_HREF}?tab=queue`,
      tone: emails.failed > 0 || emails.pending > 0 ? "warning" : "neutral",
      keywords: "email outbox delivery resend retry pending failed",
    },
    {
      id: "open-stale-intake",
      title: "Stale intakes",
      detail: staleIntakes > 0 ? "Paid requests waiting too long" : "Open stale intake queue",
      href: ADMIN_STALE_INTAKES_HREF,
      tone: staleIntakes > 0 ? "warning" : "neutral",
      keywords: "stale intake paid request recovery queue",
    },
    {
      id: "sync-script",
      title: "Prescription delivery",
      detail: prescriptionFailures > 0 ? "Prescription webhook failures need review" : "Open Parchment recovery",
      href: ADMIN_PARCHMENT_OPS_HREF,
      tone: prescriptionFailures > 0 ? "critical" : "neutral",
      keywords: "parchment prescription script webhook sync retry",
    },
  ], [emails.failed, emails.pending, prescriptionFailures, staleIntakes, webhooks.failedCount])

  return (
    <OperatorPage>
      <OperatorPageHeader
        title="Operations"
        description="Recovery paths only. Detailed logs stay inside their owning pages."
        backHref="/admin"
        backLabel="Dashboard"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <StaffCommandPalette
              items={commandItems}
              buttonLabel="Recovery palette"
              title="Recovery palette"
              description="Search the operational fix paths. Use arrow keys and Enter to open."
              placeholder="Webhook, email, stale intake, script..."
              emptyLabel="No recovery action matches that search."
            />
            <StatusPill tone={allHealthy ? "success" : "warning"}>
              System {allHealthy ? "clear" : "needs review"}
            </StatusPill>
          </div>
        }
      />

      <OperatorScrollArea>
        <section className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(340px,0.85fr)]">
          <div className="rounded-xl border border-border/50 bg-card p-5 shadow-sm shadow-primary/[0.04]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  {attentionCategories.length > 0 ? (
                    <AlertTriangle className="h-5 w-5 text-warning" />
                  ) : (
                    <CheckCircle className="h-5 w-5 text-success" />
                  )}
                  <h2 className="text-base font-semibold text-foreground">Needs attention</h2>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  Open only what blocks payment, delivery, identity, or patient flow.
                </p>
              </div>
              <StatusPill tone={attentionCategories.length > 0 ? "warning" : "success"}>
                {attentionCategories.length > 0 ? "Open" : "Clear"}
              </StatusPill>
            </div>

            <div className="mt-4 space-y-2">
              {attentionCategories.length === 0 ? (
                <div className="rounded-lg border border-success-border bg-success-light px-3 py-3 text-sm text-success">
                  No recovery work is waiting.
                </div>
              ) : (
                attentionCategories.slice(0, 6).map((category) => (
                  <RecoveryLink key={category.id} category={category} />
                ))
              )}
            </div>
          </div>

          <div className="rounded-xl border border-border/50 bg-card p-5 shadow-sm shadow-primary/[0.04]">
            <div className="flex items-center gap-2">
              <Server className="h-5 w-5 text-muted-foreground" />
              <h2 className="text-base font-semibold text-foreground">System checks</h2>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Clear means no action is needed here.
            </p>
            <div className="mt-4">
              <HealthRow healthy={systemStatus.webhooksHealthy} label="Payment webhooks" />
              <HealthRow healthy={systemStatus.emailsHealthy} label="Email delivery" />
              <HealthRow healthy={systemStatus.authEmailsHealthy} label="Auth email" />
              <HealthRow healthy={systemStatus.intakesHealthy} label="Intake processing" />
              <HealthRow healthy={systemStatus.patientIdentityHealthy} label="Patient identity" />
              <HealthRow healthy={systemStatus.prescribingIdentityHealthy} label="Prescribing identity" />
              <HealthRow healthy={systemStatus.telegramAlertsHealthy} label="Telegram alerts" />
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-border/50 bg-card p-5 shadow-sm shadow-primary/[0.04]">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-base font-semibold text-foreground">Recovery paths</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                These are shortcuts to the focused pages. Keep the dashboard out of the weeds.
              </p>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link href={ADMIN_PATIENT_MERGE_AUDIT_HREF}>
                Review duplicate profiles
                <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
          <div className="mt-4 space-y-3">
            {attentionCategories.length > 0 ? (
              <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
                {attentionCategories.map((category) => (
                  <RecoveryLink key={category.id} category={category} />
                ))}
              </div>
            ) : (
              <div className="rounded-lg border border-success-border bg-success-light px-3 py-3 text-sm text-success">
                No open recovery paths.
              </div>
            )}

            {clearCategories.length > 0 && (
              <details className="rounded-lg border border-border/50 bg-muted/20">
                <summary className="cursor-pointer px-3 py-2 text-sm font-semibold text-muted-foreground">
                  Clear paths ({clearCategories.length})
                </summary>
                <div className="grid gap-2 border-t border-border/50 p-3 md:grid-cols-2 xl:grid-cols-4">
                  {clearCategories.map((category) => (
                    <RecoveryLink key={category.id} category={category} />
                  ))}
                </div>
              </details>
            )}
          </div>
        </section>
      </OperatorScrollArea>
    </OperatorPage>
  )
}
