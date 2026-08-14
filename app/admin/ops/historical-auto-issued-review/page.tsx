import { AlertTriangle, ArrowRight, CheckCircle2, ShieldCheck } from "lucide-react"
import Link from "next/link"

import { StatusBadge } from "@/components/dashboard"
import {
  OperatorPage,
  OperatorPageHeader,
  OperatorPanel,
  OperatorScrollArea,
} from "@/components/operator"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { getHistoricalAutoIssuedReviewLane } from "@/lib/admin/historical-auto-issued-review"
import { requireRole } from "@/lib/auth/helpers"
import {
  buildHistoricalAutoIssuedReviewCaseHref,
  STAFF_OPS_HREF,
} from "@/lib/dashboard/routes"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "Historical Auto-Issued Review",
}

function formatDate(value: string | null): string {
  if (!value) return "Date unavailable"
  return new Date(value).toLocaleDateString("en-AU", {
    day: "2-digit",
    month: "short",
    timeZone: "Australia/Sydney",
    year: "numeric",
  })
}

export default async function HistoricalAutoIssuedReviewPage() {
  await requireRole(["admin"], { redirectTo: STAFF_OPS_HREF })
  const lane = await getHistoricalAutoIssuedReviewLane(createServiceRoleClient())

  return (
    <OperatorPage>
      <OperatorPageHeader
        title="Historical auto-issued review"
        description="A fixed nine-case safety review. Open and assess one complete record at a time; the system never infers an outcome."
        backHref={STAFF_OPS_HREF}
        backLabel="Operations"
        badge={
          <StatusBadge
            status={lane.queryFailed ? "error" : lane.unresolvedCount === 0 ? "success" : "warning"}
          >
            {lane.queryFailed
              ? "Check unavailable"
              : lane.unresolvedCount === 0
                ? "Complete"
                : `${lane.unresolvedCount} remaining`}
          </StatusBadge>
        }
      />

      <OperatorScrollArea>
        {lane.queryFailed ? (
          <OperatorPanel className="border-destructive-border bg-destructive-light/30">
            <div className="flex gap-3" role="alert">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" aria-hidden="true" />
              <div>
                <h2 className="text-sm font-semibold">Historical cohort check unavailable</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  The fixed nine-case source did not reconcile, so no clinical outcome can be recorded from this lane. Restore the database check and reload.
                </p>
              </div>
            </div>
          </OperatorPanel>
        ) : lane.unresolvedCount === 0 ? (
          <OperatorPanel>
            <div className="py-10 text-center">
              <CheckCircle2 className="mx-auto h-9 w-9 text-success" aria-hidden="true" />
              <h2 className="mt-3 text-base font-semibold">All nine reviews have durable outcomes</h2>
              <p className="mx-auto mt-1 max-w-lg text-sm text-muted-foreground">
                Each historical case now has either an exact-version no-correction receipt or a recorded correction path.
              </p>
            </div>
          </OperatorPanel>
        ) : (
          <OperatorPanel padding="none">
            <div className="flex flex-col gap-2 border-b border-border/60 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-sm font-semibold">Medical Director review queue</h2>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Oldest first. Patient details remain inside the opened clinical record.
                </p>
              </div>
              <Badge variant="outline" size="sm">
                {lane.resolvedCount} of {lane.expectedCount} resolved
              </Badge>
            </div>

            <div className="divide-y divide-border/60">
              {lane.cases.map((reviewCase) => (
                <div
                  key={reviewCase.intakeId}
                  className="grid gap-3 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-sm font-medium">
                        {reviewCase.referenceNumber || "Historical medical certificate"}
                      </p>
                      <Badge
                        variant={reviewCase.state === "ready_for_review" ? "warning" : "destructive"}
                        size="sm"
                      >
                        {reviewCase.state === "ready_for_review" ? "Review required" : "State changed"}
                      </Badge>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      <span>Auto-issued {formatDate(reviewCase.aiApprovedAt)}</span>
                      <span className="inline-flex items-center gap-1">
                        <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                        Decision-time evidence required individual review
                      </span>
                    </div>
                  </div>

                  <Button variant="outline" size="sm" asChild>
                    <Link
                      href={buildHistoricalAutoIssuedReviewCaseHref(reviewCase.intakeId)}
                      prefetch={false}
                    >
                      Open review
                      <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                    </Link>
                  </Button>
                </div>
              ))}
            </div>
          </OperatorPanel>
        )}
      </OperatorScrollArea>
    </OperatorPage>
  )
}
