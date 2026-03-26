import { FeatureFlagsClient } from "./features-client"
import { getFeatureFlagsAction, getAutoApproveStatsAction } from "@/app/actions/admin-config"
import { getFeatureFlagAuditLogsAction } from "@/app/actions/admin-config"
import { DEFAULT_FLAGS } from "@/lib/data/types/feature-flags"

export const dynamic = "force-dynamic"

export default async function FeatureFlagsPage() {
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
