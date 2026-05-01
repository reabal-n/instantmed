import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

const migrationSource = readFileSync(
  join(process.cwd(), "supabase/migrations/20260501025500_request_more_info_atomic.sql"),
  "utf8",
)

describe("request_more_info_atomic RPC contract", () => {
  it("writes a PHI-safe audit log inside the atomic transition", () => {
    expect(migrationSource).toContain("INSERT INTO public.audit_logs")
    expect(migrationSource).toContain("'request_more_info'")
    expect(migrationSource).toContain("from_state")
    expect(migrationSource).toContain("'pending_info'")
    expect(migrationSource).toContain("'message_length'")
    expect(migrationSource).not.toContain("'message', v_message")
    expect(migrationSource).not.toContain("'content', v_message")
  })
})
