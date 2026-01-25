/* eslint-disable no-console */
/**
 * E2E Test Data Teardown Script
 * 
 * Deletes all seeded test data by e2e_run_id in correct FK order.
 * 
 * Usage: pnpm e2e:teardown
 * Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */

import * as path from "path"
import * as dotenv from "dotenv"

// Load .env.local for Supabase credentials (when run standalone)
dotenv.config({ path: path.join(__dirname, "..", "..", ".env.local") })

import { createClient } from "@supabase/supabase-js"

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

// Same IDs as seed.ts
const OPERATOR_PROFILE_ID = "e2e00000-0000-0000-0000-000000000001"
const PATIENT_PROFILE_ID = "e2e00000-0000-0000-0000-000000000002"
const INTAKE_ID = "e2e00000-0000-0000-0000-000000000010"
const SERVICE_ID = "e2e00000-0000-0000-0000-000000000020"
const CLINIC_IDENTITY_ID = "e2e00000-0000-0000-0000-000000000030"
const DRAFT_ID = "e2e00000-0000-0000-0000-000000000040"
// Template IDs for each template type
const TEMPLATE_ID_WORK = "e2e00000-0000-0000-0000-000000000051"
const TEMPLATE_ID_UNI = "e2e00000-0000-0000-0000-000000000052"
const TEMPLATE_ID_CARER = "e2e00000-0000-0000-0000-000000000053"
const ALL_TEMPLATE_IDS = [TEMPLATE_ID_WORK, TEMPLATE_ID_UNI, TEMPLATE_ID_CARER]

// ============================================================================
// TEARDOWN FUNCTIONS (in reverse dependency order)
// ============================================================================

async function deleteDocumentDrafts() {
  console.log("🗑️  Deleting document drafts...")
  
  const { error } = await supabase
    .from("document_drafts")
    .delete()
    .eq("id", DRAFT_ID)

  if (error && !error.message.includes("0 rows")) {
    console.warn("⚠️  Failed to delete document drafts:", error.message)
  } else {
    console.log("✅ Document drafts deleted")
  }
}

async function deleteIssuedCertificates() {
  console.log("🗑️  Deleting issued certificates...")
  
  const { error } = await supabase
    .from("issued_certificates")
    .delete()
    .eq("intake_id", INTAKE_ID)

  if (error && !error.message.includes("0 rows")) {
    console.warn("⚠️  Failed to delete issued certificates:", error.message)
  } else {
    console.log("✅ Issued certificates deleted")
  }
}

async function deleteIntakeDocuments() {
  console.log("🗑️  Deleting intake documents...")
  
  const { error } = await supabase
    .from("intake_documents")
    .delete()
    .eq("intake_id", INTAKE_ID)

  if (error && !error.message.includes("0 rows")) {
    console.warn("⚠️  Failed to delete intake documents:", error.message)
  } else {
    console.log("✅ Intake documents deleted")
  }
}

async function deleteIntakeAnswers() {
  console.log("🗑️  Deleting intake answers...")
  
  const { error } = await supabase
    .from("intake_answers")
    .delete()
    .eq("intake_id", INTAKE_ID)

  if (error && !error.message.includes("0 rows")) {
    console.warn("⚠️  Failed to delete intake answers:", error.message)
  } else {
    console.log("✅ Intake answers deleted")
  }
}

async function deleteAuditLogs() {
  console.log("🗑️  Deleting audit logs...")
  
  // Delete by intake_id
  await supabase
    .from("audit_logs")
    .delete()
    .eq("intake_id", INTAKE_ID)

  // Delete by actor_id (operator and patient)
  await supabase
    .from("audit_logs")
    .delete()
    .in("actor_id", [OPERATOR_PROFILE_ID, PATIENT_PROFILE_ID])

  console.log("✅ Audit logs deleted")
}

async function deleteCertificateAuditLog() {
  console.log("🗑️  Deleting certificate audit logs...")
  
  // Delete certificates related to our intake first, then their audit logs
  const { data: certs } = await supabase
    .from("issued_certificates")
    .select("id")
    .eq("intake_id", INTAKE_ID)

  if (certs && certs.length > 0) {
    const certIds = certs.map(c => c.id)
    await supabase
      .from("certificate_audit_log")
      .delete()
      .in("certificate_id", certIds)
  }

  console.log("✅ Certificate audit logs deleted")
}

async function deleteIntakes() {
  console.log("🗑️  Deleting intakes...")
  
  const { error } = await supabase
    .from("intakes")
    .delete()
    .eq("id", INTAKE_ID)

  if (error && !error.message.includes("0 rows")) {
    console.warn("⚠️  Failed to delete intakes:", error.message)
  } else {
    console.log("✅ Intakes deleted")
  }
}

async function deleteNotifications() {
  console.log("🗑️  Deleting notifications...")
  
  const { error } = await supabase
    .from("notifications")
    .delete()
    .in("user_id", [OPERATOR_PROFILE_ID, PATIENT_PROFILE_ID])

  if (error && !error.message.includes("0 rows")) {
    console.warn("⚠️  Failed to delete notifications:", error.message)
  } else {
    console.log("✅ Notifications deleted")
  }
}

async function deleteProfiles() {
  console.log("🗑️  Deleting profiles...")
  
  const { error } = await supabase
    .from("profiles")
    .delete()
    .in("id", [OPERATOR_PROFILE_ID, PATIENT_PROFILE_ID])

  if (error && !error.message.includes("0 rows")) {
    console.warn("⚠️  Failed to delete profiles:", error.message)
  } else {
    console.log("✅ Profiles deleted")
  }
}

async function deleteClinicIdentity() {
  console.log("🗑️  Deleting clinic identity...")
  
  const { error } = await supabase
    .from("clinic_identity")
    .delete()
    .eq("id", CLINIC_IDENTITY_ID)

  if (error && !error.message.includes("0 rows")) {
    console.warn("⚠️  Failed to delete clinic identity:", error.message)
  } else {
    console.log("✅ Clinic identity deleted")
  }
}

async function deleteService() {
  console.log("🗑️  Deleting e2e service (if seeded)...")
  
  // Only delete if it's our test service
  const { error } = await supabase
    .from("services")
    .delete()
    .eq("id", SERVICE_ID)

  if (error && !error.message.includes("0 rows")) {
    console.warn("⚠️  Failed to delete service:", error.message)
  } else {
    console.log("✅ Service deleted (or was not seeded)")
  }
}

async function deleteCertificateTemplates() {
  console.log("🗑️  Deleting e2e certificate templates (if seeded)...")
  
  // Delete all three E2E templates by their deterministic IDs
  const { error } = await supabase
    .from("certificate_templates")
    .delete()
    .in("id", ALL_TEMPLATE_IDS)

  if (error && !error.message.includes("0 rows")) {
    console.warn("⚠️  Failed to delete certificate templates:", error.message)
  } else {
    console.log("✅ Certificate templates deleted (or were not seeded)")
  }
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  console.log("🧹 Starting E2E teardown...")
  console.log(`   Supabase URL: ${SUPABASE_URL}`)
  console.log("")

  try {
    // Delete in reverse dependency order (children before parents)
    // Note: clinic_identity and certificate_templates reference profiles via created_by/updated_by,
    // so they must be deleted BEFORE profiles
    await deleteCertificateAuditLog()
    await deleteIssuedCertificates()
    await deleteIntakeDocuments()
    await deleteDocumentDrafts()
    await deleteIntakeAnswers()
    await deleteAuditLogs()
    await deleteNotifications()
    await deleteIntakes()
    await deleteClinicIdentity()       // Before profiles (FK: created_by, updated_by)
    await deleteCertificateTemplates() // Before profiles (FK: created_by, activated_by)
    await deleteProfiles()
    await deleteService()
    
    console.log("")
    console.log("✅ E2E teardown completed successfully!")
    process.exit(0)
  } catch (error) {
    console.error("❌ E2E teardown failed:", error)
    process.exit(1)
  }
}

main()
