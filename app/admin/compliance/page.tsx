import { requireRole } from "@/lib/auth"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { ShieldCheck, Eye, Clock, AlertTriangle, Users, FileSearch } from "lucide-react"

export const dynamic = "force-dynamic"

export default async function ComplianceDashboardPage() {
  await requireRole(["admin"])

  const supabase = createServiceRoleClient()

  // Fetch compliance metrics
  const [
    { count: totalAuditEvents },
    { count: recentAccessCount },
    { data: recentAccess },
    { count: oldRecords },
    { data: topActors },
  ] = await Promise.all([
    // Canonical audit table is `audit_logs` (plural, with RLS)
    supabase.from("audit_logs").select("*", { count: "exact", head: true }),
    supabase.from("audit_logs").select("*", { count: "exact", head: true })
      .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()),
    supabase.from("audit_logs").select("action, actor_id, created_at, entity_type")
      .order("created_at", { ascending: false })
      .limit(20),
    supabase.from("intakes").select("*", { count: "exact", head: true })
      .lt("created_at", new Date(Date.now() - 7 * 365.25 * 24 * 60 * 60 * 1000).toISOString()),
    supabase.from("audit_logs")
      .select("actor_id")
      .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .limit(100),
  ])

  // Count unique actors in last 24h
  const uniqueActors = new Set(topActors?.map(a => a.actor_id).filter(Boolean)).size

  // Detect anomalies: any actor with >50 actions in last hour
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
  const { data: hourlyActions } = await supabase
    .from("audit_logs")
    .select("actor_id")
    .gte("created_at", oneHourAgo)

  const actorCounts = new Map<string, number>()
  for (const action of hourlyActions || []) {
    if (action.actor_id) {
      actorCounts.set(action.actor_id, (actorCounts.get(action.actor_id) || 0) + 1)
    }
  }
  const anomalies = Array.from(actorCounts.entries())
    .filter(([, count]) => count > 50)
    .map(([actorId, count]) => ({ actorId, count }))

  return (
    <div className="space-y-6 p-6" aria-label="APP Compliance Dashboard">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 text-white">
          <ShieldCheck className="h-5 w-5" aria-hidden="true" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold">APP Compliance Dashboard</h1>
          <p className="text-sm text-muted-foreground">Australian Privacy Principles monitoring</p>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-label="Compliance summary metrics">
        <div className="rounded-xl border border-border/50 bg-card p-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Eye className="h-4 w-4" aria-hidden="true" />
            <span className="text-xs font-medium uppercase tracking-wider">Total Audit Events</span>
          </div>
          <p className="mt-2 text-2xl font-semibold">{totalAuditEvents?.toLocaleString()}</p>
        </div>
        <div className="rounded-xl border border-border/50 bg-card p-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="h-4 w-4" aria-hidden="true" />
            <span className="text-xs font-medium uppercase tracking-wider">Last 24h Actions</span>
          </div>
          <p className="mt-2 text-2xl font-semibold">{recentAccessCount?.toLocaleString()}</p>
        </div>
        <div className="rounded-xl border border-border/50 bg-card p-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Users className="h-4 w-4" aria-hidden="true" />
            <span className="text-xs font-medium uppercase tracking-wider">Active Users (24h)</span>
          </div>
          <p className="mt-2 text-2xl font-semibold">{uniqueActors}</p>
        </div>
        <div className={`rounded-xl border p-4 ${
          (oldRecords || 0) > 0
            ? "border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/20"
            : "border-emerald-200 bg-emerald-50/50 dark:border-emerald-800 dark:bg-emerald-950/20"
        }`}>
          <div className="flex items-center gap-2 text-muted-foreground">
            <FileSearch className="h-4 w-4" aria-hidden="true" />
            <span className="text-xs font-medium uppercase tracking-wider">Records &gt;7yr</span>
          </div>
          <p className="mt-2 text-2xl font-semibold">{oldRecords || 0}</p>
          <p className="text-xs text-muted-foreground">{(oldRecords || 0) > 0 ? "Due for anonymization" : "Compliant"}</p>
        </div>
      </div>

      {/* Anomaly alerts */}
      {anomalies.length > 0 && (
        <div className="rounded-xl border border-red-200 bg-red-50/50 p-4 dark:border-red-800 dark:bg-red-950/20" role="alert">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" aria-hidden="true" />
            <h2 className="font-semibold text-red-800 dark:text-red-300">Anomalous Activity Detected</h2>
          </div>
          <div className="space-y-1">
            {anomalies.map((a) => (
              <p key={a.actorId} className="text-sm text-red-700 dark:text-red-400">
                Actor {a.actorId.slice(0, 8)}... performed {a.count} actions in the last hour
              </p>
            ))}
          </div>
        </div>
      )}

      {/* Recent audit trail */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Recent Activity</h2>
        <div className="rounded-xl border border-border/50 bg-card divide-y divide-border/50" role="list" aria-label="Recent audit activity">
          {(recentAccess || []).map((event, i) => (
            <div key={i} className="flex items-center justify-between px-4 py-3 text-sm" role="listitem">
              <div className="flex items-center gap-3">
                <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-mono">{event.action}</span>
                {event.entity_type && (
                  <span className="text-muted-foreground">{event.entity_type}</span>
                )}
              </div>
              <span className="text-xs text-muted-foreground">
                {new Date(event.created_at).toLocaleString("en-AU")}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
