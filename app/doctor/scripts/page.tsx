import { requireRole } from "@/lib/auth"
import { getScriptTasks, getScriptTaskCounts } from "@/lib/data/script-tasks"
import { ScriptsClient } from "./scripts-client"

export const dynamic = "force-dynamic"

export default async function ScriptsPage() {
  await requireRole(["doctor", "admin"])

  const [tasks, counts] = await Promise.all([
    getScriptTasks(),
    getScriptTaskCounts(),
  ])

  return <ScriptsClient initialTasks={tasks} initialCounts={counts} />
}
