import { requireRole } from "@/lib/auth/helpers"

import { ErrorMonitoringClient } from "./errors-client"

export const dynamic = "force-dynamic"

export default async function ErrorMonitoringPage() {
  await requireRole(["admin"], { redirectTo: "/admin" })

  return <ErrorMonitoringClient />
}
