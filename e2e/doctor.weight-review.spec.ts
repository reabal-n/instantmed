/**
 * Doctor-side weight-management launch seam.
 *
 * Weight_loss is a RESTRICTED review line (explicit `can_review_weight_loss`
 * grant; admins bypass). These tests drive the real cockpit for the first
 * paid weight case shape:
 *  - queue visibility follows the capability grant, not the generic
 *    consults capability
 *  - the request packet renders the assessment facts (BMI from the shared
 *    computeBmi constants)
 *  - the Prescribe affordance exists and Complete request stays disabled
 *    until durable script_sent evidence lands
 *  - eating-disorder history renders the call-first safety context
 */

import { randomUUID } from "node:crypto"

import { expect, test } from "@playwright/test"

import { loginAsTestUser, logoutTestUser } from "./helpers/auth"
import {
  cleanupTestIntake,
  getSupabaseClient,
  isDbAvailable,
  seedTestIntake,
} from "./helpers/db"
import { waitForPageLoad } from "./helpers/test-utils"

const E2E_OPERATOR_ID = "e2e00000-0000-0000-0000-000000000001"
const E2E_DOCTOR_ID = "e2e00000-0000-0000-0000-000000000003"
const E2E_CONSULT_SERVICE_ID = "e2e00000-0000-0000-0000-000000000022"

// weightKg 95 / heightCm 175 → computeBmi rounds to 31.0 (above the
// no-comorbidity floor of 30, so screening-clear without extra history).
const CLEAR_WEIGHT_ANSWERS: Record<string, unknown> = {
  weightKg: "95",
  heightCm: "175",
  bmi: 31.0,
  targetWeight: "82",
  previousAttempts: "diet_exercise",
  eatingDisorderHistory: "no",
  weight_pregnancy_status: "no",
  weight_men2_thyroid_cancer: false,
  weight_pancreatitis: false,
  wlAdverseReactions: "no",
  weightLossGoals: "Sustained weight loss for long-term health and mobility.",
}

async function seedWeightPatient(): Promise<string> {
  const patientId = randomUUID()
  const profileToken = patientId.slice(0, 8)
  const phoneSuffix = String(Number.parseInt(profileToken, 16)).padStart(8, "0").slice(-8)
  const now = new Date().toISOString()
  const supabase = getSupabaseClient()
  const { error } = await supabase
    .from("profiles")
    .insert({
      id: patientId,
      auth_user_id: null,
      email: `weight-review-${patientId}@test.instantmed.com.au`,
      full_name: `E2E Weight ${profileToken}`,
      date_of_birth: "1988-03-11",
      role: "patient",
      sex: "F",
      onboarding_completed: true,
      email_verified: true,
      email_verified_at: now,
      address_line1: "12 Clinical Way",
      suburb: "Sydney",
      state: "NSW",
      postcode: "2000",
      phone: `04${phoneSuffix}`,
      medicare_number: "2123456701",
      medicare_irn: 1,
      medicare_expiry: "2028-12-01",
      created_at: now,
      updated_at: now,
    })

  if (error) throw new Error(`Failed to seed weight patient: ${error.message}`)
  return patientId
}

async function seedWeightCase({
  patientId,
  answerOverrides = {},
  claimedBy = E2E_OPERATOR_ID,
}: {
  patientId: string
  answerOverrides?: Record<string, unknown>
  /** Pass null to leave the case unclaimed (visible in every doctor's queue). */
  claimedBy?: string | null
}): Promise<string> {
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
      price_cents: 8995,
      is_active: true,
      created_at: new Date().toISOString(),
    }, { onConflict: "id" })

  if (serviceError) {
    throw new Error(`Failed to seed consult service: ${serviceError.message}`)
  }

  const seed = await seedTestIntake({
    status: "in_review",
    payment_status: "paid",
    category: "consult",
    service_id: E2E_CONSULT_SERVICE_ID,
    ...(claimedBy ? { claimed_by: claimedBy } : {}),
    patient_id: patientId,
  })

  if (!seed.success || !seed.intakeId) {
    throw new Error(`Failed to seed weight consult case: ${seed.error}`)
  }

  const now = new Date().toISOString()
  const { error: intakeError } = await supabase
    .from("intakes")
    .update({
      subtype: "weight_loss",
      doctor_notes: "E2E review note: weight assessment and safety answers reviewed.",
      updated_at: now,
    })
    .eq("id", seed.intakeId)

  if (intakeError) {
    await cleanupTestIntake(seed.intakeId)
    throw new Error(`Failed to set weight subtype: ${intakeError.message}`)
  }

  const { error: answersError } = await supabase.from("intake_answers").insert({
    intake_id: seed.intakeId,
    answers: { consultSubtype: "weight_loss", ...CLEAR_WEIGHT_ANSWERS, ...answerOverrides },
  })

  if (answersError) {
    await cleanupTestIntake(seed.intakeId)
    throw new Error(`Failed to seed weight answers: ${answersError.message}`)
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

  if (error) throw new Error(`Failed to record durable script evidence: ${error.message}`)
}

async function setDoctorWeightCapability(granted: boolean): Promise<void> {
  const supabase = getSupabaseClient()
  const { error } = await supabase
    .from("profiles")
    .update({ can_review_weight_loss: granted, updated_at: new Date().toISOString() })
    .eq("id", E2E_DOCTOR_ID)

  if (error) throw new Error(`Failed to set doctor weight capability: ${error.message}`)
}

async function cleanupWeightPatient(patientId: string): Promise<void> {
  const supabase = getSupabaseClient()
  await supabase.from("patient_health_profiles").delete().eq("patient_id", patientId)
  await supabase.from("profiles").delete().eq("id", patientId)
}

test.describe("Doctor weight-management review", () => {
  test.describe.configure({ mode: "serial" })

  const seededIntakes: string[] = []
  const seededPatients: string[] = []

  test.beforeEach(() => {
    test.skip(!isDbAvailable(), "DB credentials required")
  })

  test.afterEach(async ({ page }) => {
    await logoutTestUser(page)
    for (const intakeId of seededIntakes.splice(0)) {
      await cleanupTestIntake(intakeId)
    }
    for (const patientId of seededPatients.splice(0)) {
      await cleanupWeightPatient(patientId)
    }
    // Restore the restricted-line default (explicit grant required).
    await setDoctorWeightCapability(false)
  })

  test("admin cockpit shows the weight packet, BMI fact, Prescribe affordance, and a gated Complete request", async ({ page }) => {
    const patientId = await seedWeightPatient()
    seededPatients.push(patientId)
    const intakeId = await seedWeightCase({ patientId })
    seededIntakes.push(intakeId)

    const login = await loginAsTestUser(page, "operator")
    expect(login.success, `Operator login should succeed: ${login.error}`).toBe(true)

    await page.goto(`/doctor/intakes/${intakeId}`)
    await waitForPageLoad(page)

    // Assessment facts from the shared summary (BMI computed from the
    // weight-loss-eligibility constants, not re-derived in the UI).
    await expect(page.getByText("Weight-management consult").first()).toBeVisible({ timeout: 15_000 })
    const bmiFact = page.locator('[data-review-fact="bmi"]')
    await expect(bmiFact).toContainText("BMI")
    await expect(bmiFact).toContainText("31.0")

    // Prescribing workflow: Prescribe present, completion gated on durable
    // script evidence.
    const actionRail = page.locator('[data-review-action-rail="true"]').first()
    await expect(actionRail.getByRole("button", { name: "Prescribe" })).toBeVisible()
    const completeButton = actionRail.getByRole("button", { name: "Complete request" })
    await expect(completeButton).toBeVisible()
    await expect(completeButton).toBeDisabled()
    await expect(
      actionRail.getByText("Complete or record the prescription in Parchment first."),
    ).toBeVisible()

    // Durable script_sent evidence unlocks completion.
    await recordDurableScriptEvidence(intakeId)
    await page.reload()
    await waitForPageLoad(page)
    const unlockedComplete = page
      .locator('[data-review-action-rail="true"]')
      .first()
      .getByRole("button", { name: "Complete request" })
    await expect(unlockedComplete).toBeVisible({ timeout: 15_000 })
    await expect(unlockedComplete).toBeEnabled()
  })

  test("eating-disorder history renders the call-first safety context", async ({ page }) => {
    const patientId = await seedWeightPatient()
    seededPatients.push(patientId)
    const intakeId = await seedWeightCase({
      patientId,
      answerOverrides: {
        eatingDisorderHistory: "yes",
        requiresCall: true,
        callReason: "eating_disorder_history",
      },
    })
    seededIntakes.push(intakeId)

    const login = await loginAsTestUser(page, "operator")
    expect(login.success, `Operator login should succeed: ${login.error}`).toBe(true)

    await page.goto(`/doctor/intakes/${intakeId}`)
    await waitForPageLoad(page)

    await expect(page.getByText("Eating disorder history").first()).toBeVisible({ timeout: 15_000 })
    await expect(
      page.getByText("Call the patient before any treatment decision").first(),
    ).toBeVisible()
  })

  test("queue visibility follows the restricted weight capability, not generic consults", async ({ page }) => {
    const patientId = await seedWeightPatient()
    seededPatients.push(patientId)
    // Unclaimed: visibility must come from the capability filter alone, not
    // from claim scoping.
    const intakeId = await seedWeightCase({ patientId, claimedBy: null })
    seededIntakes.push(intakeId)

    // Un-granted doctor (restricted-line default): the weight case must NOT
    // surface in their queue even though they hold generic review_consults.
    await setDoctorWeightCapability(false)
    let login = await loginAsTestUser(page, "doctor")
    expect(login.success, `Doctor login should succeed: ${login.error}`).toBe(true)

    await page.goto("/dashboard")
    await waitForPageLoad(page)
    await expect(page.getByRole("heading", { name: "Today's queue" })).toBeVisible({ timeout: 15_000 })
    await expect(page.getByTestId(`queue-row-${intakeId}`)).toHaveCount(0)

    // Granted doctor: the same case appears.
    await setDoctorWeightCapability(true)
    await logoutTestUser(page)
    login = await loginAsTestUser(page, "doctor")
    expect(login.success, `Doctor re-login should succeed: ${login.error}`).toBe(true)

    await page.goto("/dashboard")
    await waitForPageLoad(page)
    await expect(page.getByRole("heading", { name: "Today's queue" })).toBeVisible({ timeout: 15_000 })
    await expect(page.getByTestId(`queue-row-${intakeId}`)).toBeVisible({ timeout: 15_000 })
  })
})
