import { requireRole } from "@/lib/auth"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { Shield, Lock, Unlock, AlertTriangle, CheckCircle2 } from "lucide-react"

export const dynamic = "force-dynamic"

export default async function EncryptionDashboardPage() {
  await requireRole(["admin"])

  const supabase = createServiceRoleClient()

  // Check encryption feature flags
  const encryptionEnabled = process.env.PHI_ENCRYPTION_ENABLED === "true"
  const writeEnabled = process.env.PHI_ENCRYPTION_WRITE_ENABLED === "true"
  const readEnabled = process.env.PHI_ENCRYPTION_READ_ENABLED === "true"

  // Count encrypted vs unencrypted records
  const [
    { count: totalDrafts },
    { count: encryptedDrafts },
    { count: totalDocDrafts },
    { count: encryptedDocDrafts },
  ] = await Promise.all([
    supabase.from("intake_drafts").select("id", { count: "exact", head: true }),
    supabase.from("intake_drafts").select("id", { count: "exact", head: true }).not("data_encrypted", "is", null),
    supabase.from("document_drafts").select("id", { count: "exact", head: true }),
    supabase.from("document_drafts").select("id", { count: "exact", head: true }).not("data_encrypted", "is", null),
  ])

  // Get recent encryption audit events
  const { data: recentAudit } = await supabase
    .from("phi_encryption_audit")
    .select("operation, table_name, created_at")
    .order("created_at", { ascending: false })
    .limit(10)

  const stats = [
    {
      label: "Intake Drafts",
      total: totalDrafts || 0,
      encrypted: encryptedDrafts || 0,
      percentage: totalDrafts ? Math.round(((encryptedDrafts || 0) / totalDrafts) * 100) : 0,
    },
    {
      label: "Document Drafts",
      total: totalDocDrafts || 0,
      encrypted: encryptedDocDrafts || 0,
      percentage: totalDocDrafts ? Math.round(((encryptedDocDrafts || 0) / totalDocDrafts) * 100) : 0,
    },
  ]

  return (
    <div className="space-y-6 p-6" aria-label="PHI Encryption Dashboard">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-400 to-violet-600 text-white">
          <Shield className="h-5 w-5" aria-hidden="true" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold">PHI Encryption Status</h1>
          <p className="text-sm text-muted-foreground">AES-256-GCM envelope encryption for protected health information</p>
        </div>
      </div>

      {/* Feature flag status */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3" aria-label="Encryption feature flags">
        {[
          { label: "Encryption Enabled", value: encryptionEnabled },
          { label: "Write Encryption", value: writeEnabled },
          { label: "Read Decryption", value: readEnabled },
        ].map((flag) => (
          <div
            key={flag.label}
            className={`flex items-center gap-3 rounded-xl border p-4 ${
              flag.value
                ? "border-emerald-200 bg-emerald-50/50 dark:border-emerald-800 dark:bg-emerald-950/20"
                : "border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/20"
            }`}
            aria-label={`${flag.label}: ${flag.value ? "Active" : "Disabled"}`}
          >
            {flag.value ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
            ) : (
              <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" aria-hidden="true" />
            )}
            <div>
              <p className="font-medium text-sm">{flag.label}</p>
              <p className="text-xs text-muted-foreground">{flag.value ? "Active" : "Disabled"}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Encryption coverage stats */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Encryption Coverage</h2>
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-xl border border-border/50 bg-card p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                {stat.percentage === 100 ? (
                  <Lock className="h-4 w-4 text-emerald-500" aria-hidden="true" />
                ) : (
                  <Unlock className="h-4 w-4 text-amber-500" aria-hidden="true" />
                )}
                <span className="font-medium">{stat.label}</span>
              </div>
              <span className="text-sm text-muted-foreground">
                {stat.encrypted}/{stat.total} records ({stat.percentage}%)
              </span>
            </div>
            <div className="h-2 w-full rounded-full bg-muted" role="progressbar" aria-valuenow={stat.percentage} aria-valuemin={0} aria-valuemax={100} aria-label={`${stat.label} encryption progress`}>
              <div
                className={`h-2 rounded-full transition-all ${
                  stat.percentage === 100 ? "bg-emerald-500" : stat.percentage > 50 ? "bg-sky-500" : "bg-amber-500"
                }`}
                style={{ width: `${stat.percentage}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Recent audit events */}
      {recentAudit && recentAudit.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Recent Encryption Operations</h2>
          <div className="rounded-xl border border-border/50 bg-card divide-y divide-border/50" role="list" aria-label="Recent encryption operations">
            {recentAudit.map((event, i) => (
              <div key={i} className="flex items-center justify-between px-4 py-3 text-sm" role="listitem">
                <div className="flex items-center gap-2">
                  <Lock className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
                  <span className="font-medium">{event.operation}</span>
                  <span className="text-muted-foreground">on {event.table_name}</span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {new Date(event.created_at).toLocaleString("en-AU")}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
