"use client"

import {
  AlertCircle,
  ArrowUpRight,
  Clock3,
  CreditCard,
  DollarSign,
  ExternalLink,
  Receipt,
  RotateCcw,
  ShoppingCart,
  TrendingUp,
  WalletCards,
} from "lucide-react"
import Link from "next/link"
import type { ReactNode } from "react"

import {
  DashboardCard,
  DashboardGrid,
  StatCard,
  type StatCardStatus,
  StatusBadge,
  type StatusBadgeStatus,
} from "@/components/dashboard"
import { OperatorPage, OperatorPageHeader, OperatorScrollArea } from "@/components/operator"
import { Button } from "@/components/ui/button"
import {
  ADMIN_REFUNDS_HREF,
  buildAdminIntakeHref,
  buildStaffLedgerHref,
  STAFF_ANALYTICS_HREF,
  STAFF_DASHBOARD_HREF,
} from "@/lib/dashboard/routes"
import type {
  RevenueDashboard,
  RevenueDashboardStatus,
  RevenueDashboardWindow,
} from "@/lib/data/revenue-dashboard"
import { formatDateTime, formatTimeAgo } from "@/lib/format"
import { cn } from "@/lib/utils"

interface FinanceDashboardClientProps {
  revenue: RevenueDashboard
}

const statusBadgeMap: Record<RevenueDashboardStatus, StatusBadgeStatus> = {
  critical: "error",
  healthy: "success",
  quiet: "neutral",
  watch: "warning",
}

function formatCents(cents: number | null | undefined): string {
  if (cents == null) return "No data"
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    minimumFractionDigits: Math.abs(cents) % 100 === 0 ? 0 : 2,
    maximumFractionDigits: Math.abs(cents) % 100 === 0 ? 0 : 2,
  }).format(cents / 100)
}

function formatAverageOrder(window: RevenueDashboardWindow): string {
  return window.averageOrderCents == null ? "No orders" : formatCents(window.averageOrderCents)
}

function targetTrend(window: RevenueDashboardWindow): { value: number; label: string } | undefined {
  if (!window.targetCents) return undefined
  const progress = Math.round((window.netCents / window.targetCents) * 100)
  return {
    value: Math.max(0, progress),
    label: `of ${formatCents(window.targetCents)} target`,
  }
}

function revenueCardStatus(window: RevenueDashboardWindow, dashboardStatus: RevenueDashboardStatus): StatCardStatus {
  if (window.netCents < 0) return "error"
  if (dashboardStatus === "critical") return "error"
  if (window.key === "today" && (dashboardStatus === "watch" || dashboardStatus === "quiet")) return "warning"
  if (window.netCents > 0) return "success"
  return "neutral"
}

function actionCopy(status: RevenueDashboardStatus): string {
  if (status === "critical") return "Open Stripe and the failed checkout ledger now."
  if (status === "watch") return "Compare checkout demand with Stripe sessions."
  if (status === "quiet") return "Traffic is quiet. Check acquisition before changing payment code."
  return "Payments are landing. Watch mix, refunds, and checkout pressure."
}

function lastPaymentText(revenue: RevenueDashboard): string {
  if (!revenue.lastPaidAt) return "No paid intake recorded"
  return `${formatTimeAgo(revenue.lastPaidAt)} (${formatDateTime(revenue.lastPaidAt)})`
}

function barHeight(value: number, max: number): string {
  if (max <= 0 || value <= 0) return "4%"
  return `${Math.max(8, Math.round((value / max) * 100))}%`
}

function WindowCard({
  dashboardStatus,
  icon,
  window,
}: {
  dashboardStatus: RevenueDashboardStatus
  icon: ReactNode
  window: RevenueDashboardWindow
}) {
  return (
    <StatCard
      label={window.label}
      value={formatCents(window.netCents)}
      icon={icon}
      status={revenueCardStatus(window, dashboardStatus)}
      trend={targetTrend(window)}
    />
  )
}

export function FinanceDashboardClient({ revenue }: FinanceDashboardClientProps) {
  const today = revenue.windows.find((window) => window.key === "today")!
  const last7Days = revenue.windows.find((window) => window.key === "last7Days")!
  const last30Days = revenue.windows.find((window) => window.key === "last30Days")!
  const checkoutHref = buildStaffLedgerHref({ status: "pending_payment" })
  const failedCheckoutHref = buildStaffLedgerHref({ status: "checkout_failed" })

  return (
    <OperatorPage>
      <OperatorPageHeader
        title="Revenue"
        description="Lightweight payment health from reportable paid intakes, refunds, checkout-stage demand, and active drafts."
        backHref={STAFF_DASHBOARD_HREF}
        backLabel="Staff cockpit"
        badge={
          <StatusBadge status={statusBadgeMap[revenue.status]} size="sm">
            {revenue.statusLabel}
          </StatusBadge>
        }
        actions={
          <>
            <Button variant="outline" asChild>
              <Link href={ADMIN_REFUNDS_HREF}>
                <RotateCcw className="h-4 w-4" />
                Refunds
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <a href="https://dashboard.stripe.com/payments" target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4" />
                Stripe
              </a>
            </Button>
          </>
        }
      />

      <OperatorScrollArea>
        <DashboardCard padding="md" className="border-primary/15">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.8fr)]">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={statusBadgeMap[revenue.status]} size="sm">
                  {revenue.statusLabel}
                </StatusBadge>
                <span className="text-xs text-muted-foreground">
                  Last refreshed {formatTimeAgo(revenue.generatedAt)}
                </span>
              </div>
              <p className="mt-3 text-xl font-semibold tracking-tight text-foreground">
                {actionCopy(revenue.status)}
              </p>
              <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
                <div>
                  <dt className="text-xs font-medium uppercase tracking-[0.10em] text-muted-foreground">Last payment</dt>
                  <dd className="mt-1 text-foreground">{lastPaymentText(revenue)}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium uppercase tracking-[0.10em] text-muted-foreground">24h demand</dt>
                  <dd className="mt-1 text-foreground">
                    {revenue.paymentFriction.created24hCount} starts, {revenue.paymentFriction.checkoutStage24hCount} at checkout
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium uppercase tracking-[0.10em] text-muted-foreground">24h paid</dt>
                  <dd className="mt-1 text-foreground">{revenue.paymentFriction.paid24hCount} paid intakes</dd>
                </div>
              </dl>
            </div>

            <div className="rounded-xl border border-border/60 bg-muted/30 p-4">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-muted-foreground" />
                <h2 className="text-sm font-semibold text-foreground">No-purchase guard</h2>
              </div>
              {revenue.noPurchaseAlert ? (
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  {revenue.noPurchaseAlert.detail}
                </p>
              ) : (
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  No revenue-safety alert is active. The guard still checks 24h and 48h demand windows.
                </p>
              )}
              <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-lg bg-background/70 px-3 py-2 dark:bg-white/[0.04]">
                  <span className="block text-muted-foreground">24h drafts</span>
                  <strong className="mt-1 block text-base font-semibold text-foreground">
                    {revenue.noPurchaseWindows.warning.partialDrafts}
                  </strong>
                </div>
                <div className="rounded-lg bg-background/70 px-3 py-2 dark:bg-white/[0.04]">
                  <span className="block text-muted-foreground">48h checkout</span>
                  <strong className="mt-1 block text-base font-semibold text-foreground">
                    {revenue.noPurchaseWindows.critical.checkoutStageIntakes}
                  </strong>
                </div>
              </div>
            </div>
          </div>
        </DashboardCard>

        <DashboardGrid columns={4} gap="md">
          <WindowCard
            dashboardStatus={revenue.status}
            window={today}
            icon={<DollarSign className="h-5 w-5" />}
          />
          <WindowCard
            dashboardStatus={revenue.status}
            window={last7Days}
            icon={<TrendingUp className="h-5 w-5" />}
          />
          <WindowCard
            dashboardStatus={revenue.status}
            window={last30Days}
            icon={<Receipt className="h-5 w-5" />}
          />
          <StatCard
            label="30d AOV"
            value={formatAverageOrder(last30Days)}
            icon={<WalletCards className="h-5 w-5" />}
            status={last30Days.averageOrderCents ? "info" : "neutral"}
          />
        </DashboardGrid>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(360px,0.85fr)]">
          <DashboardCard padding="md">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold text-foreground">Seven-day net</h2>
                <p className="mt-1 text-xs text-muted-foreground">Paid order gross less refunds issued on each Sydney day.</p>
              </div>
              <StatusBadge status={last7Days.netCents > 0 ? "success" : "neutral"} size="sm">
                {formatCents(last7Days.netCents)}
              </StatusBadge>
            </div>
            <div className="mt-5 flex h-44 items-end gap-2" aria-label="Seven day net revenue bars">
              {revenue.daily.map((day) => (
                <div key={day.dateKey} className="flex min-w-0 flex-1 flex-col items-center gap-2">
                  <div className="flex h-32 w-full items-end rounded-lg bg-muted/40 px-1.5 py-1.5">
                    <div
                      className={cn(
                        "w-full rounded-md bg-primary/80 transition-colors",
                        day.netCents <= 0 && "bg-muted-foreground/25",
                      )}
                      style={{ height: barHeight(day.netCents, revenue.maxDailyNetCents) }}
                      title={`${day.label}: ${formatCents(day.netCents)} net, ${day.orderCount} orders`}
                    />
                  </div>
                  <div className="w-full text-center">
                    <p className="truncate text-[11px] font-medium text-foreground">{day.label}</p>
                    <p className="truncate text-[11px] text-muted-foreground">{day.orderCount} orders</p>
                  </div>
                </div>
              ))}
            </div>
          </DashboardCard>

          <DashboardCard padding="md">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold text-foreground">Payment pressure</h2>
                <p className="mt-1 text-xs text-muted-foreground">Checkout-stage requests that can recover into paid orders.</p>
              </div>
              <StatusBadge
                status={revenue.paymentFriction.activeCheckoutStageCount > 0 ? "warning" : "success"}
                size="sm"
              >
                {revenue.paymentFriction.activeCheckoutStageCount} active
              </StatusBadge>
            </div>
            <dl className="mt-5 grid grid-cols-2 gap-3 text-sm">
              <MetricTile
                icon={<Clock3 className="h-4 w-4" />}
                label="Pending"
                value={revenue.paymentFriction.pendingPaymentCount}
              />
              <MetricTile
                icon={<AlertCircle className="h-4 w-4" />}
                label="Failed"
                value={revenue.paymentFriction.checkoutFailedCount}
              />
              <MetricTile
                icon={<ShoppingCart className="h-4 w-4" />}
                label="20m+ stale"
                value={revenue.paymentFriction.staleCheckoutStageCount}
              />
              <MetricTile
                icon={<CreditCard className="h-4 w-4" />}
                label="Active drafts"
                value={revenue.paymentFriction.activeDraftCount}
              />
            </dl>
            <div className="mt-5 flex flex-wrap gap-2">
              <Button variant="outline" size="sm" asChild>
                <Link href={checkoutHref}>Pending checkout</Link>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link href={failedCheckoutHref}>Failed checkout</Link>
              </Button>
            </div>
          </DashboardCard>
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          <DashboardCard padding="md">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold text-foreground">Service mix</h2>
                <p className="mt-1 text-xs text-muted-foreground">Last 30 days, by paid intake revenue.</p>
              </div>
              <StatusBadge status="info" size="sm">{last30Days.orderCount} orders</StatusBadge>
            </div>
            <div className="mt-5 space-y-3">
              {revenue.serviceMix.length > 0 ? revenue.serviceMix.map((service) => (
                <div key={service.key} className="space-y-1.5">
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="min-w-0 truncate font-medium text-foreground">{service.label}</span>
                    <span className="shrink-0 tabular-nums text-muted-foreground">
                      {formatCents(service.netCents)} · {service.orderCount}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-muted/60">
                    <div
                      className="h-2 rounded-full bg-primary/70"
                      style={{ width: `${Math.max(4, service.shareOfGross)}%` }}
                    />
                  </div>
                </div>
              )) : (
                <p className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
                  No paid orders in the last 30 days.
                </p>
              )}
            </div>
          </DashboardCard>

          <DashboardCard padding="md">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold text-foreground">Recent paid orders</h2>
                <p className="mt-1 text-xs text-muted-foreground">No patient details, just amount, service, and time.</p>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link href={STAFF_ANALYTICS_HREF}>
                  Analytics
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>
            <div className="mt-4 divide-y divide-border/60">
              {revenue.recentPayments.length > 0 ? revenue.recentPayments.map((payment) => (
                <Link
                  key={payment.id}
                  href={buildAdminIntakeHref(payment.id)}
                  className="flex items-center justify-between gap-3 py-3 text-sm transition-colors hover:text-primary"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium text-foreground">{payment.label}</p>
                    <p className="text-xs text-muted-foreground">{formatTimeAgo(payment.paidAt)}</p>
                  </div>
                  <span className="shrink-0 tabular-nums text-foreground">{formatCents(payment.amountCents)}</span>
                </Link>
              )) : (
                <p className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
                  No paid orders found in the last 30 days.
                </p>
              )}
            </div>
          </DashboardCard>
        </div>

        <DashboardCard padding="md">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-sm font-semibold text-foreground">Refund work</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                {formatCents(revenue.refundWork.totalRefunded30dCents)} refunded in the last 30 days.
              </p>
            </div>
            <div className="grid gap-3 text-sm sm:grid-cols-3 lg:min-w-[520px]">
              <MetricTile label="Eligible" value={revenue.refundWork.eligibleRefunds} />
              <MetricTile label="Failed" value={revenue.refundWork.failedRefunds} />
              <MetricTile label="Open work" value={revenue.refundWork.openRefundWork} />
            </div>
            <Button asChild>
              <Link href={ADMIN_REFUNDS_HREF}>Open refunds</Link>
            </Button>
          </div>
        </DashboardCard>
      </OperatorScrollArea>
    </OperatorPage>
  )
}

function MetricTile({
  icon,
  label,
  value,
}: {
  icon?: ReactNode
  label: string
  value: number | string
}) {
  return (
    <div className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2">
      <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {icon}
        {label}
      </dt>
      <dd className="mt-1 text-lg font-semibold tabular-nums tracking-tight text-foreground">{value}</dd>
    </div>
  )
}
