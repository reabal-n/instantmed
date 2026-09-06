import "server-only"

import { z } from "zod"

import { createServiceRoleClient } from "@/lib/supabase/service-role"

const safeNumber = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER)
const incidentSchema = z.object({ metric: safeNumber.max(99), severity: safeNumber.max(2), count: safeNumber, at: safeNumber, active: z.boolean() }).strict()
const evidenceSchema = z.object({ event: safeNumber.max(1).optional(), id: safeNumber, number: safeNumber, attempt: safeNumber, created: safeNumber, started: safeNumber, completed: safeNumber, outcome: safeNumber.max(2), status: safeNumber.max(2) }).strict()
const common = { enabledAt: safeNumber, checkedAt: safeNumber, incidents: z.array(incidentSchema).max(100) }
export const browserStateSchema = z.object({ ...common,
  cache: z.array(evidenceSchema).max(10), completedAt: safeNumber.optional(),
  latest: evidenceSchema.optional(), success: evidenceSchema.optional(), failure: evidenceSchema.optional(),
  invocation: evidenceSchema.optional(), running: evidenceSchema.optional(),
  observerOk: z.boolean(), coverageGap: z.boolean(), backoffUntil: safeNumber,
}).strict()
export const businessStateSchema = z.object(common).strict()
export type BrowserState = z.infer<typeof browserStateSchema>
export type Incident = z.infer<typeof incidentSchema>
export type Evidence = z.infer<typeof evidenceSchema>
export type MonitorKey = "browser_observer_state" | "business_incident_state"

export async function readMonitorState<T>(key: MonitorKey, schema: z.ZodType<T>) {
  const db = createServiceRoleClient()
  const { data, error } = await db.from("operational_metrics")
    .select("metric_value,dimensions").eq("metric_name", key)
    .order("metric_value", { ascending: false }).limit(1).maybeSingle()
  if (error || !data || !Number.isSafeInteger(data.metric_value) || data.metric_value < 1) throw new Error("monitor_state_unavailable")
  return { version: data.metric_value as number, state: schema.parse(data.dimensions) }
}

export async function appendMonitorState(key: MonitorKey, version: number, state: unknown): Promise<boolean> {
  const { data, error } = await createServiceRoleClient().rpc("append_monitor_state", {
    p_key: key, p_expected_version: version, p_state: state,
  })
  if (error || typeof data !== "boolean") throw new Error("monitor_state_unavailable")
  return data
}
