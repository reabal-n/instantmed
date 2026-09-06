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
 * NODE_OPTIONS=--conditions=react-server corepack pnpm encrypt:backfill --apply --expect=/private/approved-profile-scope.json --batch=50
 * No flags means dry run. --dry-run aliases --dry. Batch bounds: 1..500.
 * Production apply requires a separately approved, exact reviewed dry-run packet.
 */
import { createHmac } from "node:crypto"
import { readFileSync } from "node:fs"

import { createClient, type SupabaseClient } from "@supabase/supabase-js"

import { isLikelyTestPatientIdentity, SEEDED_E2E_PATIENT_PROFILE_IDS } from "../lib/data/seeded-e2e-data"
import { decrypt, encrypt, verifyEncryptionSetup } from "../lib/security/encryption"

const FIELDS = ["date_of_birth", "phone", "medicare_number"] as const
type Field = typeof FIELDS[number]
type Profile = Record<Field | `${Field}_encrypted` | "email" | "full_name" | "phi_encrypted_at", string | null> & { id: string }
const CAS_COLUMNS = ["email", "full_name", "phi_encrypted_at", ...FIELDS.flatMap(field => [field, `${field}_encrypted`])] as (keyof Profile)[]
const COLUMNS = ["id", ...CAS_COLUMNS].join(",")
type Candidate = { row: Profile; fields: Field[] }
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
type ErrorCode = "INVALID_CLI" | "APPROVAL_REQUIRED" | "APPROVAL_INVALID" | "APPROVAL_MISMATCH" | "MISSING_ENV" | "INVALID_KEY" | "READ_FAILED" | "KEY_INCOMPATIBLE" | "KEY_EVIDENCE_MISSING" | "STATUS_WRITE_FAILED" | "PROFILE_WRITE_FAILED" | "WRITE_RECEIPT_INVALID" | "REREAD_FAILED" | "ENCRYPT_FAILED" | "UNEXPECTED_FAILURE"
class BackfillError extends Error {
  constructor(readonly code: ErrorCode) { super(code) }
}
function fail(code: ErrorCode): never { throw new BackfillError(code) }
function options(args: string[]) {
  let apply = false
  let modeSeen = false
  let batchSeen = false
  let batchSize = 50
  let expectationPath: string | undefined
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
    } else if (arg.startsWith("--expect=")) {
      if (expectationPath !== undefined || !arg.slice(9)) fail("INVALID_CLI")
      expectationPath = arg.slice(9)
    } else fail("INVALID_CLI")
  }
  if (apply && !expectationPath) fail("APPROVAL_REQUIRED")
  if (!apply && expectationPath) fail("INVALID_CLI")
  return { apply, batchSize, expectationPath }
}

const TOTAL_KEYS = ["scanned", "excluded", "eligible", "candidates"] as const
const COUNT_KEYS = ["missing", "existing", "decryptable", "parityMismatch", "decryptFailures"] as const
type Expectation = { version: 1; scopeFingerprint: string } & Record<typeof TOTAL_KEYS[number], number> & Record<typeof COUNT_KEYS[number], ReturnType<typeof emptyCounts>>
function exactObject(value: unknown, keys: readonly string[]): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value) && Object.keys(value).sort().join(",") === [...keys].sort().join(",")
}
function isCount(value: unknown): value is number { return typeof value === "number" && Number.isSafeInteger(value) && value >= 0 }
function readExpectation(path: string): Expectation {
  let value: unknown
  try {
    const text = readFileSync(path, "utf8")
    if (Buffer.byteLength(text) > 16384) fail("APPROVAL_INVALID")
    value = JSON.parse(text)
  } catch { fail("APPROVAL_INVALID") }
  if (!exactObject(value, ["version", "scopeFingerprint", ...TOTAL_KEYS, ...COUNT_KEYS]) || value.version !== 1 || typeof value.scopeFingerprint !== "string" || !/^[0-9a-f]{64}$/.test(value.scopeFingerprint)) fail("APPROVAL_INVALID")
  for (const key of TOTAL_KEYS) if (!isCount(value[key])) fail("APPROVAL_INVALID")
  for (const key of COUNT_KEYS) {
    const counts = value[key]
    if (!exactObject(counts, FIELDS) || FIELDS.some(field => !isCount(counts[field]))) fail("APPROVAL_INVALID")
  }
  // Normalize property order; JSON whitespace/key order is not approval scope.
  return {
    version: 1, scopeFingerprint: value.scopeFingerprint,
    ...Object.fromEntries(TOTAL_KEYS.map(key => [key, value[key]])),
    ...Object.fromEntries(COUNT_KEYS.map(key => [key, Object.fromEntries(FIELDS.map(field => [field, (value[key] as Record<Field, number>)[field]]))])),
  } as Expectation
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
  const manifest: Candidate[][] = []
  for await (const rows of pages(db, batchSize, upper)) {
    const candidates: Candidate[] = []
    for (const row of rows) {
      result.scanned++
      if (excluded(row)) { result.excluded++; continue }
      result.eligible++
      const fields = missing(row)
      if (fields.length) { result.candidates++; candidates.push({ row, fields }) }
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
    manifest.push(candidates)
  }
  result.compatible = Object.values(result.decryptable).some(count => count > 0) && Object.values(result.decryptFailures).every(count => count === 0)
  return { result, manifest }
}
function expectationFor(before: Awaited<ReturnType<typeof inspect>>["result"], manifest: Candidate[][], url: string): Expectation {
  // Domain-separated HMAC binds the target and deterministic frozen CAS scope.
  // Only the opaque digest leaves memory; no IDs, values or ciphertext are emitted.
  const hmac = createHmac("sha256", Buffer.from(process.env.ENCRYPTION_KEY!, "base64").subarray(0, 32))
  hmac.update("instantmed:profile-backfill:scope:v1\0")
  hmac.update(JSON.stringify([new URL(url).toString().replace(/\/+$/, ""), manifest.flat().map(({ row, fields }) => [row.id, fields, CAS_COLUMNS.map(column => row[column])])]))
  return {
    version: 1, scopeFingerprint: hmac.digest("hex"),
    ...Object.fromEntries(TOTAL_KEYS.map(key => [key, before[key]])),
    ...Object.fromEntries(COUNT_KEYS.map(key => [key, before[key]])),
  } as Expectation
}

async function main() {
  // Reject flags before environment validation, client creation, or any I/O.
  const { apply, batchSize, expectationPath } = options(process.argv.slice(2))
  // Missing/malformed approval fails before client creation or database reads.
  const approved = expectationPath ? readExpectation(expectationPath) : null
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
  const { result: before, manifest } = await inspect(db, batchSize, upper)
  const expectation = expectationFor(before, manifest, url)
  console.log(JSON.stringify({ phase: "preflight", mode: apply ? "apply" : "dry", batchSize, ...before, expectation }))
  if (!before.compatible) fail(Object.values(before.decryptFailures).some(Boolean) ? "KEY_INCOMPATIBLE" : "KEY_EVIDENCE_MISSING")
  if (apply && JSON.stringify(approved) !== JSON.stringify(expectation)) fail("APPROVAL_MISMATCH")
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
      // Never discover new work after approval: use only preflight snapshots.
      for (const candidates of manifest) {
        for (const { row, fields } of candidates) {
          result.processed++
          // Recheck the frozen ciphertext; CAS rejects any subsequent row change.
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
          for (const column of CAS_COLUMNS) {
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
          const { data: receipt, error } = await db.from("encryption_migration_status").update({ encrypted_records: result.updated, error_count: Object.values(result.errors).reduce((a, b) => a + b, 0), last_error: lastError, updated_at: new Date().toISOString() }).eq("id", statusId).select("id")
          if (error || !receipt || receipt.length !== 1 || receipt[0].id !== statusId) fail("STATUS_WRITE_FAILED")
        }
      }
    } catch (error) { recordError(error instanceof BackfillError ? error.code : "UNEXPECTED_FAILURE") }
  }
  if (statusId) {
    const { data: receipt, error } = await db.from("encryption_migration_status").update({ encrypted_records: result.updated, error_count: Object.values(result.errors).reduce((a, b) => a + b, 0), last_error: lastError, completed_at: Object.keys(result.errors).length || result.skipped ? null : new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", statusId).select("id")
    if (error || !receipt || receipt.length !== 1 || receipt[0].id !== statusId) recordError("STATUS_WRITE_FAILED")
  }
  console.log(JSON.stringify(result))
  // Skips need a fresh reviewed run; a partial apply never reports success.
  if (Object.keys(result.errors).length || result.skipped) process.exitCode = 1
}
main().catch(error => {
  console.log(JSON.stringify({ phase: "failure", code: error instanceof BackfillError ? error.code : "UNEXPECTED_FAILURE" }))
  process.exitCode = 1
})
