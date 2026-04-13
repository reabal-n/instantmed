import { getAutoApproveStatsAction,getFeatureFlagsAction } from "@/app/actions/admin-config"
import { getFeatureFlagAuditLogsAction } from "@/app/actions/admin-config"
import { requireRole } from "@/lib/auth/helpers"
import { DEFAULT_FLAGS } from "@/lib/data/types/feature-flags"

import { FeatureFlagsClient } from "./features-client"

export const dynamic = "force-dynamic"

export default async function FeatureFlagsPage() {
  await requireRole(["admin"], { redirectTo: "/doctor/dashboard" })

  const [flags, auditLogs, autoApproveStats] = await Promise.all([
    getFeatureFlagsAction().catch(() => DEFAULT_FLAGS),
    getFeatureFlagAuditLogsAction(),
    getAutoApproveStatsAction().catch(() => null),
  ])

  return (
    <FeatureFlagsClient
      initialFlags={flags}
      auditLogs={auditLogs}
      autoApproveStats={autoApproveStats}
    />
  )
}
