/**
 * Medical Certificate Auto-Approval E2E Contract
 *
 * Proves the live post-payment worker path can take a paid low-risk med cert
 * through AI draft readiness, deterministic auto-approval, PDF storage, and
 * patient email outbox logging without a doctor clicking approve. The test-only
 * route below deliberately bypasses the production 10+ minute cron delay.
 */

import { expect,test } from "@playwright/test"

import {
  cleanupTestIntake,
  getEmailOutboxByType,
  getIssuedCertificateForIntake,
  getSupabaseClient,
  isDbAvailable,
  storageObjectExists,
  waitForIntakeStatus,
} from "./helpers/db"

const AUTO_APPROVAL_FLAGS = {
  ai_auto_approve_enabled: true,
  auto_approve_delay_minutes: 10,
  auto_approve_rate_limit_5min: 100,
  auto_approve_daily_cap: 500,
  auto_approve_max_duration_days: 3,
  auto_approve_dry_run: false,
} as const
const E2E_MED_CERT_SERVICE_ID = "e2e00000-0000-0000-0000-000000000020"
const AUTO_APPROVAL_PATIENT_ID = "e2e00000-0000-0000-0000-0000000000a2"
const E2E_SECRET = process.env.E2E_SECRET || "e2e-test-secret-local"

type FeatureFlagKey = keyof typeof AUTO_APPROVAL_FLAGS
type FeatureFlagSnapshot = Map<FeatureFlagKey, { exists: boolean; value: unknown }>

function todayInSydney(): string {
  const parts = new Intl.DateTimeFormat("en-AU", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "Australia/Sydney",
    year: "numeric",
  }).formatToParts(new Date())

  const byType = new Map(parts.map(part => [part.type, part.value]))
  return `${byType.get("year")}-${byType.get("month")}-${byType.get("day")}`
}

async function createAutoApprovalPatient(): Promise<string> {
  const { error } = await getSupabaseClient()
    .from("profiles")
    .upsert({
      id: AUTO_APPROVAL_PATIENT_ID,
      auth_user_id: null,
      email: "e2e-auto-approval@instantmed-e2e.test",
      full_name: "E2E Auto Approval Patient",
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
      medicare_number: "2123456701",
      medicare_irn: 1,
      medicare_expiry: "2028-12-01",
    }, { onConflict: "id" })

  if (error) {
    throw new Error(`Failed to seed auto-approval patient: ${error.message}`)
  }

  return AUTO_APPROVAL_PATIENT_ID
}

async function deleteAutoApprovalPatient(patientId: string | null): Promise<void> {
  if (!patientId) return

  const { error } = await getSupabaseClient()
    .from("profiles")
    .delete()
    .eq("id", patientId)

  if (error) {
    throw new Error(`Failed to delete auto-approval patient: ${error.message}`)
  }
}

async function seedPaidMedCertIntake(patientId: string): Promise<string> {
  const supabase = getSupabaseClient()
  const { data: intake, error: insertError } = await supabase
    .from("intakes")
    .insert({
      patient_id: patientId,
      service_id: E2E_MED_CERT_SERVICE_ID,
      reference_number: `E2E-AUTO-${Date.now().toString(36).toUpperCase()}`,
      status: "pending_payment",
      payment_status: "paid",
      payment_id: `pi_e2e_auto_${Date.now().toString(36)}`,
      category: "medical_certificate",
      amount_cents: 1995,
      exclude_from_reporting: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select("id")
    .single()

  if (insertError || !intake) {
    throw new Error(`Failed to seed auto-approval intake: ${insertError?.message || "missing row"}`)
  }

  const { error: paidError } = await supabase
    .from("intakes")
    .update({
      status: "paid",
      paid_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", intake.id)

  if (paidError) {
    throw new Error(`Failed to transition auto-approval intake to paid: ${paidError.message}`)
  }

  return intake.id
}

async function setAutoApprovalFlags(): Promise<FeatureFlagSnapshot> {
  const supabase = getSupabaseClient()
  const keys = Object.keys(AUTO_APPROVAL_FLAGS) as FeatureFlagKey[]
  const { data, error } = await supabase
    .from("feature_flags")
    .select("key, value")
    .in("key", keys)

  if (error) {
    throw new Error(`Failed to snapshot auto-approval flags: ${error.message}`)
  }

  const snapshot: FeatureFlagSnapshot = new Map()
  for (const key of keys) {
    const existing = data?.find(row => row.key === key)
    snapshot.set(key, { exists: Boolean(existing), value: existing?.value })
  }

  const { error: upsertError } = await supabase
    .from("feature_flags")
    .upsert(
      keys.map(key => ({
        key,
        value: AUTO_APPROVAL_FLAGS[key],
        updated_at: new Date().toISOString(),
      })),
      { onConflict: "key" }
    )

  if (upsertError) {
    throw new Error(`Failed to enable auto-approval test flags: ${upsertError.message}`)
  }

  return snapshot
}

async function restoreFeatureFlags(snapshot: FeatureFlagSnapshot): Promise<void> {
  const supabase = getSupabaseClient()

  for (const [key, previous] of snapshot.entries()) {
    if (!previous.exists) {
      const { error } = await supabase.from("feature_flags").delete().eq("key", key)
      if (error) throw new Error(`Failed to remove test feature flag ${key}: ${error.message}`)
      continue
    }

    const { error } = await supabase
      .from("feature_flags")
      .upsert(
        {
          key,
          value: previous.value,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "key" }
      )

    if (error) {
      throw new Error(`Failed to restore feature flag ${key}: ${error.message}`)
    }
  }
}

async function seedLowRiskAnswers(intakeId: string, startDate: string): Promise<void> {
  const answers = {
    certificateType: "work",
    startDate,
    duration: "1",
    symptoms: ["runny_nose", "sore_throat", "fatigue"],
    symptomDetails: "Mild cold symptoms with runny nose, sore throat, tiredness and low energy since yesterday. Symptoms are mild and stable. A one day standard work certificate is requested.",
    symptomDuration: "1 day",
    severity: "mild",
    absence_dates: "single_day",
    additional_info: "Low-risk E2E auto-approval fixture.",
  }

  const { error } = await getSupabaseClient()
    .from("intake_answers")
    .insert({
      intake_id: intakeId,
      answers,
      symptom_duration: "1 day",
      symptom_severity: "mild",
      pregnancy_status: "na",
      absence_start_date: startDate,
      absence_end_date: startDate,
      reason_category: "acute_illness",
      red_flags: [],
      yellow_flags: [],
      questionnaire_version: "e2e-auto-approval-v1",
    })

  if (error) {
    throw new Error(`Failed to seed low-risk intake answers: ${error.message}`)
  }
}

test.describe("Medical Certificate Auto-Approval", () => {
  test("post-payment worker auto-issues a low-risk med cert and records patient email", async ({ request }) => {
    test.skip(!isDbAvailable(), "Database not available")

    const flagSnapshot = await setAutoApprovalFlags()
    let patientId: string | null = null
    let intakeId: string | null = null

    try {
      patientId = await createAutoApprovalPatient()
      intakeId = await seedPaidMedCertIntake(patientId)
      const supabase = getSupabaseClient()
      const startDate = todayInSydney()

      const { error: paidAtError } = await supabase
        .from("intakes")
        .update({
          paid_at: new Date().toISOString(),
          auto_approval_state: null,
          auto_approval_state_reason: null,
          auto_approval_state_updated_at: null,
          auto_approval_attempts: 0,
          ai_approved: false,
          ai_approved_at: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", intakeId)

      expect(paidAtError, paidAtError?.message).toBeNull()

      await seedLowRiskAnswers(intakeId, startDate)

      const triggerResponse = await request.post("/api/test/medcert-immediate-auto-approve", {
        headers: {
          "X-E2E-SECRET": E2E_SECRET,
        },
        data: {
          intakeId,
          startDate,
        },
      })

      expect(triggerResponse.ok(), await triggerResponse.text()).toBe(true)
      const triggerResult = await triggerResponse.json()
      expect(triggerResult.mode).toBe("e2e_immediate_auto_approval")
      expect(triggerResult.productionDelayBypassed).toBe(true)
      expect(triggerResult.success, JSON.stringify(triggerResult)).toBe(true)

      const approved = await waitForIntakeStatus(intakeId, "approved", 15000)
      expect(approved, "auto-approval should move intake to approved").toBe(true)

      const { data: intake, error: intakeError } = await supabase
        .from("intakes")
        .select("status, ai_approved, auto_approval_state, reviewed_by, reviewed_at, synced_clinical_note_draft_id")
        .eq("id", intakeId)
        .single()

      expect(intakeError, intakeError?.message).toBeNull()
      expect(intake?.status).toBe("approved")
      expect(intake?.ai_approved).toBe(true)
      expect(intake?.auto_approval_state).toBe("approved")
      expect(intake?.reviewed_by, "auto-approval should still attribute to an AHPRA-verified doctor").toBeTruthy()
      expect(intake?.reviewed_at).toBeTruthy()
      expect(intake?.synced_clinical_note_draft_id).toBeTruthy()

      const certificate = await getIssuedCertificateForIntake(intakeId)
      expect(certificate, "auto-approval should issue a certificate").not.toBeNull()
      expect(certificate?.storage_path).toBeTruthy()
      expect(await storageObjectExists(certificate!.storage_path)).toBe(true)

      const emailEntry = await getEmailOutboxByType(intakeId, "med_cert_patient")
      expect(emailEntry, "auto-approval should log the patient med cert email").not.toBeNull()
      expect(emailEntry?.status).toBe("skipped_e2e")
      expect(emailEntry?.provider_message_id, "E2E skipped emails should not fake a provider id").toBeNull()
      expect(emailEntry?.certificate_id).toBe(certificate?.id)

      const { count, error: auditError } = await supabase
        .from("ai_audit_log")
        .select("id", { count: "exact", head: true })
        .eq("intake_id", intakeId)
        .eq("action", "auto_approve")

      expect(auditError, auditError?.message).toBeNull()
      expect(count ?? 0, "auto-approval should write audit evidence").toBeGreaterThanOrEqual(1)
    } finally {
      if (intakeId) {
        await cleanupTestIntake(intakeId)
      }
      await restoreFeatureFlags(flagSnapshot)
      await deleteAutoApprovalPatient(patientId)
    }
  })
})
