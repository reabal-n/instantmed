import { requireRole } from "@/lib/auth/helpers"
import { getScriptTaskCounts, getScriptTasks } from "@/lib/data/script-tasks"

import { ScriptsClient } from "./scripts-client"

export const metadata = { title: "Scripts" }

export const dynamic = "force-dynamic"

export default async function ScriptsPage() {
  const auth = await requireRole(["doctor", "admin"])
  const doctorId = auth.profile.role === "admin" ? undefined : auth.profile.id
  const filters = doctorId ? { doctorId, page: 1, pageSize: 50 } : { page: 1, pageSize: 50 }

  const [{ tasks, total }, counts] = await Promise.all([
    getScriptTasks(filters),
    getScriptTaskCounts(doctorId ? { doctorId } : undefined),
  ])

  return <ScriptsClient initialTasks={tasks} initialCounts={counts} initialTotal={total} />
}
