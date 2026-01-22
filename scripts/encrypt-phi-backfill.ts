#!/usr/bin/env npx tsx
/* eslint-disable no-console */
/**
 * PHI Encryption Backfill Script
 *
 * Encrypts existing plaintext PHI fields in the profiles table:
 * - medicare_number -> medicare_number_encrypted
 * - date_of_birth -> date_of_birth_encrypted
 * - phone -> phone_encrypted
 *
 * Features:
 * - Batch processing (configurable batch size)
 * - Progress tracking in encryption_migration_status table
 * - Idempotent (skips already-encrypted records)
 * - Dry-run mode for testing
 * - Resume support (continues from where it left off)
 *
 * Required env vars:
 * - NEXT_PUBLIC_SUPABASE_URL
 * - SUPABASE_SERVICE_ROLE_KEY
 * - ENCRYPTION_KEY (32-byte base64 encoded key)
 *
 * Usage:
 *   npm run encrypt:backfill           # Production run
 *   npm run encrypt:backfill -- --dry  # Dry run (no changes)
 *   npm run encrypt:backfill -- --batch=100  # Custom batch size
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js"
import {
  encrypt,
  isEncrypted,
  verifyEncryptionSetup,
} from "../lib/security/encryption"

// ============================================
// Configuration
// ============================================

const DEFAULT_BATCH_SIZE = 50
const TABLE_NAME = "profiles"

interface Profile {
  id: string
  medicare_number: string | null
  medicare_number_encrypted: string | null
  date_of_birth: string | null
  date_of_birth_encrypted: string | null
  phone: string | null
  phone_encrypted: string | null
  phi_encrypted_at: string | null
}

interface MigrationStatus {
  id: string
  table_name: string
  total_records: number
  encrypted_records: number
  started_at: string
  completed_at: string | null
  error_count: number
  last_error: string | null
}

// ============================================
// CLI Arguments
// ============================================

const args = process.argv.slice(2)
const isDryRun = args.includes("--dry") || args.includes("--dry-run")
const batchArg = args.find((a) => a.startsWith("--batch="))
const batchSize = batchArg
  ? parseInt(batchArg.split("=")[1], 10)
  : DEFAULT_BATCH_SIZE

// ============================================
// Utilities
// ============================================

function log(
  message: string,
  type: "info" | "success" | "warn" | "error" = "info"
) {
  const icons = { info: "  ", success: "✅", warn: "⚠️ ", error: "❌" }
  const timestamp = new Date().toISOString().slice(11, 19)
  console.log(`[${timestamp}] ${icons[type]} ${message}`)
}

function formatProgress(current: number, total: number): string {
  const percent = total > 0 ? Math.round((current / total) * 100) : 0
  const bar = "█".repeat(Math.floor(percent / 5)) + "░".repeat(20 - Math.floor(percent / 5))
  return `[${bar}] ${percent}% (${current}/${total})`
}

// ============================================
// Main Script
// ============================================

async function main() {
  console.log("\n" + "=".repeat(60))
  console.log("🔐 PHI ENCRYPTION BACKFILL")
  console.log("=".repeat(60))
  console.log(`Mode: ${isDryRun ? "DRY RUN (no changes)" : "PRODUCTION"}`)
  console.log(`Batch size: ${batchSize}`)
  console.log("=".repeat(60) + "\n")

  // Load environment variables
  try {
    const { config } = await import("dotenv")
    config({ path: ".env.local" })
    config({ path: ".env" })
  } catch {
    // dotenv not available
  }

  // Verify required environment variables
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const encryptionKey = process.env.ENCRYPTION_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    log(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY",
      "error"
    )
    process.exit(1)
  }

  if (!encryptionKey) {
    log("Missing ENCRYPTION_KEY environment variable", "error")
    log(
      "Generate one with: node -e \"console.log(require('crypto').randomBytes(32).toString('base64'))\"",
      "info"
    )
    process.exit(1)
  }

  // Verify encryption setup
  log("Verifying encryption setup...", "info")
  const encryptionCheck = verifyEncryptionSetup()
  if (!encryptionCheck.valid) {
    log(`Encryption setup failed: ${encryptionCheck.error}`, "error")
    process.exit(1)
  }
  log("Encryption setup verified", "success")

  // Create Supabase client
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  })

  // Get total count of profiles needing encryption
  log("Counting profiles needing encryption...", "info")
  const { count: totalCount, error: countError } = await supabase
    .from(TABLE_NAME)
    .select("*", { count: "exact", head: true })
    .is("phi_encrypted_at", null)
    .or(
      "medicare_number.not.is.null,date_of_birth.not.is.null,phone.not.is.null"
    )

  if (countError) {
    log(`Failed to count profiles: ${countError.message}`, "error")
    process.exit(1)
  }

  const total = totalCount || 0
  log(`Found ${total} profiles needing encryption`, "info")

  if (total === 0) {
    log("No profiles need encryption. Migration complete!", "success")
    process.exit(0)
  }

  // Initialize migration status
  let migrationStatusId: string | null = null
  if (!isDryRun) {
    const { data: statusData, error: statusError } = await supabase
      .from("encryption_migration_status")
      .insert({
        table_name: TABLE_NAME,
        total_records: total,
        encrypted_records: 0,
      })
      .select("id")
      .single()

    if (statusError) {
      log(
        `Warning: Could not create migration status record: ${statusError.message}`,
        "warn"
      )
    } else {
      migrationStatusId = statusData.id
    }
  }

  // Process profiles in batches
  let processed = 0
  let encrypted = 0
  let errors = 0
  let lastError: string | null = null
  let offset = 0

  while (processed < total) {
    // Fetch batch of profiles
    const { data: profiles, error: fetchError } = await supabase
      .from(TABLE_NAME)
      .select(
        "id, medicare_number, medicare_number_encrypted, date_of_birth, date_of_birth_encrypted, phone, phone_encrypted, phi_encrypted_at"
      )
      .is("phi_encrypted_at", null)
      .or(
        "medicare_number.not.is.null,date_of_birth.not.is.null,phone.not.is.null"
      )
      .range(offset, offset + batchSize - 1)

    if (fetchError) {
      log(`Failed to fetch profiles: ${fetchError.message}`, "error")
      lastError = fetchError.message
      errors++
      break
    }

    if (!profiles || profiles.length === 0) {
      break
    }

    // Process each profile in the batch
    for (const profile of profiles as Profile[]) {
      try {
        const updates: Record<string, string | null> = {}
        let needsUpdate = false

        // Encrypt medicare_number if present and not already encrypted
        if (
          profile.medicare_number &&
          !profile.medicare_number_encrypted
        ) {
          updates.medicare_number_encrypted = encrypt(profile.medicare_number)
          needsUpdate = true
        }

        // Encrypt date_of_birth if present and not already encrypted
        if (
          profile.date_of_birth &&
          !profile.date_of_birth_encrypted
        ) {
          updates.date_of_birth_encrypted = encrypt(profile.date_of_birth)
          needsUpdate = true
        }

        // Encrypt phone if present and not already encrypted
        if (profile.phone && !profile.phone_encrypted) {
          updates.phone_encrypted = encrypt(profile.phone)
          needsUpdate = true
        }

        if (needsUpdate) {
          updates.phi_encrypted_at = new Date().toISOString()

          if (!isDryRun) {
            const { error: updateError } = await supabase
              .from(TABLE_NAME)
              .update(updates)
              .eq("id", profile.id)

            if (updateError) {
              throw new Error(updateError.message)
            }
          }

          encrypted++
        }

        processed++
      } catch (error) {
        errors++
        lastError = error instanceof Error ? error.message : String(error)
        log(`Error encrypting profile ${profile.id}: ${lastError}`, "error")
        processed++
      }

      // Update progress
      if (processed % 10 === 0 || processed === total) {
        process.stdout.write(`\r${formatProgress(processed, total)}`)
      }
    }

    // Update migration status
    if (!isDryRun && migrationStatusId) {
      await supabase
        .from("encryption_migration_status")
        .update({
          encrypted_records: encrypted,
          error_count: errors,
          last_error: lastError,
          updated_at: new Date().toISOString(),
        })
        .eq("id", migrationStatusId)
    }

    // Move to next batch
    // Note: We don't increment offset because we're filtering by phi_encrypted_at IS NULL
    // Records that get encrypted will no longer match the filter
  }

  // Mark migration as complete
  if (!isDryRun && migrationStatusId) {
    await supabase
      .from("encryption_migration_status")
      .update({
        encrypted_records: encrypted,
        error_count: errors,
        last_error: lastError,
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", migrationStatusId)
  }

  // Summary
  console.log("\n\n" + "=".repeat(60))
  console.log("📊 MIGRATION SUMMARY")
  console.log("=".repeat(60))
  console.log(`Mode: ${isDryRun ? "DRY RUN" : "PRODUCTION"}`)
  console.log(`Total profiles processed: ${processed}`)
  console.log(`Successfully encrypted: ${encrypted}`)
  console.log(`Errors: ${errors}`)
  if (lastError) {
    console.log(`Last error: ${lastError}`)
  }
  console.log("=".repeat(60))

  if (errors > 0) {
    log("Migration completed with errors", "warn")
    process.exit(1)
  } else {
    log("Migration completed successfully!", "success")
    process.exit(0)
  }
}

main().catch((error) => {
  console.error("\n💥 Unexpected error:", error)
  process.exit(1)
})
