import { expect, test } from "@playwright/test"

import { LEGACY_REPEAT_RX_RECONCILIATION_NOTE } from "@/lib/clinical/repeat-rx-attestation"

import { loginAsOperator, logoutTestUser } from "./helpers/auth"
import {
  cleanupTestIntake,
  getSupabaseClient,
  isDbAvailable,
  seedTestIntake,
} from "./helpers/db"
import { waitForPageLoad } from "./helpers/test-utils"

const E2E_OPERATOR_ID = "e2e00000-0000-0000-0000-000000000001"
const E2E_PATIENT_ID = "e2e00000-0000-0000-0000-000000000002"
const E2E_CONSULT_SERVICE_ID = "e2e00000-0000-0000-0000-000000000022"

async function seedRepeatPrescriptionCase({
  confirmUnchangedRegimen = true,
}: {
  confirmUnchangedRegimen?: boolean
} = {}): Promise<string> {
  const seed = await seedTestIntake({
    status: "in_review",
    payment_status: "paid",
    category: "prescription",
    claimed_by: E2E_OPERATOR_ID,
  })

  if (!seed.success || !seed.intakeId) {
    throw new Error(`Failed to seed repeat prescription case: ${seed.error}`)
  }

  const supabase = getSupabaseClient()
  const { error: patientError } = await supabase
    .from("profiles")
    .update({
      sex: "M",
      updated_at: new Date().toISOString(),
    })
    .eq("id", E2E_PATIENT_ID)

  if (patientError) {
    await cleanupTestIntake(seed.intakeId)
    throw new Error(`Failed to complete repeat prescription patient identity: ${patientError.message}`)
  }

  const { error: noteError } = await supabase
    .from("intakes")
    .update({
      doctor_notes:
        "E2E review note: patient repeat prescription history and safety answers reviewed before prescribing.",
      updated_at: new Date().toISOString(),
    })
    .eq("id", seed.intakeId)

  if (noteError) {
    await cleanupTestIntake(seed.intakeId)
    throw new Error(`Failed to seed repeat prescription clinical note: ${noteError.message}`)
  }

  const { error } = await supabase.from("intake_answers").insert({
    intake_id: seed.intakeId,
    answers: {
      medicationName: "Atorvastatin",
      medicationStrength: "20 mg",
      medicationForm: "tablet",
      currentDose: "Take one tablet at night",
      prescriptionHistory: "Previously prescribed by regular GP",
      known_allergies: "No known allergies",
      existing_conditions: "Hypercholesterolaemia",
      current_medications: "Atorvastatin",
      isPregnantOrBreastfeeding: "no",
      hasAdverseMedicationReactions: "no",
      ...(confirmUnchangedRegimen ? { doseChanged: false } : {}),
    },
  })

  if (error) {
    await cleanupTestIntake(seed.intakeId)
    throw new Error(`Failed to seed repeat prescription answers: ${error.message}`)
  }

  return seed.intakeId
}

async function recordDurableScriptEvidence(intakeId: string): Promise<void> {
  const supabase = getSupabaseClient()
  const now = new Date().toISOString()
  const { error } = await supabase
    .from("intakes")
    .update({
      status: "awaiting_script",
      script_sent: true,
      script_sent_at: now,
      script_notes: "Sent outside Parchment: E2E manual script evidence",
      parchment_reference: "E2E-MANUAL-SCRIPT",
      updated_at: now,
    })
    .eq("id", intakeId)

  if (error) {
    throw new Error(`Failed to record durable script evidence: ${error.message}`)
  }
}

async function seedWomensHealthUtiCase(): Promise<string> {
  const supabase = getSupabaseClient()
  const { error: serviceError } = await supabase
    .from("services")
    .upsert({
      id: E2E_CONSULT_SERVICE_ID,
      slug: "consult-e2e",
      name: "E2E Consult",
      short_name: "E2E Consult",
      description: "Deterministic E2E consult service",
      type: "consult",
      price_cents: 4995,
      is_active: true,
      created_at: new Date().toISOString(),
    }, { onConflict: "id" })

  if (serviceError) {
    throw new Error(`Failed to seed consult service: ${serviceError.message}`)
  }

  const seed = await seedTestIntake({
    status: "paid",
    payment_status: "paid",
    category: "consult",
    service_id: E2E_CONSULT_SERVICE_ID,
    claimed_by: E2E_OPERATOR_ID,
  })

  if (!seed.success || !seed.intakeId) {
    throw new Error(`Failed to seed women's health consult case: ${seed.error}`)
  }

  const now = new Date().toISOString()
  const { error: patientError } = await supabase
    .from("profiles")
    .update({
      sex: "F",
      updated_at: now,
    })
    .eq("id", E2E_PATIENT_ID)

  if (patientError) {
    await cleanupTestIntake(seed.intakeId)
    throw new Error(`Failed to complete women's health patient identity: ${patientError.message}`)
  }

  const { error: intakeError } = await supabase
    .from("intakes")
    .update({
      subtype: "womens_health",
      doctor_notes:
        "S: Patient reports lower urinary tract symptoms.\nO: Structured UTI screen completed.\nA: Likely uncomplicated lower UTI.\nP: Prescribe if clinically appropriate.",
      updated_at: now,
    })
    .eq("id", seed.intakeId)

  if (intakeError) {
    await cleanupTestIntake(seed.intakeId)
    throw new Error(`Failed to seed women's health intake metadata: ${intakeError.message}`)
  }

  const { error: answersError } = await supabase.from("intake_answers").insert({
    intake_id: seed.intakeId,
    answers: {
      consultSubtype: "womens_health",
      womensHealthOption: "uti",
      utiSymptoms: ["burning", "frequency", "urgency", "cloudy"],
      utiRedFlags: "no",
      utiPregnant: "no",
      known_allergies: "No known allergies",
      existing_conditions: "None reported",
      current_medications: "None reported",
    },
  })

  if (answersError) {
    await cleanupTestIntake(seed.intakeId)
    throw new Error(`Failed to seed women's health answers: ${answersError.message}`)
  }

  return seed.intakeId
}

test.describe("Doctor prescription UI flow", () => {
  const testIntakeIds: string[] = []

  test.beforeEach(async ({ page }) => {
    test.skip(!isDbAvailable(), "Database required for prescription UI flow")
    const login = await loginAsOperator(page)
    expect(login.success, `E2E login should succeed: ${login.error}`).toBe(true)
  })

  test.afterEach(async ({ page }) => {
    await logoutTestUser(page)
    for (const intakeId of testIntakeIds.splice(0)) {
      await cleanupTestIntake(intakeId)
    }
  })

  test("keeps Approve disabled until script evidence is recorded, then surfaces Script sent", async ({ page }) => {
    const intakeId = await seedRepeatPrescriptionCase()
    testIntakeIds.push(intakeId)

    await page.goto(`/doctor/intakes/${intakeId}`)
    await waitForPageLoad(page)

    const actionRail = page.locator('[data-review-action-rail="true"]').first()
    await expect(actionRail.getByRole("button", { name: "Prescribe" })).toBeVisible({ timeout: 15000 })

    const approveButton = actionRail.getByRole("button", { name: "Approve" })
    await expect(approveButton).toBeDisabled()
    await expect(actionRail.getByText("Complete or record the prescription in Parchment first.")).toBeVisible()

    await actionRail.getByRole("button", { name: "Sent outside Parchment" }).click()
    const manualSentPanel = page.getByRole("dialog", { name: "Confirm sent outside Parchment" })
    await expect(manualSentPanel).toBeVisible()
    await expect(manualSentPanel.getByLabel("Parchment or external reference")).toBeVisible()
    await expect(manualSentPanel.getByLabel("Channel used (recorded in the audit log)")).toBeVisible()
    await expect(manualSentPanel.getByRole("button", { name: "Confirm sent" })).toBeEnabled()
    await page.keyboard.press("Escape")
    await expect(manualSentPanel).toBeHidden()

    await recordDurableScriptEvidence(intakeId)

    await page.reload()
    await waitForPageLoad(page)

    const refreshedActionRail = page.locator('[data-review-action-rail="true"]').first()
    await expect(page.getByText("Script sent").first()).toBeVisible()
    await expect(page.getByText("Prescription already recorded").first()).toBeVisible()
    await expect(refreshedActionRail.getByRole("button", { name: "Prescribe" })).toHaveCount(0)
    await expect(refreshedActionRail.getByRole("button", { name: "Approve" })).toBeEnabled()
  })

  test("requires a saved reconciliation acknowledgement for recorded legacy script evidence", async ({ page }) => {
    const intakeId = await seedRepeatPrescriptionCase({ confirmUnchangedRegimen: false })
    testIntakeIds.push(intakeId)
    await recordDurableScriptEvidence(intakeId)

    await page.goto(`/doctor/intakes/${intakeId}`)
    await waitForPageLoad(page)

    const actionRail = page.locator('[data-review-action-rail="true"]').first()
    await expect(actionRail.getByRole("button", { name: "Prescribe" })).toHaveCount(0)
    await expect(actionRail.getByRole("button", { name: "Sent outside Parchment" })).toHaveCount(0)

    const approveButton = actionRail.getByRole("button", { name: "Approve" })
    await expect(approveButton).toBeDisabled()
    await expect(page.getByText("Recorded-script reconciliation note")).toBeVisible()

    await page.getByRole("button", { name: "Acknowledge recorded script evidence" }).click()
    await expect(approveButton).toBeDisabled()
    await page.getByRole("button", { name: "Save reconciliation note" }).click()

    await expect.poll(async () => {
      const supabase = getSupabaseClient()
      const { data } = await supabase
        .from("intakes")
        .select("doctor_notes")
        .eq("id", intakeId)
        .single()
      return data?.doctor_notes ?? ""
    }).toContain(LEGACY_REPEAT_RX_RECONCILIATION_NOTE)
    await expect(approveButton).toBeEnabled()

    await approveButton.click()
    await expect.poll(async () => {
      const supabase = getSupabaseClient()
      const { data } = await supabase
        .from("intakes")
        .select("status")
        .eq("id", intakeId)
        .single()
      return data?.status ?? null
    }).toBe("completed")
  })

  test("women's health UTI review is compact and exposes Prescribe plus Complete Consultation", async ({ page }) => {
    const intakeId = await seedWomensHealthUtiCase()
    testIntakeIds.push(intakeId)

    await page.goto("/dashboard?status=review#doctor-queue")
    await waitForPageLoad(page)

    const row = page.locator(`[data-testid="queue-row-${intakeId}"]`)
    await expect(row).toBeVisible({ timeout: 15000 })
    await row.getByRole("button", { name: /Open case for/i }).click()

    await expect(page.getByText("Women's health · UTI")).toBeVisible({ timeout: 15000 })

    const compactSafety = page.locator('[data-compact-safety-summary="true"]')
    await expect(compactSafety).toBeVisible()
    await expect(compactSafety.locator('[data-safety-severity="info"]')).toHaveCount(3)
    await expect(compactSafety.locator('[data-safety-severity="block"]')).toHaveCount(0)
    await expect(compactSafety.locator('[data-safety-severity="caution"]')).toHaveCount(0)

    const actionRail = page.locator('[data-review-action-rail="true"]').first()
    await expect(actionRail.getByRole("button", { name: "Prescribe" })).toBeVisible()
    const completeButton = actionRail.getByRole("button", { name: "Complete Consultation" })
    await expect(completeButton).toBeVisible()
    await expect(completeButton).toBeEnabled()
    await expect(actionRail.getByRole("button", { name: "Approve" })).toHaveCount(0)
  })
})
