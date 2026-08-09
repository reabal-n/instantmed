/**
 * Medical Certificate Protocol-Issuance Governance E2E Contract
 *
 * Proves the live post-payment worker keeps even a low-risk paid med cert in
 * the doctor queue while the code-owned governance gate is paused. The
 * test-only route deliberately bypasses the production cron delay so the gate,
 * rather than timing, owns the observed outcome.
 */

import { expect,test } from "@playwright/test"

import {
  cleanupTestIntake,
  getSupabaseClient,
  isDbAvailable,
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

test.describe("Medical Certificate Protocol Issuance Governance", () => {
  test("post-payment worker keeps a low-risk med cert in doctor review while governance is paused", async ({ request }) => {
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
        // This route executes the complete draft -> approval -> PDF -> outbox
        // pipeline. A cold CI worker can exceed the suite's 15s action timeout.
        timeout: 45_000,
      })

      expect(triggerResponse.ok(), await triggerResponse.text()).toBe(true)
      const triggerResult = await triggerResponse.json()
      expect(triggerResult.mode).toBe("e2e_immediate_auto_approval")
      expect(triggerResult.productionDelayBypassed).toBe(true)
      expect(triggerResult.success, JSON.stringify(triggerResult)).toBe(false)
      expect(triggerResult.status).toBe("paid")
      expect(triggerResult.autoApprovalState).toBe("pending")
      expect(triggerResult.attemptReason).toBe("Governance review pending")

      const { data: intake, error: intakeError } = await supabase
        .from("intakes")
        .select("status, ai_approved, auto_approval_state, reviewed_by, reviewed_at")
        .eq("id", intakeId)
        .single()

      expect(intakeError, intakeError?.message).toBeNull()
      expect(intake?.status).toBe("paid")
      expect(intake?.ai_approved).toBe(false)
      expect(intake?.auto_approval_state).toBe("pending")
      expect(intake?.reviewed_by).toBeNull()
      expect(intake?.reviewed_at).toBeNull()

      const { data: certificate, error: certificateError } = await supabase
        .from("issued_certificates")
        .select("id")
        .eq("intake_id", intakeId)
        .maybeSingle()
      expect(certificateError, certificateError?.message).toBeNull()
      expect(certificate, "governance pause must prevent certificate issuance").toBeNull()

      const { data: emailEntry, error: emailError } = await supabase
        .from("email_outbox")
        .select("id")
        .eq("intake_id", intakeId)
        .eq("email_type", "med_cert_patient")
        .maybeSingle()
      expect(emailError, emailError?.message).toBeNull()
      expect(emailEntry, "governance pause must prevent patient certificate delivery").toBeNull()

      const { count, error: auditError } = await supabase
        .from("ai_audit_log")
        .select("id", { count: "exact", head: true })
        .eq("intake_id", intakeId)
        .eq("action", "auto_approve")

      expect(auditError, auditError?.message).toBeNull()
      expect(count ?? 0, "governance-paused requests must not claim auto-approval").toBe(0)
    } finally {
      if (intakeId) {
        await cleanupTestIntake(intakeId)
      }
      await restoreFeatureFlags(flagSnapshot)
      await deleteAutoApprovalPatient(patientId)
    }
  })
})
