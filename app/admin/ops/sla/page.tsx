import { requireRole } from "@/lib/auth"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { Clock, AlertTriangle, CheckCircle2, Timer } from "lucide-react"

export const dynamic = "force-dynamic"

export default async function SLAMonitoringPage() {
  await requireRole(["admin"])

  const supabase = createServiceRoleClient()
  const now = new Date()

  // Active intakes with SLA status
  const { data: activeIntakes } = await supabase
    .from("intakes")
    .select(
      "id, status, paid_at, sla_deadline, category, patient:profiles!patient_id(full_name)"
    )
    .in("status", ["paid", "in_review"])
    .eq("payment_status", "paid")
    .order("paid_at", { ascending: true })

  const intakes = (activeIntakes || []).map((intake) => {
    const paidAt = intake.paid_at ? new Date(intake.paid_at) : null
    const hoursWaiting = paidAt
      ? (now.getTime() - paidAt.getTime()) / (1000 * 60 * 60)
      : 0
    const slaDeadline = intake.sla_deadline
      ? new Date(intake.sla_deadline)
      : null
    const slaBreached = slaDeadline ? now > slaDeadline : hoursWaiting > 4

    return {
      ...intake,
      hoursWaiting: Math.round(hoursWaiting * 10) / 10,
      slaBreached,
      patientName: Array.isArray(intake.patient)
        ? intake.patient[0]?.full_name
        : (intake.patient as Record<string, string>)?.full_name,
    }
  })

  const breached = intakes.filter((i) => i.slaBreached)
  const atRisk = intakes.filter((i) => !i.slaBreached && i.hoursWaiting > 2)
  const onTrack = intakes.filter((i) => !i.slaBreached && i.hoursWaiting <= 2)

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-3">
        <div
          className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 text-white"
          aria-hidden="true"
        >
          <Timer className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold">SLA Monitoring</h1>
          <p className="text-sm text-muted-foreground">
            Real-time compliance across active intakes
          </p>
        </div>
      </div>

      <div
        className="grid grid-cols-1 gap-4 sm:grid-cols-3"
        aria-label="SLA status summary"
      >
        <div className="rounded-xl border border-red-200 bg-red-50/50 p-4 dark:border-red-800 dark:bg-red-950/20">
          <div className="flex items-center gap-2">
            <AlertTriangle
              className="h-5 w-5 text-red-600 dark:text-red-400"
              aria-hidden="true"
            />
            <span className="font-medium text-red-800 dark:text-red-300">
              SLA Breached
            </span>
          </div>
          <p
            className="mt-1 text-3xl font-bold text-red-700 dark:text-red-400"
            aria-label={`${breached.length} breached intakes`}
          >
            {breached.length}
          </p>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 dark:border-amber-800 dark:bg-amber-950/20">
          <div className="flex items-center gap-2">
            <Clock
              className="h-5 w-5 text-amber-600 dark:text-amber-400"
              aria-hidden="true"
            />
            <span className="font-medium text-amber-800 dark:text-amber-300">
              At Risk (2-4h)
            </span>
          </div>
          <p
            className="mt-1 text-3xl font-bold text-amber-700 dark:text-amber-400"
            aria-label={`${atRisk.length} at risk intakes`}
          >
            {atRisk.length}
          </p>
        </div>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 dark:border-emerald-800 dark:bg-emerald-950/20">
          <div className="flex items-center gap-2">
            <CheckCircle2
              className="h-5 w-5 text-emerald-600 dark:text-emerald-400"
              aria-hidden="true"
            />
            <span className="font-medium text-emerald-800 dark:text-emerald-300">
              On Track
            </span>
          </div>
          <p
            className="mt-1 text-3xl font-bold text-emerald-700 dark:text-emerald-400"
            aria-label={`${onTrack.length} on track intakes`}
          >
            {onTrack.length}
          </p>
        </div>
      </div>

      {/* Breached intakes */}
      {breached.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-red-700 dark:text-red-400">
            Breached Intakes
          </h2>
          <div className="space-y-2" role="list" aria-label="Breached intakes list">
            {breached.map((intake) => (
              <div
                key={intake.id}
                role="listitem"
                className="flex items-center justify-between rounded-lg border border-red-200 bg-red-50/30 px-4 py-3 dark:border-red-800 dark:bg-red-950/10"
              >
                <div>
                  <p className="font-medium">
                    {intake.patientName || "Unknown"}
                  </p>
                  <p className="text-sm text-muted-foreground capitalize">
                    {intake.category?.replace(/_/g, " ")}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-red-600">
                    {intake.hoursWaiting}h waiting
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {intake.status}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* At risk */}
      {atRisk.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-amber-700 dark:text-amber-400">
            At Risk
          </h2>
          <div className="space-y-2" role="list" aria-label="At risk intakes list">
            {atRisk.map((intake) => (
              <div
                key={intake.id}
                role="listitem"
                className="flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50/30 px-4 py-3 dark:border-amber-800 dark:bg-amber-950/10"
              >
                <div>
                  <p className="font-medium">
                    {intake.patientName || "Unknown"}
                  </p>
                  <p className="text-sm text-muted-foreground capitalize">
                    {intake.category?.replace(/_/g, " ")}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-amber-600">
                    {intake.hoursWaiting}h waiting
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {intake.status}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
