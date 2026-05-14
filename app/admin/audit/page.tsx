import { getAuditLogsAction } from "@/app/actions/admin-config"
import { requireRole } from "@/lib/auth/helpers"

import { AuditLogClient } from "./audit-client"

export const dynamic = "force-dynamic"

export default async function AuditLogPage() {
  await requireRole(["admin"])

  const logsResult = await getAuditLogsAction({}, 1, 50).catch(() => ({
    data: [] as Awaited<ReturnType<typeof getAuditLogsAction>>["data"],
    total: 0,
  }))

  return (
    <AuditLogClient
      initialLogs={logsResult.data || []}
      initialTotal={logsResult.total || 0}
    />
  )
}
