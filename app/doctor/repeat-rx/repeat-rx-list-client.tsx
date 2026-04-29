"use client"

import { CheckCircle2, ChevronRight, Clock, Pill, RotateCcw } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useTransition } from "react"

import { DashboardPageHeader } from "@/components/dashboard"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardHeader } from "@/components/ui/card"
import { EmptyState } from "@/components/ui/empty-state"
import type { RepeatRxRequestRow } from "@/lib/data/repeat-rx"
import { formatDate } from "@/lib/format"

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  pending: { label: "Pending", color: "bg-info-light text-info", icon: Clock },
  requires_consult: { label: "Requires Consult", color: "bg-warning-light text-warning", icon: Clock },
  approved: { label: "Script Sent", color: "bg-success-light text-success", icon: CheckCircle2 },
  declined: { label: "Declined", color: "bg-destructive-light text-destructive", icon: CheckCircle2 },
}

interface RepeatRxListClientProps {
  initialRequests: RepeatRxRequestRow[]
  counts: { pending: number; total: number }
}

export function RepeatRxListClient({ initialRequests, counts }: RepeatRxListClientProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const requests = initialRequests

  const refresh = () => {
    startTransition(() => router.refresh())
  }

  const actionableCount = requests.filter(
    (r) => r.status === "pending" || r.status === "requires_consult"
  ).length

  return (
    <div className="space-y-4">
      <DashboardPageHeader
        title="Repeat prescriptions"
        description={
          actionableCount > 0
            ? `${actionableCount} request${actionableCount !== 1 ? "s" : ""} awaiting review`
            : "Prescription requests submitted via the repeat flow"
        }
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={refresh}
            disabled={isPending}
          >
            <RotateCcw className={`h-4 w-4 mr-2 ${isPending ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-border/50 bg-card p-3">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Awaiting review
          </p>
          <p className="text-xl font-semibold tabular-nums">{counts.pending}</p>
        </div>
        <div className="rounded-xl border border-border/50 bg-card p-3">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Total
          </p>
          <p className="text-xl font-semibold tabular-nums">{counts.total}</p>
        </div>
      </div>

      {/* List */}
      {requests.length === 0 ? (
        <EmptyState
          icon={CheckCircle2}
          title="No repeat prescriptions"
          description="Repeat prescription requests will appear here when patients submit them."
        />
      ) : (
        <div className="space-y-2">
          {requests.map((req) => {
            const config = STATUS_CONFIG[req.status] || STATUS_CONFIG.pending
            const Icon = config.icon
            const patientName =
              req.patient?.full_name ||
              (req.is_guest && req.guest_email ? req.guest_email : "Unknown")
            const isActionable = req.status === "pending" || req.status === "requires_consult"

            return (
              <Card
                key={req.id}
                className={`rounded-xl border-border/50 transition-[background-color,border-color] duration-200 ${
                  isActionable ? "hover:border-primary/30" : ""
                }`}
              >
                <CardHeader className="py-2.5 px-3">
                  <Link
                    href={`/doctor/repeat-rx/${req.id}`}
                    className="flex items-center justify-between gap-3 group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                        <Pill className="h-4 w-4 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium truncate">{patientName}</p>
                        <p className="text-sm text-muted-foreground truncate">
                          {req.medication_display}
                          {req.medication_strength ? ` ${req.medication_strength}` : ""}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge className={config.color}>
                        <Icon className="h-3 w-3 mr-1" />
                        {config.label}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {formatDate(req.created_at)}
                      </span>
                      <ChevronRight className="h-4 w-4 text-muted-foreground/50 group-hover:text-primary transition-colors" />
                    </div>
                  </Link>
                </CardHeader>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
