import {
  Activity,
  ArrowRight,
  Clock3,
  CreditCard,
  MailWarning,
  ScrollText,
  ShieldAlert,
  Stethoscope,
} from "lucide-react"
import Link from "next/link"
import type { ComponentType, SVGProps } from "react"

import { DashboardCard } from "@/components/dashboard/dashboard-card"
import { Badge, type BadgeProps } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { AdminPulseData, AdminPulseMood, AdminPulseTone } from "@/lib/data/admin-pulse"
import { formatCurrency, formatMinutes } from "@/lib/format"
import { getServicePresentation } from "@/lib/services/service-presentation"
import { cn } from "@/lib/utils"

type IconComponent = ComponentType<SVGProps<SVGSVGElement>>

interface AdminPulseProps {
  pulse: AdminPulseData
  compact?: boolean
}

const moodCopy: Record<AdminPulseMood, {
  eyebrow: string
  heading: string
  body: string
  badgeVariant: BadgeProps["variant"]
  panelClassName: string
}> = {
  calm: {
    eyebrow: "All quiet",
    heading: "Queue looks calm.",
    body: "No drama on the board. Keep the default check light and spend the spare focus on growth.",
    badgeVariant: "success",
    panelClassName: "bg-success-light/60 text-success",
  },
  steady: {
    eyebrow: "Steady shift",
    heading: "A few things are moving.",
    body: "The day has some shape, but nothing needs a whole command centre.",
    badgeVariant: "info",
    panelClassName: "bg-info-light/60 text-info",
  },
  busy: {
    eyebrow: "Bit of movement",
    heading: "Clear the queue before it stacks.",
    body: "Stay clinical: oldest paid request first, scripts second, admin after that.",
    badgeVariant: "warning",
    panelClassName: "bg-warning-light/70 text-warning",
  },
  attention: {
    eyebrow: "Worth a look",
    heading: "One thing needs attention.",
    body: "Handle the sharp edge first so it does not turn into cleanup later.",
    badgeVariant: "destructive",
    panelClassName: "bg-destructive-light/70 text-destructive",
  },
}

const actionVariant: Record<AdminPulseTone, BadgeProps["variant"]> = {
  neutral: "secondary",
  success: "success",
  info: "info",
  warning: "warning",
  danger: "destructive",
}

function MetricTile({
  icon: Icon,
  label,
  value,
  hint,
  className,
}: {
  icon: IconComponent
  label: string
  value: string | number
  hint: string
  className?: string
}) {
  return (
    <div
      className={cn(
        "min-w-0 rounded-lg border border-border/50 bg-muted/20 px-3.5 py-3",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums tracking-normal text-foreground">
            {value}
          </p>
        </div>
        <span className="rounded-md bg-white p-2 text-muted-foreground shadow-sm shadow-primary/[0.04] dark:bg-card">
          <Icon className="h-4 w-4" aria-hidden />
        </span>
      </div>
      <p className="mt-2 truncate text-xs text-muted-foreground">{hint}</p>
    </div>
  )
}

export function AdminPulse({ pulse, compact = false }: AdminPulseProps) {
  const copy = moodCopy[pulse.mood]
  const oldestWait = formatMinutes(pulse.queue.oldestInQueueMinutes)
  const avgReview = formatMinutes(pulse.queue.avgReviewTimeMinutes)
  const riskCount =
    pulse.risks.failedEmails24h +
    pulse.risks.openSupportTickets +
    pulse.risks.activeDisputes

  if (compact) {
    return (
      <DashboardCard padding="sm" className="shrink-0 overflow-hidden">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                variant={copy.badgeVariant}
                shape="pill"
                icon={<Activity className="h-3.5 w-3.5" aria-hidden />}
              >
                {copy.eyebrow}
              </Badge>
              <p className="text-sm font-semibold text-foreground">{copy.heading}</p>
            </div>
            <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">{copy.body}</p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="grid grid-cols-4 gap-2 text-center text-xs text-muted-foreground sm:min-w-[360px]">
              <div className="rounded-lg border border-border/50 bg-muted/20 px-2 py-2">
                <p className="font-semibold tabular-nums text-foreground">{pulse.queue.size}</p>
                <p>Queue</p>
              </div>
              <div className="rounded-lg border border-border/50 bg-muted/20 px-2 py-2">
                <p className="font-semibold tabular-nums text-foreground">{oldestWait}</p>
                <p>Oldest</p>
              </div>
              <div className="rounded-lg border border-border/50 bg-muted/20 px-2 py-2">
                <p className="font-semibold tabular-nums text-foreground">{pulse.today.paidOrders}</p>
                <p>Paid</p>
              </div>
              <div className="rounded-lg border border-border/50 bg-muted/20 px-2 py-2">
                <p className="font-semibold tabular-nums text-foreground">{riskCount}</p>
                <p>Risks</p>
              </div>
            </div>

            <div
              className={cn(
                "min-w-[220px] rounded-xl border border-border/50 px-3 py-2",
                copy.panelClassName,
              )}
            >
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] opacity-80">
                Best next move
              </p>
              <div className="mt-1 flex items-center justify-between gap-3">
                <p className="truncate text-sm font-semibold text-foreground">{pulse.action.label}</p>
                <Button asChild size="sm" className="h-8 shrink-0">
                  <Link href={pulse.action.href}>
                    Open
                    <ArrowRight className="h-4 w-4" aria-hidden />
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DashboardCard>
    )
  }

  return (
    <DashboardCard tier="elevated" padding="lg" className="overflow-hidden">
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(360px,0.95fr)]">
        <div className="min-w-0 space-y-5">
          <div className="space-y-3">
            <Badge
              variant={copy.badgeVariant}
              shape="pill"
              icon={<Activity className="h-3.5 w-3.5" aria-hidden />}
            >
              Today at a glance
            </Badge>
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                {copy.eyebrow}
              </p>
              <h2 className="text-2xl font-semibold tracking-normal text-foreground sm:text-3xl">
                {copy.heading}
              </h2>
              <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
                {copy.body}
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <MetricTile
              icon={Stethoscope}
              label="Queue now"
              value={pulse.queue.size}
              hint={`${pulse.queue.scriptsPending} scripts, ${pulse.queue.pendingInfo} need info`}
            />
            <MetricTile
              icon={Clock3}
              label="Oldest wait"
              value={oldestWait}
              hint={`Avg review ${avgReview}`}
            />
            <MetricTile
              icon={ScrollText}
              label="Reviewed today"
              value={pulse.today.approved + pulse.today.declined}
              hint={`${pulse.today.approved} approved, ${pulse.today.declined} declined`}
            />
            <MetricTile
              icon={CreditCard}
              label="Paid today"
              value={pulse.today.paidOrders}
              hint={formatCurrency(pulse.today.revenueCents)}
            />
          </div>
        </div>

        <div className="grid min-w-0 gap-3">
          <div
            className={cn(
              "rounded-xl border border-border/50 p-4",
              copy.panelClassName,
            )}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] opacity-80">
                  Best next move
                </p>
                <h3 className="mt-2 text-lg font-semibold tracking-normal text-foreground">
                  {pulse.action.label}
                </h3>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  {pulse.action.description}
                </p>
              </div>
              <Badge variant={actionVariant[pulse.action.tone]} shape="pill">
                Focus
              </Badge>
            </div>
            <Button asChild size="sm" className="mt-4">
              <Link href={pulse.action.href}>
                Open
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            </Button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-border/50 bg-muted/15 p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <Activity className="h-4 w-4 text-primary" aria-hidden />
                This week
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Paid orders</p>
                  <p className="mt-1 text-xl font-semibold tabular-nums text-foreground">
                    {pulse.week.paidOrders}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Gross</p>
                  <p className="mt-1 text-xl font-semibold tabular-nums text-foreground">
                    {formatCurrency(pulse.week.revenueCents)}
                  </p>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {pulse.week.serviceMix.length > 0 ? (
                  pulse.week.serviceMix.map((item) => (
                    <span
                      key={item.category}
                      className="inline-flex items-center gap-1.5 rounded-md border border-border/50 bg-white px-2.5 py-1 text-xs text-muted-foreground dark:bg-card"
                    >
                      <span className="font-semibold tabular-nums text-foreground">
                        {item.count}
                      </span>
                      {getServicePresentation({ type: item.category }).label}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-muted-foreground">
                    No paid requests yet this week.
                  </span>
                )}
              </div>
            </div>

            <div className="rounded-xl border border-border/50 bg-muted/15 p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <ShieldAlert className="h-4 w-4 text-dawn-600" aria-hidden />
                Loose ends
              </div>
              <div className="mt-4 space-y-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Failed emails</span>
                  <span className="font-semibold tabular-nums text-foreground">
                    {pulse.risks.failedEmails24h}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Support open</span>
                  <span className="font-semibold tabular-nums text-foreground">
                    {pulse.risks.openSupportTickets}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Disputes</span>
                  <span className="font-semibold tabular-nums text-foreground">
                    {pulse.risks.activeDisputes}
                  </span>
                </div>
              </div>
              <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
                <MailWarning className="h-3.5 w-3.5" aria-hidden />
                {riskCount === 0 ? "Clean enough for a solo day." : "Clear the loudest one first."}
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardCard>
  )
}
