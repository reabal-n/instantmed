import { redirect } from "next/navigation"
import { getAuthenticatedUserWithProfile } from "@/lib/auth"
import { AuditLogClient } from "./audit-client"
import { getAuditLogsAction, getAuditLogStatsAction } from "@/app/actions/admin-config"

export const dynamic = "force-dynamic"

export default async function AuditLogPage() {
  const authUser = await getAuthenticatedUserWithProfile()

  if (!authUser) {
    redirect("/auth/login")
  }

  if (authUser.profile.role !== "admin") {
    redirect("/")
  }

  const [logsResult, stats] = await Promise.all([
    getAuditLogsAction({}, 1, 50),
    getAuditLogStatsAction(),
  ])

  return (
    <AuditLogClient
      initialLogs={logsResult.data}
      initialTotal={logsResult.total}
      stats={stats}
    />
  )
}
