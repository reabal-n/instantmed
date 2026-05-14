"use client"

import {
  Clock,
  CreditCard,
  DollarSign,
  ExternalLink,
  Receipt,
  RotateCcw,
  TrendingDown,
  TrendingUp,
} from "lucide-react"
import Link from "next/link"

import { DashboardGrid, DashboardPageHeader, StatCard } from "@/components/dashboard"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ADMIN_REFUNDS_HREF, STAFF_ANALYTICS_HREF, STAFF_DASHBOARD_HREF } from "@/lib/dashboard/routes"
import { formatCurrency } from "@/lib/format"

interface FinanceData {
  summary: {
    todayRevenue: number
    weekRevenue: number
    monthRevenue: number
    totalRefunds: number
    refundRate: number
    avgTransaction: number
    pendingPayments: number
    transactionCount: number
    eligibleRefunds: number
    failedRefunds: number
  }
}

interface FinanceDashboardClientProps {
  finance: FinanceData
}

export function FinanceDashboardClient({ finance }: FinanceDashboardClientProps) {
  const { summary } = finance
  const refundNeedsWork = summary.eligibleRefunds + summary.failedRefunds

  return (
    <div className="min-h-full">
      <div className="space-y-6 p-6">
        <DashboardPageHeader
          title="Finance"
          description="Revenue, pending payments, and refund follow-up."
          backHref={STAFF_DASHBOARD_HREF}
          backLabel="Staff cockpit"
          actions={
            <>
              <Button variant="outline" asChild>
                <Link href={ADMIN_REFUNDS_HREF}>
                  <RotateCcw className="h-4 w-4" />
                  Refunds
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <a href="https://dashboard.stripe.com" target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4" />
                  Open Stripe
                </a>
              </Button>
            </>
          }
        />

        <DashboardGrid columns={4} gap="md">
          <StatCard
            label="Today"
            value={formatCurrency(summary.todayRevenue)}
            icon={<DollarSign className="h-5 w-5" />}
            status="success"
          />
          <StatCard
            label="7 Days"
            value={formatCurrency(summary.weekRevenue)}
            icon={<TrendingUp className="h-5 w-5" />}
            status="info"
          />
          <StatCard
            label="30 Days"
            value={formatCurrency(summary.monthRevenue)}
            icon={<Receipt className="h-5 w-5" />}
            status="info"
          />
          <StatCard
            label="Avg Transaction"
            value={formatCurrency(summary.avgTransaction)}
            icon={<CreditCard className="h-5 w-5" />}
            status="neutral"
          />
        </DashboardGrid>

        <DashboardGrid columns={3} gap="md">
          <StatCard
            label="Refunded 30D"
            value={formatCurrency(summary.totalRefunds)}
            icon={<RotateCcw className="h-5 w-5" />}
            status={summary.totalRefunds > 0 ? "warning" : "neutral"}
          />
          <StatCard
            label="Refund Share"
            value={`${summary.refundRate.toFixed(1)}%`}
            icon={<TrendingDown className="h-5 w-5" />}
            status={summary.refundRate > 5 ? "error" : "neutral"}
          />
          <StatCard
            label="Pending Payments"
            value={summary.pendingPayments}
            icon={<Clock className="h-5 w-5" />}
            status={summary.pendingPayments > 0 ? "warning" : "neutral"}
          />
        </DashboardGrid>

        <div className="grid gap-4 lg:grid-cols-2">
          <section className="rounded-xl border border-border/50 bg-card p-5 shadow-sm shadow-primary/[0.04] dark:shadow-none">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-foreground">Refund work</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Eligible and failed refunds needing a decision.
                </p>
              </div>
              <Badge variant={refundNeedsWork > 0 ? "warning" : "secondary"}>{refundNeedsWork} open</Badge>
            </div>
            <dl className="mt-5 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-lg bg-muted/40 p-3">
                <dt className="text-muted-foreground">Eligible</dt>
                <dd className="mt-1 text-lg font-semibold text-foreground">{summary.eligibleRefunds}</dd>
              </div>
              <div className="rounded-lg bg-muted/40 p-3">
                <dt className="text-muted-foreground">Failed</dt>
                <dd className="mt-1 text-lg font-semibold text-foreground">{summary.failedRefunds}</dd>
              </div>
            </dl>
            <Button className="mt-5" asChild>
              <Link href={ADMIN_REFUNDS_HREF}>Open refunds</Link>
            </Button>
          </section>

          <section className="rounded-xl border border-border/50 bg-card p-5 shadow-sm shadow-primary/[0.04] dark:shadow-none">
            <h2 className="text-base font-semibold text-foreground">Payment checks</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {summary.transactionCount} paid transactions in the last 30 days. Use Stripe for disputes, payouts, and bank-level reconciliation.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Button variant="outline" asChild>
                <a href="https://dashboard.stripe.com/payments" target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4" />
                  Stripe payments
                </a>
              </Button>
              <Button variant="outline" asChild>
                <Link href={STAFF_ANALYTICS_HREF}>Revenue analytics</Link>
              </Button>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
