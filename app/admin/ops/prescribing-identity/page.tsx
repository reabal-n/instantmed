import { AlertTriangle, CheckCircle, CreditCard, ExternalLink } from "lucide-react"
import Link from "next/link"

import { DashboardHeader, StatusBadge } from "@/components/dashboard"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { getPrescribingIdentityBlockerReport } from "@/lib/doctor/patient-identity-report"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

import { PrescribingIdentityEditForm } from "./edit-form"
import { RetryParchmentSyncButton } from "./retry-button"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "Prescribing Identity Blocks",
}

function formatDateTime(value: string | null): string {
  if (!value) return "Not recorded"
  return new Date(value).toLocaleString("en-AU", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export default async function PrescribingIdentityOpsPage() {
  const report = await getPrescribingIdentityBlockerReport(createServiceRoleClient())
  const topBlockers = Object.entries(report.blockerCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)

  return (
    <div className="space-y-6">
      <DashboardHeader
        title="Prescribing Identity Blocks"
        description="Paid prescription requests that are not ready for Parchment because identity data is incomplete."
        backHref="/admin/ops"
        backLabel="Operations"
        actions={
          <StatusBadge status={report.blockedCount === 0 ? "success" : "warning"}>
            {report.blockedCount === 0 ? "No blockers" : `${report.blockedCount} blocked`}
          </StatusBadge>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-border/50 bg-card p-5 shadow-sm shadow-primary/[0.04] dark:shadow-none">
          <div className="flex items-center gap-3">
            <CreditCard className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Active Rx Intakes</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums">{report.totalActive}</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-border/50 bg-card p-5 shadow-sm shadow-primary/[0.04] dark:shadow-none">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-warning" />
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Blocked</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums text-warning">{report.blockedCount}</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-border/50 bg-card p-5 shadow-sm shadow-primary/[0.04] dark:shadow-none">
          <div className="flex items-center gap-3">
            <CheckCircle className="h-5 w-5 text-success" />
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Ready</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums">{report.readyCount}</p>
            </div>
          </div>
        </div>
      </div>

      {topBlockers.length > 0 && (
        <div className="rounded-xl border border-border/50 bg-card p-5 shadow-sm shadow-primary/[0.04] dark:shadow-none">
          <h2 className="text-sm font-semibold">Top blockers</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {topBlockers.map(([label, count]) => (
              <Badge key={label} variant="warning" size="sm">
                {label}: {count}
              </Badge>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-xl border border-border/50 bg-card shadow-sm shadow-primary/[0.04] dark:shadow-none">
        <div className="border-b border-border/60 px-5 py-4">
          <h2 className="text-base font-semibold">Blocked prescription requests</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Fix the patient details here or on the profile, then retry Parchment sync.
          </p>
        </div>

        {report.items.length === 0 ? (
          <div className="px-5 py-10 text-center text-muted-foreground">
            <CheckCircle className="mx-auto mb-2 h-8 w-8 text-success" />
            <p>No active prescription identity blockers.</p>
          </div>
        ) : (
          <div className="divide-y divide-border/60">
            {report.items.map((item) => (
              <div key={item.intakeId} className="grid gap-4 px-5 py-4 lg:grid-cols-[1.3fr_1.4fr_auto] lg:items-center">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">{item.referenceNumber || "Prescription request"}</p>
                    <Badge variant="outline" size="sm">{item.status}</Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{item.patientName}</p>
                  <p className="mt-1 text-xs text-muted-foreground">Paid {formatDateTime(item.paidAt || item.createdAt)}</p>
                </div>

                <div className="flex flex-wrap gap-2">
                  {item.blockers.map((blocker) => (
                    <Badge key={blocker} variant="warning" size="sm">
                      {blocker}
                    </Badge>
                  ))}
                </div>

                <div className="flex flex-wrap gap-2 lg:justify-end">
                  <Button variant="outline" size="sm" asChild>
                    <Link href={item.intakeHref}>
                      <ExternalLink className="h-3.5 w-3.5" />
                      Intake
                    </Link>
                  </Button>
                  <Button variant="outline" size="sm" asChild>
                    <Link href={item.profileHref}>
                      <ExternalLink className="h-3.5 w-3.5" />
                      Profile
                    </Link>
                  </Button>
                  <RetryParchmentSyncButton intakeId={item.intakeId} />
                </div>

                <PrescribingIdentityEditForm
                  patientId={item.patientId}
                  intakeId={item.intakeId}
                  identity={item.identity}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
