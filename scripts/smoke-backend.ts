#!/usr/bin/env npx tsx
/* eslint-disable no-console */
/**
 * Backend Smoke Test Script
 * 
 * Validates critical backend infrastructure:
 * 1. Supabase connectivity (service role)
 * 2. Critical tables exist with expected columns
 * 3. Can query data with joins
 * 4. Doctor queue query works
 * 5. RLS functions exist
 * 
 * Usage: npm run smoke:backend
 * 
 * Note: This is a READ-ONLY test - it does not insert/modify data
 * to be safe for production environments.
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js"

// ============================================
// Configuration
// ============================================

const REQUIRED_TABLES = [
  "profiles",
  "requests", 
  "payments",
  "documents",
  "document_verifications",
  "stripe_webhook_events",
] as const

// Optional tables that may exist depending on the flow used
const OPTIONAL_TABLES = [
  "request_answers",  // Used by newer request flow
  "intake_answers",   // Used by older intake flow
] as const

const EXPECTED_COLUMNS: Record<string, string[]> = {
  profiles: ["id", "auth_user_id", "email", "full_name", "role"],
  requests: ["id", "patient_id", "type", "status", "payment_status", "created_at"],
  payments: ["id", "request_id", "stripe_session_id", "amount", "status"],
  documents: ["id", "request_id", "type", "pdf_url"],
  document_verifications: ["id", "request_id", "verification_code", "is_valid"],
  stripe_webhook_events: ["id", "event_id", "event_type", "processed_at"],
  // Optional tables
  request_answers: ["id", "request_id", "answers"],
  intake_answers: ["id", "intake_id", "answers"],
}

// ============================================
// Utilities
// ============================================

interface TestResult {
  name: string
  passed: boolean
  error?: string
  duration: number
}

const results: TestResult[] = []

function log(message: string, type: "info" | "pass" | "fail" | "warn" = "info") {
  const icons = {
    info: "ℹ️ ",
    pass: "✅",
    fail: "❌",
    warn: "⚠️ ",
  }
  console.log(`${icons[type]} ${message}`)
}

async function runTest(
  name: string,
  testFn: () => Promise<void>
): Promise<boolean> {
  const startTime = Date.now()
  try {
    await testFn()
    const duration = Date.now() - startTime
    results.push({ name, passed: true, duration })
    log(`PASS: ${name} (${duration}ms)`, "pass")
    return true
  } catch (error) {
    const duration = Date.now() - startTime
    const errorMessage = error instanceof Error ? error.message : String(error)
    results.push({ name, passed: false, error: errorMessage, duration })
    log(`FAIL: ${name} (${duration}ms)`, "fail")
    log(`  Error: ${errorMessage}`, "fail")
    if (error instanceof Error && error.stack) {
      log(`  Stack: ${error.stack.split("\n").slice(1, 3).join("\n        ")}`, "fail")
    }
    return false
  }
}

// ============================================
// Test Functions
// ============================================

let supabase: SupabaseClient

async function testSupabaseConnectivity(): Promise<void> {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl) {
    throw new Error("Missing SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL")
  }
  if (!serviceRoleKey) {
    throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY")
  }

  supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  })

  // Test connection with a simple query
  const { error } = await supabase.from("profiles").select("id").limit(1)
  
  if (error) {
    throw new Error(`Supabase connection failed: ${error.message}`)
  }
}

async function testTableExistsWithColumns(tableName: string, expectedColumns: string[]): Promise<void> {
  // Query with specific columns to verify they exist
  const selectColumns = expectedColumns.join(", ")
  const { error } = await supabase
    .from(tableName)
    .select(selectColumns)
    .limit(0)

  if (error) {
    throw new Error(`Table '${tableName}' error: ${error.message} (code: ${error.code})`)
  }
}

async function testCriticalTablesExist(): Promise<void> {
  const failures: string[] = []

  // Test required tables
  for (const table of REQUIRED_TABLES) {
    const columns = EXPECTED_COLUMNS[table] || []
    try {
      await testTableExistsWithColumns(table, columns)
      log(`  ✓ ${table} (${columns.length} columns verified)`, "info")
    } catch (error) {
      failures.push(`${table}: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  // Test optional tables (at least one should exist)
  let hasAnswersTable = false
  for (const table of OPTIONAL_TABLES) {
    const columns = EXPECTED_COLUMNS[table] || []
    try {
      await testTableExistsWithColumns(table, columns)
      log(`  ✓ ${table} (optional, ${columns.length} columns verified)`, "info")
      hasAnswersTable = true
    } catch {
      log(`  - ${table} (optional, not present)`, "info")
    }
  }

  if (!hasAnswersTable) {
    log(`  ⚠ No answers table found (request_answers or intake_answers)`, "warn")
  }

  if (failures.length > 0) {
    throw new Error(`Missing or inaccessible tables/columns:\n  - ${failures.join("\n  - ")}`)
  }
}

async function testDoctorQueueQuery(): Promise<void> {
  // Query the doctor queue - requests that are paid and pending review
  const { data, error } = await supabase
    .from("requests")
    .select(`
      id,
      type,
      status,
      payment_status,
      created_at,
      profiles:patient_id (
        id,
        full_name,
        email
      )
    `)
    .eq("payment_status", "paid")
    .in("status", ["pending", "needs_follow_up"])
    .order("created_at", { ascending: true })
    .limit(10)

  if (error) {
    throw new Error(`Doctor queue query failed: ${error.message}`)
  }

  log(`  Queue has ${data?.length || 0} pending items`, "info")
}

async function testRequestWithJoinsQuery(): Promise<void> {
  // Test that we can query requests with core joins (payments + profiles)
  const { data, error } = await supabase
    .from("requests")
    .select(`
      id,
      type,
      status,
      payment_status,
      payments (
        id,
        stripe_session_id,
        amount,
        status
      ),
      profiles:patient_id (
        id,
        full_name,
        email
      )
    `)
    .limit(1)

  if (error) {
    throw new Error(`Request with joins query failed: ${error.message}`)
  }

  log(`  Join query successful (${data?.length || 0} rows)`, "info")
}

async function testDocumentQueries(): Promise<void> {
  // Test documents table query
  const { error: docError } = await supabase
    .from("documents")
    .select(`
      id,
      request_id,
      type,
      pdf_url,
      verification_code,
      requests (
        id,
        type,
        status
      )
    `)
    .limit(1)

  if (docError) {
    throw new Error(`Documents query failed: ${docError.message}`)
  }

  // Test document_verifications query
  const { error: verifyError } = await supabase
    .from("document_verifications")
    .select(`
      id,
      verification_code,
      document_type,
      is_valid,
      expires_at
    `)
    .limit(1)

  if (verifyError) {
    throw new Error(`Document verifications query failed: ${verifyError.message}`)
  }

  log(`  Documents and verifications queries successful`, "info")
}

async function testStripeWebhookEventsQuery(): Promise<void> {
  const { error } = await supabase
    .from("stripe_webhook_events")
    .select(`
      id,
      event_id,
      event_type,
      processed_at,
      metadata
    `)
    .limit(1)

  if (error) {
    throw new Error(`Stripe webhook events query failed: ${error.message}`)
  }

  log(`  Webhook events table accessible`, "info")
}

async function testRLSFunctionsExist(): Promise<void> {
  // Test that our helper functions exist by calling them
  // Note: These will return false/null since we're using service role without a user context
  
  const functions = ["is_doctor", "is_patient", "get_my_profile_id"]
  const errors: string[] = []

  for (const fn of functions) {
    const { error } = await supabase.rpc(fn)
    // We expect these to work even if they return null/false
    // A "function does not exist" error would indicate a problem
    if (error && error.message.includes("does not exist")) {
      errors.push(`${fn}: ${error.message}`)
    }
  }

  if (errors.length > 0) {
    throw new Error(`Missing RLS functions:\n  - ${errors.join("\n  - ")}`)
  }

  log(`  RLS helper functions exist (${functions.join(", ")})`, "info")
}

async function testPaymentsQuery(): Promise<void> {
  const { data, error } = await supabase
    .from("payments")
    .select(`
      id,
      request_id,
      stripe_session_id,
      amount,
      currency,
      status,
      created_at,
      requests (
        id,
        type,
        patient_id
      )
    `)
    .order("created_at", { ascending: false })
    .limit(5)

  if (error) {
    throw new Error(`Payments query failed: ${error.message}`)
  }

  log(`  Payments query successful (${data?.length || 0} recent payments)`, "info")
}

async function testStorageBucketExists(): Promise<void> {
  const { data, error } = await supabase.storage.listBuckets()

  if (error) {
    throw new Error(`Storage bucket list failed: ${error.message}`)
  }

  const documentsBucket = data?.find(b => b.name === "documents")
  if (!documentsBucket) {
    log(`  Warning: 'documents' storage bucket not found`, "warn")
  } else {
    log(`  Storage bucket 'documents' exists (public: ${documentsBucket.public})`, "info")
  }
}

// ============================================
// Main Execution
// ============================================

async function main() {
  console.log("\n" + "=".repeat(60))
  console.log("🔬 BACKEND SMOKE TEST (Read-Only)")
  console.log("=".repeat(60) + "\n")

  const startTime = Date.now()

  // Load environment variables
  try {
    const { config } = await import("dotenv")
    config({ path: ".env.local" })
    config({ path: ".env" })
  } catch {
    // dotenv not available, rely on existing env vars
  }

  // Run tests in sequence
  await runTest("1. Supabase Connectivity (Service Role)", testSupabaseConnectivity)
  
  // Only continue if we have a connection
  if (results[0]?.passed) {
    await runTest("2. Critical Tables Exist with Expected Columns", testCriticalTablesExist)
    await runTest("3. Request with Joins Query", testRequestWithJoinsQuery)
    await runTest("4. Doctor Queue Query", testDoctorQueueQuery)
    await runTest("5. Documents & Verifications Query", testDocumentQueries)
    await runTest("6. Payments Query", testPaymentsQuery)
    await runTest("7. Stripe Webhook Events Query", testStripeWebhookEventsQuery)
    await runTest("8. RLS Helper Functions Exist", testRLSFunctionsExist)
    await runTest("9. Storage Bucket Check", testStorageBucketExists)
  }

  // Summary
  const totalDuration = Date.now() - startTime
  const passed = results.filter(r => r.passed).length
  const failed = results.filter(r => !r.passed).length

  console.log("\n" + "=".repeat(60))
  console.log("📊 SUMMARY")
  console.log("=".repeat(60))
  console.log(`Total tests: ${results.length}`)
  console.log(`Passed: ${passed}`)
  console.log(`Failed: ${failed}`)
  console.log(`Duration: ${totalDuration}ms`)
  console.log("=".repeat(60))

  if (failed > 0) {
    console.log("\n❌ SMOKE TEST FAILED\n")
    console.log("Failed tests:")
    results
      .filter(r => !r.passed)
      .forEach(r => {
        console.log(`  - ${r.name}`)
        console.log(`    Error: ${r.error}`)
      })
    process.exit(1)
  } else {
    console.log("\n✅ SMOKE TEST PASSED\n")
    process.exit(0)
  }
}

main().catch(error => {
  console.error("\n💥 Unexpected error:", error)
  process.exit(1)
})
