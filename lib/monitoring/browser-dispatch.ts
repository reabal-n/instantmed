import "server-only"

import { createServiceRoleClient } from "@/lib/supabase/service-role"

const RECEIPT = "browser_scheduled_dispatch"
const WORKFLOW = "https://api.github.com/repos/reabal-n/instantmed/actions/workflows/prod-request-flow-synthetic.yml/dispatches"

/** Only the authenticated cron writes these provider-returned run IDs. */
export async function dispatchBrowserCheck() {
  const token = process.env.GITHUB_BROWSER_MONITOR_TOKEN
  if (!token) throw new Error("browser_dispatch_not_configured")
  const requestedAt = Date.now()
  const response = await fetch(WORKFLOW, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2026-03-10", "Content-Type": "application/json" },
    body: JSON.stringify({ ref: "main" }),
    signal: AbortSignal.timeout(10000), redirect: "error", cache: "no-store",
  })
  if (response.status !== 200) throw new Error("browser_dispatch_rejected")
  const body: unknown = await response.json()
  const id = body && typeof body === "object" && "workflow_run_id" in body ? body.workflow_run_id : undefined
  if (typeof id !== "number" || !Number.isSafeInteger(id) || id <= 0) throw new Error("browser_dispatch_invalid_receipt")
  const { error } = await createServiceRoleClient().from("operational_metrics").insert({
    metric_name: RECEIPT, metric_value: id, dimensions: { requestedAt },
  })
  if (error) throw new Error("browser_dispatch_receipt_unavailable")
  return id
}

export async function readScheduledBrowserRunIds(): Promise<Set<number>> {
  const { data, error } = await createServiceRoleClient().from("operational_metrics")
    .select("metric_value").eq("metric_name", RECEIPT).order("metric_value", { ascending: false }).limit(10)
  if (error || !Array.isArray(data) || data.some(row => !Number.isSafeInteger(row.metric_value) || row.metric_value <= 0)) {
    throw new Error("browser_dispatch_receipts_unavailable")
  }
  return new Set(data.map(row => row.metric_value))
}
