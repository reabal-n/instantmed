import { AlertTriangle, CheckCircle2, ExternalLink, ShieldCheck } from "lucide-react"
import Link from "next/link"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import type { StaffReadinessCheck, StaffReadinessSnapshot } from "@/lib/data/staff-readiness"
import { cn } from "@/lib/utils"

function readinessBadge(status: StaffReadinessCheck["status"]) {
  if (status === "fail") return <Badge variant="destructive">Action needed</Badge>
  if (status === "warn") return <Badge variant="warning">Check</Badge>
  return <Badge className="border-success-border bg-success-light text-success">Ready</Badge>
}

function ReadinessCheckRow({ check }: { check: StaffReadinessCheck }) {
  const Icon = check.status === "pass" ? CheckCircle2 : AlertTriangle

  return (
    <div
      className={cn(
        "flex min-w-0 items-start justify-between gap-3 rounded-lg border px-3 py-2.5",
        check.status === "pass" && "border-success-border bg-success-light/25",
        check.status === "warn" && "border-warning-border bg-warning-light/35",
        check.status === "fail" && "border-destructive/25 bg-destructive/5",
      )}
    >
      <div className="flex min-w-0 gap-2.5">
        <Icon
          className={cn(
            "mt-0.5 h-4 w-4 shrink-0",
            check.status === "pass" && "text-success",
            check.status === "warn" && "text-warning",
            check.status === "fail" && "text-destructive",
          )}
          aria-hidden
        />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">{check.label}</p>
          <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{check.detail}</p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {readinessBadge(check.status)}
        {check.href ? (
          <Button asChild variant="ghost" size="icon" className="h-7 w-7">
            <Link href={check.href} aria-label={`Open ${check.label}`}>
              <ExternalLink className="h-3.5 w-3.5" aria-hidden />
            </Link>
          </Button>
        ) : null}
      </div>
    </div>
  )
}

export function StaffReadinessPanel({ snapshot }: { snapshot: StaffReadinessSnapshot }) {
  if (snapshot.totalFailures === 0 && snapshot.totalWarnings === 0) return null

  const tone = snapshot.totalFailures > 0 ? "fail" : "warn"
  const visibleChecks = snapshot.checks.filter((check) => check.status !== "pass")

  return (
    <Card className="shrink-0 border-border/60 bg-card px-4 py-3 shadow-sm shadow-primary/[0.03]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <ShieldCheck
              className={cn("h-4 w-4", tone === "fail" ? "text-destructive" : "text-warning")}
              aria-hidden
            />
            <p className="text-sm font-semibold text-foreground">Release readiness</p>
            <Badge variant={tone === "fail" ? "destructive" : "warning"} className="tabular-nums">
              {snapshot.totalFailures} blocking · {snapshot.totalWarnings} watch
            </Badge>
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Admin-only guardrail for staff roles, owner doctor setup, future doctors, and release telemetry.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-2 text-right text-xs text-muted-foreground">
          <div>
            <p className="font-semibold tabular-nums text-foreground">{snapshot.humanAdminCount}</p>
            <p>admin</p>
          </div>
          <div>
            <p className="font-semibold tabular-nums text-foreground">{snapshot.doctorCount}</p>
            <p>doctors</p>
          </div>
          <div>
            <p className="font-semibold tabular-nums text-foreground">{snapshot.supportCount}</p>
            <p>support</p>
          </div>
        </div>
      </div>

      <div className="mt-3 grid gap-2 lg:grid-cols-2">
        {visibleChecks.map((check) => (
          <ReadinessCheckRow key={check.id} check={check} />
        ))}
      </div>
    </Card>
  )
}
