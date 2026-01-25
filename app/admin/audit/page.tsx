import { redirect } from "next/navigation"
import { getAuthenticatedUserWithProfile } from "@/lib/auth"
import { AuditLogClient } from "./audit-client"
import { getAuditLogsAction, getAuditLogStatsAction } from "@/app/actions/admin-config"

export const dynamic = "force-dynamic"

export default async function AuditLogPage() {
  const authUser = await getAuthenticatedUserWithProfile()

  if (!authUser) {
    redirect("/sign-in")
  }

  if (authUser.profile.role !== "admin") {
    redirect("/")
  }

  const results = await Promise.allSettled([
    getAuditLogsAction({}, 1, 50),
    getAuditLogStatsAction(),
  ])

  const logsResult = results[0].status === "fulfilled" 
    ? results[0].value 
    : { data: [] as Awaited<ReturnType<typeof getAuditLogsAction>>["data"], total: 0 }
  const stats = results[1].status === "fulfilled" 
    ? results[1].value 
    : { total: 0, today: 0, byType: [], byActor: [] }

  return (
    <AuditLogClient
      initialLogs={logsResult.data || []}
      initialTotal={logsResult.total || 0}
      stats={stats}
    />
  )
}
