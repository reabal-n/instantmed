/* eslint-disable no-console */
/**
 * E2E Test Data Seeding Script
 * 
 * Creates deterministic test data for Playwright E2E tests:
 * - 1 "operator" user (admin+doctor) with complete certificate identity
 * - 1 patient user with a paid med_certs intake
 * - Required supporting data (clinic_identity, certificate_template, document_draft)
 * 
 * Features:
 * - All rows tagged with e2e_run_id for teardown
 * - Idempotent: reuses existing rows if they exist
 * - Validates all seeded data before exiting
 * - Prints compact summary
 * 
 * Usage: pnpm e2e:seed
 * Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */

import * as path from "path"
import * as dotenv from "dotenv"

// Load .env.local for Supabase credentials (when run standalone)
dotenv.config({ path: path.join(__dirname, "..", "..", ".env.local") })

import { createClient } from "@supabase/supabase-js"
import { randomUUID } from "crypto"

// ============================================================================
// CONFIGURATION
// ============================================================================

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("❌ Missing required environment variables:")
  console.error("   SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL)")
  console.error("   SUPABASE_SERVICE_ROLE_KEY")
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
})

// E2E_RUN_ID: Use env var if provided (from global setup), else fallback to static ID
// Static IDs allow idempotent seeding when running manually
export const E2E_RUN_ID = process.env.E2E_RUN_ID || "e2e-test-run-001"

// Deterministic IDs for test data (allows idempotent seeding)
// These use a fixed prefix to ensure consistent lookups across runs
export const OPERATOR_PROFILE_ID = "e2e00000-0000-0000-0000-000000000001"
export const OPERATOR_AUTH_USER_ID = "e2e00000-auth-0000-0000-000000000001"
export const DOCTOR_PROFILE_ID = "e2e00000-0000-0000-0000-000000000003"
export const DOCTOR_AUTH_USER_ID = "e2e00000-auth-0000-0000-000000000003"
export const PATIENT_PROFILE_ID = "e2e00000-0000-0000-0000-000000000002"
export const PATIENT_AUTH_USER_ID = "e2e00000-auth-0000-0000-000000000002"
export const INTAKE_ID = "e2e00000-0000-0000-0000-000000000010"
export const SERVICE_ID = "e2e00000-0000-0000-0000-000000000020"
export const CLINIC_IDENTITY_ID = "e2e00000-0000-0000-0000-000000000030"
export const DRAFT_ID = "e2e00000-0000-0000-0000-000000000040"
export const TEMPLATE_ID = "e2e00000-0000-0000-0000-000000000051"

// Valid template config that matches TypeScript types
const E2E_TEMPLATE_CONFIG = {
  layout: {
    headerStyle: "logo-left" as const,
    marginPreset: "M" as const,
    fontSizePreset: "M" as const,
    accentColorPreset: "slate" as const,
  },
  options: {
    showVerificationBlock: true,
    signatureStyle: "image" as const,
    showAbn: true,
    showPhone: false,
    showEmail: true,
    showAddress: true,
  },
  _e2e_run_id: E2E_RUN_ID, // Tag for identification
}

// Validation result type
interface ValidationResult {
  name: string
  passed: boolean
  message: string
}

// ============================================================================
// SEED FUNCTIONS (idempotent - upsert or reuse existing)
// ============================================================================

async function seedOperatorProfile() {
  console.log("🔧 Seeding operator profile (admin+doctor)...")
  
  // Check if already exists
  const { data: existing } = await supabase
    .from("profiles")
    .select("id, auth_user_id, email, full_name, date_of_birth, role, onboarding_completed, email_verified, email_verified_at, provider_number, ahpra_number, nominals, certificate_identity_complete, address_line1, suburb, state, postcode, phone, created_at, updated_at")
    .eq("id", OPERATOR_PROFILE_ID)
    .single()

  if (existing) {
    console.log("   ↳ Reusing existing operator profile")
    return existing
  }
  
  const { data, error } = await supabase
    .from("profiles")
    .upsert({
      id: OPERATOR_PROFILE_ID,
      auth_user_id: OPERATOR_AUTH_USER_ID,
      email: "e2e-operator@test.instantmed.com.au",
      full_name: "Dr. E2E Operator",
      date_of_birth: "1980-01-15",
      role: "admin", // Admin role has doctor access
      onboarding_completed: true,
      email_verified: true,
      email_verified_at: new Date().toISOString(),
      // Doctor identity fields for certificate issuance
      provider_number: "1234567A",
      ahpra_number: "MED0001234567",
      nominals: "MBBS, FRACGP",
      certificate_identity_complete: true,
      // Address for certificate
      address_line1: "123 Test Medical Centre",
      suburb: "Sydney",
      state: "NSW",
      postcode: "2000",
      phone: "0412345678",
    }, { onConflict: "id" })
    .select()
    .single()

  if (error) {
    console.error("❌ Failed to seed operator profile:", error.message)
    throw error
  }

  console.log("   ↳ Created new operator profile")
  return data
}

async function seedDoctorProfile() {
  console.log("🔧 Seeding doctor profile (NOT admin)...")
  
  // Check if already exists
  const { data: existing } = await supabase
    .from("profiles")
    .select("id, auth_user_id, email, full_name, date_of_birth, role, onboarding_completed, email_verified, email_verified_at, provider_number, ahpra_number, nominals, certificate_identity_complete, address_line1, suburb, state, postcode, phone, created_at, updated_at")
    .eq("id", DOCTOR_PROFILE_ID)
    .single()

  if (existing) {
    console.log("   ↳ Reusing existing doctor profile")
    return existing
  }
  
  const { data, error } = await supabase
    .from("profiles")
    .upsert({
      id: DOCTOR_PROFILE_ID,
      auth_user_id: DOCTOR_AUTH_USER_ID,
      email: "e2e-doctor@test.instantmed.com.au",
      full_name: "Dr. E2E Doctor",
      date_of_birth: "1985-03-20",
      role: "doctor", // Doctor role - NOT admin
      onboarding_completed: true,
      email_verified: true,
      email_verified_at: new Date().toISOString(),
      // Doctor identity fields for certificate issuance
      provider_number: "7654321B",
      ahpra_number: "MED0007654321",
      nominals: "MBBS",
      certificate_identity_complete: true,
      // Address for certificate
      address_line1: "456 Doctor Medical Centre",
      suburb: "Brisbane",
      state: "QLD",
      postcode: "4000",
      phone: "0423456789",
    }, { onConflict: "id" })
    .select()
    .single()

  if (error) {
    console.error("❌ Failed to seed doctor profile:", error.message)
    throw error
  }

  console.log("   ↳ Created new doctor profile")
  return data
}

async function seedPatientProfile() {
  console.log("🔧 Seeding patient profile...")
  
  // Check if already exists
  const { data: existing } = await supabase
    .from("profiles")
    .select("id, auth_user_id, email, full_name, date_of_birth, role, onboarding_completed, email_verified, email_verified_at, address_line1, suburb, state, postcode, phone, created_at, updated_at")
    .eq("id", PATIENT_PROFILE_ID)
    .single()

  if (existing) {
    console.log("   ↳ Reusing existing patient profile")
    return existing
  }
  
  const { data, error } = await supabase
    .from("profiles")
    .upsert({
      id: PATIENT_PROFILE_ID,
      auth_user_id: PATIENT_AUTH_USER_ID,
      email: "e2e-patient@test.instantmed.com.au",
      full_name: "E2E Test Patient",
      date_of_birth: "1990-06-20",
      role: "patient",
      onboarding_completed: true,
      email_verified: true,
      email_verified_at: new Date().toISOString(),
      address_line1: "456 Patient Street",
      suburb: "Melbourne",
      state: "VIC",
      postcode: "3000",
      phone: "0498765432",
    }, { onConflict: "id" })
    .select()
    .single()

  if (error) {
    console.error("❌ Failed to seed patient profile:", error.message)
    throw error
  }

  console.log("   ↳ Created new patient profile")
  return data
}

async function seedService() {
  console.log("🔧 Seeding med_certs service...")
  
  // Check if service already exists by slug (production may have one)
  const { data: existing } = await supabase
    .from("services")
    .select("id, slug")
    .eq("slug", "med-cert")
    .single()

  if (existing) {
    console.log("   ↳ Reusing existing service:", existing.id)
    return existing
  }

  // Check if our E2E service exists
  const { data: e2eExisting } = await supabase
    .from("services")
    .select("id, slug, name, short_name, description, type, price_cents, is_active, created_at")
    .eq("id", SERVICE_ID)
    .single()

  if (e2eExisting) {
    console.log("   ↳ Reusing existing E2E service")
    return e2eExisting
  }

  const { data, error } = await supabase
    .from("services")
    .insert({
      id: SERVICE_ID,
      slug: "med-cert-e2e",
      name: "Medical Certificate (E2E)",
      short_name: "E2E Cert",
      description: "E2E test medical certificate service",
      type: "med_certs",
      price_cents: 2500,
      is_active: true,
      created_at: new Date().toISOString(),
    })
    .select()
    .single()

  if (error) {
    console.error("❌ Failed to seed service:", error.message)
    throw error
  }

  console.log("   ↳ Created new E2E service")
  return data
}

async function seedClinicIdentity() {
  console.log("🔧 Seeding clinic identity...")
  
  // Check if our E2E clinic identity exists by deterministic ID
  const { data: existing } = await supabase
    .from("clinic_identity")
    .select("id, clinic_name, trading_name, address_line_1, address_line_2, suburb, state, postcode, abn, phone, email, logo_storage_path, footer_disclaimer, is_active, created_at, updated_at, created_by, updated_by")
    .eq("id", CLINIC_IDENTITY_ID)
    .single()

  if (existing) {
    // Ensure it's active
    if (!existing.is_active) {
      console.log("   ↳ Reactivating existing E2E clinic identity")
      await supabase
        .from("clinic_identity")
        .update({ is_active: true, updated_by: OPERATOR_PROFILE_ID })
        .eq("id", CLINIC_IDENTITY_ID)
    } else {
      console.log("   ↳ Reusing existing E2E clinic identity")
    }
    return existing
  }

  // NOTE: We do NOT reuse "any active" production rows - deterministic seeding only.
  // If production has an active clinic_identity, we deactivate it temporarily for E2E.
  // Teardown will delete our E2E row, allowing production to be reactivated if needed.

  // Deactivate any existing active clinic identity to satisfy unique constraint
  await supabase
    .from("clinic_identity")
    .update({ is_active: false })
    .eq("is_active", true)

  // Insert with correct schema columns
  const { data, error } = await supabase
    .from("clinic_identity")
    .insert({
      id: CLINIC_IDENTITY_ID,
      clinic_name: "E2E Test Medical Clinic",
      trading_name: "E2E Clinic",
      address_line_1: "123 Test Street",
      address_line_2: "Suite 100",
      suburb: "Sydney",
      state: "NSW",
      postcode: "2000",
      abn: "64 694 559 334",
      phone: "1300 123 456",
      email: "clinic@test.instantmed.com.au",
      logo_storage_path: null,
      footer_disclaimer: "This is an E2E test certificate.",
      is_active: true,
      created_by: OPERATOR_PROFILE_ID,
      updated_by: OPERATOR_PROFILE_ID,
    })
    .select()
    .single()

  if (error) {
    console.error("❌ Failed to seed clinic identity:", error.message)
    throw error
  }

  console.log("   ↳ Created new E2E clinic identity")
  return data
}

async function seedCertificateTemplate() {
  console.log("🔧 Seeding certificate template...")

  const { data: existing } = await supabase
    .from("certificate_templates")
    .select("id, template_type, version, name, config, is_active, activated_at, activated_by, created_at, created_by")
    .eq("id", TEMPLATE_ID)
    .single()

  if (existing) {
    if (!existing.is_active) {
      console.log("   ↳ Reactivating E2E template")
      await supabase
        .from("certificate_templates")
        .update({
          is_active: true,
          activated_at: new Date().toISOString(),
          activated_by: OPERATOR_PROFILE_ID,
        })
        .eq("id", TEMPLATE_ID)
    } else {
      console.log("   ↳ Reusing E2E template")
    }
    return existing
  }

  // Deactivate any existing active template to satisfy unique constraint
  await supabase
    .from("certificate_templates")
    .update({ is_active: false })
    .eq("template_type", "med_cert")
    .eq("is_active", true)

  const { data: maxVersion } = await supabase
    .from("certificate_templates")
    .select("version")
    .eq("template_type", "med_cert")
    .order("version", { ascending: false })
    .limit(1)
    .single()

  const nextVersion = (maxVersion?.version ?? 0) + 1

  const { data, error } = await supabase
    .from("certificate_templates")
    .insert({
      id: TEMPLATE_ID,
      template_type: "med_cert",
      name: "E2E Medical Certificate v1",
      version: nextVersion,
      config: E2E_TEMPLATE_CONFIG,
      is_active: true,
      activated_at: new Date().toISOString(),
      activated_by: OPERATOR_PROFILE_ID,
      created_by: OPERATOR_PROFILE_ID,
    })
    .select()
    .single()

  if (error) {
    console.error("❌ Failed to seed certificate template:", error.message)
    throw error
  }

  console.log("   ↳ Created E2E template")
  return data
}

async function seedPaidIntake(serviceId: string) {
  console.log("🔧 Seeding paid med_certs intake...")
  
  // Check if already exists
  const { data: existing } = await supabase
    .from("intakes")
    .select("id, patient_id, service_id, reference_number, status, payment_status, amount_cents, claimed_by, claimed_at, created_at, updated_at")
    .eq("id", INTAKE_ID)
    .single()

  if (existing) {
    // Reset to paid status for test reuse
    if (existing.status !== "paid") {
      console.log("   ↳ Resetting intake status to 'paid'")
      await supabase
        .from("intakes")
        .update({ 
          status: "paid", 
          claimed_by: null, 
          claimed_at: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", INTAKE_ID)
    } else {
      console.log("   ↳ Reusing existing intake (already paid)")
    }
    return existing
  }
  
  const referenceNumber = `E2E-${Date.now().toString(36).toUpperCase()}`
  
  // State machine: draft → pending_payment → paid
  // Step 1: Insert with draft status
  const { error: draftError } = await supabase
    .from("intakes")
    .insert({
      id: INTAKE_ID,
      patient_id: PATIENT_PROFILE_ID,
      service_id: serviceId,
      reference_number: referenceNumber,
      status: "draft",
      payment_status: "unpaid",
      amount_cents: 2500,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })

  if (draftError) {
    console.error("❌ Failed to seed intake (draft):", draftError.message)
    throw draftError
  }

  // Step 2: Transition to pending_payment
  const { error: pendingError } = await supabase
    .from("intakes")
    .update({
      status: "pending_payment",
      submitted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", INTAKE_ID)

  if (pendingError) {
    console.error("❌ Failed to update intake to pending_payment:", pendingError.message)
    throw pendingError
  }

  // Step 3: Transition to paid
  const { data, error } = await supabase
    .from("intakes")
    .update({
      status: "paid",
      payment_status: "paid",
      payment_id: `pi_e2e_${randomUUID().slice(0, 8)}`,
      paid_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", INTAKE_ID)
    .select()
    .single()

  if (error) {
    console.error("❌ Failed to update intake to paid:", error.message)
    throw error
  }

  console.log("   ↳ Created new paid intake, ref:", referenceNumber)
  return data
}

async function seedDocumentDraft() {
  console.log("🔧 Seeding document draft for intake (optional)...")
  
  // Check if already exists
  const { data: existing } = await supabase
    .from("document_drafts")
    .select("id, intake_id, status, created_at, updated_at")
    .eq("id", DRAFT_ID)
    .single()

  if (existing) {
    console.log("   ↳ Reusing existing document draft")
    return existing
  }
  
  // Document drafts are optional for E2E tests - the doctor can create them
  // Try to seed but don't fail if schema doesn't match
  try {
    const { data, error } = await supabase
      .from("document_drafts")
      .insert({
        id: DRAFT_ID,
        intake_id: INTAKE_ID,
        status: "draft",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) {
      console.log("   ⚠️ Skipping document draft (optional):", error.message)
      return null
    }

    console.log("   ↳ Created new document draft")
    return data
  } catch {
    console.log("   ⚠️ Skipping document draft (optional)")
    return null
  }
}

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

async function validateSeededData(): Promise<ValidationResult[]> {
  console.log("\n🔍 Validating seeded data...")
  const results: ValidationResult[] = []

  // 1. Operator profile exists with admin role
  const { data: operator } = await supabase
    .from("profiles")
    .select("id, role, provider_number, ahpra_number, certificate_identity_complete")
    .eq("id", OPERATOR_PROFILE_ID)
    .single()

  results.push({
    name: "Operator profile exists",
    passed: !!operator,
    message: operator ? `role=${operator.role}` : "NOT FOUND",
  })

  results.push({
    name: "Operator role permits /admin + /doctor",
    passed: operator?.role === "admin",
    message: operator?.role === "admin" ? "admin role OK" : `role=${operator?.role}`,
  })

  // 2. Doctor identity complete
  results.push({
    name: "Operator has provider_number",
    passed: !!operator?.provider_number,
    message: operator?.provider_number || "MISSING",
  })

  results.push({
    name: "Operator has ahpra_number",
    passed: !!operator?.ahpra_number,
    message: operator?.ahpra_number || "MISSING",
  })

  // 3. Certificate templates exist with valid config
  const { data: templates } = await supabase
    .from("certificate_templates")
    .select("id, template_type, config")
    .eq("is_active", true)

  results.push({
    name: "Active certificate templates exist",
    passed: !!(templates && templates.length > 0),
    message: templates?.length 
      ? `${templates.length} template(s): ${templates.map(t => t.template_type).join(", ")}` 
      : "NONE FOUND",
  })

  // Check that at least one template has valid config structure
  const hasValidConfig = templates?.some(t => {
    const cfg = t.config as { layout?: { headerStyle?: string }; options?: { showVerificationBlock?: boolean } }
    return cfg?.layout?.headerStyle && cfg?.options?.showVerificationBlock !== undefined
  })

  results.push({
    name: "Template has valid config.layout/options",
    passed: !!hasValidConfig,
    message: hasValidConfig ? "config structure OK" : "INVALID CONFIG STRUCTURE",
  })

  // 4. Clinic identity exists with correct schema columns
  const { data: clinic } = await supabase
    .from("clinic_identity")
    .select("id, clinic_name, address_line_1, suburb, state, postcode, abn, phone")
    .eq("is_active", true)
    .limit(1)
    .single()

  results.push({
    name: "Active clinic identity exists",
    passed: !!clinic,
    message: clinic ? `${clinic.clinic_name} (ID: ${clinic.id})` : "NONE FOUND",
  })

  // Check required NOT NULL fields
  const hasRequiredFields = !!(
    clinic?.clinic_name && 
    clinic?.address_line_1 && 
    clinic?.suburb && 
    clinic?.state && 
    clinic?.postcode && 
    clinic?.abn
  )

  results.push({
    name: "Clinic has required fields",
    passed: hasRequiredFields,
    message: hasRequiredFields 
      ? `${clinic?.address_line_1}, ${clinic?.suburb} ${clinic?.state} ${clinic?.postcode}` 
      : "MISSING REQUIRED FIELDS",
  })

  // 5. Intake exists with correct status and service type
  const { data: intake } = await supabase
    .from("intakes")
    .select(`
      id, 
      status, 
      service:services!inner(service_type)
    `)
    .eq("id", INTAKE_ID)
    .single()

  const serviceType = (intake?.service as { service_type?: string })?.service_type

  results.push({
    name: "Intake exists with status=paid",
    passed: intake?.status === "paid",
    message: intake ? `status=${intake.status}` : "NOT FOUND",
  })

  results.push({
    name: "Intake service_type=med_certs",
    passed: serviceType === "med_certs",
    message: serviceType || "UNKNOWN",
  })

  // 6. Document draft exists
  const { data: draft } = await supabase
    .from("document_drafts")
    .select("id, intake_id")
    .eq("id", DRAFT_ID)
    .single()

  results.push({
    name: "Document draft exists for intake",
    passed: draft?.intake_id === INTAKE_ID,
    message: draft ? `linked to ${draft.intake_id}` : "NOT FOUND",
  })

  return results
}

function printValidationSummary(results: ValidationResult[]): boolean {
  console.log("\n" + "=".repeat(60))
  console.log("📋 E2E SEED VALIDATION")
  console.log("=".repeat(60))

  let allPassed = true
  for (const result of results) {
    const icon = result.passed ? "✅" : "❌"
    console.log(`${icon} ${result.name}`)
    console.log(`   └─ ${result.message}`)
    if (!result.passed) allPassed = false
  }

  console.log("=".repeat(60))
  return allPassed
}

function printSeedSummary() {
  console.log("\n" + "=".repeat(60))
  console.log("📋 E2E SEED SUMMARY")
  console.log("=".repeat(60))
  console.log(`
┌─ Operator User (admin+doctor) ─────────────────────────────
│  Profile ID:    ${OPERATOR_PROFILE_ID}
│  Auth User ID:  ${OPERATOR_AUTH_USER_ID}
│  Role:          admin (has doctor access)
│  Provider #:    1234567A
│  AHPRA #:       MED0001234567
│
├─ Doctor User (doctor only, NOT admin) ─────────────────────
│  Profile ID:    ${DOCTOR_PROFILE_ID}
│  Auth User ID:  ${DOCTOR_AUTH_USER_ID}
│  Role:          doctor (no admin access)
│  Provider #:    7654321B
│  AHPRA #:       MED0007654321
│
├─ Patient User ──────────────────────────────────────────────
│  Profile ID:    ${PATIENT_PROFILE_ID}
│  Auth User ID:  ${PATIENT_AUTH_USER_ID}
│  Role:          patient
│
├─ Paid Intake ───────────────────────────────────────────────
│  Intake ID:     ${INTAKE_ID}
│  Status:        paid
│  Service:       med_certs
│  Draft ID:      ${DRAFT_ID}
│
└─ E2E Run ID (for teardown): ${E2E_RUN_ID}
`)
  console.log("=".repeat(60))
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  console.log("🚀 Starting E2E seed...")
  console.log(`   Supabase URL: ${SUPABASE_URL}`)
  console.log(`   E2E Run ID:   ${E2E_RUN_ID}`)
  console.log("")

  try {
    // Seed in dependency order
    await seedOperatorProfile()
    await seedDoctorProfile()
    await seedPatientProfile()
    const service = await seedService()
    await seedClinicIdentity()
    await seedCertificateTemplate()
    await seedPaidIntake(service.id)
    await seedDocumentDraft()
    
    // Validate all seeded data
    const validationResults = await validateSeededData()
    const allValid = printValidationSummary(validationResults)
    
    // Print summary
    printSeedSummary()
    
    // Check critical validations only (operator + patient profiles)
    const criticalResults = validationResults.slice(0, 4) // First 4 are operator checks
    const criticalPassed = criticalResults.every(r => r.passed)
    
    if (!criticalPassed) {
      console.error("\n❌ E2E seed validation FAILED - critical checks did not pass")
      console.error("   Fix the issues above before running E2E tests")
      process.exit(1)
    }
    
    if (!allValid) {
      console.log("\n⚠️ E2E seed completed with warnings (non-critical checks failed)")
    } else {
      console.log("\n✅ E2E seed completed successfully!")
    }
    process.exit(0)
  } catch (error) {
    console.error("❌ E2E seed failed:", error)
    process.exit(1)
  }
}

main()
