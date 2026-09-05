import { beforeEach, describe, expect, it, vi } from "vitest"

import { updateScriptSent } from "@/lib/data/intakes/mutations"

const state = vi.hoisted(() => ({
  row: {} as Record<string, unknown>,
  beforeWrite: null as (() => void) | null,
}))
vi.mock("next/cache", () => ({ revalidateTag: vi.fn() }))
vi.mock("@/lib/data/intake-events", () => ({ logScriptSent: vi.fn().mockResolvedValue(undefined), logStatusChange: vi.fn() }))
vi.mock("@/lib/data/intakes/email-triggers", () => ({ triggerStatusEmail: vi.fn() }))
vi.mock("@/lib/supabase/service-role", () => ({ createServiceRoleClient: () => ({
  from: () => {
    const filters: Array<(row: Record<string, unknown>) => boolean> = []
    let payload: Record<string, unknown> | null = null
    const q = {
      select: () => q,
      eq: (key: string, value: unknown) => { filters.push((row) => row[key] === value); return q },
      is: (key: string, value: unknown) => { filters.push((row) => (row[key] ?? null) === value); return q },
      in: (key: string, values: unknown[]) => { filters.push((row) => values.includes(row[key])); return q },
      update: (value: Record<string, unknown>) => { payload = value; state.beforeWrite?.(); return q },
      single: async () => ({ data: { ...state.row }, error: null }),
      maybeSingle: async () => {
        if (!filters.every((matches) => matches(state.row))) return { data: null, error: null }
        if (payload) Object.assign(state.row, payload)
        return { data: { id: state.row.id }, error: null }
      },
    }
    return q
  },
}) }))

describe("script evidence reference ownership", () => {
  beforeEach(() => {
    state.row = { id: "case", status: "awaiting_script", payment_status: "paid", category: "consult", subtype: "ed", service: { type: "consult" }, script_sent: false, parchment_reference: null }
    state.beforeWrite = null
  })
  it("does not replace a reference already claimed by a webhook", async () => {
    state.row.parchment_reference = "provider-A"
    expect(await updateScriptSent("case", true, "Recorded externally", "manual-B")).toBe(false)
    expect(state.row.parchment_reference).toBe("provider-A")
    expect(state.row.script_sent).toBe(false)
  })
  it("rejects a conflicting retry even after script sent was recorded", async () => {
    state.row.parchment_reference = "provider-A"
    state.row.script_sent = true
    expect(await updateScriptSent("case", true, undefined, "provider-B")).toBe(false)
    expect(await updateScriptSent("case", true, undefined, "provider-A")).toBe(true)
  })
  it("does not overwrite a reference claimed between the read and write", async () => {
    state.beforeWrite = () => { state.row.parchment_reference = "provider-A" }
    expect(await updateScriptSent("case", true, undefined, "manual-B")).toBe(false)
    expect(state.row.parchment_reference).toBe("provider-A")
    expect(state.row.script_sent).toBe(false)
  })
  it("records a compatible provider reference", async () => {
    state.row.parchment_reference = "provider-A"
    expect(await updateScriptSent("case", true, undefined, "provider-A")).toBe(true)
    expect(state.row.script_sent).toBe(true)
  })
})
