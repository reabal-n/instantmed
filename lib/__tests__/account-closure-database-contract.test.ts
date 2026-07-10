import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

const migrationPath = join(
  process.cwd(),
  "supabase/migrations/20260710170000_close_patient_accounts_atomically.sql",
)

function read(path: string): string {
  return readFileSync(join(process.cwd(), path), "utf8")
}

describe("patient account closure database boundary", () => {
  it("persists a service-role-only auth tombstone without an auth.users foreign key", () => {
    expect(existsSync(migrationPath)).toBe(true)
    const migration = readFileSync(migrationPath, "utf8")

    expect(migration).toContain("create table if not exists public.closed_auth_accounts")
    expect(migration).toContain("auth_user_id uuid primary key")
    expect(migration).not.toMatch(/auth_user_id[^,;]*references\s+auth\.users/i)
    expect(migration).toContain("enable row level security")
    expect(migration).toContain("force row level security")
    expect(migration).toContain("revoke all on table public.closed_auth_accounts from public, anon, authenticated")
    expect(migration).toContain("grant select, insert on table public.closed_auth_accounts to service_role")
    expect(migration).toContain("alter table public.profiles alter column email drop not null")
  })

  it("reconciles the squashed profile address column before compiling the closure RPC", () => {
    const migration = readFileSync(migrationPath, "utf8")
    const reconciliation = migration.indexOf("address_line_1")
    const closureRpc = migration.indexOf("create or replace function public.close_patient_account")

    expect(reconciliation).toBeGreaterThan(-1)
    expect(reconciliation).toBeLessThan(closureRpc)
    expect(migration).toContain("rename column address_line_1 to address_line1")
    expect(migration).toContain("drop column address_line_1")
  })

  it("rejects every concurrent attempt to resurrect a tombstoned auth link", () => {
    const migration = readFileSync(migrationPath, "utf8")

    expect(migration).toContain("create or replace function public.reject_closed_auth_profile_link()")
    expect(migration).toContain("closed.auth_user_id = new.auth_user_id")
    expect(migration).toContain("before insert on public.profiles")
    expect(migration).toContain("before update of auth_user_id on public.profiles")
    expect(migration).toContain("Closed auth account cannot be linked to a profile")
  })

  it("revokes stale-JWT access to auth-keyed storage and pins the broad documents policy closed", () => {
    const migration = readFileSync(migrationPath, "utf8")

    for (const policy of [
      "avatars_owner_read",
      "avatars_owner_insert",
      "avatars_owner_update",
      "avatars_owner_delete",
      "intake_photos_patient_read",
      "intake_photos_patient_insert",
    ]) {
      expect(migration).toContain(`create policy ${policy} on storage.objects`)
    }
    expect(migration).toContain("p.auth_user_id = auth.uid()")
    expect(migration).toContain("p.account_closed_at is null")
    expect(migration).toContain(
      'drop policy if exists "Authenticated users can view documents via signed URL" on storage.objects',
    )
  })

  it("requires an open patient profile for every auth-user-id-owned PHI policy", () => {
    const migration = readFileSync(migrationPath, "utf8")

    for (const policy of [
      "intake_drafts_owner_select",
      "intake_drafts_owner_update",
      "intake_drafts_owner_insert",
      "intake_drafts_user_delete",
      "Patients can view own chat audit log",
      "Patients can view own completions",
      "Patients can read own transcripts",
      "Patients can view own safety blocks",
    ]) {
      expect(migration).toContain(`"${policy}"`)
    }

    expect(migration).toContain("p.auth_user_id = (select auth.uid())")
    expect(migration).toContain("p.account_closed_at is null")
    expect(migration).toContain("p.role = 'patient'")
  })

  it("closes the profile and records the tombstone in one service-role-only transaction", () => {
    const migration = readFileSync(migrationPath, "utf8")
    const functionStart = migration.indexOf("create or replace function public.close_patient_account")
    const functionSource = migration.slice(functionStart)

    expect(functionStart).toBeGreaterThan(-1)
    expect(functionSource).toContain("security definer")
    expect(functionSource).toContain("for update")
    expect(functionSource).toContain("'pending_payment', 'checkout_failed', 'paid', 'in_review'")
    expect(functionSource).toContain("'pending_info', 'approved', 'awaiting_script', 'escalated'")
    expect(functionSource).toContain("insert into public.closed_auth_accounts")
    expect(functionSource).toContain("auth_user_id = null")
    expect(functionSource).toContain("account_closed_at = v_closed_at")
    expect(functionSource).toContain("medicare_number_encrypted = null")
    expect(functionSource).toContain("ihi_number_encrypted = null")
    expect(functionSource).toContain("phone_encrypted = null")
    expect(functionSource).toContain("date_of_birth_encrypted = null")
    expect(functionSource).toContain("revoke all on function public.close_patient_account")
    expect(functionSource).toContain("grant execute on function public.close_patient_account")
    expect(functionSource).toContain("to service_role")
  })

  it("backstops every profile closure update with an old-auth-id tombstone trigger", () => {
    const migration = readFileSync(migrationPath, "utf8")

    expect(migration).toContain("create or replace function public.capture_closed_profile_auth_tombstone()")
    expect(migration).toContain("old.auth_user_id is not null")
    expect(migration).toContain("new.auth_user_id is null")
    expect(migration).toContain("new.account_closed_at is not null")
    expect(migration).not.toContain("old.account_closed_at is null")
    expect(migration).toContain("on conflict (auth_user_id) do nothing")
    expect(migration).toContain("before update of auth_user_id, account_closed_at on public.profiles")
  })

  it("serializes new active-intake writes against account closure", () => {
    const migration = readFileSync(migrationPath, "utf8")
    const guardStart = migration.indexOf(
      "create or replace function public.require_open_profile_for_intake_write()",
    )
    const guardEnd = migration.indexOf(
      "revoke all on function public.require_open_profile_for_intake_write()",
      guardStart,
    )
    const guardSource = migration.slice(guardStart, guardEnd)

    expect(guardStart).toBeGreaterThan(-1)
    expect(guardEnd).toBeGreaterThan(guardStart)
    expect(guardSource).toContain("tg_op <> 'INSERT'")
    expect(guardSource).toContain("'pending_payment', 'checkout_failed', 'paid', 'in_review'")
    expect(guardSource).toContain("'pending_info', 'approved', 'awaiting_script', 'escalated'")
    expect(guardSource).toContain("for key share")
    expect(guardSource).toContain("p.account_closed_at is null")
    expect(migration).toContain("before insert or update of patient_id, status on public.intakes")
    expect(migration).toContain("Cannot attach active intake work to a closed profile")
  })

  it("blocks the auth trigger and every app profile-creation fallback from resurrecting a closed user", () => {
    const migration = readFileSync(migrationPath, "utf8")
    const postSignIn = read("app/auth/post-signin/page.tsx")
    const ensureAction = read("app/actions/ensure-profile.ts")
    const ensureRoute = read("app/api/profile/ensure/route.ts")
    const authHelpers = read("lib/auth/helpers.ts")

    expect(migration).toContain("from public.closed_auth_accounts")
    expect(migration).toContain("where closed.auth_user_id = new.id")
    expect(postSignIn).toContain("hasClosedAuthAccountTombstone(userId)")
    expect(ensureAction).toContain("hasClosedAuthAccountTombstone(userId)")
    expect(ensureRoute).toContain("hasClosedAuthAccountTombstone(user.id)")
    expect(authHelpers).toContain("hasClosedAuthAccountTombstone(user.id)")
    expect(migration).not.toContain("(email: %)")
  })

  it("uses the atomic RPC and globally revokes refresh sessions after closure", () => {
    const accountAction = read("app/actions/account.ts")

    expect(accountAction).toContain('.rpc("close_patient_account"')
    expect(accountAction).toContain('signOut({ scope: "global" })')
    expect(accountAction).not.toContain("retains `profiles.auth_user_id`")
  })
})
