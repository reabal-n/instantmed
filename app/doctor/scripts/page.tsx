import { getScriptTasks, getScriptTaskCounts } from "@/lib/data/script-tasks"
import { ScriptsClient } from "./scripts-client"

export const dynamic = "force-dynamic"

export default async function ScriptsPage() {
  // Layout enforces doctor/admin role
  const [tasks, counts] = await Promise.all([
    getScriptTasks(),
    getScriptTaskCounts(),
  ])

  return <ScriptsClient initialTasks={tasks} initialCounts={counts} />
}
