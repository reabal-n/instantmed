import { requireRole } from "@/lib/auth"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { Database, Activity, Clock } from "lucide-react"

export const dynamic = "force-dynamic"

export default async function DatabaseMonitoringPage() {
  await requireRole(["admin"])

  const supabase = createServiceRoleClient()

  // Query database stats
  const [
    { data: tableStats },
    { data: connectionStats },
    { count: totalIntakes },
    { count: totalProfiles },
  ] = await Promise.all([
    supabase.rpc("get_table_sizes").then(r => r, () => ({ data: null, error: null })),
    supabase.rpc("get_connection_count").then(r => r, () => ({ data: null, error: null })),
    supabase.from("intakes").select("id", { count: "exact", head: true }),
    supabase.from("profiles").select("id", { count: "exact", head: true }),
  ])

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-400 to-indigo-600 text-white">
          <Database className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold">Database Monitoring</h1>
          <p className="text-sm text-muted-foreground">Connection pool and query performance</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-border/50 bg-card p-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Activity className="h-4 w-4" />
            <span className="text-xs font-medium uppercase tracking-wider">Total Intakes</span>
          </div>
          <p className="mt-2 text-2xl font-semibold">{totalIntakes?.toLocaleString() || "\u2014"}</p>
        </div>
        <div className="rounded-xl border border-border/50 bg-card p-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Database className="h-4 w-4" />
            <span className="text-xs font-medium uppercase tracking-wider">Total Profiles</span>
          </div>
          <p className="mt-2 text-2xl font-semibold">{totalProfiles?.toLocaleString() || "\u2014"}</p>
        </div>
        <div className="rounded-xl border border-border/50 bg-card p-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span className="text-xs font-medium uppercase tracking-wider">Active Connections</span>
          </div>
          <p className="mt-2 text-2xl font-semibold">{connectionStats || "\u2014"}</p>
        </div>
      </div>

      {tableStats && Array.isArray(tableStats) && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Table Sizes</h2>
          <div className="rounded-xl border border-border/50 bg-card divide-y divide-border/50">
            {tableStats.map((t: { table_name: string; total_size: string; row_count: number }, i: number) => (
              <div key={i} className="flex items-center justify-between px-4 py-3 text-sm">
                <span className="font-mono">{t.table_name}</span>
                <div className="flex items-center gap-4">
                  <span className="text-muted-foreground">{t.row_count?.toLocaleString()} rows</span>
                  <span className="text-muted-foreground">{t.total_size}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
