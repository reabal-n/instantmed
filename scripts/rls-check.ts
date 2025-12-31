#!/usr/bin/env npx tsx
/* eslint-disable no-console */
/**
 * RLS Policy Verification Script
 * 
 * Tests Row Level Security policies by:
 * 1. Signing in as a normal patient user
 * 2. Testing ALLOWED actions (create own request, view own requests)
 * 3. Testing FORBIDDEN actions (update role, approve request, set payment_status)
 * 
 * Required env vars:
 * - NEXT_PUBLIC_SUPABASE_URL
 * - NEXT_PUBLIC_SUPABASE_ANON_KEY
 * - TEST_USER_EMAIL (patient account email)
 * - TEST_USER_PASSWORD (patient account password)
 * 
 * Usage: npm run check:rls
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js"

// ============================================
// Utilities
// ============================================

interface TestResult {
  name: string
  passed: boolean
  expected: "allow" | "deny"
  actual: "allowed" | "denied"
  error?: string
}

const results: TestResult[] = []

function log(message: string, type: "info" | "pass" | "fail" | "warn" = "info") {
  const icons = { info: "ℹ️ ", pass: "✅", fail: "❌", warn: "⚠️ " }
  console.log(`${icons[type]} ${message}`)
}

async function testAllowed(
  name: string,
  testFn: () => Promise<void>
): Promise<void> {
  try {
    await testFn()
    results.push({ name, passed: true, expected: "allow", actual: "allowed" })
    log(`PASS (allowed): ${name}`, "pass")
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    results.push({ name, passed: false, expected: "allow", actual: "denied", error: errorMessage })
    log(`FAIL (should be allowed): ${name}`, "fail")
    log(`  Error: ${errorMessage}`, "fail")
  }
}

async function testDenied(
  name: string,
  testFn: () => Promise<{ error: { message: string; code?: string } | null }>
): Promise<void> {
  try {
    const { error } = await testFn()
    if (error) {
      // RLS denial - this is expected
      results.push({ name, passed: true, expected: "deny", actual: "denied" })
      log(`PASS (denied): ${name}`, "pass")
      log(`  RLS message: ${error.message}`, "info")
    } else {
      // No error means it was allowed - this is a security issue!
      results.push({ name, passed: false, expected: "deny", actual: "allowed" })
      log(`FAIL (should be denied but was ALLOWED): ${name}`, "fail")
    }
  } catch (error) {
    // Thrown error also means denial
    results.push({ name, passed: true, expected: "deny", actual: "denied" })
    log(`PASS (denied with exception): ${name}`, "pass")
  }
}

// ============================================
// Main Tests
// ============================================

let supabase: SupabaseClient
let userId: string
let profileId: string
let testRequestId: string | null = null

async function setup(): Promise<void> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const testEmail = process.env.TEST_USER_EMAIL
  const testPassword = process.env.TEST_USER_PASSWORD

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY")
  }
  if (!testEmail || !testPassword) {
    throw new Error("Missing TEST_USER_EMAIL or TEST_USER_PASSWORD")
  }

  supabase = createClient(supabaseUrl, supabaseAnonKey)

  // Sign in as test user
  log(`Signing in as ${testEmail}...`, "info")
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: testEmail,
    password: testPassword,
  })

  if (authError || !authData.user) {
    throw new Error(`Failed to sign in: ${authError?.message || "No user returned"}`)
  }

  userId = authData.user.id
  log(`Signed in as user: ${userId}`, "info")

  // Get profile ID
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("auth_user_id", userId)
    .single()

  if (profileError || !profile) {
    throw new Error(`Failed to get profile: ${profileError?.message || "No profile found"}`)
  }

  profileId = profile.id
  log(`Profile ID: ${profileId}, Role: ${profile.role}`, "info")

  if (profile.role !== "patient") {
    throw new Error(`Test user must be a patient, but role is: ${profile.role}`)
  }
}

async function cleanup(): Promise<void> {
  if (testRequestId) {
    // Try to clean up test request (may fail due to RLS, which is fine)
    await supabase.from("requests").delete().eq("id", testRequestId)
    log(`Cleaned up test request: ${testRequestId}`, "info")
  }
}

// ============================================
// ALLOWED Actions (should succeed)
// ============================================

async function testViewOwnProfile(): Promise<void> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", profileId)
    .single()

  if (error) throw new Error(error.message)
  if (!data) throw new Error("No profile returned")
}

async function testCreateOwnRequest(): Promise<void> {
  const { data, error } = await supabase
    .from("requests")
    .insert({
      patient_id: profileId,
      type: "med_cert",
      status: "pending",
      payment_status: "pending_payment",
    })
    .select("id")
    .single()

  if (error) throw new Error(error.message)
  if (!data) throw new Error("No request returned")
  
  testRequestId = data.id
  log(`  Created test request: ${testRequestId}`, "info")
}

async function testViewOwnRequests(): Promise<void> {
  const { data, error } = await supabase
    .from("requests")
    .select("*")
    .eq("patient_id", profileId)

  if (error) throw new Error(error.message)
  if (!data) throw new Error("No requests returned")
  log(`  Found ${data.length} own requests`, "info")
}

async function testUpdateOwnUnpaidRequest(): Promise<void> {
  if (!testRequestId) throw new Error("No test request to update")

  // Patients can update their own unpaid requests (e.g., cancel)
  const { error } = await supabase
    .from("requests")
    .update({ clinical_note: "Patient note" })
    .eq("id", testRequestId)
    .eq("payment_status", "pending_payment")

  if (error) throw new Error(error.message)
}

// ============================================
// FORBIDDEN Actions (should be denied by RLS)
// ============================================

async function testUpdateOwnRole() {
  // Patients should NOT be able to change their role
  return await supabase
    .from("profiles")
    .update({ role: "doctor" })
    .eq("id", profileId)
}

async function testApproveOwnRequest() {
  if (!testRequestId) {
    // Create a dummy result
    return { error: { message: "No test request" } }
  }
  
  // Patients should NOT be able to approve requests
  return await supabase
    .from("requests")
    .update({ status: "approved" })
    .eq("id", testRequestId)
}

async function testSetPaymentStatusPaid() {
  if (!testRequestId) {
    return { error: { message: "No test request" } }
  }
  
  // Patients should NOT be able to mark payment as paid
  return await supabase
    .from("requests")
    .update({ payment_status: "paid" })
    .eq("id", testRequestId)
}

async function testViewOtherUsersRequests() {
  // Patients should NOT see other users' requests
  // We query for requests NOT belonging to this patient
  const { data, error } = await supabase
    .from("requests")
    .select("id")
    .neq("patient_id", profileId)
    .limit(1)

  // If we get data back, RLS failed
  if (!error && data && data.length > 0) {
    return { error: null } // Indicates failure - we could see other users' data
  }
  
  // No data or error means RLS worked
  return { error: { message: "Correctly denied - no other users requests visible" } }
}

async function testInsertPayment() {
  if (!testRequestId) {
    return { error: { message: "No test request" } }
  }
  
  // Patients should NOT be able to insert payments
  return await supabase
    .from("payments")
    .insert({
      request_id: testRequestId,
      stripe_session_id: "fake_session_" + Date.now(),
      amount: 100,
      currency: "aud",
      status: "completed",
    })
}

async function testUpdatePayment() {
  // Patients should NOT be able to update payments
  return await supabase
    .from("payments")
    .update({ status: "completed" })
    .eq("id", "00000000-0000-0000-0000-000000000000") // Fake ID
}

async function testInsertDocument() {
  if (!testRequestId) {
    return { error: { message: "No test request" } }
  }
  
  // Patients should NOT be able to insert documents
  return await supabase
    .from("documents")
    .insert({
      request_id: testRequestId,
      type: "med_cert",
      pdf_url: "https://fake.url/doc.pdf",
    })
}

async function testAccessStripeWebhookEvents() {
  // Patients should NOT be able to access webhook events
  return await supabase
    .from("stripe_webhook_events")
    .select("*")
    .limit(1)
}

async function testSetReviewedBy() {
  if (!testRequestId) {
    return { error: { message: "No test request" } }
  }
  
  // Patients should NOT be able to set reviewed_by
  return await supabase
    .from("requests")
    .update({ reviewed_by: profileId })
    .eq("id", testRequestId)
}

// ============================================
// Main Execution
// ============================================

async function main() {
  console.log("\n" + "=".repeat(60))
  console.log("🔒 RLS POLICY VERIFICATION")
  console.log("=".repeat(60) + "\n")

  // Load environment variables
  try {
    const { config } = await import("dotenv")
    config({ path: ".env.local" })
    config({ path: ".env" })
  } catch {
    // dotenv not available
  }

  try {
    await setup()
  } catch (error) {
    log(`Setup failed: ${error instanceof Error ? error.message : String(error)}`, "fail")
    process.exit(1)
  }

  console.log("\n--- ALLOWED ACTIONS (should succeed) ---\n")
  
  await testAllowed("View own profile", testViewOwnProfile)
  await testAllowed("Create own request", testCreateOwnRequest)
  await testAllowed("View own requests", testViewOwnRequests)
  await testAllowed("Update own unpaid request", testUpdateOwnUnpaidRequest)

  console.log("\n--- FORBIDDEN ACTIONS (should be denied) ---\n")

  await testDenied("Update own role to doctor", testUpdateOwnRole)
  await testDenied("Approve own request", testApproveOwnRequest)
  await testDenied("Set payment_status to paid", testSetPaymentStatusPaid)
  await testDenied("View other users' requests", testViewOtherUsersRequests)
  await testDenied("Insert payment record", testInsertPayment)
  await testDenied("Update payment record", testUpdatePayment)
  await testDenied("Insert document", testInsertDocument)
  await testDenied("Access stripe_webhook_events", testAccessStripeWebhookEvents)
  await testDenied("Set reviewed_by field", testSetReviewedBy)

  // Cleanup
  await cleanup()

  // Summary
  const passed = results.filter(r => r.passed).length
  const failed = results.filter(r => !r.passed).length
  const securityIssues = results.filter(r => !r.passed && r.expected === "deny")

  console.log("\n" + "=".repeat(60))
  console.log("📊 SUMMARY")
  console.log("=".repeat(60))
  console.log(`Total tests: ${results.length}`)
  console.log(`Passed: ${passed}`)
  console.log(`Failed: ${failed}`)
  
  if (securityIssues.length > 0) {
    console.log(`\n🚨 SECURITY ISSUES (forbidden actions that were ALLOWED):`)
    securityIssues.forEach(r => {
      console.log(`  - ${r.name}`)
    })
  }
  
  console.log("=".repeat(60))

  if (failed > 0) {
    console.log("\n❌ RLS CHECK FAILED\n")
    process.exit(1)
  } else {
    console.log("\n✅ RLS CHECK PASSED\n")
    process.exit(0)
  }
}

main().catch(error => {
  console.error("\n💥 Unexpected error:", error)
  process.exit(1)
})
