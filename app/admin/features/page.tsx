import { FeatureFlagsClient } from "./features-client"
import { getFeatureFlagsAction } from "@/app/actions/admin-config"
import { getFeatureFlagAuditLogsAction } from "@/app/actions/admin-config"
import { DEFAULT_FLAGS } from "@/lib/data/types/feature-flags"

export const dynamic = "force-dynamic"

export default async function FeatureFlagsPage() {
  const [flags, auditLogs] = await Promise.all([
    getFeatureFlagsAction().catch(() => DEFAULT_FLAGS),
    getFeatureFlagAuditLogsAction(),
  ])

  return <FeatureFlagsClient initialFlags={flags} auditLogs={auditLogs} />
}
