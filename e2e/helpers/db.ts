/* eslint-disable no-console */
/**
 * E2E Database Helpers
 * 
 * Provides Supabase service role client and helper functions
 * for database assertions in E2E tests.
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js"
import * as path from "path"
import * as dotenv from "dotenv"

// Load .env.local for Supabase credentials
dotenv.config({ path: path.join(__dirname, "..", "..", ".env.local") })

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

// Re-export E2E IDs for test assertions
export const CLINIC_IDENTITY_ID = "e2e00000-0000-0000-0000-000000000030"
export const TEMPLATE_ID_WORK = "e2e00000-0000-0000-0000-000000000051"
export const TEMPLATE_ID_UNI = "e2e00000-0000-0000-0000-000000000052"
export const TEMPLATE_ID_CARER = "e2e00000-0000-0000-0000-000000000053"

/**
 * Check if DB helpers are available (env vars set)
 */
export function isDbAvailable(): boolean {
  return !!(SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY)
}

let supabaseClient: SupabaseClient | null = null

/**
 * Get or create a Supabase client with service role privileges
 */
export function getSupabaseClient(): SupabaseClient {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. " +
      "Ensure .env.local is present and contains these values."
    )
  }
  
  if (!supabaseClient) {
    supabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    })
  }
  
  return supabaseClient
}

/**
 * Template type definition
 */
export interface CertificateTemplate {
  id: string
  template_type: string
  version: number
  name: string
  config: {
    layout?: {
      headerStyle?: string
      marginPreset?: string
      fontSizePreset?: string
      accentColorPreset?: string
    }
    options?: {
      showVerificationBlock?: boolean
      signatureStyle?: string
      showAbn?: boolean
      showPhone?: boolean
      showEmail?: boolean
      showAddress?: boolean
    }
  }
  is_active: boolean
  activated_at: string | null
  activated_by: string | null
  created_at: string
  created_by: string | null
}

/**
 * Clinic identity type definition
 */
export interface ClinicIdentity {
  id: string
  clinic_name: string
  trading_name: string | null
  address_line_1: string
  address_line_2: string | null
  suburb: string
  state: string
  postcode: string
  abn: string
  phone: string | null
  email: string | null
  logo_storage_path: string | null
  footer_disclaimer: string | null
  is_active: boolean
  created_at: string
  updated_at: string
  created_by: string | null
  updated_by: string | null
}

/**
 * Get a certificate template by ID
 */
export async function getTemplateById(id: string): Promise<CertificateTemplate | null> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from("certificate_templates")
    .select("*")
    .eq("id", id)
    .single()
  
  if (error) {
    console.error("Error fetching template:", error.message)
    return null
  }
  
  return data as CertificateTemplate
}

/**
 * Get the active certificate template for a given type
 */
export async function getActiveTemplate(templateType: string): Promise<CertificateTemplate | null> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from("certificate_templates")
    .select("*")
    .eq("template_type", templateType)
    .eq("is_active", true)
    .single()
  
  if (error) {
    console.error("Error fetching active template:", error.message)
    return null
  }
  
  return data as CertificateTemplate
}

/**
 * Get a clinic identity by ID
 */
export async function getClinicIdentityById(id: string): Promise<ClinicIdentity | null> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from("clinic_identity")
    .select("*")
    .eq("id", id)
    .single()
  
  if (error) {
    console.error("Error fetching clinic identity:", error.message)
    return null
  }
  
  return data as ClinicIdentity
}

/**
 * Get the active clinic identity
 */
export async function getActiveClinicIdentity(): Promise<ClinicIdentity | null> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from("clinic_identity")
    .select("*")
    .eq("is_active", true)
    .single()
  
  if (error) {
    console.error("Error fetching active clinic identity:", error.message)
    return null
  }
  
  return data as ClinicIdentity
}

/**
 * Update clinic identity fields (for cleanup after tests)
 */
export async function updateClinicIdentity(
  id: string, 
  updates: Partial<ClinicIdentity>
): Promise<boolean> {
  const supabase = getSupabaseClient()
  const { error } = await supabase
    .from("clinic_identity")
    .update(updates)
    .eq("id", id)
  
  if (error) {
    console.error("Error updating clinic identity:", error.message)
    return false
  }
  
  return true
}

// ============================================================================
// INTAKE AND CERTIFICATE HELPERS
// ============================================================================

// Seeded intake ID from scripts/e2e/seed.ts
export const INTAKE_ID = "e2e00000-0000-0000-0000-000000000010"

/**
 * Intake type definition
 */
export interface Intake {
  id: string
  patient_id: string
  service_id: string
  status: string
  reference_number: string
  payment_status: string
  claimed_by: string | null
  claimed_at: string | null
  created_at: string
  updated_at: string
}

/**
 * Issued certificate type definition
 */
export interface IssuedCertificate {
  id: string
  intake_id: string
  certificate_number: string
  verification_code: string
  status: "valid" | "revoked" | "superseded" | "expired"
  patient_id: string
  doctor_id: string
  template_id: string | null
  template_version: number | null
  template_config_snapshot: CertificateTemplate["config"] | null
  clinic_identity_snapshot: Partial<ClinicIdentity> | null
  storage_path: string
  email_sent_at: string | null
  email_failed_at: string | null
  email_failure_reason: string | null
  email_retry_count: number
  created_at: string
  updated_at: string
}

/**
 * Intake document type definition
 */
export interface IntakeDocument {
  id: string
  intake_id: string
  document_type: string
  storage_path: string
  created_at: string
}

/**
 * Get intake by ID
 */
export async function getIntakeById(id: string): Promise<Intake | null> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from("intakes")
    .select("*")
    .eq("id", id)
    .single()
  
  if (error) {
    console.error("Error fetching intake:", error.message)
    return null
  }
  
  return data as Intake
}

/**
 * Get intake status
 */
export async function getIntakeStatus(intakeId: string): Promise<string | null> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from("intakes")
    .select("status")
    .eq("id", intakeId)
    .single()
  
  if (error) return null
  return data?.status
}

/**
 * Get issued certificate for an intake
 */
export async function getIssuedCertificateForIntake(intakeId: string): Promise<IssuedCertificate | null> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from("issued_certificates")
    .select("*, template_config_snapshot, clinic_identity_snapshot")
    .eq("intake_id", intakeId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single()
  
  if (error) {
    console.error("Error fetching issued certificate:", error.message)
    return null
  }
  
  return data as IssuedCertificate
}

/**
 * Get intake document for an intake
 */
export async function getIntakeDocumentForIntake(intakeId: string): Promise<IntakeDocument | null> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from("intake_documents")
    .select("*")
    .eq("intake_id", intakeId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single()
  
  if (error) {
    console.error("Error fetching intake document:", error.message)
    return null
  }
  
  return data as IntakeDocument
}

/**
 * Reset intake status to paid for re-testing
 */
export async function resetIntakeForRetest(intakeId: string): Promise<void> {
  const supabase = getSupabaseClient()
  
  // Delete any existing issued certificates
  await supabase
    .from("issued_certificates")
    .delete()
    .eq("intake_id", intakeId)
  
  // Delete any existing intake documents
  await supabase
    .from("intake_documents")
    .delete()
    .eq("intake_id", intakeId)
  
  // Reset intake status to paid
  await supabase
    .from("intakes")
    .update({ 
      status: "paid",
      claimed_by: null,
      claimed_at: null,
    })
    .eq("id", intakeId)
}

/**
 * Poll for intake status change with timeout
 */
export async function waitForIntakeStatus(
  intakeId: string, 
  expectedStatus: string, 
  timeoutMs = 30000
): Promise<boolean> {
  const startTime = Date.now()
  
  while (Date.now() - startTime < timeoutMs) {
    const status = await getIntakeStatus(intakeId)
    if (status === expectedStatus) {
      return true
    }
    // Wait 500ms before polling again
    await new Promise(resolve => setTimeout(resolve, 500))
  }
  
  return false
}

/**
 * Poll for issued certificate to exist with timeout
 */
export async function waitForIssuedCertificate(
  intakeId: string, 
  timeoutMs = 30000
): Promise<IssuedCertificate | null> {
  const startTime = Date.now()
  
  while (Date.now() - startTime < timeoutMs) {
    const cert = await getIssuedCertificateForIntake(intakeId)
    if (cert) {
      return cert
    }
    // Wait 500ms before polling again
    await new Promise(resolve => setTimeout(resolve, 500))
  }
  
  return null
}

// ============================================================================
// IDEMPOTENCY HELPERS (for counting duplicates)
// ============================================================================

/**
 * Count issued certificates for an intake
 */
export async function countIssuedCertificatesForIntake(intakeId: string): Promise<number> {
  const supabase = getSupabaseClient()
  const { count, error } = await supabase
    .from("issued_certificates")
    .select("*", { count: "exact", head: true })
    .eq("intake_id", intakeId)
  
  if (error) {
    console.error("Error counting issued certificates:", error.message)
    return 0
  }
  
  return count || 0
}

/**
 * Count intake documents for an intake
 */
export async function countIntakeDocumentsForIntake(intakeId: string): Promise<number> {
  const supabase = getSupabaseClient()
  const { count, error } = await supabase
    .from("intake_documents")
    .select("*", { count: "exact", head: true })
    .eq("intake_id", intakeId)
  
  if (error) {
    console.error("Error counting intake documents:", error.message)
    return 0
  }
  
  return count || 0
}

/**
 * Count certificate audit log entries for an intake with specific event type
 */
export async function countCertificateAuditLogs(
  intakeId: string, 
  eventType?: string
): Promise<number> {
  const supabase = getSupabaseClient()
  
  let query = supabase
    .from("certificate_audit_log")
    .select("*", { count: "exact", head: true })
    .eq("intake_id", intakeId)
  
  if (eventType) {
    query = query.eq("event_type", eventType)
  }
  
  const { count, error } = await query
  
  if (error) {
    console.error("Error counting certificate audit logs:", error.message)
    return 0
  }
  
  return count || 0
}

/**
 * Poll until issued certificate count reaches expected value
 */
export async function waitForIssuedCertificateCount(
  intakeId: string,
  expectedCount: number,
  timeoutMs = 15000
): Promise<number> {
  const startTime = Date.now()
  let lastCount = 0
  
  while (Date.now() - startTime < timeoutMs) {
    lastCount = await countIssuedCertificatesForIntake(intakeId)
    if (lastCount >= expectedCount) {
      return lastCount
    }
    await new Promise(resolve => setTimeout(resolve, 300))
  }
  
  return lastCount
}

// ============================================================================
// SNAPSHOT COMPARISON HELPERS
// ============================================================================

/**
 * Get the latest active template by type (alias for getActiveTemplate with full data)
 */
export async function getLatestActiveTemplateByType(templateType: string): Promise<CertificateTemplate | null> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from("certificate_templates")
    .select("*")
    .eq("template_type", templateType)
    .eq("is_active", true)
    .order("version", { ascending: false })
    .limit(1)
    .single()
  
  if (error) {
    console.error("Error fetching latest active template:", error.message)
    return null
  }
  
  return data as CertificateTemplate
}

/**
 * Template config subset for comparison (stable keys only)
 */
export interface TemplateConfigMinimal {
  layout?: {
    headerStyle?: string
    marginPreset?: string
    fontSizePreset?: string
    accentColorPreset?: string
  }
  options?: {
    showVerificationBlock?: boolean
    signatureStyle?: string
    showAbn?: boolean
    showPhone?: boolean
    showEmail?: boolean
    showAddress?: boolean
  }
}

/**
 * Compare template config snapshots on stable keys only.
 * Returns { match: boolean, differences: string[] }
 */
export function compareTemplateConfigMinimal(
  snapshot: TemplateConfigMinimal | null | undefined,
  expected: TemplateConfigMinimal | null | undefined
): { match: boolean; differences: string[] } {
  const differences: string[] = []
  
  if (!snapshot && !expected) {
    return { match: true, differences: [] }
  }
  
  if (!snapshot || !expected) {
    return { match: false, differences: ["One config is null/undefined"] }
  }
  
  // Compare layout fields
  const layoutKeys = ["headerStyle", "marginPreset", "fontSizePreset", "accentColorPreset"] as const
  for (const key of layoutKeys) {
    const snapshotVal = snapshot.layout?.[key]
    const expectedVal = expected.layout?.[key]
    if (snapshotVal !== expectedVal) {
      differences.push(`layout.${key}: snapshot="${snapshotVal}" vs expected="${expectedVal}"`)
    }
  }
  
  // Compare options fields
  const optionKeys = ["showVerificationBlock", "signatureStyle", "showAbn", "showPhone", "showEmail", "showAddress"] as const
  for (const key of optionKeys) {
    const snapshotVal = snapshot.options?.[key]
    const expectedVal = expected.options?.[key]
    if (snapshotVal !== expectedVal) {
      differences.push(`options.${key}: snapshot="${snapshotVal}" vs expected="${expectedVal}"`)
    }
  }
  
  return { match: differences.length === 0, differences }
}

/**
 * Compare clinic identity snapshot to expected values
 */
export function compareClinicIdentitySnapshot(
  snapshot: Partial<ClinicIdentity> | null | undefined,
  expected: { phone?: string | null; updated_at?: string }
): { match: boolean; differences: string[] } {
  const differences: string[] = []
  
  if (!snapshot) {
    return { match: false, differences: ["Clinic snapshot is null/undefined"] }
  }
  
  // Check phone matches
  if (expected.phone !== undefined) {
    if (snapshot.phone !== expected.phone) {
      differences.push(`phone: snapshot="${snapshot.phone}" vs expected="${expected.phone}"`)
    }
  }
  
  // Check updated_at is >= expected (snapshot should be from after save)
  if (expected.updated_at && snapshot.updated_at) {
    const snapshotDate = new Date(snapshot.updated_at)
    const expectedDate = new Date(expected.updated_at)
    if (snapshotDate < expectedDate) {
      differences.push(`updated_at: snapshot="${snapshot.updated_at}" is before expected="${expected.updated_at}"`)
    }
  }
  
  return { match: differences.length === 0, differences }
}

// ============================================================================
// EMAIL OUTBOX HELPERS
// ============================================================================

/**
 * Email outbox entry type definition
 */
export interface EmailOutboxEntry {
  id: string
  email_type: string
  to_email: string
  to_name: string | null
  subject: string
  status: "pending" | "sent" | "failed" | "skipped_e2e"
  provider: string
  provider_message_id: string | null
  error_message: string | null
  retry_count: number
  intake_id: string | null
  patient_id: string | null
  certificate_id: string | null
  metadata: Record<string, unknown> | null
  created_at: string
  sent_at: string | null
}

/**
 * Verify email_outbox table exists and is accessible
 */
export async function verifyEmailOutboxTable(): Promise<{ exists: boolean; error?: string }> {
  try {
    const supabase = getSupabaseClient()
    const { error } = await supabase
      .from("email_outbox")
      .select("id")
      .limit(1)
    
    if (error) {
      return { exists: false, error: error.message }
    }
    return { exists: true }
  } catch (err) {
    return { exists: false, error: err instanceof Error ? err.message : "Unknown error" }
  }
}

/**
 * Insert a test row into email_outbox and verify it can be read back
 */
export async function testEmailOutboxInsertSelect(): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = getSupabaseClient()
    const testId = `e2e-test-${Date.now()}`
    
    // Insert test row
    const { data: inserted, error: insertError } = await supabase
      .from("email_outbox")
      .insert({
        email_type: "e2e_test",
        to_email: "test@example.com",
        subject: `E2E Test ${testId}`,
        status: "skipped_e2e",
        provider: "e2e_test",
        metadata: { test_id: testId },
      })
      .select()
      .single()
    
    if (insertError) {
      return { success: false, error: `Insert failed: ${insertError.message}` }
    }
    
    // Verify we can read it back
    const { data: selected, error: selectError } = await supabase
      .from("email_outbox")
      .select("*")
      .eq("id", inserted.id)
      .single()
    
    if (selectError) {
      return { success: false, error: `Select failed: ${selectError.message}` }
    }
    
    // Clean up test row
    await supabase
      .from("email_outbox")
      .delete()
      .eq("id", inserted.id)
    
    return { 
      success: selected.email_type === "e2e_test" && selected.subject === `E2E Test ${testId}` 
    }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unknown error" }
  }
}

/**
 * Get email outbox entries for an intake
 */
export async function getEmailOutboxForIntake(intakeId: string): Promise<EmailOutboxEntry[]> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from("email_outbox")
    .select("*")
    .eq("intake_id", intakeId)
    .order("created_at", { ascending: false })
  
  if (error) {
    console.error("Error fetching email_outbox entries:", error.message)
    return []
  }
  
  return data as EmailOutboxEntry[]
}

/**
 * Get email outbox entry by type for an intake
 */
export async function getEmailOutboxByType(
  intakeId: string, 
  emailType: string
): Promise<EmailOutboxEntry | null> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from("email_outbox")
    .select("*")
    .eq("intake_id", intakeId)
    .eq("email_type", emailType)
    .order("created_at", { ascending: false })
    .limit(1)
    .single()
  
  if (error) {
    console.error("Error fetching email_outbox entry:", error.message)
    return null
  }
  
  return data as EmailOutboxEntry
}

/**
 * Wait for email outbox entry to appear with timeout
 */
export async function waitForEmailOutboxEntry(
  intakeId: string,
  emailType: string,
  timeoutMs = 30000
): Promise<EmailOutboxEntry | null> {
  const startTime = Date.now()
  
  while (Date.now() - startTime < timeoutMs) {
    const entry = await getEmailOutboxByType(intakeId, emailType)
    if (entry) {
      return entry
    }
    await new Promise(resolve => setTimeout(resolve, 500))
  }
  
  return null
}

/**
 * Count email outbox entries for an intake
 */
export async function countEmailOutboxEntries(
  intakeId: string,
  emailType?: string
): Promise<number> {
  const supabase = getSupabaseClient()
  
  let query = supabase
    .from("email_outbox")
    .select("*", { count: "exact", head: true })
    .eq("intake_id", intakeId)
  
  if (emailType) {
    query = query.eq("email_type", emailType)
  }
  
  const { count, error } = await query
  
  if (error) {
    console.error("Error counting email_outbox entries:", error.message)
    return 0
  }
  
  return count || 0
}

/**
 * Delete email outbox entries for an intake (for test cleanup)
 */
export async function deleteEmailOutboxForIntake(intakeId: string): Promise<void> {
  const supabase = getSupabaseClient()
  await supabase
    .from("email_outbox")
    .delete()
    .eq("intake_id", intakeId)
}

// ============================================================================
// DECLINE FLOW TEST HELPERS
// ============================================================================

/**
 * Options for seeding a test intake
 */
export interface SeedTestIntakeOptions {
  status?: string
  payment_status?: string
  category?: string
  refund_status?: string
  refund_error?: string
}

/**
 * Seed a test intake for E2E tests
 * Uses the existing E2E patient and service if available
 */
export async function seedTestIntake(options: SeedTestIntakeOptions = {}): Promise<{
  success: boolean
  intakeId?: string
  error?: string
}> {
  try {
    const supabase = getSupabaseClient()
    
    // Use E2E patient ID (from seed.ts)
    const E2E_PATIENT_ID = "e2e00000-0000-0000-0000-000000000001"
    const E2E_SERVICE_ID = "e2e00000-0000-0000-0000-000000000021"
    
    // Check if patient exists
    const { data: patient, error: patientError } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", E2E_PATIENT_ID)
      .single()
    
    if (patientError || !patient) {
      return { success: false, error: "E2E patient not found - run seed script first" }
    }
    
    // Generate unique reference number
    const refNum = `E2E-${Date.now().toString(36).toUpperCase()}`
    
    // Insert test intake
    const { data: intake, error: insertError } = await supabase
      .from("intakes")
      .insert({
        patient_id: E2E_PATIENT_ID,
        service_id: E2E_SERVICE_ID,
        reference_number: refNum,
        status: options.status || "in_review",
        payment_status: options.payment_status || "paid",
        category: options.category || "medical_certificate",
        refund_status: options.refund_status || null,
        refund_error: options.refund_error || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select("id")
      .single()
    
    if (insertError || !intake) {
      return { success: false, error: insertError?.message || "Failed to insert intake" }
    }
    
    return { success: true, intakeId: intake.id }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unknown error" }
  }
}

/**
 * Cleanup a test intake and related data
 */
export async function cleanupTestIntake(intakeId: string): Promise<void> {
  try {
    const supabase = getSupabaseClient()
    
    // Delete related records first (foreign key constraints)
    await supabase.from("intake_events").delete().eq("intake_id", intakeId)
    await supabase.from("intake_documents").delete().eq("intake_id", intakeId)
    await supabase.from("issued_certificates").delete().eq("intake_id", intakeId)
    await supabase.from("email_outbox").delete().eq("intake_id", intakeId)
    await supabase.from("intake_answers").delete().eq("intake_id", intakeId)
    
    // Delete the intake
    await supabase.from("intakes").delete().eq("id", intakeId)
  } catch (err) {
    console.error("Error cleaning up test intake:", err)
  }
}

/**
 * Get intake refund status
 */
export async function getIntakeRefundStatus(intakeId: string): Promise<{
  refund_status: string | null
  refund_error: string | null
} | null> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from("intakes")
    .select("refund_status, refund_error")
    .eq("id", intakeId)
    .single()
  
  if (error) return null
  return data
}
