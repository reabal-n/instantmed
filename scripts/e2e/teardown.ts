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
const DOCTOR_PROFILE_ID = "e2e00000-0000-0000-0000-000000000003"
const PATIENT_PROFILE_ID = "e2e00000-0000-0000-0000-000000000002"
const INTAKE_ID = "e2e00000-0000-0000-0000-000000000010"
const SERVICE_ID = "e2e00000-0000-0000-0000-000000000020"
const CLINIC_IDENTITY_ID = "e2e00000-0000-0000-0000-000000000030"
const DRAFT_ID = "e2e00000-0000-0000-0000-000000000040"
const TEMPLATE_ID = "e2e00000-0000-0000-0000-000000000051"
const E2E_PROFILE_IDS = [OPERATOR_PROFILE_ID, DOCTOR_PROFILE_ID, PATIENT_PROFILE_ID]

let cachedIntakeIds: string[] | null = null

async function getE2EIntakeIds(): Promise<string[]> {
  if (cachedIntakeIds) return cachedIntakeIds

  const ids = new Set<string>([INTAKE_ID])
  const queries = await Promise.all([
    supabase.from("intakes").select("id").in("patient_id", E2E_PROFILE_IDS),
    supabase.from("intakes").select("id").in("claimed_by", E2E_PROFILE_IDS),
    supabase.from("intakes").select("id").in("reviewed_by", E2E_PROFILE_IDS),
    supabase.from("intakes").select("id").in("reviewing_doctor_id", E2E_PROFILE_IDS),
    supabase.from("intakes").select("id").in("assigned_admin_id", E2E_PROFILE_IDS),
    supabase.from("intakes").select("id").eq("service_id", SERVICE_ID),
  ])

  for (const query of queries) {
    if (query.error) {
      console.warn("⚠️  Failed to discover E2E intakes:", query.error.message)
      continue
    }
    for (const row of query.data || []) {
      ids.add(row.id)
    }
  }

  cachedIntakeIds = Array.from(ids)
  return cachedIntakeIds
}

// ============================================================================
// TEARDOWN FUNCTIONS (in reverse dependency order)
// ============================================================================

async function deleteDocumentDrafts() {
  console.log("🗑️  Deleting document drafts...")
  const intakeIds = await getE2EIntakeIds()

  const byId = await supabase
    .from("document_drafts")
    .delete()
    .eq("id", DRAFT_ID)

  const byIntake = await supabase
    .from("document_drafts")
    .delete()
    .in("intake_id", intakeIds)

  const byRequest = await supabase
    .from("document_drafts")
    .delete()
    .in("request_id", intakeIds)

  const error = byId.error || byIntake.error || byRequest.error

  if (error && !error.message.includes("0 rows")) {
    console.warn("⚠️  Failed to delete document drafts:", error.message)
  } else {
    console.log("✅ Document drafts deleted")
  }
}

async function deleteIssuedCertificates() {
  console.log("🗑️  Deleting issued certificates...")
  const intakeIds = await getE2EIntakeIds()
  
  const byIntake = await supabase
    .from("issued_certificates")
    .delete()
    .in("intake_id", intakeIds)

  const byPerson = await supabase
    .from("issued_certificates")
    .delete()
    .or(`patient_id.in.(${E2E_PROFILE_IDS.join(",")}),doctor_id.in.(${E2E_PROFILE_IDS.join(",")})`)

  const error = byIntake.error || byPerson.error

  if (error && !error.message.includes("0 rows")) {
    console.warn("⚠️  Failed to delete issued certificates:", error.message)
  } else {
    console.log("✅ Issued certificates deleted")
  }
}

async function deleteIntakeDocuments() {
  console.log("🗑️  Deleting intake documents...")
  const intakeIds = await getE2EIntakeIds()
  
  const byIntake = await supabase
    .from("intake_documents")
    .delete()
    .in("intake_id", intakeIds)

  const byCreator = await supabase
    .from("intake_documents")
    .delete()
    .in("created_by", E2E_PROFILE_IDS)

  const error = byIntake.error || byCreator.error

  if (error && !error.message.includes("0 rows")) {
    console.warn("⚠️  Failed to delete intake documents:", error.message)
  } else {
    console.log("✅ Intake documents deleted")
  }
}

async function deleteIntakeAnswers() {
  console.log("🗑️  Deleting intake answers...")
  const intakeIds = await getE2EIntakeIds()
  
  const { error } = await supabase
    .from("intake_answers")
    .delete()
    .in("intake_id", intakeIds)

  if (error && !error.message.includes("0 rows")) {
    console.warn("⚠️  Failed to delete intake answers:", error.message)
  } else {
    console.log("✅ Intake answers deleted")
  }
}

async function deleteAuditLogs() {
  console.log("🗑️  Deleting audit logs...")
  const intakeIds = await getE2EIntakeIds()
  
  // Delete by intake_id
  await supabase
    .from("audit_logs")
    .delete()
    .in("intake_id", intakeIds)

  // Delete by actor_id (operator and patient)
  await supabase
    .from("audit_logs")
    .delete()
    .in("actor_id", E2E_PROFILE_IDS)

  console.log("✅ Audit logs deleted")
}

async function deleteCertificateAuditLog() {
  console.log("🗑️  Deleting certificate audit logs...")
  const intakeIds = await getE2EIntakeIds()
  
  // Delete audit logs for certificates tied to E2E intakes or seeded profiles.
  const { data: certs } = await supabase
    .from("issued_certificates")
    .select("id")
    .or(`intake_id.in.(${intakeIds.join(",")}),patient_id.in.(${E2E_PROFILE_IDS.join(",")}),doctor_id.in.(${E2E_PROFILE_IDS.join(",")})`)

  if (certs && certs.length > 0) {
    const certIds = certs.map(c => c.id)
    await supabase
      .from("certificate_audit_log")
      .delete()
      .in("certificate_id", certIds)
  }

  await supabase
    .from("certificate_audit_log")
    .delete()
    .in("actor_id", E2E_PROFILE_IDS)

  console.log("✅ Certificate audit logs deleted")
}

async function deleteIntakes() {
  console.log("🗑️  Deleting intakes...")
  const intakeIds = await getE2EIntakeIds()
  
  const { error } = await supabase
    .from("intakes")
    .delete()
    .in("id", intakeIds)

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
    .in("user_id", E2E_PROFILE_IDS)

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
    .in("id", E2E_PROFILE_IDS)

  if (error && !error.message.includes("0 rows")) {
    console.warn("⚠️  Failed to delete profiles:", error.message)
  } else {
    console.log("✅ Profiles deleted")
  }
}

async function deleteClinicIdentity() {
  console.log("🗑️  Deleting clinic identity...")

  const byId = await supabase
    .from("clinic_identity")
    .delete()
    .eq("id", CLINIC_IDENTITY_ID)

  const byCreator = await supabase
    .from("clinic_identity")
    .delete()
    .in("created_by", E2E_PROFILE_IDS)

  const byUpdater = await supabase
    .from("clinic_identity")
    .delete()
    .in("updated_by", E2E_PROFILE_IDS)

  const error = byId.error || byCreator.error || byUpdater.error

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

  const byId = await supabase
    .from("certificate_templates")
    .delete()
    .eq("id", TEMPLATE_ID)

  const byCreator = await supabase
    .from("certificate_templates")
    .delete()
    .in("created_by", E2E_PROFILE_IDS)

  const byActivator = await supabase
    .from("certificate_templates")
    .delete()
    .in("activated_by", E2E_PROFILE_IDS)

  const error = byId.error || byCreator.error || byActivator.error

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

if (process.env.E2E_TEARDOWN_CLI === "1" || process.env.npm_lifecycle_event === "e2e:teardown") {
  main()
}
