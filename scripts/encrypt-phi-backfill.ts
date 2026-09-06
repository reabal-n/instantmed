#!/usr/bin/env npx tsx
/* eslint-disable no-console */
/**
 * INITIAL BACKFILL ONLY — NOT KEY ROTATION.
 * This script uses ENCRYPTION_KEY and the existing AES-256-GCM format to
 * populate missing profiles DOB/phone/Medicare ciphertext. Plaintext stays.
 * It does not read PHI_MASTER_KEY or repair existing ciphertext/parity drift.
 *
 * Supply NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ENCRYPTION_KEY
 * through the operator environment; no environment files are loaded.
 * NODE_OPTIONS=--conditions=react-server corepack pnpm encrypt:backfill --dry
 * NODE_OPTIONS=--conditions=react-server corepack pnpm encrypt:backfill --apply --batch=50
 * No flags means dry run. --dry-run aliases --dry. Batch bounds: 1..500.
 * Production apply requires a separately approved, exact reviewed dry-run packet.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js"

import { isLikelyTestPatientIdentity, SEEDED_E2E_PATIENT_PROFILE_IDS } from "../lib/data/seeded-e2e-data"
import { decrypt, encrypt, verifyEncryptionSetup } from "../lib/security/encryption"

const FIELDS = ["date_of_birth", "phone", "medicare_number"] as const
type Field = typeof FIELDS[number]
type Profile = Record<Field | `${Field}_encrypted` | "email" | "full_name" | "phi_encrypted_at", string | null> & { id: string }
const COLUMNS = ["id", "email", "full_name", "phi_encrypted_at", ...FIELDS.flatMap(field => [field, `${field}_encrypted`])].join(",")
const FIXTURE_IDS = new Set<string>([
  ...SEEDED_E2E_PATIENT_PROFILE_IDS,
  "e2e00000-0000-0000-0000-000000000001",
  "e2e00000-0000-0000-0000-000000000003",
  "e2e00000-0000-0000-0000-000000000004",
])
const excluded = (row: Profile) => FIXTURE_IDS.has(row.id) || isLikelyTestPatientIdentity({ email: row.email, fullName: row.full_name })
const missing = (row: Profile) => FIELDS.filter(field => !!row[field] && !row[`${field}_encrypted`])
const emptyCounts = () => ({ date_of_birth: 0, phone: 0, medicare_number: 0 })

// Only these locally chosen codes may reach output/status. Never interpolate
// DB errors, exceptions, values, ciphertext, URLs, or row identifiers.
type ErrorCode = "INVALID_CLI" | "MISSING_ENV" | "INVALID_KEY" | "READ_FAILED" | "KEY_INCOMPATIBLE" | "KEY_EVIDENCE_MISSING" | "STATUS_WRITE_FAILED" | "PROFILE_WRITE_FAILED" | "WRITE_RECEIPT_INVALID" | "REREAD_FAILED" | "ENCRYPT_FAILED" | "UNEXPECTED_FAILURE"
class BackfillError extends Error {
  constructor(readonly code: ErrorCode) { super(code) }
}
function fail(code: ErrorCode): never { throw new BackfillError(code) }
function options(args: string[]) {
  let apply = false
  let modeSeen = false
  let batchSeen = false
  let batchSize = 50
  for (const arg of args) {
    if (["--apply", "--dry", "--dry-run"].includes(arg)) {
      if (modeSeen) fail("INVALID_CLI")
      modeSeen = true
      apply = arg === "--apply"
    } else if (/^--batch=[1-9]\d*$/.test(arg)) {
      if (batchSeen) fail("INVALID_CLI")
      batchSeen = true
      batchSize = Number(arg.slice(8))
      if (!Number.isSafeInteger(batchSize) || batchSize > 500) fail("INVALID_CLI")
    } else fail("INVALID_CLI")
  }
  return { apply, batchSize }
}
async function* pages(db: SupabaseClient, batchSize: number, upper: string) {
  let cursor: string | null = null
  while (true) {
    const base = db.from("profiles").select(COLUMNS).lte("id", upper).order("id", { ascending: true }).limit(batchSize)
    const { data, error } = await (cursor ? base.gt("id", cursor) : base)
    if (error || !data) fail("READ_FAILED")
    if (!data.length) return
    const rows = data as unknown as Profile[]
    const next = rows[rows.length - 1].id
    if (cursor && next <= cursor) fail("READ_FAILED")
    cursor = next
    yield rows
  }
}
async function inspect(db: SupabaseClient, batchSize: number, upper: string) {
  const result = {
    scanned: 0, excluded: 0, eligible: 0, candidates: 0,
    missing: emptyCounts(), existing: emptyCounts(), decryptable: emptyCounts(), parityMismatch: emptyCounts(), decryptFailures: emptyCounts(),
    compatible: false,
  }
  for await (const rows of pages(db, batchSize, upper)) {
    for (const row of rows) {
      result.scanned++
      if (excluded(row)) { result.excluded++; continue }
      result.eligible++
      if (missing(row).length) result.candidates++
      for (const field of FIELDS) {
        const ciphertext = row[`${field}_encrypted`]
        if (!ciphertext) { if (row[field]) result.missing[field]++; continue }
        result.existing[field]++
        try {
          const plaintext = decrypt(ciphertext)
          result.decryptable[field]++
          if (plaintext !== row[field]) result.parityMismatch[field]++
        } catch { result.decryptFailures[field]++ }
      }
    }
  }
  result.compatible = Object.values(result.decryptable).some(count => count > 0) && Object.values(result.decryptFailures).every(count => count === 0)
  return result
}

async function main() {
  // Reject flags before environment validation, client creation, or any I/O.
  const { apply, batchSize } = options(process.argv.slice(2))
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey || !process.env.ENCRYPTION_KEY) fail("MISSING_ENV")
  if (!verifyEncryptionSetup().valid) fail("INVALID_KEY")
  const db = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })
  const { data: upperRows, error: upperError } = await db.from("profiles").select("id").order("id", { ascending: false }).limit(1)
  if (upperError || !upperRows) fail("READ_FAILED")
  // A finite high-water mark excludes later IDs. This is a sequential scan,
  // not a transaction snapshot; repeat the read-only run after an apply.
  const upper = upperRows[0]?.id as string | undefined
  if (!upper) fail("KEY_EVIDENCE_MISSING")
  const before = await inspect(db, batchSize, upper)
  console.log(JSON.stringify({ phase: "preflight", mode: apply ? "apply" : "dry", batchSize, ...before }))
  if (!before.compatible) fail(Object.values(before.decryptFailures).some(Boolean) ? "KEY_INCOMPATIBLE" : "KEY_EVIDENCE_MISSING")
  const result = { phase: "summary", mode: apply ? "apply" : "dry", processed: 0, updated: 0, updatedFields: emptyCounts(), skipped: 0, skips: { sourceChanged: 0, targetChanged: 0, otherChanged: 0, deleted: 0 }, errors: {} as Partial<Record<ErrorCode, number>> }
  let statusId: string | null = null
  let lastError: ErrorCode | null = null
  const recordError = (code: ErrorCode) => { lastError = code; result.errors[code] = (result.errors[code] || 0) + 1 }
  if (apply && before.candidates) {
    const { data, error } = await db.from("encryption_migration_status").insert({ table_name: "profiles", total_records: before.candidates, encrypted_records: 0 }).select("id").single()
    if (error || !data?.id) fail("STATUS_WRITE_FAILED")
    statusId = data.id
  }
  if (apply && before.candidates) {
    try {
      for await (const rows of pages(db, batchSize, upper)) {
        for (const row of rows) {
          if (excluded(row)) continue
          const fields = missing(row)
          if (!fields.length) continue
          result.processed++
          // Recheck existing ciphertext seen after preflight before this write.
          for (const field of FIELDS) {
            if (row[`${field}_encrypted`]) {
              try { decrypt(row[`${field}_encrypted`]!) } catch { fail("KEY_INCOMPATIBLE") }
            }
          }
          const updates: Record<string, string> = { phi_encrypted_at: new Date().toISOString() }
          try { for (const field of fields) updates[`${field}_encrypted`] = encrypt(row[field]!) } catch { fail("ENCRYPT_FAILED") }
          let query = db.from("profiles").update(updates).eq("id", row.id)
          // Atomic whole-row CAS: preserve all source/target snapshots, fixture
          // classification inputs and timestamp. Empty targets match exactly;
          // null targets use IS NULL. Never use an ID-only retry.
          for (const column of ["email", "full_name", "phi_encrypted_at", ...FIELDS.flatMap(field => [field, `${field}_encrypted`])] as (keyof Profile)[]) {
            query = row[column] === null ? query.is(column, null) : query.eq(column, row[column]!)
          }
          const { data: affected, error } = await query.select("id")
          if (error) { recordError("PROFILE_WRITE_FAILED"); continue }
          if (!affected || affected.length > 1 || (affected.length === 1 && affected[0].id !== row.id)) fail("WRITE_RECEIPT_INVALID")
          if (affected.length === 1) {
            result.updated++
            for (const field of fields) result.updatedFields[field]++
          } else {
            result.skipped++
            const { data: current, error: rereadError } = await db.from("profiles").select(COLUMNS).eq("id", row.id).maybeSingle()
            if (rereadError) fail("REREAD_FAILED")
            const fresh = current as Profile | null
            if (!fresh) result.skips.deleted++
            else if (FIELDS.some(field => fresh[field] !== row[field])) result.skips.sourceChanged++
            else if (FIELDS.some(field => fresh[`${field}_encrypted`] !== row[`${field}_encrypted`])) result.skips.targetChanged++
            else result.skips.otherChanged++
          }
        }
        if (statusId) {
          const { error } = await db.from("encryption_migration_status").update({ encrypted_records: result.updated, error_count: Object.values(result.errors).reduce((a, b) => a + b, 0), last_error: lastError, updated_at: new Date().toISOString() }).eq("id", statusId)
          if (error) fail("STATUS_WRITE_FAILED")
        }
      }
    } catch (error) { recordError(error instanceof BackfillError ? error.code : "UNEXPECTED_FAILURE") }
  }
  if (statusId) {
    const { error } = await db.from("encryption_migration_status").update({ encrypted_records: result.updated, error_count: Object.values(result.errors).reduce((a, b) => a + b, 0), last_error: lastError, completed_at: Object.keys(result.errors).length || result.skipped ? null : new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", statusId)
    if (error) recordError("STATUS_WRITE_FAILED")
  }
  console.log(JSON.stringify(result))
  // Skips need a fresh reviewed run; a partial apply never reports success.
  if (Object.keys(result.errors).length || result.skipped) process.exitCode = 1
}
main().catch(error => {
  console.log(JSON.stringify({ phase: "failure", code: error instanceof BackfillError ? error.code : "UNEXPECTED_FAILURE" }))
  process.exitCode = 1
})
