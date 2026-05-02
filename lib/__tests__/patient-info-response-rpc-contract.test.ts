import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

const migrationSource = readFileSync(
  join(process.cwd(), "supabase/migrations/20260501034500_patient_info_response_atomic.sql"),
  "utf8",
)
const privilegesSource = readFileSync(
  join(process.cwd(), "supabase/migrations/20260502012000_harden_info_request_rpc_privileges.sql"),
  "utf8",
)

describe("respond_to_info_request_atomic RPC contract", () => {
  it("restores pending-info requests and writes PHI-safe audit evidence", () => {
    expect(migrationSource).toContain("CREATE OR REPLACE FUNCTION public.respond_to_info_request_atomic")
    expect(migrationSource).toContain("FOR UPDATE")
    expect(migrationSource).toContain("v_target_status")
    expect(migrationSource).toContain("'patient_info_response'")
    expect(migrationSource).toContain("'message_length'")
    expect(migrationSource).toContain("previous_status = 'pending_info'::public.intake_status")
    expect(privilegesSource).toContain("idx_patient_messages_intake_created_at")
    expect(migrationSource).not.toContain("'message', v_message")
    expect(migrationSource).not.toContain("'content', v_message")
  })
})
