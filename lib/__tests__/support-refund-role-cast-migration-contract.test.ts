import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

const migration = readFileSync(
  join(
    process.cwd(),
    "supabase/migrations/20260814190000_fix_support_refund_attempt_role_cast.sql",
  ),
  "utf8",
)

describe("support refund role-cast migration contract", () => {
  it("matches the profiles.role storage type without weakening the actor gate", () => {
    expect(migration).toContain("v_actor_role text;")
    expect(migration).toContain("SELECT profile.role")
    expect(migration).toContain("v_actor_role IS DISTINCT FROM 'support'")
    expect(migration).not.toContain("v_actor_role public.user_role")
    expect(migration).not.toContain("'support'::public.user_role")
  })

  it("preserves the service-role-only security-definer boundary", () => {
    expect(migration).toContain("SECURITY DEFINER")
    expect(migration).toContain("SET search_path = pg_catalog, public")
    expect(migration).toMatch(
      /REVOKE ALL ON FUNCTION public\.reserve_support_refund_attempt\(uuid, uuid, text, integer\)\s+FROM PUBLIC, anon, authenticated, service_role;\s+GRANT EXECUTE ON FUNCTION public\.reserve_support_refund_attempt\(uuid, uuid, text, integer\)\s+TO service_role;/,
    )
  })
})
