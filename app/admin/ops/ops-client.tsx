"use client"

import {
  AlertTriangle,
  ArrowRight,
  BellRing,
  CheckCircle,
  Clock,
  FileWarning,
  Keyboard,
  type LucideIcon,
  Mail,
  MailOpen,
  Pill,
  ReceiptText,
  RefreshCw,
  ScrollText,
  Search,
  Send,
  Server,
  Users,
  Webhook,
  XCircle,
} from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { type KeyboardEvent, type ReactNode, useEffect, useMemo, useState, useTransition } from "react"
import { toast } from "sonner"

import { sendOpsTestEmailAction } from "@/app/actions/email-ops"
import { sendTelegramTestAlertAction } from "@/app/actions/telegram-ops"
import { DashboardPageHeader, StatusBadge } from "@/components/dashboard"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import {
  ADMIN_AUDIT_HREF,
  ADMIN_EMAIL_HUB_HREF,
  ADMIN_PARCHMENT_OPS_HREF,
  ADMIN_PATIENT_MERGE_AUDIT_HREF,
  ADMIN_PRESCRIBING_IDENTITY_HREF,
  ADMIN_STALE_INTAKES_HREF,
  ADMIN_WEBHOOK_DLQ_HREF,
} from "@/lib/dashboard/routes"
import { cn } from "@/lib/utils"

interface OpsData {
  webhooks: {
    failedCount: number
    recentFailed: Array<{
      id: string
      created_at: string
      status: string
      event_type: string
    }>
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
    recent: Array<{
      id: string
      action: string
      created_at: string
      metadata: Record<string, unknown> | null
    }>
  }
  auditVolume: number
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
type FailureItem = OpsData["failureOverview"]["recent"][number]
type FailureSeverity = FailureCategory["severity"]
type OpsSignalTone = "success" | "warning" | "critical" | "info" | "neutral"

const categoryActionById: Record<string, string> = {
  stripe_webhooks: "Retry webhook",
  email_delivery: "Check email",
  checkout: "Recover checkout",
  incomplete_requests: "Recover request",
  certificate_delivery: "Resend cert",
  prescription_delivery: "Retry Parchment",
  stale_scripts: "Send script",
  refund_failures: "Resolve refund",
}

function getSeverityTone(severity: FailureSeverity) {
  if (severity === "critical") {
    return {
      card: "border-red-200 bg-red-50/70 hover:border-red-300 hover:bg-red-50 dark:border-red-500/30 dark:bg-red-950/20 dark:hover:border-red-400/40",
      icon: "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300",
      pill: "border-red-200 bg-red-100 text-red-800 dark:border-red-500/30 dark:bg-red-950/50 dark:text-red-200",
      action: "border-red-600 bg-red-600 text-white group-hover:bg-red-700 dark:border-red-500 dark:bg-red-500 dark:group-hover:bg-red-400 dark:text-red-950",
      text: "text-red-800 dark:text-red-200",
    }
  }

  return {
    card: "border-orange-200 bg-orange-50/80 hover:border-orange-300 hover:bg-orange-50 dark:border-orange-500/30 dark:bg-orange-950/20 dark:hover:border-orange-400/40",
    icon: "bg-orange-100 text-orange-700 dark:bg-orange-950/50 dark:text-orange-300",
    pill: "border-orange-200 bg-orange-100 text-orange-800 dark:border-orange-500/30 dark:bg-orange-950/50 dark:text-orange-200",
    action: "border-orange-500 bg-orange-500 text-white group-hover:bg-orange-600 dark:border-orange-400 dark:bg-orange-400 dark:group-hover:bg-orange-300 dark:text-orange-950",
    text: "text-orange-800 dark:text-orange-200",
  }
}

function SignalPill({
  tone,
  children,
  className,
}: {
  tone: "success" | "warning" | "critical" | "neutral"
  children: ReactNode
  className?: string
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-medium leading-none",
        tone === "success" && "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-950/30 dark:text-emerald-300",
        tone === "warning" && "border-orange-200 bg-orange-100 text-orange-800 dark:border-orange-500/30 dark:bg-orange-950/40 dark:text-orange-200",
        tone === "critical" && "border-red-200 bg-red-100 text-red-800 dark:border-red-500/30 dark:bg-red-950/40 dark:text-red-200",
        tone === "neutral" && "border-border/60 bg-muted/60 text-muted-foreground",
        className,
      )}
    >
      {children}
    </span>
  )
}

function StatusIndicator({ healthy, label }: { healthy: boolean; label: string }) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-2 rounded-lg border px-3 py-2 transition-colors",
        healthy
          ? "border-emerald-200 bg-emerald-50/70 text-emerald-800 dark:border-emerald-500/25 dark:bg-emerald-950/20 dark:text-emerald-200"
          : "border-red-200 bg-red-50 text-red-800 dark:border-red-500/30 dark:bg-red-950/30 dark:text-red-200",
      )}
    >
      <span className="min-w-0 truncate text-sm font-medium">{label}</span>
      <div
        className={cn(
          "h-2.5 w-2.5 rounded-full",
          healthy ? "bg-emerald-500" : "bg-red-500",
        )}
      />
    </div>
  )
}

function getOpsSignalToneClasses(tone: OpsSignalTone) {
  switch (tone) {
    case "success":
      return {
        icon: "bg-success-light text-success",
        value: "text-foreground",
      }
    case "warning":
      return {
        icon: "bg-warning-light text-warning",
        value: "text-warning",
      }
    case "critical":
      return {
        icon: "bg-destructive-light text-destructive",
        value: "text-destructive",
      }
    case "info":
      return {
        icon: "bg-info-light text-info",
        value: "text-foreground",
      }
    case "neutral":
    default:
      return {
        icon: "bg-muted text-muted-foreground",
        value: "text-foreground",
      }
  }
}

function OpsSignalCard({
  icon: Icon,
  label,
  value,
  detail,
  tone = "neutral",
  href,
  actionLabel,
  children,
}: {
  icon: LucideIcon
  label: string
  value: ReactNode
  detail?: ReactNode
  tone?: OpsSignalTone
  href?: string
  actionLabel?: string
  children?: ReactNode
}) {
  const toneClasses = getOpsSignalToneClasses(tone)

  return (
    <div className="rounded-xl border border-border/50 bg-card p-5 shadow-sm shadow-primary/[0.04] dark:shadow-none">
      <div className="flex items-start gap-4">
        <div className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-lg", toneClasses.icon)}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
          <p className={cn("mt-1 text-2xl font-semibold tabular-nums", toneClasses.value)}>{value}</p>
          {detail ? <p className="mt-1 text-xs text-muted-foreground">{detail}</p> : null}
        </div>
      </div>
      {href && actionLabel ? (
        <Button variant="link" size="sm" className="mt-3 h-auto p-0 text-xs" asChild>
          <Link href={href}>
            {actionLabel}
            <ArrowRight className="ml-1 h-3 w-3" />
          </Link>
        </Button>
      ) : null}
      {children ? <div className="mt-4">{children}</div> : null}
    </div>
  )
}

function TelegramTestAlertControl({
  configured,
  missingVars,
}: {
  configured: boolean
  missingVars: string[]
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [lastResult, setLastResult] = useState<{
    tone: "success" | "critical"
    label: string
  } | null>(null)

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border/60 bg-muted/30 p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-foreground">Live alert check</p>
          <p className="truncate text-[11px] text-muted-foreground">
            {configured ? "Sends a real ops test to Telegram." : `Missing ${missingVars.join(", ")}`}
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 shrink-0 gap-1.5 px-2.5 text-xs"
          disabled={!configured || isPending}
          onClick={() => {
            startTransition(async () => {
              const result = await sendTelegramTestAlertAction()
              if (result.success) {
                setLastResult({ tone: "success", label: "Delivered" })
                toast.success("Telegram test alert sent")
                router.refresh()
                return
              }

              setLastResult({ tone: "critical", label: "Failed" })
              toast.error(result.error || "Telegram test alert failed")
            })
          }}
        >
          <RefreshCw className={cn("h-3.5 w-3.5", isPending && "animate-spin")} />
          {isPending ? "Sending" : "Send test"}
        </Button>
      </div>
      {lastResult ? (
        <SignalPill tone={lastResult.tone} className="w-fit">
          {lastResult.label}
        </SignalPill>
      ) : null}
    </div>
  )
}

function EmailTestControl({
  configured,
  missingVars,
}: {
  configured: boolean
  missingVars: string[]
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [lastResult, setLastResult] = useState<{
    tone: "success" | "critical"
    label: string
  } | null>(null)

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border/60 bg-muted/30 p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-foreground">Live email check</p>
          <p className="truncate text-[11px] text-muted-foreground">
            {configured ? "Sends a real test to your admin email." : `Missing ${missingVars.join(", ")}`}
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 shrink-0 gap-1.5 px-2.5 text-xs"
          disabled={!configured || isPending}
          onClick={() => {
            startTransition(async () => {
              const result = await sendOpsTestEmailAction()
              if (result.success) {
                setLastResult({ tone: "success", label: "Sent" })
                toast.success("Test email sent")
                router.refresh()
                return
              }

              setLastResult({ tone: "critical", label: "Failed" })
              toast.error(result.error || "Test email failed")
            })
          }}
        >
          <Send className={cn("h-3.5 w-3.5", isPending && "animate-spin")} />
          {isPending ? "Sending" : "Send test"}
        </Button>
      </div>
      {lastResult ? (
        <SignalPill tone={lastResult.tone} className="w-fit">
          {lastResult.label}
        </SignalPill>
      ) : null}
    </div>
  )
}

function formatOpsTime(value: string | null): string {
  if (!value) return "No signal"
  return new Date(value).toLocaleString("en-AU", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function ProductionHealthTimeline({
  items,
}: {
  items: OpsData["productionTimeline"]
}) {
  return (
    <section className="rounded-xl border border-border/50 bg-card p-6 shadow-sm shadow-primary/[0.04] dark:shadow-none">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Server className="h-5 w-5 text-muted-foreground" />
            <h3 className="text-base font-semibold text-foreground">Production health timeline</h3>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Last successful signal for the paths that make a paid request actually move.
          </p>
        </div>
        <SignalPill tone={items.every((item) => item.status === "ok") ? "success" : "warning"} className="px-3 py-1.5">
          {items.filter((item) => item.status === "ok").length}/{items.length} live
        </SignalPill>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {items.map((item) => (
          <Link
            key={item.id}
            href={item.href}
            className={cn(
              "group rounded-lg border p-3 transition-colors",
              item.status === "ok"
                ? "border-emerald-200 bg-emerald-50/50 hover:border-emerald-300 dark:border-emerald-500/25 dark:bg-emerald-950/15"
                : "border-orange-200 bg-orange-50/70 hover:border-orange-300 dark:border-orange-500/25 dark:bg-orange-950/20",
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <p className="truncate text-sm font-medium text-foreground">{item.label}</p>
              <div className={cn("h-2.5 w-2.5 rounded-full", item.status === "ok" ? "bg-emerald-500" : "bg-orange-500")} />
            </div>
            <p className="mt-2 truncate text-xs text-muted-foreground">{item.detail}</p>
            <p className="mt-1 text-xs font-medium text-foreground">{formatOpsTime(item.occurredAt)}</p>
          </Link>
        ))}
      </div>
    </section>
  )
}

interface OpsCommandItem {
  id: string
  title: string
  detail: string
  href: string
  tone: "critical" | "warning" | "neutral"
  keywords: string
}

function OpsCommandPalette({ commands }: { commands: OpsCommandItem[] }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [selectedIndex, setSelectedIndex] = useState(0)

  useEffect(() => {
    function handleGlobalKeydown(event: globalThis.KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault()
        setOpen(true)
      }
    }

    window.addEventListener("keydown", handleGlobalKeydown)
    return () => window.removeEventListener("keydown", handleGlobalKeydown)
  }, [])

  const filteredCommands = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    if (!normalizedQuery) return commands
    return commands.filter((command) =>
      [command.title, command.detail, command.keywords].join(" ").toLowerCase().includes(normalizedQuery)
    )
  }, [commands, query])

  useEffect(() => {
    setSelectedIndex(0)
  }, [query])

  function openCommand(command: OpsCommandItem) {
    setOpen(false)
    setQuery("")
    router.push(command.href)
  }

  function handleListKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault()
      setSelectedIndex((index) => Math.min(index + 1, filteredCommands.length - 1))
    }
    if (event.key === "ArrowUp") {
      event.preventDefault()
      setSelectedIndex((index) => Math.max(index - 1, 0))
    }
    if (event.key === "Enter" && filteredCommands[selectedIndex]) {
      event.preventDefault()
      openCommand(filteredCommands[selectedIndex])
    }
  }

  return (
    <>
      <Button type="button" variant="outline" size="sm" className="gap-2" onClick={() => setOpen(true)}>
        <Keyboard className="h-4 w-4" />
        Recovery palette
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Recovery palette</DialogTitle>
            <DialogDescription>
              Search the operational fix paths. Use arrow keys and Enter to open.
            </DialogDescription>
          </DialogHeader>
          <div onKeyDown={handleListKeyDown}>
            <Input
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Retry webhook, resend email, stale intake, sync script..."
              startContent={<Search className="h-4 w-4" />}
            />
            <div className="mt-3 max-h-[360px] overflow-y-auto rounded-lg border border-border/60">
              {filteredCommands.length === 0 ? (
                <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                  No recovery action matches that search.
                </div>
              ) : (
                filteredCommands.map((command, index) => (
                  <button
                    key={command.id}
                    type="button"
                    className={cn(
                      "flex w-full items-center justify-between gap-3 border-b border-border/50 px-3 py-3 text-left last:border-b-0",
                      index === selectedIndex ? "bg-muted/70" : "hover:bg-muted/40",
                    )}
                    onMouseEnter={() => setSelectedIndex(index)}
                    onClick={() => openCommand(command)}
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-sm font-medium text-foreground">{command.title}</p>
                        <SignalPill tone={command.tone === "critical" ? "critical" : command.tone === "warning" ? "warning" : "neutral"}>
                          {command.tone === "neutral" ? "Open" : command.tone}
                        </SignalPill>
                      </div>
                      <p className="mt-1 truncate text-xs text-muted-foreground">{command.detail}</p>
                    </div>
                    <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                  </button>
                ))
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

function FailureStatusPill({ category }: { category: FailureCategory }) {
  if (category.count === 0) {
    return <SignalPill tone="success">Clear</SignalPill>
  }

  return (
    <SignalPill tone={category.severity === "critical" ? "critical" : "warning"}>
      {category.count} open
    </SignalPill>
  )
}

function FailureActionPill({
  item,
  category,
}: {
  item?: FailureItem
  category?: FailureCategory
}) {
  const severity = item?.severity ?? category?.severity ?? "warning"
  const label = item
    ? categoryActionById[item.categoryId] || "Open fix"
    : category
      ? categoryActionById[category.id] || "Open fix"
      : "Open fix"

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium leading-none transition-colors",
        severity === "critical"
          ? "border-red-600 bg-red-600 text-white group-hover:bg-red-700 dark:border-red-500 dark:bg-red-500 dark:group-hover:bg-red-400 dark:text-red-950"
          : "border-orange-500 bg-orange-500 text-white group-hover:bg-orange-600 dark:border-orange-400 dark:bg-orange-400 dark:group-hover:bg-orange-300 dark:text-orange-950",
      )}
    >
      {label}
      <ArrowRight className="h-3 w-3" />
    </span>
  )
}

export function OpsDashboardClient({ ops }: OpsDashboardClientProps) {
  const {
    webhooks,
    emails,
    errors,
    auditVolume,
    patientIdentity,
    prescribingIdentity,
    staleIntakes,
    alerting,
    productionTimeline,
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
  const overallStatus = allHealthy ? "healthy" : "needs review"
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
  const attentionCategories = failureOverview.categories.filter((category) => category.count > 0)
  const prescriptionFailures = failureOverview.categories.find(
    (category) => category.id === "prescription_delivery",
  )?.count || 0
  const commandItems = useMemo<OpsCommandItem[]>(() => [
    {
      id: "retry-webhook",
      title: "Retry failed webhook",
      detail: `${webhooks.failedCount} unresolved payment webhook${webhooks.failedCount === 1 ? "" : "s"}`,
      href: ADMIN_WEBHOOK_DLQ_HREF,
      tone: webhooks.failedCount > 0 ? "critical" : "neutral",
      keywords: "stripe webhook payment checkout dead letter retry",
    },
    {
      id: "resend-email",
      title: "Resend failed email",
      detail: `${emails.failed} failed / ${emails.pending} pending`,
      href: `${ADMIN_EMAIL_HUB_HREF}?tab=queue`,
      tone: emails.failed > 0 || emails.pending > 0 ? "warning" : "neutral",
      keywords: "email outbox delivery resend retry pending failed",
    },
    {
      id: "open-stale-intake",
      title: "Open stale intake queue",
      detail: `${staleIntakes} paid request${staleIntakes === 1 ? "" : "s"} waiting 2h+`,
      href: ADMIN_STALE_INTAKES_HREF,
      tone: staleIntakes > 0 ? "warning" : "neutral",
      keywords: "stale intake paid request recovery queue",
    },
    {
      id: "sync-script",
      title: "Sync prescription script",
      detail: `${prescriptionFailures} prescription webhook failure${prescriptionFailures === 1 ? "" : "s"}`,
      href: ADMIN_PARCHMENT_OPS_HREF,
      tone: prescriptionFailures > 0 ? "critical" : "neutral",
      keywords: "parchment prescription script webhook sync retry",
    },
  ], [emails.failed, emails.pending, prescriptionFailures, staleIntakes, webhooks.failedCount])

  return (
    <div className="min-h-full">
      <div className="p-6 space-y-6">
        <DashboardPageHeader
          title="Operations Dashboard"
          description="Operational recovery, delivery health, and the few blockers worth opening."
          backHref="/admin"
          backLabel="Admin"
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <OpsCommandPalette commands={commandItems} />
              <SignalPill tone={allHealthy ? "success" : "warning"} className="px-3 py-1.5">
                System {overallStatus}
              </SignalPill>
            </div>
          }
        />

        <section className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(360px,0.85fr)]">
          <div className="rounded-xl border border-border/50 bg-card p-6 shadow-sm shadow-primary/[0.04] dark:shadow-none">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <AlertTriangle className={cn("h-5 w-5", attentionCategories.length > 0 ? "text-warning" : "text-success")} />
                  <h3 className="text-base font-semibold text-foreground">Needs attention</h3>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  The short list of work that can block payment, delivery, or patient care.
                </p>
              </div>
              <SignalPill tone={attentionCategories.length > 0 ? "warning" : "success"} className="px-3 py-1.5">
                {failureOverview.openCount} open
              </SignalPill>
            </div>

            {attentionCategories.length === 0 ? (
              <div className="mt-5 flex items-center gap-2 rounded-lg bg-success-light px-3 py-3 text-sm text-success">
                <CheckCircle className="h-4 w-4" />
                No payment, delivery, identity, or intake recovery work right now.
              </div>
            ) : (
              <div className="mt-5 space-y-2">
                {attentionCategories.slice(0, 5).map((category) => {
                  const tone = getSeverityTone(category.severity)
                  return (
                    <Link
                      key={category.id}
                      href={category.href}
                      className={cn(
                        "group flex items-center justify-between gap-3 rounded-lg border px-3 py-3 transition-colors",
                        tone.card,
                      )}
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">{category.label}</p>
                        <p className={cn("text-xs", tone.text)}>{category.count} open</p>
                      </div>
                      <FailureActionPill category={category} />
                    </Link>
                  )
                })}
                {attentionCategories.length > 5 ? (
                  <p className="px-1 pt-1 text-xs text-muted-foreground">
                    {attentionCategories.length - 5} more recovery groups are listed below.
                  </p>
                ) : null}
              </div>
            )}
          </div>

          <div className="rounded-xl border border-border/50 bg-card p-6 shadow-sm shadow-primary/[0.04] dark:shadow-none">
            <div className="flex items-center gap-2">
              <Server className="h-5 w-5 text-muted-foreground" />
              <h3 className="text-base font-semibold text-foreground">Health checks</h3>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Green means there is no admin action to open from this dashboard.
            </p>
            <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-1">
              <StatusIndicator healthy={systemStatus.webhooksHealthy} label="Payment webhooks" />
              <StatusIndicator healthy={systemStatus.emailsHealthy} label="Email delivery" />
              <StatusIndicator healthy={systemStatus.intakesHealthy} label="Intake processing" />
              <StatusIndicator healthy={systemStatus.patientIdentityHealthy} label="Patient identity" />
              <StatusIndicator healthy={systemStatus.prescribingIdentityHealthy} label="Prescribing identity" />
              <StatusIndicator healthy={systemStatus.failureOverviewHealthy} label="Recovery inbox" />
              <StatusIndicator healthy={systemStatus.telegramAlertsHealthy} label="Telegram alerts" />
              <StatusIndicator healthy label="Doctor dashboard toasts: new requests only" />
            </div>
          </div>
        </section>

        <ProductionHealthTimeline items={productionTimeline} />

        <section className="rounded-xl border border-border/50 bg-card p-6 shadow-sm shadow-primary/[0.04] dark:shadow-none">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <AlertTriangle className={cn("h-5 w-5", failureOverview.openCount > 0 ? "text-warning" : "text-success")} />
                <h3 className="text-base font-semibold text-foreground">Recovery inbox</h3>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                One canonical place for payment, webhook, email, certificate, and script delivery failures.
              </p>
            </div>
            <SignalPill tone={failureOverview.openCount > 0 ? "warning" : "success"} className="px-3 py-1.5">
              {failureOverview.openCount} open
            </SignalPill>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {failureOverview.categories.map((category) => {
              const Icon = categoryIconById[category.id] || AlertTriangle
              const hasFailures = category.count > 0
              const tone = getSeverityTone(category.severity)
              return (
                <Link
                  key={category.id}
                  href={category.href}
                  className={cn(
                    "group flex min-h-28 flex-col justify-between rounded-xl border border-border/50 bg-muted/30 p-3 transition-colors hover:border-primary/30 hover:bg-muted/60",
                    hasFailures && tone.card,
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={cn(
                        "flex h-8 w-8 items-center justify-center rounded-full bg-muted text-muted-foreground transition-colors",
                        hasFailures && tone.icon,
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                    <FailureStatusPill category={category} />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">{category.label}</p>
                    <p className={cn("mt-0.5 text-2xl font-semibold tabular-nums", hasFailures && tone.text)}>
                      {category.count}
                    </p>
                    <div className="mt-2">
                      {hasFailures ? (
                        <FailureActionPill category={category} />
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-background px-2.5 py-1 text-[11px] font-medium leading-none text-muted-foreground">
                          No action
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>

          <div className="mt-5 border-t border-border/50 pt-4">
            <div className="mb-3 flex items-center justify-between">
              <h4 className="text-sm font-medium text-foreground">Newest items</h4>
              <span className="text-xs text-muted-foreground">Last 7 days</span>
            </div>
            {failureOverview.recent.length === 0 ? (
              <div className="flex items-center gap-2 rounded-lg bg-success-light px-3 py-2 text-sm text-success">
                <CheckCircle className="h-4 w-4" />
                Nothing needs recovery right now.
              </div>
            ) : (
              <div className="divide-y divide-border/50 rounded-lg border border-border/50">
                {failureOverview.recent.slice(0, 6).map((item) => (
                  <Link
                    key={`${item.categoryId}-${item.id}`}
                    href={item.href}
                    className={cn(
                      "group flex items-center justify-between gap-3 px-3 py-2.5 transition-colors hover:bg-muted/40",
                      item.severity === "critical" && "hover:bg-red-50/70 dark:hover:bg-red-950/20",
                      item.severity === "warning" && "hover:bg-orange-50/70 dark:hover:bg-orange-950/20",
                    )}
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">{item.title}</p>
                      <p className="truncate text-xs text-muted-foreground">{item.detail}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className="hidden text-xs text-muted-foreground sm:inline">
                        {new Date(item.occurredAt).toLocaleString("en-AU")}
                      </span>
                      <SignalPill tone={item.severity === "critical" ? "critical" : "warning"}>
                        {item.severity}
                      </SignalPill>
                      <FailureActionPill item={item} />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </section>

        <section>
          <div className="mb-3">
            <h3 className="text-base font-semibold text-foreground">Signals</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Small operating indicators for today. Open a card only when it has work attached.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            <OpsSignalCard
              icon={Webhook}
              label="Payment DLQ"
              value={webhooks.failedCount}
              detail="Dead-lettered checkout webhooks"
              tone={webhooks.failedCount > 0 ? "critical" : "success"}
              href={webhooks.failedCount > 0 ? ADMIN_WEBHOOK_DLQ_HREF : undefined}
              actionLabel={webhooks.failedCount > 0 ? "Open DLQ" : undefined}
            />
            <OpsSignalCard
              icon={Mail}
              label="Email success"
              value={`${emails.successRate}%`}
              detail={
                emails.configured
                  ? `${emails.total} today / ${emails.failed} failed / ${emails.pending} pending`
                  : `Missing ${emails.missingVars.join(", ")}`
              }
              tone={!emails.configured || emails.failed > 0 ? "warning" : "success"}
              href={`${ADMIN_EMAIL_HUB_HREF}?tab=queue`}
              actionLabel="Open outbox"
            >
              <EmailTestControl configured={emails.configured} missingVars={emails.missingVars} />
            </OpsSignalCard>
            <OpsSignalCard
              icon={Clock}
              label="Stale intakes"
              value={staleIntakes}
              detail="Paid requests waiting 2h+"
              tone={staleIntakes > 0 ? "warning" : "success"}
              href={staleIntakes > 0 ? ADMIN_STALE_INTAKES_HREF : undefined}
              actionLabel={staleIntakes > 0 ? "Review stale intakes" : undefined}
            />
            <OpsSignalCard
              icon={ScrollText}
              label="Audit logs (24h)"
              value={auditVolume.toLocaleString()}
              detail="Operational audit events"
              tone="info"
              href={ADMIN_AUDIT_HREF}
              actionLabel="View logs"
            />
            <OpsSignalCard
              icon={Users}
              label="Patient identity"
              value={patientIdentity.duplicateProfileCount}
              detail={`${patientIdentity.duplicateGroupCount} groups / ${patientIdentity.rawProfileCount} raw profiles`}
              tone={patientIdentity.duplicateProfileCount > 0 ? "warning" : "success"}
              href={patientIdentity.duplicateProfileCount > 0 ? ADMIN_PATIENT_MERGE_AUDIT_HREF : undefined}
              actionLabel={patientIdentity.duplicateProfileCount > 0 ? "Review duplicate profiles" : undefined}
            />
            <OpsSignalCard
              icon={Pill}
              label="Rx Identity Blocks"
              value={prescribingIdentity.blockedCount}
              detail={`${prescribingIdentity.readyCount} ready / ${prescribingIdentity.totalActive} active`}
              tone={prescribingIdentity.blockedCount > 0 ? "warning" : "success"}
              href={prescribingIdentity.blockedCount > 0 ? ADMIN_PRESCRIBING_IDENTITY_HREF : undefined}
              actionLabel={prescribingIdentity.blockedCount > 0 ? "Review blocks" : undefined}
            />
            <OpsSignalCard
              icon={BellRing}
              label="Telegram alerts"
              value={alerting.telegramConfigured ? "Ready" : "Missing"}
              detail={
                alerting.telegramConfigured
                  ? `Last test ${formatOpsTime(alerting.telegramLastTestedAt)}`
                  : `Missing ${alerting.missingTelegramVars.join(", ")}`
              }
              tone={alerting.telegramConfigured ? "success" : "warning"}
            >
              <TelegramTestAlertControl
                configured={alerting.telegramConfigured}
                missingVars={alerting.missingTelegramVars}
              />
            </OpsSignalCard>
          </div>
        </section>

        <section className="rounded-xl border border-border/50 bg-card p-6 shadow-sm shadow-primary/[0.04] dark:shadow-none">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <MailOpen className="h-5 w-5 text-muted-foreground" />
                <h3 className="text-base font-semibold text-foreground">Outgoing emails</h3>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                Latest send, retry, and delivery states without opening a log table.
              </p>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href={`${ADMIN_EMAIL_HUB_HREF}?tab=queue`}>
                Open outbox
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>

          {emails.recentOutgoing.length === 0 ? (
            <div className="mt-5 flex items-center gap-2 rounded-lg bg-success-light px-3 py-3 text-sm text-success">
              <CheckCircle className="h-4 w-4" />
              No outgoing email rows found.
            </div>
          ) : (
            <div className="mt-5 divide-y divide-border/50 rounded-lg border border-border/50">
              {emails.recentOutgoing.slice(0, 6).map((row) => {
                const resolvedStatus = row.deliveryStatus === "bounced" || row.deliveryStatus === "complained"
                  ? row.deliveryStatus
                  : row.status
                const tone = ["failed", "bounced", "complained"].includes(resolvedStatus)
                  ? "critical"
                  : ["pending", "sending"].includes(resolvedStatus)
                    ? "warning"
                    : "success"

                return (
                  <Link
                    key={row.id}
                    href={row.href}
                    className="group grid gap-3 px-3 py-3 transition-colors hover:bg-muted/40 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-sm font-medium text-foreground">{row.subject}</p>
                        <SignalPill tone={tone}>
                          {resolvedStatus === "skipped_e2e" ? "sent test" : resolvedStatus.replace("_", " ")}
                        </SignalPill>
                      </div>
                      <p className="mt-1 truncate text-xs text-muted-foreground">
                        {row.emailType} / {row.intakeId ? `Intake ${row.intakeId.slice(0, 8)}` : "No linked intake"} / {row.retryCount} retries
                      </p>
                      {row.errorMessage ? (
                        <p className="mt-1 truncate text-xs text-destructive">{row.errorMessage}</p>
                      ) : null}
                    </div>
                    <div className="flex items-center justify-between gap-2 sm:justify-end">
                      <span className="text-xs text-muted-foreground">{formatOpsTime(row.occurredAt)}</span>
                      <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </section>

        <section>
          <div className="mb-3">
            <h3 className="text-base font-semibold text-foreground">Background detail</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Keep these lower on the page so the dashboard does not become a log reader.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="rounded-xl border border-border/50 bg-card p-6 shadow-sm shadow-primary/[0.04] dark:shadow-none">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Webhook className="h-5 w-5 text-muted-foreground" />
                  <h3 className="text-base font-semibold text-foreground">Recent payment DLQ events</h3>
                </div>
                <Button variant="outline" size="sm" asChild>
                  <Link href={ADMIN_WEBHOOK_DLQ_HREF}>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Open DLQ
                  </Link>
                </Button>
              </div>
              {webhooks.recentFailed.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle className="w-8 h-8 mx-auto mb-2 text-success" />
                  <p>No failed webhooks</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {webhooks.recentFailed.map((webhook) => (
                    <div key={webhook.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                      <div>
                        <p className="text-sm font-medium">{webhook.event_type}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(webhook.created_at).toLocaleString("en-AU")}
                        </p>
                      </div>
                      <StatusBadge status="error" size="sm">{webhook.status}</StatusBadge>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-xl border border-border/50 bg-card p-6 shadow-sm shadow-primary/[0.04] dark:shadow-none">
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle className="h-5 w-5 text-muted-foreground" />
                <h3 className="text-base font-semibold text-foreground">Recent Errors (7 days)</h3>
              </div>
              <p className="text-sm text-muted-foreground mb-4">{errors.count} errors logged</p>
              {errors.recent.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle className="w-8 h-8 mx-auto mb-2 text-success" />
                  <p>No recent errors</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {errors.recent.slice(0, 10).map((error) => (
                    <div key={error.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{error.action}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(error.created_at).toLocaleString("en-AU")}
                        </p>
                      </div>
                      <XCircle className="w-4 h-4 text-destructive shrink-0 ml-2" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
