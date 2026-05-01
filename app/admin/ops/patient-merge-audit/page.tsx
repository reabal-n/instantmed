import { CheckCircle, ExternalLink, GitMerge, History, Users } from "lucide-react"
import Link from "next/link"

import { DashboardPageHeader, StatusBadge } from "@/components/dashboard"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { requireRole } from "@/lib/auth/helpers"
import { getPatientProfileMergeAudit } from "@/lib/data/patient-profile-merge-audit"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "Patient Merge Audit",
}

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString("en-AU", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export default async function PatientMergeAuditPage() {
  await requireRole(["admin"], { redirectTo: "/doctor/dashboard" })

  const { entries, error } = await getPatientProfileMergeAudit(50)
  const movedReferenceCount = entries.reduce((sum, entry) => sum + entry.referenceSummary.total, 0)

  return (
    <div className="space-y-6">
      <DashboardPageHeader
        title="Patient Merge Audit"
        description="Immutable history of duplicate patient profile merges and the records moved into the canonical profile."
        backHref="/admin/ops"
        backLabel="Operations"
        actions={
          <StatusBadge status={error ? "error" : "success"}>
            {error ? "Audit unavailable" : `${entries.length} recent merges`}
          </StatusBadge>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-border/50 bg-card p-5 shadow-sm shadow-primary/[0.04] dark:shadow-none">
          <div className="flex items-center gap-3">
            <GitMerge className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Recent Merges</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums">{entries.length}</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-border/50 bg-card p-5 shadow-sm shadow-primary/[0.04] dark:shadow-none">
          <div className="flex items-center gap-3">
            <History className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">References Moved</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums">{movedReferenceCount}</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-border/50 bg-card p-5 shadow-sm shadow-primary/[0.04] dark:shadow-none">
          <div className="flex items-center gap-3">
            <Users className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Last Merge</p>
              <p className="mt-1 text-sm font-medium">
                {entries[0] ? formatDateTime(entries[0].createdAt) : "None recorded"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-destructive-border bg-destructive-light/30 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="rounded-xl border border-border/50 bg-card shadow-sm shadow-primary/[0.04] dark:shadow-none">
        <div className="border-b border-border/60 px-5 py-4">
          <h2 className="text-base font-semibold">Merge history</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Each row is written by the merge RPC after patient-owned references are reassigned.
          </p>
        </div>

        {entries.length === 0 ? (
          <div className="px-5 py-10 text-center text-muted-foreground">
            <CheckCircle className="mx-auto mb-2 h-8 w-8 text-success" />
            <p>No patient profile merges recorded.</p>
          </div>
        ) : (
          <div className="divide-y divide-border/60">
            {entries.map((entry) => (
              <div key={entry.id} className="grid gap-4 px-5 py-4 lg:grid-cols-[1.1fr_1.2fr_auto] lg:items-center">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">{entry.canonicalName}</p>
                    <Badge variant="outline" size="sm">{entry.duplicateCount} duplicate{entry.duplicateCount === 1 ? "" : "s"}</Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{entry.canonicalEmail || entry.canonicalProfileId}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Merged {formatDateTime(entry.createdAt)} by {entry.mergedBy}
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex flex-wrap gap-2">
                    {entry.referenceSummary.movedTables.length === 0 ? (
                      <Badge variant="secondary" size="sm">No linked references moved</Badge>
                    ) : (
                      entry.referenceSummary.movedTables.slice(0, 6).map((item) => (
                        <Badge key={item.table} variant="secondary" size="sm">
                          {item.table}: {item.count}
                        </Badge>
                      ))
                    )}
                  </div>
                  {entry.reason && (
                    <p className="text-sm text-muted-foreground">{entry.reason}</p>
                  )}
                </div>

                <div className="flex flex-wrap gap-2 lg:justify-end">
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/doctor/patients/${entry.canonicalProfileId}`}>
                      <ExternalLink className="h-3.5 w-3.5" />
                      Patient
                    </Link>
                  </Button>
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/admin/audit?search=${entry.id}`}>
                      <ExternalLink className="h-3.5 w-3.5" />
                      Audit
                    </Link>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
