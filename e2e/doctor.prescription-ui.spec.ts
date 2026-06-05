import { expect, test } from "@playwright/test"

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

async function seedRepeatPrescriptionCase(): Promise<string> {
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
    await expect(refreshedActionRail.getByRole("button", { name: "Approve" })).toBeEnabled()
  })
})
