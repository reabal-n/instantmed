#!/usr/bin/env npx tsx
/* eslint-disable no-console */
/**
 * Stripe Test-Mode Smoke Test Script
 * 
 * Walks through each consult subtype using Stripe test mode and records:
 * - Stripe session IDs
 * - Intake IDs
 * - Payment status updates
 * - Doctor queue visibility
 * 
 * Usage:
 *   npx tsx scripts/stripe-smoke-test.ts
 * 
 * Prerequisites:
 * - STRIPE_SECRET_KEY must be a test-mode key (starts with sk_test_)
 * - Supabase credentials configured
 * - Run against local dev or staging environment
 * 
 * This is a DEV-ONLY script for manual verification before production release.
 */

import { createClient } from "@supabase/supabase-js"
import Stripe from "stripe"

// ============================================================================
// Configuration
// ============================================================================

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error("❌ Missing Supabase credentials")
  console.error("   Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY")
  process.exit(1)
}

if (!STRIPE_SECRET_KEY) {
  console.error("❌ Missing STRIPE_SECRET_KEY")
  process.exit(1)
}

if (!STRIPE_SECRET_KEY.startsWith("sk_test_")) {
  console.error("❌ STRIPE_SECRET_KEY must be a test-mode key (starts with sk_test_)")
  console.error("   DO NOT run this script with production keys!")
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
const stripe = new Stripe(STRIPE_SECRET_KEY)

// ============================================================================
// Consult Subtypes to Test
// ============================================================================

interface SubtypeTest {
  subtype: string
  label: string
  priceEnvVar: string
  expectedPriceId: string | undefined
}

const CONSULT_SUBTYPES: SubtypeTest[] = [
  {
    subtype: "general",
    label: "General Consult",
    priceEnvVar: "STRIPE_PRICE_CONSULT",
    expectedPriceId: process.env.STRIPE_PRICE_CONSULT,
  },
  {
    subtype: "new_medication",
    label: "New Medication",
    priceEnvVar: "STRIPE_PRICE_CONSULT",
    expectedPriceId: process.env.STRIPE_PRICE_CONSULT,
  },
  {
    subtype: "ed",
    label: "ED Treatment",
    priceEnvVar: "STRIPE_PRICE_CONSULT_ED",
    expectedPriceId: process.env.STRIPE_PRICE_CONSULT_ED || process.env.STRIPE_PRICE_CONSULT,
  },
  {
    subtype: "hair_loss",
    label: "Hair Loss",
    priceEnvVar: "STRIPE_PRICE_CONSULT_HAIR_LOSS",
    expectedPriceId: process.env.STRIPE_PRICE_CONSULT_HAIR_LOSS || process.env.STRIPE_PRICE_CONSULT,
  },
  {
    subtype: "womens_health",
    label: "Women's Health",
    priceEnvVar: "STRIPE_PRICE_CONSULT_WOMENS_HEALTH",
    expectedPriceId: process.env.STRIPE_PRICE_CONSULT_WOMENS_HEALTH || process.env.STRIPE_PRICE_CONSULT,
  },
  {
    subtype: "weight_loss",
    label: "Weight Loss",
    priceEnvVar: "STRIPE_PRICE_CONSULT_WEIGHT_LOSS",
    expectedPriceId: process.env.STRIPE_PRICE_CONSULT_WEIGHT_LOSS || process.env.STRIPE_PRICE_CONSULT,
  },
]

// ============================================================================
// Main Test Runner
// ============================================================================

interface TestResult {
  subtype: string
  label: string
  priceId: string | null
  priceValid: boolean
  stripeSessionId: string | null
  intakeId: string | null
  intakeStatus: string | null
  paymentStatus: string | null
  doctorQueueVisible: boolean
  errors: string[]
}

async function verifyPriceExists(priceId: string): Promise<{ valid: boolean; amount?: number; error?: string }> {
  try {
    const price = await stripe.prices.retrieve(priceId)
    return { valid: true, amount: price.unit_amount || 0 }
  } catch (error) {
    return { valid: false, error: error instanceof Error ? error.message : "Unknown error" }
  }
}

async function findRecentIntake(subtype: string): Promise<{
  id: string
  status: string
  payment_status: string
  stripe_session_id: string | null
} | null> {
  const { data, error } = await supabase
    .from("intakes")
    .select("id, status, payment_status, stripe_session_id, subtype")
    .eq("category", "consult")
    .eq("subtype", subtype)
    .order("created_at", { ascending: false })
    .limit(1)
    .single()

  if (error || !data) return null
  return data
}

async function checkDoctorQueueVisibility(intakeId: string): Promise<boolean> {
  // Check if intake appears in the doctor's pending queue
  const { data, error } = await supabase
    .from("intakes")
    .select("id, status, assigned_doctor_id")
    .eq("id", intakeId)
    .in("status", ["pending_review", "in_review", "pending_payment"])
    .single()

  return !error && !!data
}

async function runSubtypeTest(test: SubtypeTest): Promise<TestResult> {
  const result: TestResult = {
    subtype: test.subtype,
    label: test.label,
    priceId: test.expectedPriceId || null,
    priceValid: false,
    stripeSessionId: null,
    intakeId: null,
    intakeStatus: null,
    paymentStatus: null,
    doctorQueueVisible: false,
    errors: [],
  }

  // 1. Verify price ID exists in Stripe
  if (!test.expectedPriceId) {
    result.errors.push(`Missing ${test.priceEnvVar} environment variable`)
  } else {
    const priceCheck = await verifyPriceExists(test.expectedPriceId)
    result.priceValid = priceCheck.valid
    if (!priceCheck.valid) {
      result.errors.push(`Price ID ${test.expectedPriceId} not found: ${priceCheck.error}`)
    }
  }

  // 2. Find recent intake for this subtype
  const intake = await findRecentIntake(test.subtype)
  if (intake) {
    result.intakeId = intake.id
    result.intakeStatus = intake.status
    result.paymentStatus = intake.payment_status
    result.stripeSessionId = intake.stripe_session_id

    // 3. Check doctor queue visibility
    result.doctorQueueVisible = await checkDoctorQueueVisibility(intake.id)
  }

  return result
}

async function printResults(results: TestResult[]): Promise<void> {
  console.log("\n" + "=".repeat(80))
  console.log("STRIPE SMOKE TEST RESULTS")
  console.log("=".repeat(80) + "\n")

  let allPassed = true

  for (const r of results) {
    const priceStatus = r.priceValid ? "✅" : "❌"
    const intakeStatus = r.intakeId ? "✅" : "⚠️"
    const queueStatus = r.doctorQueueVisible ? "✅" : "⚠️"

    console.log(`📋 ${r.label} (${r.subtype})`)
    console.log(`   ${priceStatus} Price ID: ${r.priceId || "NOT SET"}`)
    console.log(`   ${intakeStatus} Recent Intake: ${r.intakeId || "None found"}`)
    if (r.intakeId) {
      console.log(`      Status: ${r.intakeStatus}`)
      console.log(`      Payment: ${r.paymentStatus}`)
      console.log(`      Stripe Session: ${r.stripeSessionId || "N/A"}`)
    }
    console.log(`   ${queueStatus} Doctor Queue: ${r.doctorQueueVisible ? "Visible" : "Not visible"}`)

    if (r.errors.length > 0) {
      allPassed = false
      console.log(`   ❌ Errors:`)
      r.errors.forEach((e) => console.log(`      - ${e}`))
    }
    console.log()
  }

  console.log("=".repeat(80))
  if (allPassed) {
    console.log("✅ All price IDs valid and configured correctly")
  } else {
    console.log("❌ Some issues found - see errors above")
  }
  console.log("=".repeat(80))

  // Print manual testing checklist
  console.log("\n📝 MANUAL VERIFICATION CHECKLIST:")
  console.log("─".repeat(40))
  console.log("For each subtype, manually verify:")
  console.log("  1. Navigate to /request?service=consult&subtype=<subtype>")
  console.log("  2. Complete the flow to checkout step")
  console.log("  3. Verify price label matches expected")
  console.log("  4. Complete Stripe test payment (card: 4242 4242 4242 4242)")
  console.log("  5. Verify intake appears in doctor queue")
  console.log("  6. Verify subtype badge visible in intake detail")
  console.log("  7. Verify webhook updates payment_status to 'paid'")
  console.log()
  console.log("Stripe test cards: https://stripe.com/docs/testing#cards")
  console.log()
}

async function main(): Promise<void> {
  console.log("🧪 Stripe Test-Mode Smoke Test")
  console.log("─".repeat(40))
  console.log(`Stripe Mode: ${STRIPE_SECRET_KEY?.startsWith("sk_test_") ? "TEST ✅" : "LIVE ❌"}`)
  console.log(`Supabase URL: ${SUPABASE_URL}`)
  console.log()

  const results: TestResult[] = []

  for (const test of CONSULT_SUBTYPES) {
    console.log(`Testing ${test.label}...`)
    const result = await runSubtypeTest(test)
    results.push(result)
  }

  await printResults(results)
}

main().catch((error) => {
  console.error("Fatal error:", error)
  process.exit(1)
})
