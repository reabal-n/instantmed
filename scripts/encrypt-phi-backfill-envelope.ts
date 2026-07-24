#!/usr/bin/env npx tsx
/* eslint-disable no-console */
/**
 * INITIAL BACKFILL ONLY — NOT KEY ROTATION.
 *
 * Envelope-encryption (PHI_MASTER_KEY) backfill for the two field pairs the
 * profiles-only encrypt-phi-backfill.ts script does not cover:
 *
 *   intake_answers:  answers (JSONB)  -> answers_encrypted (+ encryption_metadata)
 *   intakes:         doctor_notes     -> doctor_notes_enc
 *
 * Context (2026-07-24): the live checkout paths bypassed the answers
 * encryption seam entirely, so every production intake_answers row was
 * plaintext-only. The write fix routes new inserts through
 * buildAnswersInsertColumns; this script encrypts the historical rows.
 *
 * Safety properties:
 * - Idempotent: only touches rows where the encrypted column IS NULL.
 * - Never modifies plaintext columns.
 * - Key-match preflight: decrypts one PROD-written doctor_notes_enc envelope
 *   before writing anything, proving the local PHI_MASTER_KEY matches the key
 *   production ciphertext was written with. Aborts hard on mismatch.
 * - --verify mode decrypts every envelope and compares against plaintext,
 *   printing counts only (never PHI values).
 *
 * Usage:
 *   npx tsx scripts/encrypt-phi-backfill-envelope.ts --dry     # report only
 *   npx tsx scripts/encrypt-phi-backfill-envelope.ts           # backfill
 *   npx tsx scripts/encrypt-phi-backfill-envelope.ts --verify  # parity check
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js"

import { SEEDED_E2E_PATIENT_PROFILE_ID } from "../lib/data/seeded-e2e-data"
import {
  decryptJSONB,
  decryptPHI,
  type EncryptedPHI,
  encryptJSONB,
  encryptPHI,
  isEncryptedPHI,
} from "../lib/security/phi-encryption"

/**
 * Seeded E2E fixture intakes are synthetic, not PHI, and CI runs with a
 * different PHI_MASTER_KEY: a production-key envelope on a fixture makes every
 * CI read log a decrypt failure (broke the checkout-resume spec's
 * zero-console-errors guard on 2026-07-24). Resolved as an explicit id set
 * because PostgREST cannot pattern-match uuid columns.
 */
async function getSeededIntakeIds(supabase: SupabaseClient): Promise<string[]> {
  const { data, error } = await supabase
    .from("intakes")
    .select("id")
    .eq("patient_id", SEEDED_E2E_PATIENT_PROFILE_ID)
  if (error) {
    log(`Failed to resolve seeded fixture intakes: ${error.message}`, "error")
    process.exit(1)
  }
  return (data ?? []).map((row) => row.id as string)
}

const notInSeeded = (ids: string[]) => `(${ids.join(",")})`

const args = process.argv.slice(2)
const isDryRun = args.includes("--dry") || args.includes("--dry-run")
const isVerify = args.includes("--verify")
// Re-encrypts rows whose envelope decrypts to a DIFFERENT value than the
// current plaintext. Only valid while plaintext is still the write target of
// record (dual-write phase): the historical bypass writers updated plaintext
// without touching the envelope, so plaintext is the truth for those rows.
const isRepair = args.includes("--repair-mismatches")
const BATCH = 50

function log(message: string, type: "info" | "success" | "warn" | "error" = "info") {
  const icons = { info: "  ", success: "✅", warn: "⚠️ ", error: "❌" }
  console.log(`[${new Date().toISOString().slice(11, 19)}] ${icons[type]} ${message}`)
}

async function keyMatchPreflight(supabase: SupabaseClient): Promise<void> {
  const { data, error } = await supabase
    .from("intakes")
    .select("id, doctor_notes_enc")
    .not("doctor_notes_enc", "is", null)
    .limit(1)

  if (error || !data?.length) {
    log("Preflight: no existing doctor_notes_enc envelope found to test against", "error")
    process.exit(1)
  }

  const envelope = data[0].doctor_notes_enc as EncryptedPHI
  if (!isEncryptedPHI(envelope)) {
    log("Preflight: stored envelope shape unrecognised", "error")
    process.exit(1)
  }

  try {
    await decryptPHI(envelope)
    log(`Preflight: local PHI_MASTER_KEY decrypts production ciphertext (intake ${data[0].id})`, "success")
  } catch {
    log("Preflight FAILED: local PHI_MASTER_KEY does not match production ciphertext. Aborting.", "error")
    process.exit(1)
  }
}

async function backfillAnswers(supabase: SupabaseClient, seededIds: string[]): Promise<void> {
  let done = 0
  let failed = 0
  for (;;) {
    let pageQuery = supabase
      .from("intake_answers")
      .select("id, answers")
      .not("answers", "is", null)
      .is("answers_encrypted", null)
      .order("id")
      .limit(BATCH)
    if (seededIds.length) pageQuery = pageQuery.not("intake_id", "in", notInSeeded(seededIds))
    const { data, error } = await pageQuery
    if (error) {
      log(`intake_answers page fetch failed: ${error.message}`, "error")
      process.exit(1)
    }
    if (!data?.length) break

    for (const row of data) {
      if (isDryRun) {
        done++
        continue
      }
      try {
        const encrypted = await encryptJSONB(row.answers as Record<string, unknown>)
        const { error: updateError } = await supabase
          .from("intake_answers")
          .update({
            answers_encrypted: encrypted,
            encryption_metadata: {
              keyId: encrypted.keyId,
              version: encrypted.version,
              encryptedAt: new Date().toISOString(),
              source: "backfill_envelope_20260724",
            },
          })
          .eq("id", row.id)
          .is("answers_encrypted", null)
        if (updateError) throw new Error(updateError.message)
        done++
      } catch (e) {
        failed++
        log(`intake_answers ${row.id} failed: ${e instanceof Error ? e.message : String(e)}`, "error")
      }
    }
    if (isDryRun) break // one page is enough to size a dry run; count reported below
  }

  if (isDryRun) {
    let countQuery = supabase
      .from("intake_answers")
      .select("id", { count: "exact", head: true })
      .not("answers", "is", null)
      .is("answers_encrypted", null)
    if (seededIds.length) countQuery = countQuery.not("intake_id", "in", notInSeeded(seededIds))
    const { count } = await countQuery
    log(`DRY RUN: intake_answers rows needing encryption: ${count ?? "?"}`, "info")
  } else {
    log(`intake_answers backfill: ${done} encrypted, ${failed} failed`, failed ? "warn" : "success")
  }
}

async function backfillDoctorNotes(supabase: SupabaseClient, seededIds: string[]): Promise<void> {
  let dnQuery = supabase
    .from("intakes")
    .select("id, doctor_notes")
    .not("doctor_notes", "is", null)
    .is("doctor_notes_enc", null)
    .order("id")
    .limit(500)
  if (seededIds.length) dnQuery = dnQuery.not("id", "in", notInSeeded(seededIds))
  const { data, error } = await dnQuery
  if (error) {
    log(`intakes fetch failed: ${error.message}`, "error")
    process.exit(1)
  }
  if (!data?.length) {
    log("doctor_notes: nothing to backfill", "success")
    return
  }
  if (isDryRun) {
    log(`DRY RUN: intakes rows needing doctor_notes encryption: ${data.length}`, "info")
    return
  }

  let done = 0
  let failed = 0
  for (const row of data) {
    try {
      const encrypted = await encryptPHI(row.doctor_notes as string)
      const { error: updateError } = await supabase
        .from("intakes")
        .update({ doctor_notes_enc: encrypted })
        .eq("id", row.id)
        .is("doctor_notes_enc", null)
      if (updateError) throw new Error(updateError.message)
      done++
    } catch (e) {
      failed++
      log(`intakes ${row.id} failed: ${e instanceof Error ? e.message : String(e)}`, "error")
    }
  }
  log(`doctor_notes backfill: ${done} encrypted, ${failed} failed`, failed ? "warn" : "success")
}

async function verifyParity(supabase: SupabaseClient, seededIds: string[]): Promise<void> {
  // intake_answers: decrypt every envelope, deep-compare to plaintext.
  let ansChecked = 0
  let ansMismatch = 0
  let ansUndecryptable = 0
  let lastId: string | null = null
  for (;;) {
    let query = supabase
      .from("intake_answers")
      .select("id, answers, answers_encrypted")
      .not("answers", "is", null)
      .not("answers_encrypted", "is", null)
      .order("id")
      .limit(BATCH)
    if (seededIds.length) query = query.not("intake_id", "in", notInSeeded(seededIds))
    if (lastId) query = query.gt("id", lastId)
    const { data, error } = await query
    if (error) {
      log(`verify page fetch failed: ${error.message}`, "error")
      process.exit(1)
    }
    if (!data?.length) break
    for (const row of data) {
      ansChecked++
      try {
        const decrypted = await decryptJSONB<Record<string, unknown>>(
          row.answers_encrypted as EncryptedPHI,
        )
        if (JSON.stringify(decrypted) !== JSON.stringify(row.answers)) ansMismatch++
      } catch {
        ansUndecryptable++
      }
    }
    lastId = data[data.length - 1].id as string
  }

  // doctor_notes: decrypt and string-compare.
  let dnChecked = 0
  let dnMismatch = 0
  let dnUndecryptable = 0
  let dnRepaired = 0
  let dnVerifyQuery = supabase
    .from("intakes")
    .select("id, doctor_notes, doctor_notes_enc")
    .not("doctor_notes", "is", null)
    .not("doctor_notes_enc", "is", null)
    .limit(1000)
  if (seededIds.length) dnVerifyQuery = dnVerifyQuery.not("id", "in", notInSeeded(seededIds))
  const { data: dnRows, error: dnError } = await dnVerifyQuery
  if (dnError) {
    log(`doctor_notes verify fetch failed: ${dnError.message}`, "error")
    process.exit(1)
  }
  for (const row of dnRows ?? []) {
    dnChecked++
    try {
      const decrypted = await decryptPHI(row.doctor_notes_enc as EncryptedPHI)
      if (decrypted !== row.doctor_notes) {
        dnMismatch++
        log(`doctor_notes stale envelope on intake ${row.id}`, "warn")
        if (isRepair) {
          const fresh = await encryptPHI(row.doctor_notes as string)
          const { error: repairError } = await supabase
            .from("intakes")
            .update({ doctor_notes_enc: fresh })
            .eq("id", row.id)
          if (repairError) {
            log(`repair failed for ${row.id}: ${repairError.message}`, "error")
          } else {
            dnRepaired++
          }
        }
      }
    } catch {
      dnUndecryptable++
    }
  }
  if (isRepair) log(`doctor_notes repaired: ${dnRepaired}/${dnMismatch}`, dnRepaired === dnMismatch ? "success" : "warn")

  let ansRemainingQuery = supabase
    .from("intake_answers")
    .select("id", { count: "exact", head: true })
    .not("answers", "is", null)
    .is("answers_encrypted", null)
  if (seededIds.length) ansRemainingQuery = ansRemainingQuery.not("intake_id", "in", notInSeeded(seededIds))
  const { count: ansRemaining } = await ansRemainingQuery
  let dnRemainingQuery = supabase
    .from("intakes")
    .select("id", { count: "exact", head: true })
    .not("doctor_notes", "is", null)
    .is("doctor_notes_enc", null)
  if (seededIds.length) dnRemainingQuery = dnRemainingQuery.not("id", "in", notInSeeded(seededIds))
  const { count: dnRemaining } = await dnRemainingQuery

  log(`PARITY intake_answers: checked=${ansChecked} mismatch=${ansMismatch} undecryptable=${ansUndecryptable} still_unencrypted=${ansRemaining ?? "?"}`,
    ansMismatch || ansUndecryptable || (ansRemaining ?? 1) ? "warn" : "success")
  log(`PARITY doctor_notes: checked=${dnChecked} mismatch=${dnMismatch} undecryptable=${dnUndecryptable} still_unencrypted=${dnRemaining ?? "?"}`,
    dnMismatch || dnUndecryptable || (dnRemaining ?? 1) ? "warn" : "success")

  if (ansMismatch || ansUndecryptable || dnMismatch || dnUndecryptable) process.exitCode = 2
}

async function main() {
  try {
    const { config } = await import("dotenv")
    config({ path: ".env.local" })
    config({ path: ".env" })
  } catch {
    // dotenv not available
  }

  console.log("\n" + "=".repeat(60))
  console.log("🔐 PHI ENVELOPE BACKFILL (answers + doctor_notes)")
  console.log(`Mode: ${isVerify ? "VERIFY" : isDryRun ? "DRY RUN" : "PRODUCTION"}`)
  console.log("=".repeat(60) + "\n")

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !supabaseServiceKey) {
    log("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY", "error")
    process.exit(1)
  }
  if (!process.env.PHI_MASTER_KEY) {
    log("Missing PHI_MASTER_KEY", "error")
    process.exit(1)
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  })

  await keyMatchPreflight(supabase)

  const seededIds = await getSeededIntakeIds(supabase)
  log(`Excluding ${seededIds.length} seeded E2E fixture intake(s)`, "info")

  if (isVerify || isRepair) {
    await verifyParity(supabase, seededIds)
    return
  }

  await backfillAnswers(supabase, seededIds)
  await backfillDoctorNotes(supabase, seededIds)
  log("Done. Run with --verify for the parity report.", "info")
}

main().catch((e) => {
  log(`Fatal: ${e instanceof Error ? e.message : String(e)}`, "error")
  process.exit(1)
})
